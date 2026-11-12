import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'deposit_sheet.dart';
import 'packages.dart';

/// Tab Beranda: ringkasan kas, kartu statistik, paket, aktivitas terbaru.
class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    final summary = context.watch<SummaryState>();
    final analytics = context.watch<AnalyticsState>();

    return Scaffold(
      body: RefreshIndicator(
        color: Palette.orange,
        onRefresh: () => _refresh(context),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            _Header(community: auth.community),
            if (auth.communities.length > 1)
              SliverToBoxAdapter(
                child: _CommunityChips(communities: auth.communities),
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              sliver: SliverToBoxAdapter(
                child: summary.loading && summary.summary == null
                    ? const _Skeleton()
                    : _DashboardBody(summary: summary, analytics: analytics),
              ),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 96)),
          ],
        ),
      ),
    );
  }

  Future<void> _refresh(BuildContext context) async {
    final summary = context.read<SummaryState>();
    final analytics = context.read<AnalyticsState>();
    await summary.refresh(silent: true);
    await analytics.refresh();
  }
}

/// Header "large title" ala iOS dengan tombol keluar dan pilih komunitas.
class _Header extends StatelessWidget {
  const _Header({required this.community});
  final CommunitySummaryItem? community;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthState>();
    final dark = Theme.of(context).brightness == Brightness.dark;
    return SliverAppBar(
      pinned: false,
      floating: true,
      automaticallyImplyLeading: false,
      titleSpacing: 16,
      toolbarHeight: 52,
      actions: [
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: IconButton(
            onPressed: () async {
              await auth.logout();
            },
            style: IconButton.styleFrom(
              backgroundColor: dark ? Palette.darkFill : Palette.cream,
              foregroundColor: dark ? Palette.darkInkSoft : Palette.inkSoft,
            ),
            icon: const Icon(Icons.power_settings_new_rounded, size: 19),
          ),
        ),
      ],
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Beranda',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          if (community != null)
            Text(community!.name,
                style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _CommunityChips extends StatelessWidget {
  const _CommunityChips({required this.communities});
  final List<CommunitySummaryItem> communities;

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthState>();
    final dark = Theme.of(context).brightness == Brightness.dark;
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          for (final item in communities)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: item.id != auth.community?.id
                    ? () => _switch(context, item)
                    : null,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: item.id == auth.community?.id
                        ? Palette.orangePastel
                        : (dark ? Palette.darkCard : Palette.white),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    item.name,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: item.id == auth.community?.id
                          ? Palette.orangeDeep
                          : (dark ? Palette.darkInkSoft : Palette.inkSoft),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _switch(BuildContext context, CommunitySummaryItem item) {
    context.read<AuthState>().switchCommunity(item);
    context.read<SummaryState>().refresh();
    context.read<AnalyticsState>().refresh();
    context.read<RemindersState>().refresh();
  }
}

class _Skeleton extends StatelessWidget {
  const _Skeleton();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        ShimmerBox(height: 148, radius: 18),
        SizedBox(height: 14),
        ShimmerBox(height: 92, radius: 18),
        SizedBox(height: 14),
        ShimmerBox(height: 150, radius: 18),
      ],
    );
  }
}

class _DashboardBody extends StatelessWidget {
  const _DashboardBody({required this.summary, required this.analytics});
  final SummaryState summary;
  final AnalyticsState analytics;

  @override
  Widget build(BuildContext context) {
    final data = summary.summary;
    if (data == null || (summary.error ?? '').isNotEmpty) {
      return EmptyState(
        title: summary.error == null ? 'Belum ada data' : 'Gagal memuat data',
        subtitle: (summary.error ?? '').isEmpty
            ? 'Coba tarik layar untuk mengulang'
            : 'Periksa koneksi dan tarik layar untuk mengulang',
        icon: Icons.cloud_off_rounded,
      );
    }

    final totals = (data['totals'] as Map<String, dynamic>?) ?? {};
    final collected = ((totals['collected'] ?? 0) as num).toInt();
    final target = ((totals['target'] ?? 0) as num).toInt();
    final members = ((totals['members'] ?? 0) as num).toInt();
    final progress = target > 0 ? collected / target : 0.0;

    final stats = (analytics.data?['installmentStats'] as Map<String, dynamic>?)
        ?? const {};
    final overdue = ((stats['overdueAmount'] ?? 0) as num? ?? 0).toInt();
    final packages = (data['packages'] as List<dynamic>? ?? const []);
    final recent = (data['recentEntries'] as List<dynamic>? ?? const []);
    final canWrite = context.read<AuthState>().canWrite;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _CashCard(
          collected: collected,
          target: target,
          progress: progress,
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Anggota',
                sub: '$members aktif',
                icon: Icons.groups_3_rounded,
                colorBg: const Color(0xFFD9F6F2),
                fg: const Color(0xFF0F9D8F),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _StatCard(
                label: 'Tunggakan',
                sub: overdue <= 0 ? 'bersih' : formatRp(overdue),
                icon: Icons.error_outline_rounded,
                colorBg: Palette.coralPastel,
                fg: Palette.coralDeep,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (canWrite)
          Row(
            children: [
              Expanded(
                child: _ActionChip(
                  icon: Icons.payments_rounded,
                  label: 'Setoran',
                  onTap: () => showDepositSheet(context),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionChip(
                  icon: Icons.inventory_2_outlined,
                  label: 'Paket',
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                        builder: (_) => const PackagesPage()),
                  ),
                ),
              ),
            ],
          ),
        if (canWrite) const SizedBox(height: 20),
        SectionHeader('Paket', subtitle: 'Progres pencairan paket · ${packages.length}'),
        const SizedBox(height: 10),
        if (packages.isEmpty)
          IosCard(
            padding: const EdgeInsets.all(18),
            child: Row(children: [
              const Icon(Icons.category_outlined,
                  color: Palette.orangeDeep),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Belum ada paket. Buat paket dari menu Alat atau tombol Paket.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ]),
          )
        else
          SizedBox(
            height: 114,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: packages.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final pkg = packages[i] as Map<String, dynamic>;
                final pkgCollected = ((pkg['collected'] ?? 0) as num).toInt();
                final pkgTarget = ((pkg['targetAmount'] ?? 0) as num).toInt();
                final pct =
                    pkgTarget > 0 ? pkgCollected / pkgTarget : 0.0;
                return StaggeredAnimator(
                  index: i,
                  child: IosCard(
                    onTap: canWrite
                        ? () => showDepositSheet(context,
                            initialPackageId: (pkg['id'] as num).toInt())
                        : null,
                    width: 210,
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
                                style:
                                    Theme.of(context).textTheme.titleSmall,
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
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        const SizedBox(height: 20),
        SectionHeader('Aktivitas Kas',
            subtitle: 'Sentuh lama entri setoran untuk koreksi'),
        const SizedBox(height: 10),
        if (recent.isEmpty)
          IosCard(
            child: Text('Belum ada aktivitas ledger.',
                style: Theme.of(context).textTheme.bodySmall),
          )
        else
          IosListCard(
            children: [
              for (final row in recent.take(8))
                _EntryRow(
                  entry: row as Map<String, dynamic>,
                  canCorrect: canWrite &&
                      row['refType'] == 'deposit' &&
                      row['depositStatus'] == 'CONFIRMED',
                ),
            ],
          ),
      ],
    );
  }
}

class _CashCard extends StatelessWidget {
  const _CashCard({
    required this.collected,
    required this.target,
    required this.progress,
  });
  final int collected;
  final int target;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final percent = (progress * 100).round();
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
            ],
          ),
          const SizedBox(height: 12),
          CountUp(collected,
              style: const TextStyle(
                fontSize: 34,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.8,
              ),
              key: ValueKey(collected)),
          const SizedBox(height: 14),
          SoftProgress(value: progress, height: 6),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('dari target ${formatRp(target)}',
                  style: Theme.of(context).textTheme.bodySmall),
              Text('$percent%',
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: Palette.orangeDeep,
                  )),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.sub,
    required this.icon,
    required this.colorBg,
    required this.fg,
  });
  final String label;
  final String sub;
  final IconData icon;
  final Color colorBg;
  final Color fg;

  @override
  Widget build(BuildContext context) {
    return IosCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: colorBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: fg),
          ),
          const SizedBox(height: 10),
          Text(label,
              style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).textTheme.bodySmall?.color)),
          const SizedBox(height: 2),
          Text(sub,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.2,
                color: Theme.of(context).textTheme.bodyLarge?.color,
              )),
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  const _ActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return IosCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Palette.orangePastel,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 18, color: Palette.orangeDeep),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleSmall),
          ),
          Icon(Icons.chevron_right_rounded,
              size: 20, color: Theme.of(context).textTheme.bodySmall?.color),
        ],
      ),
    );
  }
}

class _EntryRow extends StatelessWidget {
  const _EntryRow({required this.entry, required this.canCorrect});
  final Map<String, dynamic> entry;
  final bool canCorrect;

  bool get isNegative => ((entry['amount'] ?? 0) as num) < 0;

  @override
  Widget build(BuildContext context) {
    final amount = ((entry['amount'] ?? 0) as num).toInt();
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onLongPress: canCorrect
          ? () => showCorrectionSheet(context, entry)
          : null,
      onTap: canCorrect ? () => showCorrectionSheet(context, entry) : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isNegative ? Palette.coralPastel : Palette.mintPastel,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                isNegative
                    ? Icons.replay_circle_filled_rounded
                    : Icons.trending_up_rounded,
                size: 17,
                color: isNegative ? Palette.coralDeep : Palette.mintDeep,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isNegative
                        ? 'Koreksi (void)'
                        : '${entry['memberName'] ?? '(tanpa anggota)'}',
                    style: Theme.of(context).textTheme.titleSmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    [
                      formatDateTimeSimple('${entry['occurredAt'] ?? ''}'),
                      if (isNegative) '${entry['note'] ?? ''}' else '',
                    ].where((s) => s.isNotEmpty).join(' · '),
                    style: Theme.of(context).textTheme.bodySmall,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
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
                color: isNegative ? Palette.coralDeep : Palette.mintDeep,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
