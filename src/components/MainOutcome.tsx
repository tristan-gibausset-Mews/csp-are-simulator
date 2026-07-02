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

function valueClasses(winner: WinningScenario): string {
  if (winner === 'CSP') return 'text-csp';
  if (winner === 'ARE + préavis') return 'text-are';
  return 'text-mews-grey-900';
}

function mainSentenceParts(winner: WinningScenario): { prefix: string; suffix: string } {
  if (winner === 'CSP') {
    return { prefix: 'Dans votre scénario, le CSP vous rapporte environ ', suffix: ' de plus.' };
  }
  if (winner === 'ARE + préavis') {
    return { prefix: 'Dans votre scénario, garder le préavis puis toucher l’ARE classique rapporte environ ', suffix: ' de plus.' };
  }
  return { prefix: '', suffix: '' };
}

export default function MainOutcome({ result }: MainOutcomeProps) {
  const finalPoint = result.decisionPoints[result.decisionPoints.length - 1];
  if (!finalPoint) return null;

  const amount = Math.abs(finalPoint.diffBenefitsOnly);
  const isEgalite = finalPoint.winner === 'Égalité';
  const { prefix, suffix } = mainSentenceParts(finalPoint.winner);

  return (
    <section className="card" aria-labelledby="main-outcome-title">
      <h2 id="main-outcome-title" className="sr-only">
        Résultat en clair
      </h2>

      <span className={`badge px-3 py-1 text-sm font-semibold ${badgeClasses(finalPoint.winner)}`}>
        {isEgalite ? 'Égalité' : `${finalPoint.winner} gagnant`}
      </span>

      <p className="mt-3 text-xl font-semibold leading-snug text-mews-grey-900 sm:text-2xl">
        {isEgalite ? (
          'Dans votre scénario, le CSP et le préavis + ARE se valent à peu près.'
        ) : (
          <>
            {prefix}
            <span className={valueClasses(finalPoint.winner)}>{formatEuros(amount)}</span>
            {suffix}
          </>
        )}
      </p>

      <div className="mt-5 flex flex-col gap-4 border-t border-mews-grey-100 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">Écart estimé</p>
          <p className={`mt-1 text-3xl font-bold sm:text-4xl ${valueClasses(finalPoint.winner)}`}>
            {isEgalite ? '≈ 0 €' : `+${formatEuros(amount)}`}
          </p>
        </div>
        <div className="sm:max-w-sm sm:text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-mews-grey-500">Pourquoi</p>
          <p className="mt-1 text-sm leading-relaxed text-mews-grey-900">
            {isEgalite ? 'Les deux options se compensent sur la durée observée.' : `Grâce à ${finalPoint.reason}.`}
          </p>
        </div>
      </div>
    </section>
  );
}
