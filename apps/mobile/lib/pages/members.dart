// ignore_for_file: use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'member_detail.dart';

/// Tab Anggota: pencarian + filter RT + daftar beranimasi.
class MembersPage extends StatefulWidget {
  const MembersPage({super.key});

  @override
  State<MembersPage> createState() => _MembersPageState();
}

class _MembersPageState extends State<MembersPage> {
  String _query = '';
  String? _rtFilter;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final summary = context.read<SummaryState>();
      await summary.refresh(silent: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = context.watch<SummaryState>();
    final members =
        (summary.summary?['members'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>();
    final rts =
        (summary.summary?['rtSummary'] as List<dynamic>? ?? const [])
            .cast<Map<String, dynamic>>()
            .map((r) => '${r['rt'] ?? ''}')
            .where((rt) => rt.isNotEmpty)
            .toSet()
            .toList();

    final q = _query.trim().toLowerCase();
    final filtered = members.where((member) {
      final name = '${member['name'] ?? ''}'.toLowerCase();
      final rt = '${member['rt'] ?? ''}';
      final matchQuery = q.isEmpty || name.contains(q) || rt.contains(q);
      final matchRt = _rtFilter == null || rt == _rtFilter;
      return matchQuery && matchRt;
    }).toList();

    return Scaffold(
      body: RefreshIndicator(
        color: Palette.orange,
        onRefresh: () => context.read<SummaryState>().refresh(silent: true),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 62, 18, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Anggota',
                        style: Theme.of(context).textTheme.headlineMedium),
                    const SizedBox(height: 4),
                    Text(
                        '${filtered.length} dari ${members.length} anggota ditampilkan',
                        style: Theme.of(context).textTheme.bodySmall),
                    const SizedBox(height: 14),
                    TextField(
                      onChanged: (value) => setState(() => _query = value),
                      decoration: const InputDecoration(
                        prefixIcon: Icon(Icons.search_rounded, size: 20),
                        hintText: 'Cari nama / RT…',
                      ),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 40,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          _chip(context, null, 'Semua RT'),
                          for (final rt in rts) _chip(context, rt, 'RT $rt'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (summary.loading && summary.summary == null)
              SliverPadding(
                padding: const EdgeInsets.all(18),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => const Padding(
                      padding: EdgeInsets.only(bottom: 12),
                      child: ShimmerBox(height: 76, radius: 20),
                    ),
                    childCount: 6,
                  ),
                ),
              )
            else if (filtered.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  title: 'Tidak ada anggota',
                  subtitle: 'Coba kata kunci atau filter lain',
                  icon: Icons.person_off_outlined,
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 8, 18, 100),
                sliver: SliverList.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final member = filtered[i];
                    return StaggeredAnimator(
                      index: i,
                      baseDelay: const Duration(milliseconds: 28),
                      child: _MemberCard(
                        member: member,
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute<void>(
                              builder: (_) => MemberDetailPage(
                                memberId: (member['id'] as num).toInt(),
                                name: member['name'] ?? 'Anggota',
                                rt: member['rt']?.toString(),
                                phone: member['phone']?.toString(),
                              ),
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _chip(BuildContext context, String? value, String label) {
    final selected = _rtFilter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: GestureDetector(
        onTap: () => setState(() => _rtFilter = value),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
          decoration: BoxDecoration(
            color: selected
                ? Palette.orangePastel
                : (Theme.of(context).brightness == Brightness.dark
                    ? Palette.darkCard
                    : Palette.white),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: selected ? Palette.orangeLight : Palette.border),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
              color: selected ? Palette.orangeDeep : Palette.inkSoft,
            ),
          ),
        ),
      ),
    );
  }
}

class _MemberCard extends StatelessWidget {
  const _MemberCard({required this.member, required this.onTap});
  final Map<String, dynamic> member;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final arrears = ((member['arrears'] ?? 0) as num).toInt();
    final total = ((member['total'] ?? 0) as num).toInt();
    final details = (member['arrearsDetail'] as List<dynamic>? ?? const []);
    final arrearsAmount = details.fold<int>(
        0,
        (sum, item) =>
            sum + ((item as Map<String, dynamic>)['amount'] ?? 0) as int);
    final dark = Theme.of(context).brightness == Brightness.dark;
    return IosCard(
      onTap: onTap,
      radius: 20,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      shadow: true,
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: Palette.orangePastel,
            child: Text(
              ('${member['name'] ?? '?'}'.isNotEmpty)
                  ? '${member['name']!}'[0].toUpperCase()
                  : '?',
              style: const TextStyle(
                  fontSize: 18,
                  color: Palette.orangeDeep,
                  fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${member['name'] ?? ''}',
                    style: Theme.of(context).textTheme.titleMedium,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  'RT ${member['rt'] ?? '—'} · terbukti ${formatRp(total)}',
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (arrears > 0)
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Palette.coralPastel,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${member['arrears']} tunggakan · ${formatRp(arrearsAmount).trim()}',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Palette.coralDeep,
                ),
              ),
            )
          else
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: dark ? Palette.darkBg : Palette.mintPastel,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text('Lunas',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Palette.mintDeep)),
            ),
        ],
      ),
    );
  }
}
