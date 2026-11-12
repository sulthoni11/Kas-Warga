export function Card({ className = '', soft = false, as: Tag = 'article', children, ...rest }) {
  return (
    <Tag
      className={`rounded-card border border-line bg-white ${
        soft ? 'shadow-soft' : 'shadow-[0_1px_0_rgba(42,38,33,0.03)]'
      } transition-base ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({ eyebrow, title, lead, className = '' }) {
  return (
    <div className={`max-w-2xl ${className}`}>
      {eyebrow && (
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 text-[24px] font-extrabold leading-tight text-ink sm:text-[28px]">
        {title}
      </h2>
      {lead && <p className="mt-2 text-[14px] leading-relaxed text-muted sm:text-[15px]">{lead}</p>}
    </div>
  );
}

export function Badge({ children, tone = 'cream', className = '' }) {
  const tones = {
    cream: 'border-line bg-white text-muted',
    brand: 'border-transparent bg-brandPastel text-ink',
    dark: 'border-transparent bg-ink text-white',
    mint: 'border-transparent bg-[#DFF6EA] text-[#1F7A4F]',
    coral: 'border-transparent bg-[#FFECEC] text-[#B53434]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold ${
        tones[tone] ?? tones.cream
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Tick({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}
