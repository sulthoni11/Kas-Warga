import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Dropdown dengan kotak pencarian di dalamnya.
 * Dipakai untuk memilih anggota dan paket supaya tetap enak dipakai
 * walaupun datanya ratusan.
 */
export default function SearchSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyLabel = 'Tidak ada pilihan',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef(null);

  const selected = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => String(option.label).toLowerCase().includes(needle));
  }, [options, query]);

  return (
    <div ref={boxRef} className="relative">
      {label && <p className="text-[11px] font-medium text-sage-500">{label}</p>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-sage-300 bg-white px-3 py-2 text-left text-xs text-sage-900 disabled:opacity-50"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span aria-hidden="true" className="text-sage-500">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-sage-100 bg-white shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-sage-100 px-2 py-1.5 text-xs outline-none focus:border-sage-500"
            />
          </div>
          <ul className="max-h-56 overflow-auto pb-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-sage-500">{emptyLabel}</li>
            )}
            {filtered.map((option) => (
              <li key={String(option.value)}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-sage-50 ${
                    String(option.value) === String(value) ? 'bg-sage-100 font-medium' : ''
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint && <span className="shrink-0 text-sage-500">{option.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
