import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_colors.dart';

/// Tema Wipli (adaptado del diseño "Wipli App Mobile"). Claro + oscuro, marca
/// lima + ink, tipografía **Sora** y formas tipo *pill* (radios grandes).
class AppTheme {
  const AppTheme._();

  static ThemeData get dark => _build(Brightness.dark, WipliColors.dark);

  static ThemeData get light => _build(Brightness.light, WipliColors.light);

  static ThemeData _build(Brightness brightness, WipliColors colors) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: AppColors.lime,
      onPrimary: AppColors.ink,
      secondary: AppColors.lime,
      onSecondary: AppColors.ink,
      surface: colors.surface,
      onSurface: colors.textPrimary,
      error: AppColors.danger,
      onError: AppColors.ink,
    );

    final baseTextTheme =
        (brightness == Brightness.dark ? ThemeData.dark() : ThemeData.light()).textTheme;
    final textTheme = GoogleFonts.soraTextTheme(baseTextTheme).apply(
      bodyColor: colors.textPrimary,
      displayColor: colors.textPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.background,
      canvasColor: colors.background,
      fontFamily: GoogleFonts.sora().fontFamily,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: colors.background,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.sora(
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceAlt,
        hintStyle: TextStyle(color: colors.textMuted),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: colors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.lime, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.lime,
          foregroundColor: AppColors.ink,
          disabledBackgroundColor: colors.surfaceAlt,
          disabledForegroundColor: colors.textMuted,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: GoogleFonts.sora(fontWeight: FontWeight.w700, fontSize: 15),
          // Forma "pill" del diseño.
          shape: const StadiumBorder(),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.border),
          padding: const EdgeInsets.symmetric(vertical: 16),
          textStyle: GoogleFonts.sora(fontWeight: FontWeight.w600, fontSize: 15),
          shape: const StadiumBorder(),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        side: BorderSide(color: colors.border),
      ),
      dividerTheme: DividerThemeData(color: colors.border, space: 1),
      navigationBarTheme: NavigationBarThemeData(
        labelTextStyle: WidgetStatePropertyAll(
          GoogleFonts.sora(fontSize: 11, fontWeight: FontWeight.w600),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: colors.surfaceAlt,
        contentTextStyle: TextStyle(color: colors.textPrimary),
        behavior: SnackBarBehavior.floating,
      ),
      extensions: <ThemeExtension<dynamic>>[colors],
    );
  }
}
