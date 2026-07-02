import { formatEuros, formatSignedEuros } from '../lib/formatters';
import type { SimulationResult } from '../lib/types';

interface ComparisonTableProps {
  result: SimulationResult;
}

export default function ComparisonTable({ result }: ComparisonTableProps) {
  return (
    <section aria-labelledby="comparison-table-title">
      <h2 id="comparison-table-title" className="mb-4 text-lg font-semibold text-mews-grey-900">
        Tableau de comparaison
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-mews-grey-100 text-left text-xs uppercase tracking-wide text-mews-grey-500">
              <th className="py-2 pr-4">Horizon</th>
              <th className="py-2 pr-4">Total CSP</th>
              <th className="py-2 pr-4">Total ARE + préavis</th>
              <th className="py-2 pr-4">Écart CSP - ARE</th>
              <th className="py-2">Option gagnante</th>
            </tr>
          </thead>
          <tbody>
            {result.comparisonTable.map((row) => (
              <tr key={row.label} className="border-b border-mews-grey-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-mews-grey-900">{row.label}</td>
                <td className="py-2 pr-4 text-csp">{formatEuros(row.totalCsp)}</td>
                <td className="py-2 pr-4 text-are">{formatEuros(row.totalAre)}</td>
                <td className="py-2 pr-4">{formatSignedEuros(row.diff)}</td>
                <td className="py-2 font-medium">{row.winner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-mews-grey-500">
        Les dates d’épuisement des droits sont détaillées dans la section "Dates clés" ci-dessous.
      </p>
    </section>
  );
}
