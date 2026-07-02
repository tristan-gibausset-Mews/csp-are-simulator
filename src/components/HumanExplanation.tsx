import type { SimulationResult } from '../lib/types';

interface HumanExplanationProps {
  result: SimulationResult;
}

/**
 * Explication en 2 à 4 phrases, en langage courant. Les termes techniques
 * (SJR, ASP, différé spécifique...) sont volontairement évités ici — ils
 * restent disponibles dans "Voir le détail du calcul".
 */
function buildSentences(result: SimulationResult): string[] {
  const { input, chosenAid } = result;
  const finalPoint = result.decisionPoints[result.decisionPoints.length - 1];
  const sentences: string[] = [];

  if (result.hasNewJob && input.monthsBeforeNewJob !== null) {
    if (result.classicAreNeverStarted) {
      sentences.push(
        `Vous reprenez un emploi au mois ${input.monthsBeforeNewJob}, avant que le chômage classique (ARE) ne démarre.`,
      );
      sentences.push(
        'Dans le scénario préavis + ARE, vous touchez donc surtout le préavis, les congés payés et l’indemnité supra-légale.',
      );
    } else if (result.classicAreStoppedByNewJob) {
      sentences.push(
        `Vous reprenez un emploi au mois ${input.monthsBeforeNewJob}, après le début du chômage classique (ARE), qui s’arrête alors.`,
      );
      sentences.push(
        'Dans le scénario préavis + ARE, vous touchez le préavis, les congés payés et l’indemnité supra-légale, puis le chômage classique (ARE) jusqu’à la reprise.',
      );
    } else {
      sentences.push(`Vous reprenez un emploi au mois ${input.monthsBeforeNewJob}.`);
    }
  } else {
    sentences.push(
      'Vous ne prévoyez pas de reprise d’emploi dans cette simulation : les allocations sont donc versées jusqu’à épuisement de vos droits.',
    );
    sentences.push('Dans le scénario préavis + ARE, vous touchez le préavis puis le chômage classique (ARE) jusqu’à épuisement de vos droits.');
  }

  if (result.hasNewJob && result.cspAspStoppedByNewJob) {
    if (chosenAid === 'RECLASSEMENT_PRIME') {
      sentences.push('Avec le CSP, l’allocation CSP s’arrête à la reprise, mais la prime de reclassement peut être versée en deux fois.');
    } else if (chosenAid === 'IDR') {
      sentences.push(
        'Avec le CSP, l’allocation CSP s’arrête à la reprise, mais une aide complémentaire peut compenser une partie de la baisse de salaire si le nouvel emploi est moins payé.',
      );
    } else {
      sentences.push('Avec le CSP, l’allocation CSP s’arrête à la reprise d’emploi.');
    }
  } else if (result.cspAreAfterCspApplicable) {
    sentences.push('Avec le CSP, l’allocation CSP est versée pendant 12 mois, puis un reliquat de chômage peut suivre si vos droits ne sont pas épuisés.');
  } else {
    sentences.push('Avec le CSP, l’allocation CSP est versée sans délai ni attente dès la rupture du contrat.');
  }

  if (finalPoint) {
    if (finalPoint.winner === 'Égalité') {
      sentences.push('Les deux options se rapprochent donc sur la durée observée.');
    } else {
      sentences.push(`C’est ce qui rend le ${finalPoint.winner} plus favorable dans cette simulation.`);
    }
  }

  return sentences.slice(0, 4);
}

export default function HumanExplanation({ result }: HumanExplanationProps) {
  const sentences = buildSentences(result);

  return (
    <section aria-labelledby="human-explanation-title">
      <h2 id="human-explanation-title" className="sr-only">
        Explication en langage simple
      </h2>
      <p className="text-sm leading-relaxed text-mews-grey-900">{sentences.join(' ')}</p>
    </section>
  );
}
