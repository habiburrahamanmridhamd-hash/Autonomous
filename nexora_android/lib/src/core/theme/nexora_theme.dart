import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NexoraColors {
  static const Color bgDark = Color(0xFF080B14);
  static const Color surfaceDark = Color(0xFF10182A);
  static const Color purple = Color(0xFF8B5CF6);
  static const Color electricBlue = Color(0xFF38BDF8);
  static const Color offWhite = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color mutedSlate = Color(0xFF64748B);

  static const LinearGradient brandGradient = LinearGradient(
    colors: [electricBlue, purple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

class NexoraTheme {
  static ThemeData get darkTheme {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: NexoraColors.bgDark,
      colorScheme: const ColorScheme.dark(
        primary: NexoraColors.purple,
        secondary: NexoraColors.electricBlue,
        surface: NexoraColors.surfaceDark,
        onPrimary: NexoraColors.offWhite,
        onSecondary: NexoraColors.bgDark,
        onSurface: NexoraColors.offWhite,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: NexoraColors.offWhite,
        displayColor: NexoraColors.offWhite,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }

  static ThemeData get lightTheme {
    final base = ThemeData.light(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: NexoraColors.offWhite,
      colorScheme: const ColorScheme.light(
        primary: NexoraColors.purple,
        secondary: NexoraColors.electricBlue,
        surface: NexoraColors.lightSurface,
        onPrimary: NexoraColors.offWhite,
        onSecondary: NexoraColors.bgDark,
        onSurface: NexoraColors.bgDark,
      ),
      textTheme: GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
        bodyColor: NexoraColors.bgDark,
        displayColor: NexoraColors.bgDark,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}
