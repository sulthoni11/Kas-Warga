import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'api_client.dart';
import 'pages/root.dart';
import 'state.dart';
import 'theme.dart';

void main() {
  runApp(const KaswargaApp());
}

class KaswargaApp extends StatelessWidget {
  const KaswargaApp({super.key});

  @override
  Widget build(BuildContext context) {
    final api = ApiClient();
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider(
          create: (context) => AuthState(api)..restore(),
        ),
        ChangeNotifierProvider(
          create: (context) =>
              SummaryState(api, context.read<AuthState>()),
        ),
        ChangeNotifierProvider(
          create: (context) =>
              AnalyticsState(api, context.read<AuthState>()),
        ),
        ChangeNotifierProvider(
          create: (context) =>
              RemindersState(api, context.read<AuthState>()),
        ),
      ],
      child: MaterialApp(
        title: 'KasWarga',
        debugShowCheckedModeBanner: false,
        themeMode: ThemeMode.system,
        theme: buildAppTheme(Brightness.light),
        darkTheme: buildAppTheme(Brightness.dark),
        home: const RootGate(),
      ),
    );
  }
}
