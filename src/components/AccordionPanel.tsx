import { useState } from 'react';
import type { ReactNode } from 'react';

interface AccordionPanelProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Panneau secondaire replié par défaut, utilisé pour les 4 accordéons de bas
 * de page (hypothèses avancées, détail du calcul, dates, export). Volontairement
 * plus léger qu'une carte de contenu principal : bordure fine, pas d'ombre,
 * chevron discret.
 */
export default function AccordionPanel({ title, subtitle, children, defaultOpen = false }: AccordionPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-xl border border-mews-grey-100 bg-white/70">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-mews-grey-100/50"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-mews-grey-900">{title}</h2>
          <p className="mt-0.5 text-xs text-mews-grey-500">{subtitle}</p>
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-mews-grey-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && <div className="space-y-6 border-t border-mews-grey-100 px-4 py-5">{children}</div>}
    </section>
  );
}
