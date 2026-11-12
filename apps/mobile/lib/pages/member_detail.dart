import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Member's cicilan per-paket + tombol rekonsiliasi (pemulihan manual).
class MemberDetailPage extends StatefulWidget {
  const MemberDetailPage({
    super.key,
    required this.memberId,
    required this.name,
    this.rt,
    this.phone,
  });
  final int memberId;
  final String name;
  final String? rt;
  final String? phone;

  @override
  State<MemberDetailPage> createState() => _MemberDetailPageState();
}

/// Satu baris cicilan dari API admin.
class InstallmentRow {
  InstallmentRow.fromJson(Map<String, dynamic> json)
      : id = (json['id'] as num?)?.toInt() ?? 0,
        seq = (json['seq'] as num?)?.toInt() ?? 0,
        amount = (json['amount'] as num?)?.toInt() ?? 0,
        paidAmount = (json['paidAmount'] as num?)?.toInt() ?? 0,
        dueDate = json['dueDate'] as String? ?? '',
        status = json['status'] as String? ?? 'DUE',
        packageId = (json['packageId'] as num?)?.toInt() ?? 0,
        packageName = json['packageName'] as String? ?? '';
  final int id;
  final int seq;
  final int amount;
  final int paidAmount;
  final String dueDate;
  final String status;
  final int packageId;
  final String packageName;

  bool get paid => paidAmount >= amount;
  int get remaining => (amount - paidAmount).clamp(0, amount).toInt();
}

class _MemberDetailPageState extends State<MemberDetailPage> {
  List<InstallmentRow> _installments = [];
  Map<String, String>? _memberInfo;
  bool _loading = true;
  bool _syncing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    final community = context.read<AuthState>().community;
    try {
      final api = context.read<ApiClient>();      final res = await api.get(
          '/api/admin/communities/${community!.id}/members/${widget.memberId}/installments');
      final info = res['member'] as Map<String, dynamic>?;
      setState(() {
        _memberInfo = {
          'name': info?['name'] as String? ?? widget.name,
          'rt': info?['rt']?.toString() ?? widget.rt ?? '',
          'phone': (info?['phone'] as String?) ?? widget.phone ?? '',
        };
        _installments = (res['installments'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map(InstallmentRow.fromJson)
            .toList()
          ..sort((a, b) => a.dueDate.compareTo(b.dueDate) != 0
              ? a.dueDate.compareTo(b.dueDate)
              : a.seq.compareTo(b.seq));
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
    // after fetch, sync summary silently for badges
    if (mounted) {
      // ignore: unawaited_futures
      context.read<SummaryState>().refresh(silent: true);
    }
  }

  Future<void> _reconcile() async {
    setState(() => _syncing = true);
    try {
      final community = context.read<AuthState>().community;
      final res = await context.read<ApiClient>().post(
          '/api/admin/communities/${community!.id}/installments/reconcile');
      final reconciled = res['reconciled'];
      final failed = res['failed'];
      if (mounted) {
        toast(context,
            failed == 0
                ? 'Cicilan disinkronkan ($reconciled anggota diproses).'
                : 'Sinkron selesai dengan $failed gagal — coba lagi.');
      }
      await _load(silent: true);
    } catch (e) {
      if (mounted) toast(context, 'Sinkron gagal: $e');
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // kelompok cicilan per paket
    final groups = <int, List<InstallmentRow>>{};
    for (final row in _installments) {
      groups.putIfAbsent(row.packageId, () => []).add(row);
    }
    final packages = groups.entries.map((entry) {
      final rows = entry.value..sort((a, b) => a.seq.compareTo(b.seq));
      final totalDue = rows.fold<int>(0, (acc, row) => acc + row.amount);
      final totalPaid = rows.fold<int>(0, (acc, row) => acc + row.paidAmount);
      return (
        packageId: entry.key,
        name: rows.first.packageName,
        rows: rows,
        totalDue: totalDue,
        totalPaid: totalPaid,
      );
    }).toList()
      ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    final name = _memberInfo?['name'] ?? widget.name;
    final rt = _memberInfo?['rt'] ?? widget.rt ?? '';
    final phone = _memberInfo?['phone'] ?? widget.phone ?? '';

    final totalRemaining =
        _installments.fold<int>(0, (sum, row) => sum + row.remaining);
    final totalDue =
        _installments.fold<int>(0, (sum, row) => sum + row.amount);

    return Scaffold(
      appBar: AppBar(
        title: Text(name),
        actions: [
          if (totalRemaining > 0)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: StatusBadge(
                  text: 'Tunggakan ${formatRp(totalRemaining)}',
                  bg: Palette.coralPastel,
                  fg: Palette.coralDeep,
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        color: Palette.orange,
        onRefresh: () => _load(silent: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 118),
          children: [
            IosCard(
              radius: 18,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Hero(
                    tag: 'member-${widget.memberId}',
                    child: CircleAvatar(
                      radius: 26,
                      backgroundColor: Palette.orangePastel,
                      child: Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Palette.orangeDeep),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(name,
                            style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 3),
                        Text(
                          [
                            if (rt.isNotEmpty) 'RT $rt',
                            if (phone.isNotEmpty) phone,
                          ].join(' · '),
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                        const SizedBox(height: 8),
                        if (totalDue > 0) ...[
                          SoftProgress(
                              value: totalDue <= 0
                                  ? 0
                                  : (totalDue - totalRemaining) / totalDue),
                          const SizedBox(height: 5),
                          Text(
                              '${formatRp(totalDue - totalRemaining)} / ${formatRp(totalDue)} cicilan',
                              style: Theme.of(context).textTheme.bodySmall),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (_loading)
              const Padding(
                padding: EdgeInsets.only(top: 20),
                child: ShimmerBox(height: 220, radius: 24),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.only(top: 20),
                child: EmptyState(
                  title: 'Gagal memuat cicilan',
                  subtitle: _error,
                  icon: Icons.error_outline_rounded,
                  action: GradientButton(
                      label: 'Coba lagi', onPressed: () => _load()),
                ),
              )
            else ...[
              if (totalRemaining > 0)
                Padding(
                  padding: const EdgeInsets.only(top: 18),
                  child: GradientButton(
                    label: 'Sinkronkan Cicilan',
                    icon: Icons.sync_rounded,
                    busy: _syncing,
                    onPressed: _reconcile,
                  ),
                ),
              for (final (i, pkg) in packages.indexed) ...[
                const SizedBox(height: 12),
                StaggeredAnimator(
                  index: i,
                  child: _PackageGroup(
                    pkg: pkg,
                  ),
                ),
              ],
              if (packages.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 18),
                  child: EmptyState(
                    title: 'Belum ada paket cicilan',
                    subtitle: 'Anggota ini belum terdaftar di paket mana pun',
                    icon: Icons.category_outlined,
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  double totalPaidRatio(int totalDue, int totalRemaining) =>
      totalDue <= 0 ? 0 : (totalDue - totalRemaining) / totalDue;
}

typedef _PackageGroupData = ({
  int packageId,
  String name,
  List<InstallmentRow> rows,
  int totalDue,
  int totalPaid,
});

class _PackageGroup extends StatefulWidget {
  const _PackageGroup({required this.pkg});
  final _PackageGroupData pkg;

  @override
  State<_PackageGroup> createState() => _PackageGroupState();
}

class _PackageGroupState extends State<_PackageGroup> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final pkg = widget.pkg;
    final pct = pkg.totalDue <= 0 ? 0.0 : pkg.totalPaid / pkg.totalDue;
    final remaining = pkg.totalDue - pkg.totalPaid;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return IosCard(
      radius: 18,
      padding: const EdgeInsets.all(16),
      onTap: () => setState(() => _expanded = !_expanded),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(pkg.name,
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                        '${formatRp(pkg.totalPaid)} dari ${formatRp(pkg.totalDue)}',
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              Icon(_expanded
                  ? Icons.expand_less_rounded
                  : Icons.expand_more_rounded),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: SoftProgress(
                  value: pct,
                  color: remaining <= 0 ? Palette.mint : Palette.orange,
                  track: dark ? Palette.darkBg : Palette.cream,
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: remaining <= 0 ? Palette.mintPastel : Palette.orangePastel,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Text(
                  remaining <= 0 ? 'Lunas' : 'Sisa ${formatRp(remaining)}',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: remaining <= 0
                        ? Palette.mintDeep
                        : Palette.orangeDeep,
                  ),
                ),
              ),
            ],
          ),
          AnimatedCrossFade(
            firstChild: const SizedBox(width: double.infinity),
            secondChild: _InstallmentList(rows: pkg.rows),
            crossFadeState: _expanded
                ? CrossFadeState.showSecond
                : CrossFadeState.showFirst,
            duration: const Duration(milliseconds: 260),
            sizeCurve: Curves.easeOut,
          ),
        ],
      ),
    );
  }
}

class _InstallmentList extends StatelessWidget {
  const _InstallmentList({required this.rows});
  final List<InstallmentRow> rows;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        children: rows.map((row) {
          final overdue = row.status == 'DUE' &&
              row.remaining > 0 &&
              row.dueDate.compareTo(_today()) <= 0;
          final badge = row.status == 'PAID'
              ? const StatusBadge(text: 'LUNAS',
                  bg: Palette.mintPastel, fg: Palette.mintDeep)
              : row.status == 'WAIVED'
                  ? const StatusBadge(text: 'DIHAPUS',
                      bg: Palette.purplePastel, fg: Palette.purple)
                  : overdue
                      ? const StatusBadge(text: 'JATUH TEMPO',
                          bg: Palette.coralPastel, fg: Palette.coralDeep)
                      : const StatusBadge(text: 'AKAN DUE',
                          bg: Palette.orangePastel, fg: Palette.orangeDeep);
          return Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.dark
                        ? Palette.darkBg
                        : Palette.cream,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${row.seq}',
                    style: const TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: Palette.orangeDeep),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        row.remaining <= 0
                            ? formatRp(row.amount)
                            : '${formatRp(row.paidAmount)} / ${formatRp(row.amount)}',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                      Text('due ${formatDateSimple(row.dueDate)}',
                          style: Theme.of(context).textTheme.bodySmall),
                    ],
                  ),
                ),
                badge,
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  String _today() {
    final now = DateTime.now();
    final mm = now.month.toString().padLeft(2, '0');
    final dd = now.day.toString().padLeft(2, '0');
    return '${now.year}-$mm-$dd';
  }
}
