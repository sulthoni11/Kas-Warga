import { Link, NavLink } from 'react-router-dom';
import { Brand } from './Brand.jsx';

const nav = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/s', label: 'Portal warga' },
  { to: '/bayar', label: 'Cara bayar' },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Brand />
        <nav className="ml-6 hidden items-center gap-1 sm:flex" aria-label="Utama">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-[13px] font-semibold transition-base ${
                  isActive
                    ? 'bg-brandPastel text-ink'
                    : 'text-muted hover:bg-white/70 hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Link
          to="/s"
          className="ml-auto rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white transition-base hover:bg-brand"
        >
          Buka portal
        </Link>
      </div>
    </header>
  );
}
