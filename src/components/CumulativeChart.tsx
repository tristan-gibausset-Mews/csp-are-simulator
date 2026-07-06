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
}

const COLOR_GRID = '#3A3944';
const COLOR_AXIS = '#A6A4B8';
const COLOR_CSP = '#FF83DA';
const COLOR_ARE = '#E3FFFD';
const COLOR_MUTED = '#4A4954';
const COLOR_ACCENT = '#FF5303';

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
    <div className="rounded-xl border border-mews-grey-300/40 bg-background-card p-3 text-xs shadow-popover">
      <p className="mb-1.5 font-semibold text-mews-grey-900">Mois {Math.round(label * 10) / 10}</p>
      <p className="text-csp">CSP : {formatEuros(cspTotal)}</p>
      <p className="text-are">Préavis + ARE : {formatEuros(areTotal)}</p>
      <p className="mt-1.5 border-t border-mews-grey-300/30 pt-1.5 font-medium text-mews-grey-900">
        Écart : {formatSignedEuros(cspTotal - areTotal)}
      </p>
    </div>
  );
}

export default function CumulativeChart({ result, displayMode }: CumulativeChartProps) {
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

  const primeCspDay =
    result.chosenAid === 'RECLASSEMENT_PRIME' && result.reclassementPrime.eligible ? result.reclassementPrime.firstPaymentDay : null;

  const endOfPaymentsDay = useMemo(() => {
    const candidates = [
      result.cspAspEndDay,
      result.cspAreAfterCspExhaustionDay ?? 0,
      result.classicAreExhaustionDay ?? 0,
      result.reclassementPrime.secondPaymentPaid ? result.reclassementPrime.secondPaymentDay ?? 0 : result.reclassementPrime.firstPaymentDay ?? 0,
      result.idr.endDay ?? 0,
    ];
    return Math.max(...candidates);
  }, [result]);

  return (
    <section className="card" aria-labelledby="chart-title">
      <h2 id="chart-title" className="section-title">
        Évolution du cumul perçu
      </h2>
      <p className="section-subtitle">Par défaut, le graphique compare uniquement CSP, préavis, ARE et primes — sans le nouveau salaire.</p>

      <div className="mt-4 rounded-xl border border-mews-grey-300/30 bg-background-card-muted p-2">
        <div className="h-72 w-full md:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 28, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={COLOR_GRID} />
              <XAxis
                dataKey="month"
                type="number"
                domain={[0, result.horizon.displayedMonths]}
                tickFormatter={(value: number) => `${Math.round(value)}`}
                stroke={COLOR_AXIS}
                fontSize={11}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value: number) => formatEuros(value)}
                stroke={COLOR_AXIS}
                fontSize={11}
                width={88}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltipContent result={result} displayMode={displayMode} />} />
              <Legend wrapperStyle={{ fontSize: 12, color: COLOR_AXIS }} iconType="plainline" iconSize={14} />
              <Line type="monotone" dataKey="csp" name="CSP" stroke={COLOR_CSP} strokeWidth={2.25} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="are" name="Préavis + ARE" stroke={COLOR_ARE} strokeWidth={2.25} dot={false} isAnimationActive={false} />

              {reprisePresent && result.newJobStartDay !== null && (
                <ReferenceLine
                  x={dayToMonth(result.newJobStartDay)}
                  stroke={COLOR_AXIS}
                  strokeDasharray="4 4"
                  label={{ value: 'Reprise d’emploi', position: 'insideTop', fontSize: 10, fill: COLOR_AXIS, offset: 8 }}
                />
              )}

              {primeCspDay !== null && (
                <ReferenceLine
                  x={dayToMonth(primeCspDay)}
                  stroke={COLOR_CSP}
                  strokeDasharray="4 4"
                  label={{ value: 'Prime CSP', position: 'insideTop', fontSize: 10, fill: COLOR_CSP, offset: 24 }}
                />
              )}

              {!result.classicAreNeverStarted && (
                <ReferenceLine
                  x={dayToMonth(result.classicAreStartDay)}
                  stroke={COLOR_ARE}
                  strokeDasharray="4 4"
                  label={{ value: 'Début ARE', position: 'insideTop', fontSize: 10, fill: COLOR_ARE, offset: 40 }}
                />
              )}

              <ReferenceLine
                x={dayToMonth(endOfPaymentsDay)}
                stroke={COLOR_MUTED}
                strokeDasharray="2 2"
                label={{ value: 'Fin des versements', position: 'insideTop', fontSize: 10, fill: COLOR_AXIS, offset: 56 }}
              />

              {crossoverMonth !== null && crossoverValue !== null && (
                <ReferenceDot x={crossoverMonth} y={crossoverValue} r={5} fill={COLOR_ACCENT} stroke="#242330" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-mews-grey-500">{interpretation.message}</p>
    </section>
  );
}
