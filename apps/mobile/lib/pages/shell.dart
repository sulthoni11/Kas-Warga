import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state.dart';
import '../theme.dart';
import 'analytics.dart';
import 'dashboard.dart';
import 'members.dart';
import 'tools.dart';

/// Induk aplikasi setelah login: 4 tab dengan nav bar bergaya iOS.
class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _refreshAll(silent: false);
  }

  Future<void> _refreshAll({required bool silent}) async {
    final auth = context.read<AuthState>();
    if (auth.community == null) return;
    // ignore: unawaited_futures
    context.read<SummaryState>().refresh(silent: silent);
    // ignore: unawaited_futures
    context.read<AnalyticsState>().refresh();
    // ignore: unawaited_futures
    context.read<RemindersState>().refresh(silent: silent);
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          DashboardPage(),
          MembersPage(),
          AnalyticsPage(),
          ToolsPage(),
        ],
      ),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        decoration: BoxDecoration(
          color: dark ? Palette.darkCard : Palette.white,
          borderRadius: BorderRadius.circular(26),
          border: Border.all(color: dark ? Palette.darkBorder : Palette.border),
          boxShadow: const [
            BoxShadow(
              color: Palette.shadow,
              blurRadius: 26,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Row(
          children: [
            for (final (i, item) in _items.indexed)
              Expanded(
                child: _NavItem(
                  icon: item.$1,
                  activeIcon: item.$2,
                  label: item.$3,
                  active: i == _index,
                  onTap: () => setState(() => _index = i),
                ),
              ),
          ],
        ),
      ),
    );
  }

  static const _items = [
    (Icons.home_outlined, Icons.home_rounded, 'Beranda'),
    (Icons.groups_3_outlined, Icons.groups_3_rounded, 'Anggota'),
    (Icons.stacked_line_chart_rounded, Icons.stacked_line_chart, 'Analisis'),
    (Icons.widgets_outlined, Icons.widgets_rounded, 'Alat'),
  ];
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.active,
    required this.onTap,
  });
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          transitionBuilder: (child, animation) => ScaleTransition(
            scale: Tween(begin: 0.8, end: 1.0).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutBack),
            ),
            child: FadeTransition(opacity: animation, child: child),
          ),
          child: active
              ? Column(
                  key: ValueKey('a$label'),
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 18, vertical: 4),
                      decoration: BoxDecoration(
                        color: Palette.orangePastel,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: Icon(activeIcon,
                          size: 23, color: Palette.orangeDeep),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w800,
                        color: Palette.orangeDeep,
                      ),
                    ),
                  ],
                )
              : Padding(
                  key: ValueKey('i$label'),
                  padding: const EdgeInsets.only(top: 6),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(icon,
                          size: 23,
                          color: Theme.of(context).colorScheme.onSurface
                              .withValues(alpha: 0.35)),
                      const SizedBox(height: 3),
                      Text(
                        label,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context)
                              .colorScheme
                              .onSurface
                              .withValues(alpha: 0.35),
                        ),
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
