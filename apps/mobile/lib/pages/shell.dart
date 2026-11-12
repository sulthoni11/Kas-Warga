import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state.dart';
import '../theme.dart';
import 'analytics.dart';
import 'dashboard.dart';
import 'members.dart';
import 'tools.dart';

/// Induk aplikasi setelah login: 4 tab dengan tab bar transparan ala iOS.
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
      extendBody: true,
      body: IndexedStack(
        index: _index,
        children: const [
          DashboardPage(),
          MembersPage(),
          AnalyticsPage(),
          ToolsPage(),
        ],
      ),
      bottomNavigationBar: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: Container(
            decoration: BoxDecoration(
              color: (dark ? Colors.black : Colors.white)
                  .withValues(alpha: 0.86),
              border: Border(
                top: BorderSide(
                  color: dark ? Palette.darkBorder : Palette.border,
                  width: 0.5,
                ),
              ),
            ),
            child: SafeArea(
              top: false,
              child: SizedBox(
                height: 52,
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
            ),
          ),
        ),
      ),
    );
  }

  static const _items = [
    (Icons.home_outlined, Icons.home_rounded, 'Beranda'),
    (Icons.people_alt_outlined, Icons.people_alt_rounded, 'Anggota'),
    (Icons.insights_outlined, Icons.insights_rounded, 'Analisis'),
    (Icons.grid_view_outlined, Icons.grid_view_rounded, 'Alat'),
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
    final dark = Theme.of(context).brightness == Brightness.dark;
    final idle = dark ? Palette.darkInkSoft : const Color(0xFF8E8E93);
    final color = active ? Palette.orange : idle;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedScale(
            scale: active ? 1.04 : 1,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            child: Icon(active ? activeIcon : icon, size: 23, color: color),
          ),
          const SizedBox(height: 2),
          AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 200),
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: active ? FontWeight.w600 : FontWeight.w500,
              color: color,
              letterSpacing: -0.1,
            ),
            child: Text(label),
          ),
        ],
      ),
    );
  }
}
