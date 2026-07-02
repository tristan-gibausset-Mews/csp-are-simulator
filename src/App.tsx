import { useMemo, useState } from 'react';
import AccordionPanel from './components/AccordionPanel';
import AdvancedSettings from './components/AdvancedSettings';
import AssumptionsPanel from './components/AssumptionsPanel';
import ComparisonTable from './components/ComparisonTable';
import CumulativeChart from './components/CumulativeChart';
import DecisionSummary from './components/DecisionSummary';
import DisclaimerBanner from './components/DisclaimerBanner';
import DisplayModeToggle from './components/DisplayModeToggle';
import EventTimeline from './components/EventTimeline';
import ExplanationPanel from './components/ExplanationPanel';
import ExportButtons from './components/ExportButtons';
import HumanExplanation from './components/HumanExplanation';
import InputPanel from './components/InputPanel';
import KeyDatesPanel from './components/KeyDatesPanel';
import MainOutcome from './components/MainOutcome';
import PaymentPeriodsPanel from './components/PaymentPeriodsPanel';
import ResultsCards from './components/ResultsCards';
import ScenarioBreakdown from './components/ScenarioBreakdown';
import SimpleMonthlyTimeline from './components/SimpleMonthlyTimeline';
import SimplePaymentDuration from './components/SimplePaymentDuration';
import { runSimulation } from './lib/calculationEngine';
import { DEFAULT_INPUT } from './lib/types';
import type { DisplayMode, SimulationInput } from './lib/types';

export default function App() {
  const [input, setInput] = useState<SimulationInput>(DEFAULT_INPUT);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('benefits_only');

  const handleChange = (patch: Partial<SimulationInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
  };

  const result = useMemo(() => runSimulation(input), [input]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-mews-grey-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
          <h1 className="text-xl font-semibold text-mews-grey-900 sm:text-2xl">Simulateur CSP vs ARE</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mews-grey-500">
            Comparez ce que vous touchez en acceptant le CSP ou en gardant votre préavis puis l’ARE classique.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <DisclaimerBanner />

        {result.warnings.length > 0 && (
          <div className="rounded-xl border border-warn/25 bg-warn-light px-4 py-2.5">
            <ul className="list-disc space-y-1 pl-5 text-xs text-mews-grey-900">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <InputPanel input={input} onChange={handleChange} />

        <MainOutcome result={result} />
        <HumanExplanation result={result} />

        <DisplayModeToggle displayMode={displayMode} onChange={setDisplayMode} />

        <SimpleMonthlyTimeline result={result} displayMode={displayMode} />
        <SimplePaymentDuration result={result} />
        <CumulativeChart result={result} displayMode={displayMode} />

        <div className="space-y-2.5">
          <AdvancedSettings input={input} onChange={handleChange} />

          <AccordionPanel
            title="Voir le détail du calcul"
            subtitle="Tableau de comparaison, détail par scénario, résultats détaillés et explications techniques."
          >
            <DecisionSummary result={result} />
            <ComparisonTable result={result} />
            <ScenarioBreakdown result={result} />
            <ResultsCards result={result} />
            <AssumptionsPanel result={result} />
            <ExplanationPanel result={result} displayMode={displayMode} />
          </AccordionPanel>

          <AccordionPanel title="Voir toutes les dates" subtitle="Chronologie complète des événements, périodes de versement et dates clés.">
            <EventTimeline result={result} />
            <PaymentPeriodsPanel result={result} />
            <KeyDatesPanel result={result} displayMode={displayMode} />
          </AccordionPanel>

          <AccordionPanel title="Exporter les résultats" subtitle="Tableaux au format CSV, hypothèses et résultats en JSON, graphique en PNG.">
            <ExportButtons result={result} />
          </AccordionPanel>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-10 text-xs leading-relaxed text-mews-grey-500 sm:px-6">
        Simulation indicative, sans valeur contractuelle. Ce simulateur ne remplace pas une notification officielle
        France Travail, un conseil juridique ou un calcul RH officiel.
      </footer>
    </div>
  );
}
