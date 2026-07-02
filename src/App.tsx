import { useMemo, useState } from 'react';
import AdvancedSettings from './components/AdvancedSettings';
import AssumptionsPanel from './components/AssumptionsPanel';
import ComparisonTable from './components/ComparisonTable';
import CumulativeChart from './components/CumulativeChart';
import DecisionSummary from './components/DecisionSummary';
import DisclaimerBanner from './components/DisclaimerBanner';
import EventTimeline from './components/EventTimeline';
import ExpertSection from './components/ExpertSection';
import ExplanationPanel from './components/ExplanationPanel';
import ExportButtons from './components/ExportButtons';
import InputPanel from './components/InputPanel';
import KeyDatesPanel from './components/KeyDatesPanel';
import MonthlyCashflowTable from './components/MonthlyCashflowTable';
import PaymentPeriodsPanel from './components/PaymentPeriodsPanel';
import ResultsCards from './components/ResultsCards';
import ScenarioBreakdown from './components/ScenarioBreakdown';
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
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-mews-grey-900">Simulateur CSP vs ARE</h1>
          <p className="mt-1 text-sm text-mews-grey-500">
            Comparez l’acceptation du CSP et le refus du CSP (préavis + ARE classique) après un licenciement économique.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <DisclaimerBanner />

        {result.warnings.length > 0 && (
          <div className="rounded-lg border border-mews-accent/30 bg-mews-accent-light px-3 py-2">
            <ul className="list-disc space-y-1 pl-5 text-xs text-mews-grey-900">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <InputPanel input={input} onChange={handleChange} />
        <AdvancedSettings input={input} onChange={handleChange} />

        <DecisionSummary result={result} />

        <CumulativeChart result={result} displayMode={displayMode} onDisplayModeChange={setDisplayMode} />
        <EventTimeline result={result} />

        <ComparisonTable result={result} />

        <ScenarioBreakdown result={result} />

        <MonthlyCashflowTable result={result} />
        <PaymentPeriodsPanel result={result} />
        <KeyDatesPanel result={result} displayMode={displayMode} />

        <ExpertSection
          title="Résultats experts"
          subtitle="Chiffres détaillés et termes techniques (SJR, ASP, ARE, IDR...) pour aller plus loin — déjà résumés en langage simple ci-dessus."
        >
          <ResultsCards result={result} />
          <AssumptionsPanel result={result} />
        </ExpertSection>

        <ExplanationPanel result={result} displayMode={displayMode} />
        <ExportButtons result={result} />
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-mews-grey-500">
        Simulation indicative, sans valeur contractuelle. Ce simulateur ne remplace pas une notification officielle
        France Travail, un conseil juridique ou un calcul RH officiel.
      </footer>
    </div>
  );
}
