export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-rose via-plum to-surface shadow-2xl shadow-rose/30">
        <svg viewBox="0 0 24 24" className="h-10 w-10 animate-beat fill-white">
          <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2.3 4.5 6.2 4.5c2.2 0 3.8 1.3 4.6 2.6.2.3.6.3.8 0 .8-1.3 2.4-2.6 4.6-2.6 3.9 0 5.8 4.1 4.2 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
        <span className="absolute -right-2 -top-2 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-black text-bg">18+</span>
      </div>
      <h1 className="font-display text-4xl font-bold tracking-tight">mySex</h1>
      {subtitle && <p className="mt-2 max-w-xs text-sm text-ink-2">{subtitle}</p>}
    </div>
  );
}
