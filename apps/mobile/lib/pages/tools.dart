// ignore_for_file: use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'packages.dart';

/// Tab Alat: pintasan paket, rekonsiliasi, verifikasi ledger, daftar pengingat.
class ToolsPage extends StatefulWidget {
  const ToolsPage({super.key});

  @override
  State<ToolsPage> createState() => _ToolsPageState();
}

class _ToolsPageState extends State<ToolsPage> {
  bool _reconciling = false;
  bool _verifying = false;
  bool _runningReminder = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final summaries = context.read<SummaryState>();
      final reminders = context.read<RemindersState>();
      await summaries.refresh(silent: true);
      await reminders.refresh(silent: true);
    });
  }

  Future<void> _reconcile() async {
    setState(() => _reconciling = true);
    try {
      final community = context.read<AuthState>().community;
      final api = context.read<ApiClient>();
      final summaries = context.read<SummaryState>();
      final res = await api.post(
          '/api/admin/communities/${community!.id}/installments/reconcile');
      final reconciled = res['reconciled'];
      final failed = res['failed'];
      if (mounted) {
        toast(context,
            failed == 0
                ? 'Semua cicilan disinkronkan ($reconciled anggota).'
                : 'Selesai dengan $failed gagal — coba ulangi.');
      }
      await summaries.refresh(silent: true);
    } catch (e) {
      if (mounted) toast(context, 'Sinkron gagal: $e');
    } finally {
      if (mounted) setState(() => _reconciling = false);
    }
  }

  /// Verifikasi hash chain ledger via GET /verify.
  Future<void> _verify() async {
    setState(() => _verifying = true);
    Map<String, dynamic>? result;
    try {
      final community = context.read<AuthState>().community;
      result = await context
          .read<ApiClient>()
          .get('/api/admin/communities/${community!.id}/verify');
    } catch (e) {
      if (mounted) {
        toast(context, 'Verifikasi gagal: $e');
      }
    }
    if (!mounted) return;
    setState(() => _verifying = false);
    final ok = result?['ok'] == true;
    final entries = ((result?['totalEntries'] ?? 0) as num).toInt();
    final hash = '${result?['rootHash'] ?? ''}';
    final reason = '${result?['reason'] ?? ''}';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(ok ? Icons.verified_rounded : Icons.gpp_bad_rounded,
                color: ok ? Palette.mintDeep : Palette.coralDeep),
            const SizedBox(width: 10),
            Text(ok ? 'Ledger Valid' : 'Ledger Tidak Valid'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$entries entri terverifikasi',
                style: Theme.of(context).textTheme.titleSmall),
            if (reason.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(reason, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 10),
            Text('Root hash:',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            SelectableText(
              hash.isEmpty ? '-' : hash,
              style: TextStyle(
                fontSize: 11,
                fontFamily: 'monospace',
                color: Theme.of(context).textTheme.bodyMedium?.color,
              ),
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
  }

  @override
  Widget build(BuildContext context) {
    final reminders = context.watch<RemindersState>();
    final auth = context.watch<AuthState>();
    final canWrite = auth.canWrite;

    return Scaffold(
      body: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(18, 62, 18, 110),
        children: [
          Text('Alat', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 4),
          Text(
              'Masuk sebagai ${auth.user?.email ?? ''} · ${auth.user?.role ?? ''}',
              style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 18),
          _ToolRow(
            icon: Icons.inventory_2_rounded,
            title: 'Kelola Paket',
            subtitle: 'Lihat, tambah, dan hapus paket program kas',
            onTap: () =>
                Navigator.of(context).push(MaterialPageRoute<void>(
                    builder: (_) => const PackagesPage())),
          ),
          if (canWrite) ...[
            _ToolRow(
              icon: Icons.sync_rounded,
              title: 'Sinkronkan Semua Cicilan',
              subtitle:
                  'Hitung ulang alokasi setoran untuk cicilan seluruh anggota',
              busy: _reconciling,
              onTap: _reconcile,
            ),
            _ToolRow(
              icon: Icons.verified_user_outlined,
              title: 'Verifikasi Ledger',
              subtitle: 'Tes integritas rantai hash kas',
              busy: _verifying,
              onTap: _verify,
            ),
          ],
          const SizedBox(height: 22),
          if (canWrite) ...[
            Card(
              margin: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24)),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.notifications_active_outlined,
                            color: Palette.orangeDeep, size: 22),
                        const SizedBox(width: 10),
                        Expanded(
                            child: Text('Pengingat WhatsApp',
                                style:
                                    Theme.of(context).textTheme.titleMedium)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Mengirim pengingat jatuh tempo <= 3 hari ke seluruh anggota',
                      style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 14),
                    GradientButton(
                      label: 'Jalankan Sekarang',
                      icon: Icons.send_rounded,
                      busy: _runningReminder,
                      onPressed: _runReminders,
                    ),
                    const SizedBox(height: 14),
                    if (reminders.loading && reminders.rows.isEmpty)
                      const ShimmerBox(height: 200, radius: 18)
                    else if (reminders.rows.isEmpty)
                      const Text(
                        'Belum ada riwayat pengingat.',
                        style: TextStyle(color: Palette.inkSoft, fontSize: 13),
                      )
                    else
                      ...reminders.rows.take(12).map(
                            (row) => _reminderTile(context, row),
                          ),
                    if (reminders.rows.length > 12)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          '+${reminders.rows.length - 12} riwayat lain',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _runReminders() async {
    setState(() => _runningReminder = true);
    try {
      final message = await context.read<RemindersState>().runNow();
      if (mounted) toast(context, message);
    } on ApiException catch (e) {
      if (mounted) toast(context, 'Gagal menjalankan pengingat (${e.code}).');
    } finally {
      if (mounted) setState(() => _runningReminder = false);
    }
  }

  Widget _reminderTile(BuildContext context, ReminderRow row) {
    final sent = row.status.toUpperCase() == 'SENT';
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(
            sent ? Icons.mark_email_read_rounded : Icons.schedule_rounded,
            size: 18,
            color: sent ? Palette.mintDeep : Palette.inkSoft,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.memberName,
                    style: Theme.of(context).textTheme.titleSmall),
                Text(
                  '${sent ? 'terkirim' : row.status.toLowerCase()} · ${formatDateSimple(row.scheduledDate)}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          StatusBadge(
            text: sent ? 'TERKIRIM' : row.status.toUpperCase(),
            bg: sent ? Palette.mintPastel : Palette.orangePastel,
            fg: sent ? Palette.mintDeep : Palette.orangeDeep,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          ),
        ],
      ),
    );
  }
}

class _ToolRow extends StatelessWidget {
  const _ToolRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.busy = false,
  });
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: IosCard(
        onTap: busy ? null : onTap,
        radius: 22,
        shadow: true,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: Palette.orangePastel,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 21, color: Palette.orangeDeep),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 3),
                  Text(subtitle,
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
            const SizedBox(width: 6),
            busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        strokeWidth: 2.4, color: Palette.orange),
                  )
                : const Icon(Icons.chevron_right_rounded,
                    color: Palette.inkSoft),
          ],
        ),
      ),
    );
  }
}
