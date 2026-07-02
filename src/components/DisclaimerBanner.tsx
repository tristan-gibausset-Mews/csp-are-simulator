import { useState } from 'react';

export default function DisclaimerBanner() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-mews-accent/30 bg-mews-accent-light px-3 py-1.5" role="note">
      <span aria-hidden="true" className="text-sm">
        ⚠️
      </span>
      <p className="text-xs text-mews-grey-900">
        Simulation indicative en brut. Le calcul officiel France Travail peut varier selon votre situation.
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-auto text-xs font-medium text-mews-accent underline-offset-2 hover:underline"
      >
        {open ? 'Masquer' : 'Voir les limites du simulateur'}
      </button>

      {open && (
        <p className="w-full text-xs leading-snug text-mews-grey-900">
          Le calcul officiel France Travail peut différer selon votre situation exacte (attestation employeur,
          primes, absences, indemnités de rupture, temps partiel, âge, ancienneté...). Aucune cotisation sociale,
          CSG/CRDS ou impôt n’est calculée : tous les montants affichés sont bruts.
        </p>
      )}
    </div>
  );
}
