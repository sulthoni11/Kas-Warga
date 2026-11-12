import { Link } from 'react-router-dom';
import { Brand } from './Brand.jsx';

export default function SiteFooter() {
  return (
    <footer className="mt-16 bg-ink text-white/70">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Brand light />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed">
            Kas RT/RW tercatat di buku besar berantai hash. Pengurus mencatat dari aplikasi
            Android, warga memeriksa lewat satu tautan.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">
            Warga
          </p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>
              <Link className="transition-base hover:text-white" to="/s">
                Buka portal warga
              </Link>
            </li>
            <li>
              <Link className="transition-base hover:text-white" to="/bayar">
                Cara membayar
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/40">
            Pengurus
          </p>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>Aplikasi Android KasWarga</li>
            <li className="text-white/45">Pencatatan setoran &amp; koreksi</li>
            <li className="text-white/45">Pembuatan tautan portal</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-[12px] text-white/45 sm:px-6">
          <span>© 2026 KasWarga · R2 09 Dukuh Tlobong</span>
          <span>Hash SHA-256 · Data tidak bisa dihapus diam-diam</span>
        </div>
      </div>
    </footer>
  );
}
