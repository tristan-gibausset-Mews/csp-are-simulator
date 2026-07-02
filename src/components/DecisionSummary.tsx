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

export default function DecisionSummary({ result }: DecisionSummaryProps) {
  const mainPoint = result.decisionPoints[result.decisionPoints.length - 1];
  const hasNewJob = result.hasNewJob;

  return (
    <section className="card" aria-labelledby="decision-summary-title">
      <h2 id="decision-summary-title" className="mb-3 text-lg font-semibold text-mews-grey-900">
        Verdict
      </h2>

      {mainPoint && (
        <div className="mb-4 rounded-lg border border-mews-grey-100 bg-cream p-4">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${badgeClasses(mainPoint.winner)}`}>
            {mainPoint.winner === 'Égalité' ? 'Égalité' : `${mainPoint.winner} gagnant`}
          </span>
          <p className="mt-2 text-sm text-mews-grey-900">
            À {mainPoint.label.toLowerCase()}, {mainPoint.winner === 'Égalité'
              ? 'les deux options sont quasiment équivalentes'
              : `le ${mainPoint.winner} est plus favorable de ${formatEuros(Math.abs(mainPoint.diffBenefitsOnly))}`}
            {mainPoint.winner !== 'Égalité' ? ` grâce à ${mainPoint.reason}.` : '.'}
          </p>
          {hasNewJob && (
            <p className="mt-1 text-xs text-mews-grey-500">
              Le nouveau salaire est identique dans les deux scénarios ; il ne change donc pas l’écart entre CSP et ARE.
            </p>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {result.decisionPoints.map((point) => (
          <li key={point.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-mews-grey-500">{point.label}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses(point.winner)}`}>
              {point.winner}
            </span>
            <span className="ml-auto font-medium text-mews-grey-900">
              {formatEuros(Math.abs(point.diffBenefitsOnly))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
