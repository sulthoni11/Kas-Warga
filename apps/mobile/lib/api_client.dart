import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

/// Kesalahan yang mudah ditampilkan ke user (status + kode API).
class ApiException implements Exception {
  ApiException(this.statusCode, this.code, [this.message]);
  final int statusCode;
  final String code;
  final String? message;

  @override
  String toString() => code;
}

/// Klien REST dengan sesi cookie server (cookie `scff_session`).
/// Nilai cookie disimpan aman di perangkat dan dikirim manual pada tiap request.
class ApiClient {
  ApiClient();

  static const _storage = FlutterSecureStorage();
  static const _keyBase = 'scff_base_url';
  static const _keyCookie = 'scff_cookie';
  static const defaultBase = 'http://10.0.2.2:4000';

  /// Dipanggil saat server menjawab 401: app kembali ke halaman login.
  void Function()? onUnauthorized;

  String baseUrl = defaultBase;
  String? cookie;
  bool restored = false;

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Cookie': ?cookie,
      };

  /// Muat baseUrl + cookie tersimpan, lalu cek masa berlaku lewat `/auth/me`.
  /// Mengembalikan true bila sesi masih berlaku.
  Future<bool> restore() async {
    baseUrl = await _storage.read(key: _keyBase) ?? defaultBase;
    cookie = await _storage.read(key: _keyCookie);
    await _storage.write(key: _keyBase, value: baseUrl);
    restored = true;
    if (cookie == null) return false;
    try {
      final me = await get('/api/auth/me');
      final user = me['user'];
      return user is Map<String, dynamic>;
    } on ApiException catch (e) {
      if (e.statusCode == 401) cookie = null;
      return false;
    }
  }

  Future<void> login({required String base, required String email, required String password}) async {
    var clean = base.trim().replaceAll(RegExp(r'/+$'), '');
    // Toleransi bila user lupa menulis skema, mis. "10.0.2.2:4000".
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://$clean';
    }
    final previous = baseUrl;
    baseUrl = clean.isEmpty ? defaultBase : clean;
    cookie = null;
    try {
      final res = await _run('POST', '/api/auth/login',
          body: {'email': email.trim(), 'password': password});
      if (res['user'] is! Map<String, dynamic>) {
        throw ApiException(500, 'LOGIN_FAILED');
      }
      await _storage.write(key: _keyBase, value: baseUrl);
      await _storage.write(key: _keyCookie, value: cookie);
    } catch (_) {
      baseUrl = previous;
      rethrow;
    }
  }

  Future<void> logout() async {
    try {
      await _run('POST', '/api/auth/logout');
    } catch (_) {
      // server boleh gagal; sesi lokal tetap dibuang
    }
    cookie = null;
    await _storage.delete(key: _keyCookie);
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, String>? query}) =>
      send('GET', path, query: query);

  Future<Map<String, dynamic>> post(String path, {Object? body}) =>
      send('POST', path, body: body);

  Future<Map<String, dynamic>> patch(String path, {Object? body}) =>
      send('PATCH', path, body: body);

  Future<Map<String, dynamic>> delete(String path) => send('DELETE', path);

  Future<Map<String, dynamic>> send(String method, String path,
      {Object? body, Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters:
        query == null || query.isEmpty ? null : query);
    // BODI HANYA DIKIRIM BILA ADA (request GET/menabak tanpa bodi tidak boleh
    // membawa "null" — body-parser server menolaknya sebagai INVALID_JSON).
    final payload = body == null ? null : jsonEncode(body);
    final res = await _raw(method, uri, payload);
    if (res.statusCode >= 400) {
      throw _from(res);
    }
    if (res.statusCode == 204 || res.body.isEmpty) return {};
    return jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
  }

  ApiException _from(http.Response res) {
    String code = 'HTTP_${res.statusCode}';
    String? message;
    try {
      final body = jsonDecode(utf8.decode(res.bodyBytes));
      if (body is Map<String, dynamic>) {
        code = (body['error'] as String?) ?? code;
        message = (body['message'] as String?) ?? '';
      }
    } catch (_) {
      // respons non-JSON biarkan pakai kode default
    }
    return ApiException(res.statusCode, code, message);
  }

  Future<Map<String, dynamic>> _run(String method, String path, {Object? body}) {
    return send(method, path, body: body);
  }

  Future<http.Response> _raw(String method, Uri uri, String? payload) async {
    final request = http.Request(method, uri);
    request.headers.addAll(_headers);
    if (payload != null) request.body = payload;
    final res = await http.Response.fromStream(
      await request.send().timeout(const Duration(seconds: 20)),
    );
    final setCookie = res.headers['set-cookie'];
    if (setCookie != null && setCookie.isNotEmpty) {
      cookie = setCookie.split(';').first;
    }
    if (res.statusCode >= 400) {
      debugPrint(
        '[api] $method $uri → ${res.statusCode} :: '
        '${utf8.decode(res.bodyBytes, allowMalformed: true)}',
      );
    }
    if (res.statusCode == 401 && onUnauthorized != null) {
      onUnauthorized!();
    }
    return res;
  }
}

/// Kunci idempoten sederhana tanpa paket uuid.
String newIdempotencyKey() {
  final rnd = Random.secure();
  final bytes = List.generate(16, (_) => rnd.nextInt(256));
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return 'MOB-$hex';
}
