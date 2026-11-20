import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/nexora_theme.dart';

class FloatingGlassNav extends StatelessWidget {
  final int currentIndex;
  const FloatingGlassNav({super.key, required this.currentIndex});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = [
      (Icons.home_rounded, 'HOME', '/home'),
      (Icons.play_circle_fill_rounded, 'REELS', '/reels'),
      (Icons.add_circle_rounded, 'CREATE', '/create-post'),
      (Icons.chat_bubble_rounded, 'MESSAGES', '/messages'),
      (Icons.person_rounded, 'PROFILE', '/profile'),
    ];

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
            child: Container(
              height: 68,
              decoration: BoxDecoration(
                color: (isDark ? NexoraColors.surfaceDark : Colors.white)
                    .withOpacity(isDark ? 0.82 : 0.88),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withOpacity(0.14)
                      : NexoraColors.bgDark.withOpacity(0.08),
                ),
                boxShadow: [
                  BoxShadow(
                    color: NexoraColors.purple.withOpacity(0.18),
                    blurRadius: 28,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(items.length, (i) {
                  final (icon, label, route) = items[i];
                  final active = currentIndex == i;
                  final isCreate = i == 2;
                  return InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => context.go(route),
                    child: SizedBox(
                      width: 60,
                      height: 54,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: EdgeInsets.all(isCreate ? 8 : 4),
                            decoration: isCreate
                                ? const BoxDecoration(
                                    gradient: NexoraColors.brandGradient,
                                    shape: BoxShape.circle,
                                  )
                                : null,
                            child: Icon(
                              icon,
                              size: isCreate ? 24 : 22,
                              color: isCreate
                                  ? Colors.white
                                  : active
                                      ? NexoraColors.electricBlue
                                      : (isDark ? Colors.white60 : Colors.black54),
                            ),
                          ),
                          if (!isCreate)
                            Text(
                              label,
                              style: TextStyle(
                                fontSize: 9.5,
                                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                                color: active
                                    ? NexoraColors.electricBlue
                                    : (isDark ? Colors.white60 : Colors.black54),
                              ),
                            ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
