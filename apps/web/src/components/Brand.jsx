import { Link } from 'react-router-dom';

export function BrandMark({ size = 36, className = '' }) {
  return (
    <img
      src="/favicon.svg"
      alt=""
      width={size}
      height={size}
      className={`rounded-xl shadow-lift ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function Brand({ to = '/', light = false }) {
  return (
    <Link to={to} className="flex items-center gap-2.5">
      <BrandMark />
      <span
        className={`text-[15px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}
      >
        KasWarga
      </span>
    </Link>
  );
}
