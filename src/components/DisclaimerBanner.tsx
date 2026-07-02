import { useState } from 'react';

export default function DisclaimerBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-warn/20 bg-warn-light px-4 py-2.5" role="note">
      <div className="flex flex-wrap items-center gap-2.5">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 text-warn"
        >
          <path
            d="M10 7.5v3.75M10 13.75h.008M8.9 3.62 2.4 15a1.25 1.25 0 0 0 1.08 1.88h13.04A1.25 1.25 0 0 0 17.6 15L11.1 3.62a1.25 1.25 0 0 0-2.2 0Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-xs leading-relaxed text-mews-grey-900">
          Simulation indicative en brut. Le calcul officiel France Travail peut varier selon votre situation.
        </p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium text-warn underline decoration-warn/40 underline-offset-2 transition-colors hover:decoration-warn"
        >
          {open ? 'Masquer' : 'Voir les limites du simulateur'}
        </button>
      </div>

      {open && (
        <p className="mt-2 border-t border-warn/15 pt-2 text-xs leading-relaxed text-mews-grey-900">
          Le calcul officiel France Travail peut différer selon votre situation exacte (attestation employeur,
          primes, absences, indemnités de rupture, temps partiel, âge, ancienneté...). Aucune cotisation sociale,
          CSG/CRDS ou impôt n’est calculée : tous les montants affichés sont bruts.
        </p>
      )}
    </div>
  );
}
