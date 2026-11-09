import 'dart:math';

import 'package:flutter/material.dart';

import 'theme.dart';

// -------------------------------------------------------------- util format

/// Rp dengan pemisah ribuan bergaya Indonesia (1.250.000) tanpa locale data.
String formatRp(Object? value) {
  final number = value is num ? value : int.tryParse('$value') ?? 0;
  final digits = number.abs().floor().toString();
  final grouped = digits.replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');
  return number < 0 ? '- Rp $grouped' : 'Rp $grouped';
}

/// Ambil angka saja dari teks bebas.
String onlyDigits(String raw) => raw.replaceAll(RegExp(r'\D'), '');

const _idMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/// yyyy-MM-dd → `12 Nov 2026`; teks apa pun lain dikembalikan apa adanya.
String formatDateSimple(String raw) {
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(raw);
  if (match == null) return raw;
  final year = match.group(1)!;
  final month = int.tryParse(match.group(2)!) ?? 1;
  final day = int.tryParse(match.group(3)!);
  return '$day ${_idMonths[max(0, month - 1)]} $year';
}

/// yyyy-MM-ddTHH:mm → `12 Nov 2026, 08:30`.
String formatDateTimeSimple(String raw) {
  final date = formatDateSimple(raw);
  final time = RegExp(r'T(\d{2}:\d{2})').firstMatch(raw)?.group(1);
  return time == null ? date : '$date, $time';
}

// ------------------------------------------------------------------ widgets

/// Angka beranimasi naik dari 0 (atau dari angka lama) saat nilai berubah.
class CountUp extends StatelessWidget {
  const CountUp(this.value,
      {super.key, this.style, this.duration = const Duration(milliseconds: 900)});
  final num value;
  final TextStyle? style;
  final Duration duration;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.toDouble()),
      duration: duration,
      curve: Curves.easeOutCubic,
      builder: (context, animated, _) =>
          Text(formatRp(animated.round()), style: style),
    );
  }
}

/// Blok shimmer skeleton untuk keadaan memuat.
class ShimmerBox extends StatefulWidget {
  const ShimmerBox({super.key, this.height = 16, this.width, this.radius = 10});
  final double height;
  final double? width;
  final double radius;

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
        ..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final base = dark ? Palette.darkCard : Palette.cream;
    final sheen = dark ? Palette.darkBorder : Palette.white;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) => ClipRRect(
        borderRadius: BorderRadius.circular(widget.radius),
        child: Container(
          height: widget.height,
          width: widget.width,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-1 - 2 * (_controller.value * 2 - 1), 0),
              end: Alignment(1 + 2 * (_controller.value * 2 - 1), 0),
              colors: [base, sheen, base],
            ),
          ),
        ),
      ),
    );
  }
}

/// Daftar yang masuk dengan efek fade + slide berurutan.
class StaggeredAnimator extends StatelessWidget {
  const StaggeredAnimator({
    super.key,
    required this.index,
    required this.child,
    this.baseDelay = const Duration(milliseconds: 40),
  });
  final int index;
  final Widget child;
  final Duration baseDelay;

  @override
  Widget build(BuildContext context) {
    final delay = baseDelay * min(index, 12);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 420),
      curve: Curves.easeOutCubic,
      builder: (context, value, animatedChild) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, (1 - value) * 16),
          child: animatedChild,
        ),
      ),
      child: FutureBuilder<void>(
        future: Future.delayed(delay),
        builder: (context, snapshot) => snapshot.connectionState ==
                ConnectionState.done
            ? child
            : const SizedBox(),
      ),
    );
  }
}

/// Kartu iOS dengan sudut besar dan bayangan lembut.
class IosCard extends StatelessWidget {
  const IosCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
    this.radius = 24,
    this.shadow = false,
    this.onTap,
    this.width,
    this.height,
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? color;
  final double radius;
  final bool shadow;
  final VoidCallback? onTap;
  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final card = DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? (dark ? Palette.darkCard : Palette.white),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: dark ? Palette.darkBorder : Palette.border),
        boxShadow: [
          if (shadow)
            const BoxShadow(
              color: Palette.shadow,
              blurRadius: 22,
              offset: Offset(0, 10),
            ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        borderRadius: BorderRadius.circular(radius),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(radius),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
    if (width == null && height == null) return card;
    return SizedBox(width: width, height: height, child: card);
  }
}

/// Progress bar tipis beranimasi (0..1).
class SoftProgress extends StatelessWidget {
  const SoftProgress({super.key, required this.value, this.height = 6,
      this.color = Palette.orange, this.track});
  final double value; // 0..1
  final double height;
  final Color color;
  final Color? track;

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: value.clamp(0, 1)),
      duration: const Duration(milliseconds: 800),
      curve: Curves.easeOutCubic,
      builder: (context, v, _) => ClipRRect(
        borderRadius: BorderRadius.circular(height),
        child: LinearProgressIndicator(
          value: v <= 0 ? null : v,
          minHeight: height,
          backgroundColor: track ?? Palette.orangePastel,
          valueColor: AlwaysStoppedAnimation(color),
        ),
      ),
    );
  }
}

/// Badge kecil untuk status.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.text, required this.bg,
      required this.fg, this.padding = const EdgeInsets.symmetric(
          horizontal: 9, vertical: 4)});
  final String text;
  final Color bg;
  final Color fg;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        text,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

/// Tombol bergradien oranye dengan efek tekan membesar/mengecil.
class GradientButton extends StatefulWidget {
  const GradientButton({
    super.key,
    required this.label,
    this.onPressed,
    this.busy = false,
    this.icon,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool busy;
  final IconData? icon;

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton> {
  bool _pressed = false;

  final _decoration = BoxDecoration(
    borderRadius: BorderRadius.circular(16),
    gradient: const LinearGradient(colors: [
      Palette.gradientStart,
      Palette.gradientEnd,
    ]),
    boxShadow: const [
      BoxShadow(
        color: Palette.shadow,
        blurRadius: 18,
        offset: Offset(0, 9),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null && !widget.busy;
    return GestureDetector(
      onTapDown: enabled ? (_) => setState(() => _pressed = true) : null,
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1,
        duration: const Duration(milliseconds: 120),
        child: AnimatedOpacity(
          opacity: enabled ? 1 : 0.55,
          duration: const Duration(milliseconds: 200),
          child: DecoratedBox(
            decoration: _decoration,
            child: Material(
              type: MaterialType.transparency,
              child: InkWell(
                onTap: enabled ? widget.onPressed : null,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 52,
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 22),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: widget.busy
                        ? const Row(
                            key: ValueKey('busy'),
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                  valueColor: AlwaysStoppedAnimation(
                                      Palette.white),
                                ),
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Memproses…',
                                style: TextStyle(
                                  color: Palette.white,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          )
                        : Row(
                            key: const ValueKey('idle'),
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (widget.icon != null) ...[
                                Icon(widget.icon,
                                    color: Palette.white, size: 20),
                                const SizedBox(width: 8),
                              ],
                              Text(
                                widget.label,
                                style: const TextStyle(
                                  color: Palette.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Segmented control gaya iOS.
class IosSegmented<T> extends StatelessWidget {
  const IosSegmented({
    super.key,
    required this.items,
    required this.value,
    required this.onChanged,
  });
  final Map<T, String> items;
  final T value;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: dark ? Palette.darkBg : Palette.cream,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: dark ? Palette.darkBorder : Palette.border),
      ),
      child: Row(
        children: [
          for (final entry in items.entries)
            Expanded(
              child: GestureDetector(
                onTap: () => onChanged(entry.key),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  curve: Curves.easeOut,
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  decoration: BoxDecoration(
                    color: entry.key == value
                        ? (dark ? Palette.darkCard : Palette.white)
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      if (entry.key == value && !dark)
                        const BoxShadow(
                          color: Palette.shadow,
                          blurRadius: 8,
                          offset: Offset(0, 3),
                        ),
                    ],
                  ),
                  child: Text(
                    entry.value,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight:
                          entry.key == value ? FontWeight.w800 : FontWeight.w600,
                      color: entry.key == value
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
}

/// Bagian judul dengan aksi opsional.
class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.action, this.subtitle});
  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title,
                  style: Theme.of(context).textTheme.titleMedium),
              if (subtitle != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(subtitle!,
                      style: Theme.of(context).textTheme.bodySmall),
                ),
            ],
          ),
        ),
        ?action,
      ],
    );
  }
}

/// Layar kosong/gagal yang konsisten.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, this.subtitle,
      this.icon = Icons.inbox_outlined, this.action});
  final String title;
  final String? subtitle;
  final IconData icon;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final soft = Theme.of(context).textTheme.bodySmall?.color ??
        Palette.inkSoft;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Palette.orangePastel,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 30, color: Palette.orangeDeep),
            ),
            const SizedBox(height: 14),
            Text(title,
                style: Theme.of(context).textTheme.titleMedium,
                textAlign: TextAlign.center),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: soft, fontSize: 13)),
            ],
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}

/// SnackBar toast berisi pesan.
void toast(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Bottom sheet bergaya iOS (pegangan kecil di atas).
Future<T?> showIosSheet<T>(BuildContext context, Widget child,
    {bool isScrollable = true}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (context) {
      final dark = Theme.of(context).brightness == Brightness.dark;
      return Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Container(
          decoration: BoxDecoration(
            color: dark ? Palette.darkCard : Palette.white,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 10),
              Container(
                width: 42,
                height: 5,
                decoration: BoxDecoration(
                  color: dark ? Palette.darkBorder : Palette.border,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: child,
                ),
              ),
            ],
          ),
        ),
      );
    },
  );
}
