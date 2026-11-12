// ignore_for_file: use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../api_client.dart';
import '../state.dart';
import '../theme.dart';
import '../widgets.dart';

/// Sheet pencatatan setoran: pilih anggota, paket (opsional), nominal, metode.
Future<void> showDepositSheet(BuildContext context, {int? initialPackageId}) {
  return showIosSheet<void>(
    context,
    _DepositSheet(initialPackageId: initialPackageId),
  );
}

/// Sheet koreksi jumlah setoran (akibat salah entri): butuh alasan >=10 karakter.
Future<void> showCorrectionSheet(
    BuildContext context, Map<String, dynamic> entry) {
  return showIosSheet<void>(context, _CorrectionSheet(entry: entry));
}

class _DepositSheet extends StatefulWidget {
  const _DepositSheet({this.initialPackageId});
  final int? initialPackageId;

  @override
  State<_DepositSheet> createState() => _DepositSheetState();
}

class _DepositSheetState extends State<_DepositSheet> {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  Map<String, dynamic>? _member;
  Map<String, dynamic>? _package;
  String _method = 'CASH';
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      final summaries = context.read<SummaryState>();
      if (summaries.summary == null) {
        await summaries.refresh(silent: true);
      }
      if (!mounted) return;
      final packages = (summaries.summary?['packages'] as List<dynamic>?
              ?? const [])
          .cast<Map<String, dynamic>>();
      if (widget.initialPackageId != null) {
        for (final pkg in packages) {
          if ((pkg['id'] as num).toInt() == widget.initialPackageId) {
            setState(() => _package = pkg);
            break;
          }
        }
      }
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  int? get _parsedAmount {
    final digits = onlyDigits(_amount.text);
    return digits.isEmpty ? null : int.tryParse(digits);
  }

  Future<void> _pickMember() async {
    final members =
        (context.read<SummaryState>().summary?['members'] as List<dynamic>? ??
                const [])
            .cast<Map<String, dynamic>>();
    final picked =
        await showIosSheet<Map<String, dynamic>>(context, _MemberPicker(
      members: members,
    ));
    if (picked != null && mounted) {
      setState(() => _member = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final community = context.read<AuthState>().community;
    setState(() => _busy = true);
    try {
      await context.read<ApiClient>().post('/api/admin/deposits', body: {
        'communityId': community!.id,
        'memberId': (_member!['id'] as num).toInt(),
        if (_package != null) 'packageId': (_package!['id'] as num).toInt(),
        'amount': _parsedAmount,
        'method': _method,
        'idempotencyKey': newIdempotencyKey(),
        if (_note.text.trim().isNotEmpty) 'note': _note.text.trim(),
      });
      if (!mounted) return;
      toast(context, 'Setoran ${formatRp(_parsedAmount)} tercatat; cicilan tertua ikut diperbarui.');
      if (mounted) {
        await context.read<SummaryState>().refresh(silent: true);
      }
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _busy = false);
      if (!mounted) return;
      final reason = switch (e.code) {
        'PACKAGE_NOT_FOUND' => 'Paket tidak ditemukan di komunitas ini.',
        'PACKAGE_NOT_ENROLLED' => 'Anggota belum terdaftar di paket terpilih.',
        'MEMBER_NOT_FOUND' => 'Anggota tidak ditemukan.',
        _ => 'Gagal menyimpan (${e.code}).',
      };
      toast(context, reason);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
              child: Text('Setoran Baru',
                  style: Theme.of(context).textTheme.titleLarge)),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: Text('Anggota',
                    style: Theme.of(context).textTheme.labelLarge),
              ),
              if (_member != null)
                GestureDetector(
                  onTap: () => setState(() => _member = null),
                  child: const Text(
                    'Reset',
                    style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: Palette.coralDeep),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: _pickMember,
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
                  Expanded(
                    child: Text(
                      _member?['name'] as String? ?? 'Pilih anggota…',
                      style: TextStyle(
                        color: _member == null
                            ? Palette.inkSoft
                            : Theme.of(context).textTheme.bodyMedium?.color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Icon(Icons.expand_more_rounded,
                      color: Palette.inkSoft, size: 20),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Paket', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _pkgChip(null, 'Semua paket (cicilan tertua dulu)'),
              for (final pkg in
                  (context.watch<SummaryState>().summary?['packages']
                          as List<dynamic>? ??
                      const []))
                _pkgChip(pkg['id'], '${pkg['name'] ?? ''}'),
            ],
          ),
          const SizedBox(height: 16),
          Text('Nominal', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          TextFormField(
            controller: _amount,
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(
              prefixText: 'Rp ',
              prefixStyle: const TextStyle(
                  fontWeight: FontWeight.w700, color: Palette.orangeDeep),
              hintText: '0',
              suffixText: onlyDigits(_amount.text).isEmpty
                  ? null
                  : formatRp(onlyDigits(_amount.text)),
            ),
            validator: (_) =>
                (_parsedAmount ?? 0) <= 0 ? 'Nominal harus lebih dari 0' : null,
          ),
          const SizedBox(height: 16),
          Text('Metode', style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 8),
          IosSegmented(
            value: _method,
            items: const {
              'CASH': 'Tunai',
              'TRANSFER': 'Transfer',
              'GATEWAY': 'Gateway',
            },
            onChanged: (value) => setState(() => _method = value),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _note,
            maxLength: 255,
            decoration: const InputDecoration(hintText: 'Catatan (opsional)'),
          ),
          const SizedBox(height: 22),
          GradientButton(
            label: 'Simpan Setoran',
            icon: Icons.payments_rounded,
            busy: _busy,
            onPressed: _member == null
                ? null
                : () {
                    if (_formKey.currentState!.validate()) _submit();
                  },
          ),
        ],
      ),
    );
  }

  Widget _pkgChip(Object? id, String label) {
    final selected = _package == null
        ? id == null
        : id != null &&
            (id as num).toInt() == (_package!['id'] as num).toInt();
    return GestureDetector(
      onTap: () {
        if (id == null) {
          setState(() => _package = null);
          return;
        }
        final packages =
            (context.read<SummaryState>().summary?['packages'] as List<dynamic>? ??
                    const [])
                .cast<Map<String, dynamic>>();
        final wanted = (id as num).toInt();
        for (final pkg in packages) {
          if ((pkg['id'] as num).toInt() == wanted) {
            setState(() => _package = pkg);
            break;
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: selected
              ? Palette.orangePastel
              : (Theme.of(context).brightness == Brightness.dark
                  ? Palette.darkFill
                  : Palette.cream),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: selected
                ? Palette.orangeDeep
                : Theme.of(context).textTheme.bodySmall?.color,
          ),
        ),
      ),
    );
  }
}

class _MemberPicker extends StatefulWidget {
  const _MemberPicker({required this.members});
  final List<Map<String, dynamic>> members;

  @override
  State<_MemberPicker> createState() => _MemberPickerState();
}

class _MemberPickerState extends State<_MemberPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.trim().toLowerCase();
    final filtered = widget.members.where((member) {
      final name = '${member['name'] ?? ''}'.toLowerCase();
      final rt = '${member['rt'] ?? ''}';
      return q.isEmpty || name.contains(q) || rt.contains(q);
    }).toList();

    return Column(
      children: [
        Center(
            child: Text('Pilih Anggota',
                style: Theme.of(context).textTheme.titleLarge)),
        const SizedBox(height: 14),
        TextField(
          onChanged: (value) => setState(() => _query = value),
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search_rounded, size: 20),
            hintText: 'Cari nama / RT…',
          ),
        ),
        const SizedBox(height: 12),
        if (filtered.isEmpty)
          const Padding(
            padding: EdgeInsets.all(18),
            child: Text('Tidak ada anggota yang cocok.'),
          ),
        for (final (i, member) in filtered.take(60).indexed)
          StaggeredAnimator(
            index: i,
            child: ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                backgroundColor: Palette.orangePastel,
                child: Text(
                  ('${member['name'] ?? '?'}'.isNotEmpty)
                      ? '${member['name']!}'[0].toUpperCase()
                      : '?',
                  style: const TextStyle(
                      color: Palette.orangeDeep, fontWeight: FontWeight.w800),
                ),
              ),
              title: Text('${member['name'] ?? ''}',
                  style: Theme.of(context).textTheme.titleSmall),
              subtitle: Text(
                member['rt'] != null ? 'RT ${member['rt']}' : 'RT —',
                style: Theme.of(context).textTheme.bodySmall,
              ),
              onTap: () => Navigator.of(context).pop(member),
            ),
          ),
      ],
    );
  }
}

class _CorrectionSheet extends StatefulWidget {
  const _CorrectionSheet({required this.entry});
  final Map<String, dynamic> entry;

  @override
  State<_CorrectionSheet> createState() => _CorrectionSheetState();
}

class _CorrectionSheetState extends State<_CorrectionSheet> {
  late final int depositId = (widget.entry['refId'] as num).toInt();
  late final int original = ((widget.entry['amount'] ?? 0) as num).toInt();
  final _corrected = TextEditingController();
  final _reason = TextEditingController();
  bool _busy = false;

  int? get _parsedCorrected {
    final digits = onlyDigits(_corrected.text);
    return digits.isEmpty ? null : int.tryParse(digits);
  }

  @override
  void dispose() {
    _corrected.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _busy = true);
    try {
      final api = context.read<ApiClient>();
      final result = await api.post('/api/admin/deposits/$depositId/correct',
          body: {
            'correctedAmount': _parsedCorrected,
            'reason': _reason.text.trim(),
          });
      if (!mounted) return;
      toast(context,
          'Koreksi tersimpan: void #${result['voidEntry']?['seq'] ?? '?'} lalu setoran baru dicatat.');
      await context.read<SummaryState>().refresh(silent: true);
      if (mounted) Navigator.of(context).pop();
    } on ApiException catch (e) {
      setState(() => _busy = false);
      if (!mounted) return;
      toast(context, 'Koreksi gagal (${e.code}).');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(
            child: Text('Koreksi Setoran',
                style: Theme.of(context).textTheme.titleLarge)),
        const SizedBox(height: 8),
        Center(
          child: Text(
            'Setoran #${widget.entry['refId']}${widget.entry['memberName'] != null ? ' · ${widget.entry['memberName']}' : ''} · nominal lama ${formatRp(original)}',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 20),
        TextFormField(
          controller: _corrected,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            prefixText: 'Rp ',
            prefixStyle: TextStyle(
                fontWeight: FontWeight.w700, color: Palette.orangeDeep),
            hintText: 'Nominal yang benar',
          ),
          validator: (_) =>
              (_parsedCorrected ?? 0) <= 0 ? 'Nominal harus lebih dari 0' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _reason,
          minLines: 2,
          maxLines: 4,
          maxLength: 255,
          decoration: const InputDecoration(
            hintText: 'Alasan koreksi (min. 10 karakter)',
          ),
          validator: (value) => ((value ?? '').trim().length) < 10
              ? 'Alasan minimal 10 karakter'
              : null,
        ),
        const SizedBox(height: 22),
        GradientButton(
          label: 'Simpan Koreksi',
          icon: Icons.rule_rounded,
          busy: _busy,
          onPressed: () {
            if (_corrected.text.isEmpty) return;
            if (_parsedCorrected != null && _reason.text.trim().length >= 10) {
              _submit();
            }
          },
        ),
      ],
    );
  }
}
