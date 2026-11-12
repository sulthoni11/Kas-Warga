// ignore_for_file: use_build_context_synchronously

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Tab Analisis: deret bulanan, komposisi paket, tunggakan RT, status cicilan.
class AnalyticsPage extends StatefulWidget {
  const AnalyticsPage({super.key});

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  int _months = 12;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final analytics = context.read<AnalyticsState>();
      await analytics.refresh(months: _months);
    });
  }

  @override
  Widget build(BuildContext context) {
    final analytics = context.watch<AnalyticsState>();
    final data = analytics.data;

    return Scaffold(
      body: RefreshIndicator(
        color: Palette.orange,
        onRefresh: () => context.read<AnalyticsState>().refresh(months: _months),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 56, 16, 118),
          children: [
            Text('Analisis',
                style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text('Pandangan kas komunitas',
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 14),
            Center(
              child: SizedBox(
                width: 260,
                child: IosSegmented<int>(
                  value: _months,
                  items: const {3: '3 bln', 6: '6 bln', 12: '12 bln'},
                  onChanged: (value) {
                    setState(() => _months = value);
                    context.read<AnalyticsState>().refresh(months: value);
                  },
                ),
              ),
            ),
            const SizedBox(height: 18),
            if (analytics.loading && data == null) ..._skeleton()
            else if (data == null || (analytics.error ?? '').isNotEmpty)
              EmptyState(
                title: 'Gagal memuat analisis',
                subtitle: analytics.error,
                icon: Icons.query_stats_rounded,
                action: GradientButton(
                    label: 'Coba lagi',
                    onPressed: () => context
                        .read<AnalyticsState>()
                        .refresh(months: _months)),
              )
            else ...[
              _InstallmentStatsCard(stats: data),
              const SizedBox(height: 18),
              _MonthlyLineChart(series: _series(data)),
              const SizedBox(height: 18),
              _DueBarChart(series: _series(data)),
              const SizedBox(height: 18),
              _PackagePie(packages: data),
              const SizedBox(height: 18),
              _ArrearsByRtCard(rt: data),
            ],
          ],
        ),
      ),
    );
  }

  List<Widget> _skeleton() => const [
        ShimmerBox(height: 120, radius: 18),
        SizedBox(height: 16),
        ShimmerBox(height: 220, radius: 18),
        SizedBox(height: 16),
        ShimmerBox(height: 220, radius: 18),
      ];

  List<Map<String, dynamic>> _series(Map<String, dynamic> data) =>
      (data['series'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>();
}

// -------------------------------------------------------------- stats header

class _InstallmentStatsCard extends StatelessWidget {
  const _InstallmentStatsCard({required this.stats});
  final Map<String, dynamic> stats;

  @override
  Widget build(BuildContext context) {
    final stat = (stats['installmentStats'] as Map<String, dynamic>? ?? const {});
    final total = ((stat['total'] ?? 0) as num).toInt();
    final paid = ((stat['paid'] ?? 0) as num).toInt();
    final waived = ((stat['waived'] ?? 0) as num).toInt();
    final overdue = ((stat['overdueAmount'] ?? 0) as num).toInt();
    final dueRemaining = ((stat['dueRemaining'] ?? 0) as num).toInt();
    final onTime = total <= 0 ? 0.0 : paid / total;

    return IosCard(
      radius: 18,
      padding: const EdgeInsets.all(20),
      shadow: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.donut_large_rounded,
                  color: Palette.orangeDeep, size: 21),
              const SizedBox(width: 10),
              Text('Status Cicilan',
                  style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 108,
                          height: 108,
                          child: PieChart(
                            PieChartData(
                              centerSpaceRadius: 34,
                              sectionsSpace: 3,
                              startDegreeOffset: -90,
                              sections: [
                                PieChartSectionData(
                                  value: (onTime * 100).clamp(1, 100),
                                  color: Palette.mint,
                                  radius: 14,
                                  showTitle: false,
                                ),
                                if (onTime < 1)
                                  PieChartSectionData(
                                    value: (100 - onTime * 100).clamp(0.1, 100),
                                    color: Palette.orangePastel,
                                    radius: 14,
                                    showTitle: false,
                                  ),
                              ],
                            ),
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text('${(onTime * 100).round()}%',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w900)),
                            Text('lunas',
                                style: Theme.of(context).textTheme.labelSmall),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                        '$total cicilan · $paid lunas · $waived dihapus',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _miniStat(
                      context,
                      colorBg: Palette.coralPastel,
                      fg: Palette.coralDeep,
                      label: 'Jatuh tempo',
                      value: overdue,
                    ),
                    const SizedBox(height: 8),
                    _miniStat(
                      context,
                      colorBg: Palette.orangePastel,
                      fg: Palette.orangeDeep,
                      label: 'Sisa semua cicilan',
                      value: dueRemaining,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniStat(BuildContext context,
      {required String label, required int value, required Color colorBg,
      required Color fg}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorBg,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style:
                  TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: fg)),
          const SizedBox(height: 4),
          Text(formatRp(value),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 16.5, fontWeight: FontWeight.w900, color: fg)),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------ monthly series

double _niceMax(List<double> values) {
  final max = values.isEmpty ? 0 : values.reduce((a, b) => a > b ? a : b);
  if (max <= 0) return 1000;
  var magnitude = 1.0;
  while (max >= magnitude * 10) {
    magnitude *= 10;
  }
  return (max / magnitude).ceilToDouble() * magnitude;
}

class _MonthlyLineChart extends StatelessWidget {
  const _MonthlyLineChart({required this.series});
  final List<Map<String, dynamic>> series;

  @override
  Widget build(BuildContext context) {
    if (series.isEmpty) return const SizedBox.shrink();
    final values =
        series.map((s) => ((s['collected'] ?? 0) as num).toDouble()).toList();
    final maxY = _niceMax(values);
    final hasData = values.any((v) => v > 0);

    return IosCard(
      radius: 18,
      padding: const EdgeInsets.fromLTRB(16, 18, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.swipe_up_alt_rounded,
                      color: Palette.orangeDeep, size: 19),
                  const SizedBox(width: 9),
                  Text('Kas masuk per bulan',
                      style: Theme.of(context).textTheme.titleMedium),
                ]),
                const SizedBox(height: 3),
                Text('Setoran dikurangi koreksi (void)',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: hasData
                ? LineChart(
                    LineChartData(
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: maxY / 4,
                        getDrawingHorizontalLine: (v) => const FlLine(
                          color: Palette.border,
                          strokeWidth: 1,
                          dashArray: [6, 5],
                        ),
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        rightTitles:
                            const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles:
                            const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 30,
                            getTitlesWidget: (value, meta) =>
                                _MonthLabel(series, value),
                          ),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      lineTouchData: LineTouchData(
                        touchTooltipData: LineTouchTooltipData(
                          getTooltipItems: (spots) => [
                            LineTooltipItem(
                              '${_labelAt(series, spots.first.x)}: ${formatRp(spots.first.y.round())}',
                              const TextStyle(
                                  color: Palette.ink,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      lineBarsData: [
                        LineChartBarData(
                          spots: [
                            for (final (i, v) in values.indexed)
                              FlSpot(i.toDouble(), v),
                          ],
                          isCurved: true,
                          preventCurveOverShooting: true,
                          barWidth: 3.4,
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (spot, perc, chartData, index) =>
                                FlDotCirclePainter(
                              radius: 3.2,
                              color: Palette.orangeDeep,
                              strokeColor: Colors.white,
                              strokeWidth: 1.6,
                            ),
                          ),
                          belowBarData: BarAreaData(
                            show: true,
                            gradient: const LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Color(0x55FF8A00),
                                Color(0x11FF8A00),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFFFF8A00),
                              Color(0xFFFFC24B),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                : const Center(
                    child: Text('Belum ada kas masuk dalam periode ini.',
                        style: TextStyle(color: Palette.inkSoft, fontSize: 13)),
                  ),
          ),
        ],
      ),
    );
  }
}

String _labelAt(List<Map<String, dynamic>> series, num x) {
  final idx = x.toInt();
  if (idx < 0 || idx >= series.length) return '';
  return '${series[idx]['label'] ?? ''}';
}

class _MonthLabel extends StatelessWidget {
  const _MonthLabel(this.series, this.value);
  final List<Map<String, dynamic>> series;
  final double value;

  @override
  Widget build(BuildContext context) {
    final idx = value.toInt();
    if (idx < 0 || idx >= series.length) return const SizedBox.shrink();
    final label = '${series[idx]['label'] ?? ''}';
    if (label.isEmpty) return const SizedBox.shrink();
    // Tampilkan semua bila <= 8, selang beberapa bila lebih.
    final total = series.length;
    final showAll = total <= 8;
    if (!showAll &&
        value != 0 &&
        value != total - 1 &&
        value.toInt() % (total ~/ 4) != 0) {
      return const SizedBox.shrink();
    }
    return Text(label, style: Theme.of(context).textTheme.labelSmall);
  }
}

class _DueBarChart extends StatelessWidget {
  const _DueBarChart({required this.series});
  final List<Map<String, dynamic>> series;

  @override
  Widget build(BuildContext context) {
    if (series.isEmpty) return const SizedBox.shrink();
    final values =
        series.map((s) => ((s['dueRemaining'] ?? 0) as num).toDouble()).toList();
    final maxY = _niceMax(values);
    final hasData = values.any((v) => v > 0);

    return IosCard(
      radius: 18,
      padding: const EdgeInsets.fromLTRB(16, 18, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: EdgeInsets.zero,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  const Icon(Icons.timeline_rounded,
                      color: Palette.coralDeep, size: 19),
                  const SizedBox(width: 9),
                  Text('Sisa cicilan jatuh tempo',
                      style: Theme.of(context).textTheme.titleMedium),
                ]),
                const SizedBox(height: 3),
                Text('Cicilan belum dibayar, dikelompokkan bulan jatuh temponya',
                    style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 190,
            child: hasData
                ? BarChart(
                    BarChartData(
                      maxY: maxY * 1.08,
                      gridData: const FlGridData(
                        show: true,
                        drawVerticalLine: false,
                      ),
                      titlesData: FlTitlesData(
                        leftTitles: const AxisTitles(
                            sideTitles: SideTitles(showTitles: false)),
                        rightTitles:
                            const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        topTitles:
                            const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 30,
                            getTitlesWidget: (value, meta) =>
                                _MonthLabel(series, value),
                          ),
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barTouchData: BarTouchData(
                        touchTooltipData: BarTouchTooltipData(
                          getTooltipColor: (_) => const Color(0x66FFFFFF),
                          getTooltipItem: (group, groupIndex, rod, rodIndex) =>
                              BarTooltipItem(
                            '${_labelAt(series, group.x)}: ${formatRp(rod.toY.round())}',
                            const TextStyle(
                                color: Palette.coralDeep,
                                fontWeight: FontWeight.w800,
                                fontSize: 12),
                          ),
                        ),
                      ),
                      barGroups: [
                        for (final (i, v) in values.indexed)
                          BarChartGroupData(
                            x: i,
                            barRods: [
                              BarChartRodData(
                                toY: v,
                                width: 16,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(5),
                                ),
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFFFF6B6B),
                                    Color(0xFFFFC24B),
                                  ],
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  )
                : const Center(
                    child: Text('Tidak ada cicilan jatuh tempo.',
                        style: TextStyle(color: Palette.inkSoft, fontSize: 13)),
                  ),
          ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------ package share

class _PackagePie extends StatelessWidget {
  const _PackagePie({required this.packages});
  final Map<String, dynamic> packages;

  @override
  Widget build(BuildContext context) {
    final list =
        ((packages['packages'] ?? const []) as List<dynamic>).cast<Map<String, dynamic>>();
    final withData = list
        .where((pkg) => ((pkg['collected'] ?? 0) as num).toInt() > 0)
        .toList();
    final total =
        withData.fold<int>(0, (sum, pkg) => sum + ((pkg['collected'] ?? 0) as num).toInt());

    return IosCard(
      radius: 18,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.donut_small_rounded,
                color: Palette.purple, size: 19),
            const SizedBox(width: 9),
            Text('Komposisi per paket',
                style: Theme.of(context).textTheme.titleMedium),
          ]),
          const SizedBox(height: 16),
          if (withData.isEmpty)
            const Text('Belum ada kas pada paket mana pun.',
                style: TextStyle(color: Palette.inkSoft, fontSize: 13))
          else
            Column(
              children: [
                SizedBox(
                  width: 170,
                  height: 170,
                  child: PieChart(
                    PieChartData(
                      centerSpaceRadius: 42,
                      sectionsSpace: 3,
                      startDegreeOffset: -90,
                      sections: [
                        for (final (i, pkg) in withData.indexed)
                          PieChartSectionData(
                            value:
                                ((pkg['collected'] ?? 0) as num).toDouble(),
                            color: Palette
                                .chart[i % Palette.chart.length],
                            radius: 26,
                            showTitle: false,
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                for (final (i, pkg) in withData.indexed)
                  Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            color: Palette.chart[i % Palette.chart.length],
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('${pkg['name'] ?? ''}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context).textTheme.titleSmall),
                        ),
                        Text(
                          '${((((pkg['collected'] ?? 0) as num).toInt() / (total == 0 ? 1 : total)) * 100).round()}%',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

// ------------------------------------------------------------- arrears by RT

class _ArrearsByRtCard extends StatelessWidget {
  const _ArrearsByRtCard({required this.rt});
  final Map<String, dynamic> rt;

  @override
  Widget build(BuildContext context) {
    final rows = ((rt['rt'] ?? const []) as List<dynamic>);
    final withArrears = rows
        .cast<Map<String, dynamic>>()
        .where((r) => ((r['arrears'] ?? 0) as num).toInt() > 0)
        .toList();
    final arrearsList = withArrears
        .map((r) => ((r['arrears'] ?? 0) as num).toInt())
        .toList();
    final maximum = arrearsList.isEmpty
        ? 0
        : arrearsList.reduce((a, b) => a > b ? a : b);

    return IosCard(
      radius: 18,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.home_work_outlined, color: Palette.pink, size: 19),
            const SizedBox(width: 9),
            Text('Tunggakan per RT',
                style: Theme.of(context).textTheme.titleMedium),
          ]),
          const SizedBox(height: 16),
          if (withArrears.isEmpty)
            Text('Semua RT bersih — tidak ada tunggakan.',
                style: TextStyle(color: Palette.mintDeep, fontWeight: FontWeight.w700))
          else
            ...withArrears.map((r) {
              final amount = ((r['arrears'] ?? 0) as num).toInt();
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 46,
                      padding: const EdgeInsets.symmetric(vertical: 5),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: Palette.pink.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text('${r['rt'] ?? '—'}',
                          style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFFD64E77))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(
                            begin: 0, end: maximum <= 0 ? 0 : amount / maximum),
                        duration: const Duration(milliseconds: 800),
                        curve: Curves.easeOutCubic,
                        builder: (context, v, _) => ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: LinearProgressIndicator(
                            value: v.clamp(0.04, 1),
                            minHeight: 12,
                            backgroundColor: Theme.of(context)
                                    .brightness ==
                                    Brightness.dark
                                ? Palette.darkBg
                                : Palette.cream,
                            valueColor:
                                const AlwaysStoppedAnimation(Palette.pink),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(formatRp(amount),
                        style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFD64E77))),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}
