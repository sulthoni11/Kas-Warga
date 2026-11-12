import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';
import 'portal.dart';
import 'shell.dart';

/// Pencabang utama: splash → login → shell.
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    if (auth.restoring) return const SplashPage();
    if (!auth.authenticated) return const LoginPage();
    return const HomeShell();
  }
}

/// Splash dengan logo beranimasi.
class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    context.read<AuthState>().restore();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.6, end: 1),
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeOutBack,
          builder: (context, scale, _) => Transform.scale(
            scale: scale,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const _LogoBadge(size: 92),
                const SizedBox(height: 18),
                Text(
                  'KasWarga',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 6),
                Text('Kas RW/RT · terang & terlacak',
                    style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: 26),
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.6,
                    valueColor:
                        AlwaysStoppedAnimation(Palette.orange),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Logo generik: lingkaran gradien dengan ikon dompet.
class _LogoBadge extends StatelessWidget {
  const _LogoBadge({required this.size});
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(size * 0.29),
        color: Palette.orange,
        boxShadow: [
          BoxShadow(
            color: Palette.orange.withValues(alpha: 0.28),
            blurRadius: 26,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Icon(Icons.savings_rounded,
          color: Palette.white, size: size * 0.46),
    );
  }
}

/// Halaman login bergaya iOS dengan pengaturan URL server di bagian bawah.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _base =
      TextEditingController(text: ApiClient.defaultBase);
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _obscure = true;
  bool _advanced = false;
  String? _message;

  @override
  void dispose() {
    _base.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Terjemahkan kode API ke pesan bahasa Indonesia.
  String _humanError(Object error) {
    if (error is! ApiException) {
      return 'Tidak dapat terhubung ke server. Periksa URL dan jaringan.';
    }
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Email atau password salah.';
      case 'ACCOUNT_LOCKED':
        return 'Akun terkunci sebentar, coba lagi beberapa menit.';
      case 'INVALID_JSON':
        return 'Server menolak data kiriman. Hapus dan ulang install aplikasi, atau periksa alamat API.';
      case 'VALIDATION_ERROR':
        return 'Isian tidak sesuai format (contoh: tanpa @ di email).';
      default:
        return 'Login gagal (${error.code}).';
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await context.read<AuthState>().login(
            base: _base.text,
            email: _email.text,
            password: _password.text,
          );
      _message = null;
      // RootGate otomatis pindah ke shell saat authenticated berubah.
      if (!mounted) return;
      setState(() => _busy = false);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _message = _humanError(error);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Center(
          heightFactor: 0.95,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 26),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
                  const _LogoBadge(size: 68),
                  const SizedBox(height: 16),
                  Text(
                    'Masuk Pengurus',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Kelola kas RW/RT Anda dari ponsel',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 26),
                  IosCard(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autofillHints: const [AutofillHints.email],
                          decoration: const InputDecoration(
                            prefixIcon: Icon(Icons.alternate_email_rounded,
                                color: Palette.inkSoft, size: 19),
                            hintText: 'email@rw.id',
                          ),
                          validator: (value) =>
                              (value ?? '').trim().isEmpty
                                  ? 'Email wajib diisi'
                                  : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _password,
                          obscureText: _obscure,
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.lock_rounded,
                                color: Palette.inkSoft, size: 19),
                            hintText: 'Password',
                            suffixIcon: IconButton(
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_off_rounded
                                    : Icons.visibility_rounded,
                                size: 19,
                                color: Palette.inkSoft,
                              ),
                            ),
                          ),
                          validator: (value) =>
                              (value ?? '').isEmpty
                                  ? 'Password wajib diisi'
                                  : null,
                        ),
                        const SizedBox(height: 18),
                        GradientButton(
                          label: 'Masuk',
                          busy: _busy,
                          onPressed: _submit,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton.icon(
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute<void>(
                          builder: (_) => const PortalPage()),
                    ),
                    icon: const Icon(Icons.public_rounded, size: 18),
                    label: const Text('Buka portal warga (tanpa login)'),
                    style: TextButton.styleFrom(
                      foregroundColor: Palette.orangeDeep,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Align(
                    alignment: Alignment.center,
                    child: TextButton(
                      onPressed: () =>
                          setState(() => _advanced = !_advanced),
                      style: TextButton.styleFrom(
                        foregroundColor: Palette.inkSoft,
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      child: Text(
                        _advanced
                            ? 'Sembunyikan pengaturan lanjutan'
                            : 'Pengaturan lanjutan',
                      ),
                    ),
                  ),
                  if (_advanced) ...[
                    const SizedBox(height: 6),
                    TextFormField(
                      controller: _base,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'Alamat API server',
                        prefixIcon: Icon(Icons.dns_rounded,
                            size: 19, color: Palette.inkSoft),
                        helperText:
                            'Emulator: default otomatis. HP fisik: alamat IP LAN, contoh http://192.168.1.9:4000',
                        helperMaxLines: 2,
                      ),
                    ),
                  ],
                  if (_message != null) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: Palette.coralPastel,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_rounded,
                              color: Palette.coralDeep, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _message!,
                              style: const TextStyle(
                                fontSize: 13,
                                color: Palette.coralDeep,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
