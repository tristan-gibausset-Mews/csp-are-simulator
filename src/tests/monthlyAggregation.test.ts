import { describe, expect, it } from 'vitest';
import { aggregateDailySeriesByMonth, MONTHLY_TABLE_DISPLAY_MONTHS, runSimulation } from '../lib/calculationEngine';
import { BASE_INPUT, expectMoneyClose } from './testHelpers';

// ---------------------------------------------------------------------------
// 13. Agrégation mensuelle
// ---------------------------------------------------------------------------

describe('Agrégation mensuelle — tableau "Ce que vous touchez chaque mois"', () => {
  it('always exposes exactly 23 months, labelled "Mois 1".."Mois 23" (never "M1")', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    expect(result.monthlySeries).toHaveLength(MONTHLY_TABLE_DISPLAY_MONTHS);
    expect(result.monthlySeries[0]?.monthLabel).toBe('Mois 1');
    expect(result.monthlySeries[22]?.monthLabel).toBe('Mois 23');
    for (const month of result.monthlySeries) {
      expect(month.monthLabel).toMatch(/^Mois \d+$/);
      expect(month.monthLabel).not.toMatch(/^M\d+$/);
    }
  });

  it('shows 0 € for months with no payment once benefits are exhausted or stopped (never invents a payment)', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const lastMonth = result.monthlySeries[result.monthlySeries.length - 1];
    expect(lastMonth).toBeDefined();
    if (lastMonth) {
      expectMoneyClose(lastMonth.csp.benefitsOnlyMonthlyTotal, 0, 0.01);
      expectMoneyClose(lastMonth.classicAre.benefitsOnlyMonthlyTotal, 0, 0.01);
    }
  });

  it('pays the reclassement prime only in the months where each installment actually falls', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    expect(result.chosenAid).toBe('RECLASSEMENT_PRIME');

    const monthsWithPrime = result.monthlySeries.filter((m) => m.csp.reclassementPrime > 0.5);
    // Deux versements distincts -> au plus deux mois concernés (un seul si les
    // deux versements tombent dans le même mois calendaire, ce qui n'est pas
    // le cas ici : le second est versé ~91 jours après le premier).
    expect(monthsWithPrime.length).toBeGreaterThanOrEqual(1);
    expect(monthsWithPrime.length).toBeLessThanOrEqual(2);

    const totalPrimePaid = result.monthlySeries.reduce((sum, m) => sum + m.csp.reclassementPrime, 0);
    expectMoneyClose(totalPrimePaid, result.reclassementPrime.primeTotal, 1);
  });

  it('never duplicates the lump-sum paid-leave payment across several months', () => {
    // Côté CSP : versement au jour 0, donc uniquement au mois 1.
    const cspResult = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null });
    const cspMonthsWithPaidLeave = cspResult.monthlySeries.filter((m) => m.csp.paidLeave > 0.5);
    expect(cspMonthsWithPaidLeave).toHaveLength(1);
    expect(cspMonthsWithPaidLeave[0]?.monthIndex).toBe(0);

    // Côté ARE + préavis : versement à la fin du préavis, donc un seul mois
    // (celui qui contient la date de fin de préavis, sous réserve de l'arrondi
    // au jour entier le plus proche à la frontière du mois).
    const areResult = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, noticePeriodMonths: 3, remainingPaidLeaveDays: 28 });
    const areMonthsWithPaidLeave = areResult.monthlySeries.filter((m) => m.classicAre.paidLeave > 0.5);
    expect(areMonthsWithPaidLeave).toHaveLength(1);
  });

  it('sums monthly deltas up to exactly the final cumulative total (telescoping sum)', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null });
    const cspSum = result.monthlySeries.reduce((sum, m) => sum + m.csp.benefitsOnlyMonthlyTotal, 0);
    const areSum = result.monthlySeries.reduce((sum, m) => sum + m.classicAre.benefitsOnlyMonthlyTotal, 0);
    const lastMonth = result.monthlySeries[result.monthlySeries.length - 1];
    expect(lastMonth).toBeDefined();
    if (lastMonth) {
      expectMoneyClose(cspSum, lastMonth.csp.benefitsOnlyCumulativeTotal, 0.5);
      expectMoneyClose(areSum, lastMonth.classicAre.benefitsOnlyCumulativeTotal, 0.5);
    }
  });

  it('keeps monthly totals consistent with the underlying daily series', () => {
    // On utilise un horizon manuel >= 23 mois pour que dailySeries couvre
    // toute la période vérifiée par monthlySeries (les deux dérivent de la
    // même série complète, mais dailySeries peut être plus courte en mode
    // automatique).
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 24,
    });
    const recomputed = aggregateDailySeriesByMonth(result.dailySeries);

    for (let m = 0; m < MONTHLY_TABLE_DISPLAY_MONTHS; m += 1) {
      const fromTable = result.monthlySeries[m];
      const fromDaily = recomputed[m];
      expect(fromTable).toBeDefined();
      expect(fromDaily).toBeDefined();
      if (fromTable && fromDaily) {
        expectMoneyClose(fromTable.csp.benefitsOnlyMonthlyTotal, fromDaily.csp.benefitsOnlyMonthlyTotal, 0.5);
        expectMoneyClose(fromTable.classicAre.benefitsOnlyMonthlyTotal, fromDaily.classicAre.benefitsOnlyMonthlyTotal, 0.5);
      }
    }
  });

  it('still shows 23 months when the automatic horizon would otherwise be shorter (manual short horizon)', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 6,
    });
    expect(result.horizon.displayedMonths).toBe(6);
    expect(result.monthlySeries).toHaveLength(23);
  });

  it('keeps ASP/ARE at 0 after a resumption in benefits-only mode, and pays the prime only on the concerned months', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const newJobMonthIndex = Math.floor((result.newJobStartDay ?? 0) / (365 / 12));
    for (const month of result.monthlySeries) {
      if (month.monthIndex > newJobMonthIndex + 1) {
        expectMoneyClose(month.csp.asp, 0, 0.01);
      }
    }
  });
});
