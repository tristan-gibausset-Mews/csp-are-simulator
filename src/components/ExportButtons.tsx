import type { SimulationResult } from '../lib/types';

interface ExportButtonsProps {
  result: SimulationResult;
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toCsv(rows: (string | number)[][]): string {
  const csv = rows.map((line) => line.join(';')).join('\n');
  return '﻿' + csv;
}

function exportComparisonCsv(result: SimulationResult) {
  const header = ['Horizon', 'Total CSP', 'Total ARE + préavis', 'Écart CSP - ARE', 'Option gagnante'];
  const rows = result.comparisonTable.map((row) => [
    row.label,
    row.totalCsp.toFixed(2),
    row.totalAre.toFixed(2),
    row.diff.toFixed(2),
    row.winner,
  ]);
  downloadBlob(toCsv([header, ...rows]), 'comparaison-csp-are.csv', 'text/csv;charset=utf-8');
}

function exportMonthlyCsv(result: SimulationResult) {
  const header = [
    'Mois',
    'CSP ce mois (indemnités)',
    'ARE + préavis ce mois (indemnités)',
    'Écart du mois',
    'Cumul CSP (indemnités)',
    'Cumul ARE + préavis (indemnités)',
    'Écart cumulé',
    'Option gagnante',
  ];
  const rows = result.monthlySeries.map((month) => [
    month.monthLabel,
    month.csp.benefitsOnlyMonthlyTotal.toFixed(2),
    month.classicAre.benefitsOnlyMonthlyTotal.toFixed(2),
    month.monthlyDifference.toFixed(2),
    month.csp.benefitsOnlyCumulativeTotal.toFixed(2),
    month.classicAre.benefitsOnlyCumulativeTotal.toFixed(2),
    month.cumulativeDifference.toFixed(2),
    month.winningScenario,
  ]);
  downloadBlob(toCsv([header, ...rows]), 'montants-mensuels-csp-are.csv', 'text/csv;charset=utf-8');
}

function exportJson(result: SimulationResult) {
  const payload = {
    hypotheses: result.input,
    resultatsCles: {
      sjr: result.sjr,
      aspDaily: result.aspDaily,
      baseAreDaily: result.baseAreDaily,
      areEntitlement: result.areEntitlement,
      classicAreStartDay: result.classicAreStartDay,
      classicAreExhaustionDay: result.classicAreExhaustionDay,
      cspAspEndDay: result.cspAspEndDay,
      cspAreAfterCspExhaustionDay: result.cspAreAfterCspExhaustionDay,
      crossoverDay: result.crossoverDay,
      decisionPoints: result.decisionPoints,
      reclassementPrime: result.reclassementPrime,
      idr: result.idr,
      chosenAid: result.chosenAid,
      horizon: result.horizon,
    },
    tableauComparaison: result.comparisonTable,
    avertissement:
      'Simulation indicative en brut. Le calcul officiel France Travail peut différer selon la situation exacte du salarié.',
  };
  downloadBlob(JSON.stringify(payload, null, 2), 'simulation-csp-are.json', 'application/json');
}

export default function ExportButtons({ result }: ExportButtonsProps) {
  return (
    <section aria-labelledby="export-buttons-title">
      <h2 id="export-buttons-title" className="section-title mb-3">
        Export
      </h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => exportComparisonCsv(result)} className="btn-secondary px-4 py-2 text-sm">
          Exporter le tableau de comparaison (CSV)
        </button>
        <button type="button" onClick={() => exportMonthlyCsv(result)} className="btn-secondary px-4 py-2 text-sm">
          Exporter le tableau mensuel (CSV)
        </button>
        <button type="button" onClick={() => exportJson(result)} className="btn-secondary px-4 py-2 text-sm">
          Exporter hypothèses + résultats (JSON)
        </button>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-mews-grey-100 bg-mews-grey-100 px-4 py-2 text-sm font-medium text-mews-grey-500"
          title="Export PNG du graphique — à venir"
        >
          Exporter le graphique (PNG) — à venir
        </button>
      </div>
    </section>
  );
}
