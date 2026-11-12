import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Palet "iOS Clean" — latar abu sistem, kartu putih, aksen oranye tunggal.
class Palette {
  // Aksen oranye (system orange)
  static const orange = Color(0xFFFF9500);
  static const orangeLight = Color(0xFFFFB84D);
  static const orangeDeep = Color(0xFFC96A00);
  static const orangePastel = Color(0xFFFFF0DD);
  static const gradientStart = Color(0xFFFF9F1A);
  static const gradientEnd = Color(0xFFFFC15E);

  // Latar & teks
  static const white = Color(0xFFFFFFFF);
  static const cream = Color(0xFFF2F2F7); // grouped background
  static const field = Color(0xFFE9E9EE); // isian di atas latar putih/abu
  static const ink = Color(0xFF1C1C1E);
  static const inkSoft = Color(0xFF6E6E73);
  static const border = Color(0xFFE5E5EA); // separator

  // Warna pendamping (kartu statistik + chart)
  static const teal = Color(0xFF34C7B8);
  static const tealDeep = Color(0xFF0F9D8F);
  static const coral = Color(0xFFFF6B6B);
  static const coralDeep = Color(0xFFD94848);
  static const coralPastel = Color(0xFFFFECEC);
  static const purple = Color(0xFFA78BFA);
  static const purplePastel = Color(0xFFF1EAFE);
  static const pink = Color(0xFFFF6B9D);
  static const mint = Color(0xFF4CC38A);
  static const mintDeep = Color(0xFF2E9E67);
  static const mintPastel = Color(0xFFE3F6EC);
  static const amber = Color(0xFFFFC24B);

  static const chart = [orange, teal, purple, pink, mint, amber];

  // Dark mode
  static const darkBg = Color(0xFF000000);
  static const darkCard = Color(0xFF1C1C1E);
  static const darkInk = Color(0xFFFFFFFF);
  static const darkInkSoft = Color(0xFF98989F);
  static const darkBorder = Color(0xFF38383A);
  static const darkFill = Color(0xFF2C2C2E);

  static const shadow = Color(0x14000000); // hitam ~8%
}

/// Grup warna per-semantik, diganti mengikuti mode terang/gelap.
class SchemeTokens {
  const SchemeTokens(this.background, this.surface, this.ink, this.inkSoft,
      this.border, this.shallow);
  final Color background;
  final Color surface;
  final Color ink;
  final Color inkSoft;
  final Color border;
  final Color shallow;
}

const lightTokens = SchemeTokens(
  Palette.cream,
  Palette.white,
  Palette.ink,
  Palette.inkSoft,
  Palette.border,
  Palette.orangePastel,
);

const darkTokens = SchemeTokens(
  Palette.darkBg,
  Palette.darkCard,
  Palette.darkInk,
  Palette.darkInkSoft,
  Palette.darkBorder,
  Palette.orangePastel,
);

ThemeData buildAppTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final t = dark ? darkTokens : lightTokens;
  final fill = dark ? Palette.darkFill : Palette.field;
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Palette.orange,
      brightness: brightness,
    ).copyWith(
      primary: Palette.orange,
      secondary: Palette.teal,
      surface: t.surface,
      error: Palette.coral,
    ),
    scaffoldBackgroundColor: t.background,
    splashFactory: InkSparkle.splashFactory,
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: t.background,
      foregroundColor: t.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleSpacing: 16,
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: t.ink,
      ),
      iconTheme: IconThemeData(color: t.ink, size: 22),
    ),
    cardTheme: CardThemeData(
      color: t.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Palette.orange,
        foregroundColor: Palette.white,
        minimumSize: const Size.fromHeight(50),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: fill,
      contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 14),
      hintStyle: TextStyle(color: t.inkSoft, fontSize: 15),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Palette.orange, width: 1.4),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Palette.coral, width: 1.2),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Palette.coral, width: 1.6),
      ),
      labelStyle: TextStyle(color: t.inkSoft, fontSize: 13),
      floatingLabelStyle: const TextStyle(
        color: Palette.orangeDeep,
        fontWeight: FontWeight.w600,
      ),
      helperStyle: TextStyle(color: t.inkSoft, fontSize: 11.5),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xFF3A3A3C) : Palette.ink,
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontSize: 14,
        fontWeight: FontWeight.w500,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    chipTheme: baseChipTheme(dark: dark),
    dividerTheme: DividerThemeData(
      color: t.border,
      thickness: 0.5,
      space: 0.5,
    ),
    textTheme: _textTheme(dark: dark),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Palette.orange,
      selectionColor: Color(0x33FF9500),
    ),
    datePickerTheme: DatePickerThemeData(
      backgroundColor: dark ? Palette.darkCard : Palette.white,
      surfaceTintColor: Colors.transparent,
      headerForegroundColor: Palette.ink,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: dark ? Palette.darkCard : Palette.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: Palette.orange,
      linearTrackColor: Palette.cream,
    ),
  );
  return base;
}

ChipThemeData baseChipTheme({required bool dark}) {
  return ChipThemeData(
    backgroundColor: dark ? Palette.darkFill : Palette.cream,
    selectedColor: Palette.orangePastel,
    side: BorderSide.none,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
  );
}

const _figures = <FontFeature>[FontFeature.tabularFigures()];

TextTheme _textTheme({required bool dark}) {
  final ink = dark ? Palette.darkInk : Palette.ink;
  final soft = dark ? Palette.darkInkSoft : Palette.inkSoft;
  return TextTheme(
    headlineLarge: TextStyle(
      fontSize: 34,
      fontWeight: FontWeight.w700,
      color: ink,
      height: 1.12,
      letterSpacing: -0.6,
      fontFeatures: _figures,
    ),
    headlineMedium: TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: ink,
      height: 1.14,
      letterSpacing: -0.4,
      fontFeatures: _figures,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: ink,
      letterSpacing: -0.2,
      fontFeatures: _figures,
    ),
    titleMedium: TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.w600,
      color: ink,
      letterSpacing: -0.1,
      fontFeatures: _figures,
    ),
    titleSmall: TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w600,
      color: ink,
      fontFeatures: _figures,
    ),
    bodyLarge: TextStyle(
      fontSize: 15,
      color: ink,
      height: 1.35,
      fontFeatures: _figures,
    ),
    bodyMedium: TextStyle(
      fontSize: 14,
      color: ink,
      height: 1.35,
      fontFeatures: _figures,
    ),
    bodySmall: TextStyle(
      fontSize: 12.5,
      color: soft,
      height: 1.35,
      fontFeatures: _figures,
    ),
    labelLarge: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w600,
      color: soft,
      fontFeatures: _figures,
    ),
    labelSmall: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: soft,
      letterSpacing: 0.2,
      fontFeatures: _figures,
    ),
  ).apply(bodyColor: ink, displayColor: ink);
}
