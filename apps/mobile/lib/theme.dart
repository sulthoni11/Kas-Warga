import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Palet "Bright Orange Clean" — putih bersih dengan aksen oranye cerah
/// dan warna pendamping lembut untuk kartu statistik.
class Palette {
  // Nada oranye utama
  static const orange = Color(0xFFFF8A00);
  static const orangeLight = Color(0xFFFFA840);
  static const orangeDeep = Color(0xFFF4760A);
  static const orangePastel = Color(0xFFFFE3C2);
  static const gradientStart = Color(0xFFFF8A00);
  static const gradientEnd = Color(0xFFFFC24B);

  // Latar & teks
  static const white = Color(0xFFFFFFFF);
  static const cream = Color(0xFFFFF8F2);
  static const ink = Color(0xFF2A2621);
  static const inkSoft = Color(0xFF9E958C);
  static const border = Color(0xFFF3E7DC);

  // Warna pendamping (kartu statistik + chart)
  static const teal = Color(0xFF2BD9C8);
  static const tealDeep = Color(0xFF0F9D8F);
  static const coral = Color(0xFFFF6B6B);
  static const coralDeep = Color(0xFFD94848);
  static const coralPastel = Color(0xFFFFECEC);
  static const purple = Color(0xFFA78BFA);
  static const purplePastel = Color(0xFFF1EAFE);
  static const pink = Color(0xFFFF6B9D);
  static const mint = Color(0xFF4CC38A);
  static const mintDeep = Color(0xFF2E9E67);
  static const mintPastel = Color(0xFFDFF6EA);
  static const amber = Color(0xFFFFC24B);

  static const chart = [orange, teal, purple, pink, mint, amber];

  // Dark mode
  static const darkBg = Color(0xFF1C1714);
  static const darkCard = Color(0xFF27211C);
  static const darkInk = Color(0xFFF5EEE7);
  static const darkInkSoft = Color(0xFFB9AFA5);
  static const darkBorder = Color(0xFF3A322B);

  static const shadow = Color(0x1AFF8A00); // oranye ~10%
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
  Palette.white,
  Palette.cream,
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
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        color: t.ink,
      ),
      iconTheme: IconThemeData(color: t.ink),
    ),
    cardTheme: CardThemeData(
      color: t.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: t.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? Palette.darkCard : Palette.cream,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      hintStyle: TextStyle(color: t.inkSoft),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: t.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: t.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Palette.orange, width: 1.6),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Palette.coral, width: 1.4),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Palette.coral, width: 1.8),
      ),
      labelStyle: TextStyle(color: t.inkSoft),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xFF35302B) : Palette.ink,
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontSize: 13.5,
        fontWeight: FontWeight.w500,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
    chipTheme: baseChipTheme(dark: dark),
    dividerTheme: DividerThemeData(color: t.border, thickness: 1),
    textTheme: _textTheme(dark: dark),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: Palette.orange,
      selectionColor: Color(0x33FF8A00),
    ),
    datePickerTheme: DatePickerThemeData(
      backgroundColor: dark ? Palette.darkCard : Palette.white,
      surfaceTintColor: Colors.transparent,
      headerForegroundColor: Palette.ink,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: dark ? Palette.darkCard : Palette.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
    ),
  );
  return base;
}

ChipThemeData baseChipTheme({required bool dark}) {
  return ChipThemeData(
    backgroundColor: dark ? Palette.darkCard : Palette.cream,
    selectedColor: Palette.orangePastel,
    side: BorderSide(color: dark ? Palette.darkBorder : Palette.border),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    labelStyle: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
  );
}

TextTheme _textTheme({required bool dark}) {
  final ink = dark ? Palette.darkInk : Palette.ink;
  final soft = dark ? Palette.darkInkSoft : Palette.inkSoft;
  return TextTheme(
    headlineLarge: TextStyle(
      fontSize: 30,
      fontWeight: FontWeight.w800,
      color: ink,
      height: 1.15,
    ),
    headlineMedium: TextStyle(
      fontSize: 24,
      fontWeight: FontWeight.w800,
      color: ink,
      height: 1.2,
    ),
    titleLarge: TextStyle(fontSize: 19, fontWeight: FontWeight.w700, color: ink),
    titleMedium: TextStyle(
      fontSize: 15.5,
      fontWeight: FontWeight.w700,
      color: ink,
    ),
    titleSmall: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: ink),
    bodyLarge: TextStyle(fontSize: 15, color: ink),
    bodyMedium: TextStyle(fontSize: 13.5, color: ink),
    bodySmall: TextStyle(fontSize: 12, color: soft),
    labelLarge: TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: ink,
    ),
    labelSmall: TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w600,
      color: soft,
      letterSpacing: 0.3,
    ),
  ).apply(bodyColor: ink, displayColor: ink);
}
