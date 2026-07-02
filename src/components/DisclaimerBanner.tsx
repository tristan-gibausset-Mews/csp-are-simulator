export default function DisclaimerBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-mews-accent/30 bg-mews-accent-light px-3 py-2" role="note">
      <span aria-hidden="true" className="mt-0.5 text-sm">
        ⚠️
      </span>
      <p className="text-xs leading-snug text-mews-grey-900">
        <strong>Simulation indicative en brut.</strong> Le calcul officiel France Travail peut différer selon votre
        situation exacte (attestation employeur, primes, absences, indemnités de rupture, temps partiel, âge,
        ancienneté...). Aucune cotisation sociale, CSG/CRDS ou impôt n’est calculée.
      </p>
    </div>
  );
}
