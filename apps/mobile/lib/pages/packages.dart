// ignore_for_file: use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Daftar paket + tambah/hapus (hanya paket tanpa setoran terkonfirmasi).
class PackagesPage extends StatefulWidget {
  const PackagesPage({super.key});

  @override
  State<PackagesPage> createState() => _PackagesPageState();
}

class _PackagesPageState extends State<PackagesPage> {
  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final summary = context.read<SummaryState>();
      await summary.refresh(silent: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final summary = context.watch<SummaryState>();
    final packages = (summary.summary?['packages'] as List<dynamic>? ?? const [])
        .cast<Map<String, dynamic>>();

    return Scaffold(
      appBar: AppBar(title: const Text('Paket')),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Palette.orange,
        foregroundColor: Palette.white,
        elevation: 0,
        heroTag: 'pkg-fab',
        onPressed: _showCreateSheet,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Paket'),
      ),
      body: RefreshIndicator(
        color: Palette.orange,
        onRefresh: () => context.read<SummaryState>().refresh(silent: true),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 110),
          children: [
            if (summary.loading && summary.summary == null)
              const ShimmerBox(height: 96, radius: 22)
            else if (packages.isEmpty)
              const EmptyState(
                title: 'Belum ada paket',
                subtitle: 'Tambah paket program kas untuk mulai mencatat cicilan',
                icon: Icons.category_outlined,
              )
            else
              for (final (i, pkg) in packages.indexed)
                StaggeredAnimator(
                  index: i,
                  baseDelay: const Duration(milliseconds: 30),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _PackageCard(pkg: pkg, onDelete: _confirmDelete),
                  ),
                ),
          ],
        ),
      ),
    );
  }

  void _showCreateSheet() {
    showIosSheet<void>(context, const _CreatePackageForm());
  }

  Future<void> _confirmDelete(Map<String, dynamic> pkg) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus paket?'),
        content: Text(
            'Hanya paket yang belum punya setoran terkonfirmasi yang boleh dihapus.\n\n${pkg['name']}'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Palette.coralDeep),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      final api = context.read<ApiClient>();
      await api.delete('/api/admin/packages/${(pkg['id'] as num).toInt()}');
      if (mounted) {
        toast(context, 'Paket "${pkg['name']}" dihapus.');
        await context.read<SummaryState>().refresh(silent: true);
      }
    } on ApiException catch (e) {
      if (mounted) {
        toast(context,
            e.code == 'PACKAGE_HAS_DEPOSITS'
                ? 'Paket sudah punya setoran — tidak bisa dihapus.'
                : 'Hapus gagal (${e.code}).');
      }
    }
  }
}

class _PackageCard extends StatelessWidget {
  const _PackageCard({required this.pkg, required this.onDelete});
  final Map<String, dynamic> pkg;
  final Future<void> Function(Map<String, dynamic>) onDelete;

  @override
  Widget build(BuildContext context) {
    final collected = ((pkg['collected'] ?? 0) as num).toInt();
    final target = ((pkg['targetAmount'] ?? 0) as num).toInt();
    final pct = target > 0 ? collected / target : 0.0;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return IosCard(
      radius: 18,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${pkg['name'] ?? ''}',
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 3),
                    Text(
                      'target ${formatRp(target)} · tempo ${formatDateSimple('${pkg['dueDate'] ?? ''}')} · ${_frequencyLabel('${pkg['frequency'] ?? ''}')}',
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: 'Hapus paket',
                onPressed: () => onDelete(pkg),
                style: IconButton.styleFrom(
                  backgroundColor: dark ? Palette.darkBg : Palette.coralPastel,
                  foregroundColor: Palette.coralDeep,
                ),
                icon: const Icon(Icons.delete_outline_rounded, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 10),
          SoftProgress(value: pct),
          const SizedBox(height: 6),
          Text(
            '${formatRp(collected)} terkumpul · ${(pct * 100).round()}%',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    );
  }

  String _frequencyLabel(String raw) => switch (raw) {
        'DAILY' => 'harian',
        'MONTHLY' => 'bulanan',
        _ => 'mingguan',
      };
}

class _CreatePackageForm extends StatefulWidget {
  const _CreatePackageForm();

  @override
  State<_CreatePackageForm> createState() => _CreatePackageFormState();
}

class _CreatePackageFormState extends State<_CreatePackageForm> {
  final _name = TextEditingController();
  final _amount = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  DateTime _due = DateTime.now().add(const Duration(days: 90));
  String _frequency = 'WEEKLY';
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _pickDueDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _due,
      firstDate: DateTime.now().add(const Duration(days: 1)),
      lastDate: DateTime.now().add(const Duration(days: 3 * 365)),
      helpText: 'Tanggal jatuh tempo paket',
    );
    if (picked != null) {
      setState(() {
        _due = picked;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final community = context.read<AuthState>().community;
    setState(() => _busy = true);
    try {
      final amount = int.tryParse(onlyDigits(_amount.text)) ?? 0;
      final api = context.read<ApiClient>();
      final res = await api.post(
        '/api/admin/communities/${community!.id}/packages',
        body: {
          'name': _name.text.trim(),
          'targetAmount': amount,
          'dueDate': _formatDate(_due),
          'frequency': _frequency,
        },
      );
      if (!mounted) return;
      toast(context,
          'Paket dibuat: ${res['enrolledMembers']} anggota otomatis terdaftar.');
      await context.read<SummaryState>().refresh(silent: true);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _busy = false);
      if (!mounted) return;
      toast(context, switch (e.code) {
        'DUE_DATE_IN_PAST' => 'Tanggal jatuh tempo harus masih di depan.',
        'VALIDATION_ERROR' => 'Periksa isian paket (nama/nominal/tanggal).',
        _ => 'Gagal membuat paket (${e.code}).',
      });
    }
  }

  String _formatDate(DateTime d) {
    final mm = d.month.toString().padLeft(2, '0');
    final dd = d.day.toString().padLeft(2, '0');
    return '${d.year}-$mm-$dd';
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
              child: Text('Paket Baru',
                  style: Theme.of(context).textTheme.titleLarge)),
          const SizedBox(height: 20),
          TextFormField(
            controller: _name,
            textInputAction: TextInputAction.next,
            maxLength: 120,
            decoration: const InputDecoration(hintText: 'Nama, mis. Renovasi Mushola'),
            validator: (value) =>
                ((value ?? '').trim().length) < 2 ? 'Nama minimal 2 karakter' : null,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _amount,
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              prefixText: 'Rp ',
              prefixStyle: const TextStyle(
                  fontWeight: FontWeight.w700, color: Palette.orangeDeep),
              hintText: 'Target nominal',
              suffixText: onlyDigits(_amount.text).isEmpty
                  ? null
                  : formatRp(onlyDigits(_amount.text)),
            ),
            validator: (value) {
              final amount = int.tryParse(onlyDigits(value ?? '')) ?? 0;
              return amount <= 0 ? 'Nominal harus lebih dari 0' : null;
            },
          ),
          const SizedBox(height: 16),
          Text('Frekuensi cicilan',
              style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          IosSegmented(
            value: _frequency,
            items: const {'WEEKLY': 'Mingguan', 'MONTHLY': 'Bulanan', 'DAILY': 'Harian'},
            onChanged: (value) => setState(() => _frequency = value),
          ),
          const SizedBox(height: 16),
          Text('Jatuh tempo', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _pickDueDate,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 15, vertical: 15),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.dark
                    ? Palette.darkFill
                    : Palette.cream,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.event_rounded,
                      size: 19, color: Palette.orangeDeep),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      formatDateTimeSimple(_formatDate(_due)),
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                  ),
                  Icon(Icons.expand_more_rounded,
                      color: Theme.of(context).textTheme.bodySmall?.color,
                      size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 22),
          Text(
            'Semua anggota aktif otomatis ikut paket ini beserta jadwal cicilannya.',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 12),
          GradientButton(
            label: 'Buat Paket',
            icon: Icons.post_add_rounded,
            busy: _busy,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
