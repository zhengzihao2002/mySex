import { Heart } from 'lucide-react';

export function Brand({ subtitle }: { subtitle?: string }) {
  return <div className="auth-brand flex flex-col items-center text-center">
    <div className="relative brand-mark"><Heart size={31} strokeWidth={1.2} /><span className="absolute -right-2 -top-2 rounded-full border border-line bg-surface px-2 py-1 text-[9px] font-semibold tracking-wide text-ink-2">18+</span></div>
    <h1 className="font-display tracking-tight">mySex</h1>
    {subtitle && <p className="mt-3 max-w-xs text-sm text-ink-2">{subtitle}</p>}
  </div>;
}
