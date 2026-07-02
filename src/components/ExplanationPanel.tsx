import type { DisplayMode, SimulationResult } from '../lib/types';

interface ExplanationPanelProps {
  result: SimulationResult;
  displayMode: DisplayMode;
}

export default function ExplanationPanel({ result, displayMode }: ExplanationPanelProps) {
  const explanations: string[] = [
    'Le CSP démarre immédiatement car l’ASP n’a ni différé ni délai d’attente.',
    'L’ARE classique démarre avec l’avantage du préavis, versé intégralement au salarié.',
    'Les congés payés décalent le début de l’ARE classique.',
    'L’indemnité supra-légale ajoute un différé spécifique.',
    'L’ASP du CSP n’est jamais dégressive, quel que soit le niveau de salaire.',
  ];

  if (result.areDegressiveApplicableClassic || result.areDegressiveApplicableAfterCsp) {
    explanations.push('La dégressivité réduit l’ARE des hauts revenus à partir du seuil applicable. Elle ne réduit pas l’ASP du CSP.');
  }

  if (result.hasNewJob && result.classicAreNeverStarted) {
    explanations.push(
      'La reprise d’emploi intervient avant le début estimé de l’ARE classique. Dans cette simulation, aucune ARE classique n’est donc versée. Le scénario ARE + préavis repose alors principalement sur le préavis, les congés payés et l’indemnité supra-légale.',
    );
  }

  if (result.hasNewJob && result.cspAspStoppedByNewJob) {
    explanations.push(
      'La reprise d’emploi intervient pendant le CSP. L’ASP s’arrête à la date de reprise. Si le contrat repris est éligible, le salarié peut toutefois bénéficier de la prime de reclassement CSP.',
    );
  }

  if (displayMode === 'benefits_only') {
    explanations.push(
      'Le graphique exclut le nouveau salaire. Il montre uniquement les sommes liées à la rupture, au chômage et aux aides CSP. Après reprise d’emploi, les courbes peuvent devenir plates si plus aucune indemnité n’est due.',
    );
  } else {
    explanations.push(
      'Le graphique inclut le nouveau salaire après reprise d’emploi. Les courbes peuvent continuer à monter même si l’ASP ou l’ARE sont arrêtées.',
    );
  }

  if (result.horizon.mode === 'auto') {
    explanations.push(
      'La durée affichée est calculée automatiquement pour couvrir les principaux événements de la simulation sans prolonger inutilement le graphique.',
    );
  }

  if (!result.input.seniorityAtLeastOneYear) {
    explanations.push(
      'Ancienneté inférieure à 1 an : le CSP est calculé selon des règles différentes de celles présentées ici (voir avertissement ci-dessus).',
    );
  }

  return (
    <section className="card" aria-labelledby="explanation-panel-title">
      <h2 id="explanation-panel-title" className="mb-3 text-lg font-semibold text-mews-grey-900">
        Ce qu’il faut comprendre
      </h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-mews-grey-900">
        {explanations.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </section>
  );
}
