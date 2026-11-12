import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Portal transparansi untuk warga: tanpa login, cukup tempel tautan/token
/// yang dibuat pengurus (`/s/<token>`). Memakai endpoint publik yang sama
/// dengan halaman web, jadi tidak butuh sesi cookie.
class PortalPage extends StatefulWidget {
  const PortalPage({super.key, this.initialToken});

  final String? initialToken;

  @override
  State<PortalPage> createState() => _PortalPageState();
}

class _PortalPageState extends State<PortalPage> {
  final _link = TextEditingController();
  late final TextEditingController _base;
  late final TextEditingController _webBase;
  Map<String, dynamic>? _data;
  String? _token;
  String? _error;
  bool _loading = false;
  bool _verifying = false;
  bool _minting = false;
  List<Map<String, dynamic>> _members = const [];

  @override
  void initState() {
    super.initState();
    _base = TextEditingController(text: context.read<ApiClient>().baseUrl);
    _webBase = TextEditingController(text: context.read<ApiClient>().webBase);
    if (widget.initialToken != null) {
      _link.text = widget.initialToken!;
      WidgetsBinding.instance.addPostFrameCallback((_) => _load());
    }
  }

  @override
  void dispose() {
    _link.dispose();
    _base.dispose();
    _webBase.dispose();
    super.dispose();
  }

  /// Terima tautan lengkap (`http://host/s/<token>`) maupun token mentah.
  String? _extractToken(String raw) {
    final match = RegExp(r'/s/([A-Za-z0-9_-]{20,})').firstMatch(raw);
    final value = (match?.group(1) ?? raw).trim().replaceAll(
      RegExp(r'/+$'),
      '',
    );
    if (!RegExp(r'^[A-Za-z0-9_-]{20,}$').hasMatch(value)) return null;
    return value;
  }

  String _humanError(Object error) {
    if (error is! ApiException) {
      return 'Tidak dapat menghubungi server. Periksa alamat server dan jaringan.';
    }
    switch (error.code) {
      case 'TOKEN_INVALID_OR_REVOKED':
        return 'Tautan tidak dikenali, sudah dicabut, atau kedaluwarsa.';
      case 'RATE_LIMITED':
        return 'Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.';
      case 'COMMUNITY_NOT_FOUND':
        return 'Komunitas tidak ditemukan di server ini.';
      default:
        return 'Gagal memuat portal (${error.code}).';
    }
  }

  Future<void> _load() async {
    final token = _extractToken(_link.text);
    if (token == null) {
      setState(
        () => _error = 'Tautan belum dikenali. Tempel seluruh tautan dari pengurus, contohnya http://…/s/xxxx.',
      );
      return;
    }

    final api = context.read<ApiClient>();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (_base.text.trim().isNotEmpty) {
        await api.saveBaseUrl(_base.text);
      }
      final data = await api.get('/api/public/$token');
      if (!mounted) return;
      setState(() {
        _data = data;
        _token = token;
      });
    } catch (error) {
      if (!mounted) return;
      final message = _humanError(error);
      if (_data == null) {
        setState(() => _error = message);
      } else {
        toast(context, message);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify() async {
    final token = _token;
    if (token == null) return;
    setState(() => _verifying = true);
    try {
      final res = await context.read<ApiClient>().get(
        '/api/public/$token/verify',
      );
      if (!mounted) return;
      final ok = res['ok'] == true;
      final total = (res['totalEntries'] as num? ?? 0).toInt();
      final reason = '${res['reason'] ?? ''}';
      final hash = '${res['rootHash'] ?? ''}';
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Row(
            children: [
              Icon(
                ok ? Icons.verified_rounded : Icons.gpp_bad_rounded,
                color: ok ? Palette.mintDeep : Palette.coralDeep,
              ),
              const SizedBox(width: 10),
              Expanded(child: Text(ok ? 'Catatan Sah' : 'Catatan Tidak Sah')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '$total entri terverifikasi',
                style: Theme.of(context).textTheme.titleSmall,
              ),
              if (reason.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  'Penyebab: $reason',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
              const SizedBox(height: 10),
              Text(
                'Kode verifikasi:',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              SelectableText(
                hash.isEmpty ? '-' : hash,
                style: const TextStyle(fontSize: 11, fontFamily: 'monospace'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Tutup'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (mounted) toast(context, _humanError(error));
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    if (data == null) return _buildGate(context);

    final community = (data['community'] as Map<String, dynamic>?) ?? const {};
    final period =
        '${community['periodStart'] ?? ''} – ${community['periodEnd'] ?? ''}';

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              setState(() {
                _data = null;
                _token = null;
              });
            }
          },
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${community['name'] ?? 'Portal warga'}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(period, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Muat ulang',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _buildBody(context, data),
    );
  }

  /// Halaman awal: tempel tautan/token.
  Widget _buildGate(BuildContext context) {
    final auth = context.watch<AuthState>();
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 19),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Text(
          'Portal warga',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
          children: [
            const _PortalBadge(),
            const SizedBox(height: 16),
            Text(
              'Lihat kas tanpa login',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Tempel tautan yang dikirim pengurus. Tautan pribadi menampilkan '
              'saldo dan tunggakan Anda; tautan komunitas menampilkan kas bersama.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 18),
            IosCard(
              shadow: true,
              padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _link,
                    minLines: 1,
                    maxLines: 3,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      hintText: 'Tempel tautan dari pengurus…',
                      prefixIcon: Icon(
                        Icons.link_rounded,
                        color: Palette.inkSoft,
                        size: 19,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _base,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'Alamat API server',
                      helperText: 'Emulator: 10.0.2.2:4000 · HP fisik: IP LAN',
                      helperMaxLines: 2,
                      prefixIcon: Icon(
                        Icons.dns_rounded,
                        color: Palette.inkSoft,
                        size: 19,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  GradientButton(
                    label: 'Buka portal',
                    icon: Icons.public_rounded,
                    busy: _loading,
                    onPressed: _load,
                  ),
                ],
              ),
            ),
            if (auth.canShare) ...[
              const SizedBox(height: 16),
              _buildAdminCard(context),
            ] else if (!auth.authenticated) ...[
              const SizedBox(height: 16),
              IosCard(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
                child: Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded,
                        size: 20, color: Palette.orangeDeep),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Ingin membuat tautan baru? Masuk dulu sebagai pengurus '
                        '(bendahara, ketua, atau super admin), lalu buka kembali '
                        'layar ini.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: Palette.coralPastel,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.info_rounded,
                      color: Palette.coralDeep,
                      size: 18,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          fontSize: 13,
                          color: Palette.coralDeep,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 18),
            Text(
              'Belum punya tautan? Pengurus yang sudah masuk bisa membuatnya '
              'langsung di layar ini — pilih anggota untuk tautan pribadi, atau '
              'tautan komunitas.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }

  /// Pengurus: buat tautan komunitas/pribadi tanpa membuka panel web.
  Widget _buildAdminCard(BuildContext context) {
    return IosCard(
      shadow: true,
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(9),
                decoration: const BoxDecoration(
                  color: Palette.orangePastel,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.shield_moon_rounded,
                  size: 19,
                  color: Palette.orangeDeep,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Pengurus · bagikan akses',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Buat tautan untuk warga dari sini. Tautan pribadi hanya '
            'menampilkan posisi satu orang; tautan komunitas menampilkan '
            'kas bersama.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _webBase,
            keyboardType: TextInputType.url,
            autocorrect: false,
            decoration: const InputDecoration(
              labelText: 'Alamat web portal (opsional)',
              hintText: 'https://kas-warga.vercel.app',
              helperText: 'Dipakai menyusun tautan yang dibagikan ke warga',
              prefixIcon: Icon(Icons.language_rounded, color: Palette.inkSoft),
            ),
          ),
          const SizedBox(height: 14),
          GradientButton(
            label: 'Pilih anggota',
            icon: Icons.person_add_alt_1_rounded,
            busy: _minting,
            onPressed: _pickMember,
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            onPressed: _minting ? null : _mintCommunity,
            icon: const Icon(Icons.groups_rounded, size: 18),
            label: const Text('Buat tautan komunitas'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Palette.orangeDeep,
              side: const BorderSide(color: Palette.orangeLight),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickMember() async {
    final auth = context.read<AuthState>();
    if (auth.community == null) return;
    await _ensureMembers();
    if (!mounted) return;
    if (_members.isEmpty) {
      toast(context, 'Belum ada anggota di komunitas ini.');
      return;
    }
    final selected = await showIosSheet<Map<String, dynamic>>(
      context,
      _MemberPicker(members: _members),
    );
    if (selected != null && mounted) await _mintMember(selected);
  }

  Future<void> _ensureMembers() async {
    final summary = context.read<SummaryState>();
    if (summary.summary == null) {
      await summary.refresh(silent: true);
    }
    _members = (summary.summary?['members'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList();
  }

  Future<void> _mintMember(Map<String, dynamic> member) async {
    final community = context.read<AuthState>().community;
    final api = context.read<ApiClient>();
    if (community == null) return;
    setState(() => _minting = true);
    try {
      await api.saveWebBase(_webBase.text);
      final res = await api.post(
        '/api/admin/communities/${community.id}/members/${member['id']}/public-token',
      );
      if (!mounted) return;
      final returned = res['member'] as Map<String, dynamic>?;
      final name = '${returned?['name'] ?? member['name'] ?? 'Anggota'}';
      await _showLinkSheet(
        token: '${res['token']}',
        label: 'Tautan pribadi · $name',
      );
    } catch (error) {
      if (mounted) toast(context, _mintError(error));
    } finally {
      if (mounted) setState(() => _minting = false);
    }
  }

  Future<void> _mintCommunity() async {
    final community = context.read<AuthState>().community;
    final api = context.read<ApiClient>();
    if (community == null) return;
    setState(() => _minting = true);
    try {
      await api.saveWebBase(_webBase.text);
      final res = await api.post(
        '/api/admin/communities/${community.id}/public-token',
      );
      if (!mounted) return;
      await _showLinkSheet(token: '${res['token']}', label: 'Tautan komunitas');
    } catch (error) {
      if (mounted) toast(context, _mintError(error));
    } finally {
      if (mounted) setState(() => _minting = false);
    }
  }

  String _mintError(Object error) {
    if (error is! ApiException) {
      return 'Tidak dapat menghubungi server. Periksa alamat API dan jaringan.';
    }
    switch (error.code) {
      case 'FORBIDDEN':
        return 'Hanya bendahara, ketua, atau super admin yang bisa membuat tautan.';
      case 'MEMBER_NOT_FOUND':
        return 'Anggota tidak ditemukan di server.';
      case 'COMMUNITY_NOT_FOUND':
        return 'Komunitas tidak ditemukan.';
      default:
        return 'Gagal membuat tautan (${error.code}).';
    }
  }

  /// Tampilkan tautan hasil pembuatan: salin atau langsung buka.
  Future<void> _showLinkSheet({
    required String token,
    required String label,
  }) async {
    final webBase = _webBase.text.trim().replaceAll(RegExp(r'/+$'), '');
    final link = webBase.isEmpty ? token : '$webBase/s/$token';
    final theme = Theme.of(context);
    await showIosSheet<void>(
      context,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.link_rounded, color: Palette.orangeDeep),
              const SizedBox(width: 10),
              Expanded(child: Text(label, style: theme.textTheme.titleMedium)),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Palette.orangePastel,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Palette.orangeLight),
            ),
            child: SelectableText(
              link,
              style: const TextStyle(
                fontSize: 12.5,
                height: 1.5,
                fontFamily: 'monospace',
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            webBase.isEmpty
                ? 'Alamat web portal masih kosong, jadi hanya kode di atas '
                      'yang bisa dibagikan. Isi kolom “Alamat web portal” agar '
                      'tautan langsung bisa dibuka di browser.'
                : 'Siapa pun yang memegang tautan ini bisa melihat datanya. '
                      'Bagikan hanya kepada warga yang bersangkutan.',
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () async {
                    await Clipboard.setData(ClipboardData(text: link));
                    if (!mounted) return;
                    toast(context, 'Tautan disalin.');
                  },
                  icon: const Icon(Icons.copy_rounded, size: 18),
                  label: const Text('Salin'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Palette.orangeDeep,
                    side: const BorderSide(color: Palette.orangeLight),
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: GradientButton(
                  label: 'Buka',
                  icon: Icons.arrow_forward_rounded,
                  onPressed: () {
                    Navigator.of(context).pop();
                    _openToken(token);
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Tautan hanya ditampilkan sekali. Bila hilang, buat ulang dari '
            'layar ini.',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  void _openToken(String token) {
    _link.text = token;
    _load();
  }

  Widget _buildBody(BuildContext context, Map<String, dynamic> data) {
    final totals = (data['totals'] as Map<String, dynamic>?) ?? const {};
    final packages = (data['packages'] as List<dynamic>? ?? const []);
    final entries = (data['recentEntries'] as List<dynamic>? ?? const []);
    final member = data['memberView'] as Map<String, dynamic>?;
    final isPersonal = data['scope'] == 'MEMBER' && member != null;

    final collected = (totals['collected'] as num? ?? 0).toInt();
    final target = (totals['target'] as num? ?? 0).toInt();
    final members = (totals['members'] as num? ?? 0).toInt();
    final totalEntries = (totals['entries'] as num? ?? 0).toInt();
    final progress = target > 0 ? collected / target : 0.0;

    return RefreshIndicator(
      color: Palette.orange,
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 34),
        children: [
          _PortalCashCard(
            collected: collected,
            target: target,
            progress: progress,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _MiniStat(
                  label: 'Anggota aktif',
                  value: '$members',
                  icon: Icons.groups_3_rounded,
                  bg: const Color(0xFFD9F6F2),
                  fg: const Color(0xFF0F9D8F),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MiniStat(
                  label: 'Entri ledger',
                  value: '$totalEntries',
                  icon: Icons.receipt_long_rounded,
                  bg: Palette.purplePastel,
                  fg: Palette.purple,
                ),
              ),
            ],
          ),
          if (isPersonal) ...[
            const SizedBox(height: 20),
            SectionHeader(
              'Posisi Anda',
              subtitle: member['rt'] != null
                  ? '${member['name']} · RT ${member['rt']}'
                  : '${member['name']}',
            ),
            const SizedBox(height: 10),
            _MemberCard(member: member),
          ],
          const SizedBox(height: 20),
          SectionHeader('Paket', subtitle: '${packages.length} program kas'),
          const SizedBox(height: 10),
          if (packages.isEmpty)
            IosCard(
              child: Text(
                'Belum ada paket.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            )
          else
            ...packages.map((raw) {
              final pkg = raw as Map<String, dynamic>;
              final pkgCollected = (pkg['collected'] as num? ?? 0).toInt();
              final pkgTarget = (pkg['targetAmount'] as num? ?? 0).toInt();
              final pct = pkgTarget > 0 ? pkgCollected / pkgTarget : 0.0;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: IosCard(
                  radius: 16,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${pkg['name'] ?? ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                          ),
                          Text(
                            '${(pct * 100).round()}%',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Palette.orangeDeep,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SoftProgress(value: pct),
                      const SizedBox(height: 8),
                      Text(
                        '${formatRp(pkgCollected)} dari ${formatRp(pkgTarget)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (pkg['dueDate'] != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          'jatuh tempo ${formatDateSimple('${pkg['dueDate']}')}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 10),
          SectionHeader(
            isPersonal ? 'Riwayat setoran Anda' : 'Mutasi terbaru',
            subtitle: '20 entri terakhir',
          ),
          const SizedBox(height: 10),
          if (entries.isEmpty)
            IosCard(
              child: Text(
                isPersonal
                    ? 'Belum ada setoran atas nama Anda.'
                    : 'Belum ada mutasi kas.',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            )
          else
            IosListCard(
              children: [
                for (final raw in entries)
                  _EntryTile(
                    entry: raw as Map<String, dynamic>,
                    showName: !isPersonal,
                  ),
              ],
            ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _verifying ? null : _verify,
            icon: _verifying
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.2,
                      color: Palette.orange,
                    ),
                  )
                : const Icon(Icons.verified_user_outlined, size: 18),
            label: const Text('Verifikasi keaslian catatan'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Palette.orangeDeep,
              minimumSize: const Size.fromHeight(46),
              side: const BorderSide(color: Palette.orangeLight),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Setiap setoran dicatat sebagai entri berantai hash dan tidak dapat '
            'diubah atau dihapus. Halaman ini hanya menampilkan nama, RT, dan '
            'nominal — tanpa data pribadi lain.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

/// Sheet daftar anggota untuk membuat tautan pribadi.
class _MemberPicker extends StatefulWidget {
  const _MemberPicker({required this.members});

  final List<Map<String, dynamic>> members;

  @override
  State<_MemberPicker> createState() => _MemberPickerState();
}

class _MemberPickerState extends State<_MemberPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final rows = widget.members.where((member) {
      final name = '${member['name'] ?? ''}'.toLowerCase();
      final rt = '${member['rt'] ?? ''}';
      return q.isEmpty || name.contains(q) || rt.contains(q);
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Pilih anggota', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(
          'Tautan pribadi menampilkan posisi orang ini saja.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 14),
        TextField(
          onChanged: (value) => setState(() => _query = value),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search_rounded, size: 20),
            hintText: 'Cari nama / RT…',
          ),
        ),
        const SizedBox(height: 6),
        for (final member in rows)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: CircleAvatar(
              backgroundColor: Palette.orangePastel,
              child: Text(
                '${member['name'] ?? '?'}'.isNotEmpty
                    ? '${member['name']}'[0].toUpperCase()
                    : '?',
                style: const TextStyle(
                  color: Palette.orangeDeep,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            title: Text(
              '${member['name'] ?? ''}',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            subtitle: Text(
              'RT ${member['rt'] ?? '—'}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            trailing: const Icon(Icons.link_rounded, color: Palette.orangeDeep),
            onTap: () => Navigator.of(context).pop(member),
          ),
        if (rows.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 18),
            child: Text(
              'Tidak ada anggota yang cocok.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
      ],
    );
  }
}

class _PortalBadge extends StatelessWidget {
  const _PortalBadge();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        width: 54,
        height: 54,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Palette.orange,
        ),
        child: const Icon(Icons.public_rounded, color: Palette.white, size: 26),
      ),
    );
  }
}

class _PortalCashCard extends StatelessWidget {
  const _PortalCashCard({
    required this.collected,
    required this.target,
    required this.progress,
  });
  final int collected;
  final int target;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final percent = (progress * 100).round().clamp(0, 100);
    return IosCard(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: Palette.orangePastel,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: const Icon(Icons.savings_rounded,
                    color: Palette.orangeDeep, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                'Kas terkumpul',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: Theme.of(context).textTheme.bodySmall?.color,
                    ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Palette.orangePastel,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$percent%',
                  style: const TextStyle(
                    color: Palette.orangeDeep,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          CountUp(
            collected,
            key: ValueKey(collected),
            style: const TextStyle(
              fontSize: 34,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.8,
            ),
          ),
          const SizedBox(height: 14),
          SoftProgress(value: progress, height: 6),
          const SizedBox(height: 8),
          Text(
            'dari target ${formatRp(target)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.label,
    required this.value,
    required this.icon,
    required this.bg,
    required this.fg,
  });
  final String label;
  final String value;
  final IconData icon;
  final Color bg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return IosCard(
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: Icon(icon, size: 17, color: fg),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: Theme.of(context).textTheme.titleMedium),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.member});
  final Map<String, dynamic> member;

  @override
  Widget build(BuildContext context) {
    final total = (member['total'] as num? ?? 0).toInt();
    final arrears = (member['arrears'] as num? ?? 0).toInt();
    final arrearsAmount = (member['arrearsAmount'] as num? ?? 0).toInt();
    final detail = (member['arrearsDetail'] as List<dynamic>? ?? const []);
    final name = '${member['name'] ?? ''}';
    final initial = name.trim().isEmpty
        ? 'KW'
        : name.trim().split(RegExp(r'\s+')).take(2).map((p) => p[0]).join();

    final dark = Theme.of(context).brightness == Brightness.dark;
    final ink = Theme.of(context).textTheme.bodyLarge?.color;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: dark
            ? Palette.darkCard
            : Palette.orangePastel.withValues(alpha: 0.45),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: dark ? Palette.darkBorder : Palette.orangeLight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Palette.orangeDeep,
                  shape: BoxShape.circle,
                ),
                child: Text(
                  initial.toUpperCase(),
                  style: const TextStyle(
                    color: Palette.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      member['rt'] != null
                          ? 'RT ${member['rt']}'
                          : 'RT belum diisi',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Total setoran',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  Text(
                    formatRp(total),
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.2,
                      color: ink,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          if (arrears > 0) ...[
            StatusBadge(
              text: '$arrears cicilan tertunggak · ${formatRp(arrearsAmount)}',
              bg: Palette.coralPastel,
              fg: Palette.coralDeep,
            ),
            const SizedBox(height: 10),
            ...detail.map((raw) {
              final item = raw as Map<String, dynamic>;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: dark
                        ? Palette.darkFill
                        : Palette.white.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${item['packageName'] ?? ''}',
                              style: Theme.of(context).textTheme.titleSmall,
                            ),
                          ),
                          Text(
                            '${item['installments'] ?? 0} cicilan',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${formatRp(item['amount'])} · jatuh tempo '
                        '${formatDateSimple('${item['firstDueDate'] ?? ''}')}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              );
            }),
          ] else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Palette.mintPastel,
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text(
                'Tidak ada cicilan tertunggak.',
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                  color: Palette.mintDeep,
                ),
              ),
            ),
          const SizedBox(height: 8),
          Text(
            'Tautan ini hanya memuat mutasi atas nama Anda; angka komunitas '
            'di atas tetap agregat.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}

class _EntryTile extends StatelessWidget {
  const _EntryTile({required this.entry, required this.showName});
  final Map<String, dynamic> entry;
  final bool showName;

  @override
  Widget build(BuildContext context) {
    final amount = (entry['amount'] as num? ?? 0).toInt();
    final negative = amount < 0;
    final voided = entry['entryType'] == 'VOID';
    final rt = entry['memberRt'];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: negative ? Palette.coralPastel : Palette.mintPastel,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              negative
                  ? Icons.replay_circle_filled_rounded
                  : Icons.trending_up_rounded,
              size: 17,
              color: negative ? Palette.coralDeep : Palette.mintDeep,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  showName
                      ? '${entry['memberName'] ?? '(tanpa anggota)'}'
                      : (voided ? 'Pembatalan' : 'Setoran'),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                Text(
                  [
                    formatDateTimeSimple('${entry['occurredAt'] ?? ''}'),
                    if (rt != null) 'RT $rt',
                    if (showName && voided) 'pembatalan',
                  ].join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatRp(amount),
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 15,
              color: negative ? Palette.coralDeep : Palette.mintDeep,
            ),
          ),
        ],
      ),
    );
  }
}
