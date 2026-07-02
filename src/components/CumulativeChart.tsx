import { useMemo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getCurveInterpretation } from '../lib/calculationEngine';
import { dayToMonth, toChartData } from '../lib/chartUtils';
import { DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { formatEuros, formatSignedEuros } from '../lib/formatters';
import type { DisplayMode, SimulationResult } from '../lib/types';

interface CumulativeChartProps {
  result: SimulationResult;
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
}

function pointAtDay(result: SimulationResult, day: number) {
  const idx = Math.min(result.dailySeries.length - 1, Math.max(0, Math.round(day)));
  return result.dailySeries[idx];
}

function ChartTooltipContent({
  active,
  label,
  result,
  displayMode,
}: {
  active?: boolean;
  label?: number;
  result: SimulationResult;
  displayMode: DisplayMode;
}) {
  if (!active || label === undefined) return null;
  const day = label * DAYS_PER_MONTH;
  const point = pointAtDay(result, day);
  if (!point) return null;

  const cspTotal = displayMode === 'with_new_salary' ? point.csp.withNewSalaryTotal : point.csp.benefitsOnlyTotal;
  const areTotal = displayMode === 'with_new_salary' ? point.classicAre.withNewSalaryTotal : point.classicAre.benefitsOnlyTotal;

  return (
    <div className="rounded-lg border border-mews-grey-100 bg-white p-3 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-mews-grey-900">Mois {Math.round(label * 10) / 10}</p>
      <p className="text-csp">Total CSP : {formatEuros(cspTotal)}</p>
      <p className="text-are">Total ARE + préavis : {formatEuros(areTotal)}</p>
      <p className="mt-1 font-medium text-mews-grey-900">Écart : {formatSignedEuros(cspTotal - areTotal)}</p>
    </div>
  );
}

export default function CumulativeChart({ result, displayMode, onDisplayModeChange }: CumulativeChartProps) {
  const data = useMemo(() => toChartData(result.dailySeries, displayMode), [result.dailySeries, displayMode]);

  const crossoverMonth = result.crossoverDay !== null ? dayToMonth(result.crossoverDay) : null;
  const crossoverValue = useMemo(() => {
    if (result.crossoverDay === null) return null;
    const point = pointAtDay(result, result.crossoverDay);
    if (!point) return null;
    return displayMode === 'with_new_salary' ? point.csp.withNewSalaryTotal : point.csp.benefitsOnlyTotal;
  }, [result, displayMode]);

  const reprisePresent = result.hasNewJob && result.newJobStartDay !== null;
  const interpretation = useMemo(
    () => getCurveInterpretation({ hasNewJob: result.hasNewJob }, result.dailySeries, displayMode),
    [result.hasNewJob, result.dailySeries, displayMode],
  );

  return (
    <section className="card" aria-labelledby="chart-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="chart-title" className="text-lg font-semibold text-mews-grey-900">
          Courbes cumulées
        </h2>
        <div className="flex rounded-lg border border-mews-grey-300 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onDisplayModeChange('benefits_only')}
            className={`rounded-md px-2.5 py-1 font-medium ${displayMode === 'benefits_only' ? 'bg-mews-accent text-white' : 'text-mews-grey-500'}`}
          >
            Indemnités uniquement
          </button>
          <button
            type="button"
            onClick={() => onDisplayModeChange('with_new_salary')}
            className={`rounded-md px-2.5 py-1 font-medium ${displayMode === 'with_new_salary' ? 'bg-mews-accent text-white' : 'text-mews-grey-500'}`}
          >
            Total avec nouveau salaire
          </button>
        </div>
      </div>

      <div className="h-72 w-full md:h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDEDEF" />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, result.horizon.displayedMonths]}
              tickFormatter={(value: number) => `M${Math.round(value)}`}
              stroke="#928FAA"
              fontSize={12}
            />
            <YAxis tickFormatter={(value: number) => formatEuros(value)} stroke="#928FAA" fontSize={12} width={90} />
            <Tooltip content={<ChartTooltipContent result={result} displayMode={displayMode} />} />
            <Legend />
            <Line type="monotone" dataKey="csp" name="CSP" stroke="#2563EB" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="are" name="ARE + préavis" stroke="#0F9D6B" strokeWidth={2} dot={false} isAnimationActive={false} />

            {reprisePresent && result.newJobStartDay !== null && (
              <ReferenceLine
                x={dayToMonth(result.newJobStartDay)}
                stroke="#928FAA"
                strokeDasharray="4 4"
                label={{ value: 'Reprise', position: 'insideTop', fontSize: 10, fill: '#928FAA' }}
              />
            )}

            {crossoverMonth !== null && crossoverValue !== null && (
              <ReferenceDot x={crossoverMonth} y={crossoverValue} r={5} fill="#FF5303" stroke="white" strokeWidth={2} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-xs text-mews-grey-500">{interpretation.message}</p>
    </section>
  );
}
