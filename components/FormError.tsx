'use client';

import { useT } from './I18nProvider';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert } from 'lucide-react';

export function FormError({ error }: { error?: string | null }) {
  const { t } = useT();
  return <AnimatePresence initial={false}>{error && <motion.p key={error} role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2 overflow-hidden rounded-2xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-rose-2"><CircleAlert size={17} className="mt-0.5"/>{t(error)}</motion.p>}</AnimatePresence>;
}
