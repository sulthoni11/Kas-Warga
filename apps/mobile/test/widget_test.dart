import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kaswarga_mobile/theme.dart';
import 'package:kaswarga_mobile/widgets.dart';

void main() {
  group('formatRp', () {
    test('format rupiah gaya Indonesia', () {
      expect(formatRp(1250000), 'Rp 1.250.000');
      expect(formatRp(0), 'Rp 0');
      expect(formatRp(-5000), '- Rp 5.000');
      expect(formatRp(950), 'Rp 950');
    });
  });

  group('formatDateSimple', () {
    test('mengubah yyyy-MM-dd ke format Indonesia', () {
      expect(formatDateSimple('2026-11-12'), '12 Nov 2026');
      expect(formatDateSimple('2026-02-01'), '1 Feb 2026');
      expect(formatDateSimple('teks-lain'), 'teks-lain');
    });
  });

  group('CountUp', () {
    testWidgets('menampilkan nilai akhir dan terformat rupiah',
        (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: buildAppTheme(Brightness.light),
          home: const Scaffold(body: CountUp(1250000, key: Key('n'))),
        ),
      );
      // animasi selesai: dorong beberapa frame + microtask
      await tester.pumpAndSettle();
      expect(find.text('Rp 1.250.000'), findsOneWidget);
    });
  });

  group('StatusBadge & IosCard', () {
    testWidgets('badge menampilkan teks', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
              body: StatusBadge(text: 'LUNAS', bg: Color(0xFFDFF6EA), fg: Color(0xFF2E9E67))),
        ),
      );
      expect(find.text('LUNAS'), findsOneWidget);
    });

    testWidgets('IosCard memprotap ketuk', (tester) async {
      var tapped = false;
      await tester.pumpWidget(MaterialApp(
        theme: buildAppTheme(Brightness.light),
        home: Scaffold(
          body: IosCard(
            onTap: () => tapped = true,
            child: const Text('ketuk saya'),
          ),
        ),
      ));
      await tester.tap(find.text('ketuk saya'));
      expect(tapped, isTrue);
    });
  });
}
