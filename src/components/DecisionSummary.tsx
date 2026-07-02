import { formatEuros } from '../lib/formatters';
import type { SimulationResult, WinningScenario } from '../lib/types';

interface DecisionSummaryProps {
  result: SimulationResult;
}

function badgeClasses(winner: WinningScenario): string {
  if (winner === 'CSP') return 'bg-csp-light text-csp';
  if (winner === 'ARE + préavis') return 'bg-are-light text-are';
  return 'bg-mews-grey-100 text-mews-grey-500';
}

/**
 * Détail expert du "Résultat en clair" (MainOutcome) : l'option gagnante et
 * l'écart à chaque horizon usuel (M6, M9, M15, M20, fin de la période
 * comparée), pour qui veut vérifier le calcul mois par mois.
 */
export default function DecisionSummary({ result }: DecisionSummaryProps) {
  return (
    <section aria-labelledby="decision-summary-title">
      <h2 id="decision-summary-title" className="section-title mb-3">
        Comparaison par horizon
      </h2>

      <ul className="space-y-2">
        {result.decisionPoints.map((point) => (
          <li key={point.label} className="flex items-center justify-between gap-3 rounded-lg border border-mews-grey-100 px-3 py-2 text-sm">
            <span className="text-mews-grey-500">{point.label}</span>
            <span className={`badge font-semibold ${badgeClasses(point.winner)}`}>{point.winner}</span>
            <span className="ml-auto font-medium tabular-nums text-mews-grey-900">
              {formatEuros(Math.abs(point.diffBenefitsOnly))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
