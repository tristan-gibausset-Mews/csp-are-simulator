import { formatEuros } from '../lib/formatters';
import type { SimulationResult, WinningScenario } from '../lib/types';

interface MainOutcomeProps {
  result: SimulationResult;
}

function badgeClasses(winner: WinningScenario): string {
  if (winner === 'CSP') return 'bg-csp-light text-csp';
  if (winner === 'ARE + préavis') return 'bg-are-light text-are';
  return 'bg-mews-grey-100 text-mews-grey-500';
}

function mainSentence(winner: WinningScenario, amount: number): string {
  if (winner === 'CSP') {
    return `Dans votre scénario, le CSP vous rapporte environ ${formatEuros(amount)} de plus.`;
  }
  if (winner === 'ARE + préavis') {
    return `Dans votre scénario, garder le préavis puis toucher l’ARE classique rapporte environ ${formatEuros(amount)} de plus.`;
  }
  return 'Dans votre scénario, le CSP et le préavis + ARE se valent à peu près.';
}

export default function MainOutcome({ result }: MainOutcomeProps) {
  const finalPoint = result.decisionPoints[result.decisionPoints.length - 1];
  if (!finalPoint) return null;

  const amount = Math.abs(finalPoint.diffBenefitsOnly);
  const winnerLabel = finalPoint.winner === 'Égalité' ? 'Égalité' : finalPoint.winner;

  return (
    <section className="card" aria-labelledby="main-outcome-title">
      <h2 id="main-outcome-title" className="sr-only">
        Résultat en clair
      </h2>
      <p className="text-lg font-semibold leading-snug text-mews-grey-900 sm:text-xl">
        {mainSentence(finalPoint.winner, amount)}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-mews-grey-100 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">Meilleure option</p>
          <span className={`mt-1 inline-block rounded-full px-3 py-1 text-base font-semibold ${badgeClasses(finalPoint.winner)}`}>
            {winnerLabel}
          </span>
        </div>
        <div className="rounded-lg border border-mews-grey-100 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">Écart estimé</p>
          <p className="mt-1 text-2xl font-semibold text-mews-grey-900">
            {finalPoint.winner === 'Égalité' ? '≈ 0 €' : `+${formatEuros(amount)}`}
          </p>
        </div>
        <div className="rounded-lg border border-mews-grey-100 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">Pourquoi</p>
          <p className="mt-1 text-sm text-mews-grey-900">
            {finalPoint.winner === 'Égalité' ? 'Les deux options se compensent sur la durée.' : `Grâce à ${finalPoint.reason}.`}
          </p>
        </div>
      </div>
    </section>
  );
}
