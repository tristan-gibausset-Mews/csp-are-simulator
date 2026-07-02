import { useState } from 'react';
import type { ReactNode } from 'react';

interface ExpertSectionProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * Section repliée par défaut pour les résultats les plus techniques (SJR,
 * ASP, ARE, IDR...). Les explications en langage simple restent visibles par
 * défaut ailleurs (Verdict, Détail par scénario) ; cette section permet
 * d'aller plus loin pour qui le souhaite, sans surcharger la vue standard.
 */
export default function ExpertSection({ title, subtitle, children }: ExpertSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="card">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold text-mews-grey-900">{title}</h2>
          <p className="mt-0.5 text-xs text-mews-grey-500">{subtitle}</p>
        </div>
        <span className="shrink-0 text-sm text-mews-grey-500">{open ? 'Masquer ▲' : 'Afficher ▼'}</span>
      </button>

      {open && <div className="mt-4 space-y-6">{children}</div>}
    </section>
  );
}
