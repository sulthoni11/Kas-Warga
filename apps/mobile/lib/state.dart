import 'package:flutter/foundation.dart';

import 'api_client.dart';

/// Data user sederhana dari /auth/me dan /bootstrap.
class CurrentUser {
  CurrentUser({required this.id, required this.email, required this.role});
  final int id;
  final String email;
  final String role;

  factory CurrentUser.fromJson(Map<String, dynamic> json) => CurrentUser(
        id: (json['id'] as num).toInt(),
        email: json['email'] as String? ?? '',
        role: json['role'] as String? ?? '',
      );
}

class CommunitySummaryItem {
  CommunitySummaryItem(
      {required this.id,
      required this.name,
      required this.slug,
      this.memberCount = 0});
  final int id;
  final String name;
  final String slug;
  final int memberCount;

  factory CommunitySummaryItem.fromJson(Map<String, dynamic> json) =>
      CommunitySummaryItem(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        memberCount: (json['memberCount'] as num?)?.toInt() ?? 0,
      );
}

/// Sesi + pilihan komunitas aktif.
class AuthState extends ChangeNotifier {
  AuthState(this.api);

  final ApiClient api;
  final List<CommunitySummaryItem> communities = [];

  CurrentUser? user;
  CommunitySummaryItem? community;
  bool restoring = true;
  bool authenticated = false;
  String? lastError;

  bool get canWrite =>
      authenticated && (user?.role == 'BENDAHARA' || user?.role == 'SUPER_ADMIN');

  /// Ketua boleh membagikan portal warga (baca-saja) walau tidak boleh menulis.
  bool get canShare =>
      authenticated &&
      (user?.role == 'BENDAHARA' ||
          user?.role == 'KETUA' ||
          user?.role == 'SUPER_ADMIN');

  Future<void> restore() async {
    restoring = true;
    notifyListeners();
    try {
      authenticated = await api.restore();
      if (authenticated) {
        final me = await api.get('/api/auth/me');
        user = CurrentUser.fromJson(me['user'] as Map<String, dynamic>);
        api.onUnauthorized = _handleUnauthorized;
        await _loadCommunities();
      }
    } catch (e) {
      authenticated = false;
      lastError = e.toString();
    } finally {
      restoring = false;
      notifyListeners();
    }
  }

  Future<void> login({
    required String base,
    required String email,
    required String password,
  }) async {
    await api.login(base: base, email: email, password: password);
    final me = await api.get('/api/auth/me');
    user = CurrentUser.fromJson(me['user'] as Map<String, dynamic>);
    api.onUnauthorized = _handleUnauthorized;
    authenticated = true;
    lastError = null;
    await _loadCommunities();
    notifyListeners();
  }

  Future<void> _loadCommunities() async {
    final boot = await api.get('/api/admin/bootstrap');
    communities
      ..clear()
      ..addAll((boot['communities'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(CommunitySummaryItem.fromJson));
    if (community == null || !communities.any((c) => c.id == community!.id)) {
      // Default: komunitas dengan anggota terbanyak, bukan sekadar yang pertama
      // (hindari terpilihnya komunitas uji kosong dari seed).
      community = communities.isEmpty
          ? null
          : communities.reduce((a, b) =>
              b.memberCount > a.memberCount ? b : a);
    }
  }

  void switchCommunity(CommunitySummaryItem item) {
    community = item;
    notifyListeners();
  }

  Future<void> logout() async {
    await api.logout();
    authenticated = false;
    user = null;
    community = null;
    notifyListeners();
  }

  void _handleUnauthorized() {
    authenticated = false;
    user = null;
    api.cookie = null;
  }
}

/// Ringkasan komunitas (`/summary`) dipakai dashboard, anggota, dan paket.
class SummaryState extends ChangeNotifier {
  SummaryState(this.api, this.auth);

  final ApiClient api;
  final AuthState auth;
  Map<String, dynamic>? summary;
  bool loading = false;
  String? error;

  Future<void> refresh({bool silent = false}) async {
    final community = auth.community;
    if (community == null) return;
    if (!silent) {
      loading = true;
      error = null;
      notifyListeners();
    }
    try {
      summary =
          await api.get('/api/admin/communities/${community.id}/summary');
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  // Penunjuk ringkas untuk halaman.
  int numberAt(String path) => (dataSnapshot(path: path) as num?)?.toInt() ?? 0;

  dynamic dataSnapshot({required String path}) {
    if (summary == null) return null;
    dynamic cursor = summary;
    for (final part in path.split('.').where((p) => p.isNotEmpty)) {
      if (cursor is! Map) return null;
      cursor = cursor[part];
    }
    return cursor;
  }
}

/// Analisis keuangan (`/analytics`).
class AnalyticsState extends ChangeNotifier {
  AnalyticsState(this.api, this.auth);

  final ApiClient api;
  final AuthState auth;
  Map<String, dynamic>? data;
  bool loading = false;
  String? error;
  int months = 12;

  Future<void> refresh({int? months}) async {
    final community = auth.community;
    if (community == null) return;
    if (months != null) this.months = months;
    loading = true;
    error = null;
    notifyListeners();
    try {
      data = await api.get('/api/admin/communities/${community.id}/analytics',
          query: {'months': '${this.months}'});
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }
}

/// Baris pengingat dari `GET /communities/:id/reminders`.
class ReminderRow {
  ReminderRow({
    required this.id,
    required this.memberName,
    required this.templateKey,
    required this.status,
    required this.scheduledDate,
    required this.sentAt,
  });
  final int id;
  final String memberName;
  final String templateKey;
  final String status;
  final String scheduledDate;
  final String? sentAt;

  factory ReminderRow.fromJson(Map<String, dynamic> json) => ReminderRow(
        id: (json['id'] as num?)?.toInt() ?? 0,
        memberName: json['memberName'] as String? ?? '',
        templateKey: json['templateKey'] as String? ?? '',
        status: json['status'] as String? ?? '',
        scheduledDate: json['scheduledDate'] as String? ?? '',
        sentAt: json['sentAt'] as String?,
      );
}

class RemindersState extends ChangeNotifier {
  RemindersState(this.api, this.auth);

  final ApiClient api;
  final AuthState auth;
  final List<ReminderRow> rows = [];
  bool loading = false;
  String? error;

  Future<void> refresh({bool silent = false}) async {
    final community = auth.community;
    if (community == null) return;
    if (!silent) {
      loading = true;
      notifyListeners();
    }
    try {
      final res =
          await api.get('/api/admin/communities/${community.id}/reminders');
      rows
        ..clear()
        ..addAll((res['items'] as List<dynamic>? ?? [])
            .whereType<Map<String, dynamic>>()
            .map(ReminderRow.fromJson));
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  /// Jalankan pengingat sekarang; mengembalikan pesan ringkas.
  Future<String> runNow() async {
    final community = auth.community;
    if (community == null) throw ApiException(400, 'NO_COMMUNITY');
    final res =
        await api.post('/api/admin/communities/${community.id}/reminders/run');
    final queued = res['queued'];
    final sent = res['sent'];
    await refresh(silent: true);
    return 'Pengingat dijalankan: $queued masuk antrean, $sent terkirim.';
  }
}
