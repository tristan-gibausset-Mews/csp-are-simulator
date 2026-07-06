import { describe, expect, it } from 'vitest';
import { getAREEntitlementDays, runSimulation } from '../lib/calculationEngine';
import { CSP_MAX_DAYS } from '../lib/regulatoryConstants';
import { BASE_INPUT, expectMoneyClose } from './testHelpers';

// ---------------------------------------------------------------------------
// 14. Invariants de cohérence
// ---------------------------------------------------------------------------

describe('Invariants — aucun montant négatif', () => {
  const scenarios: Partial<typeof BASE_INPUT>[] = [
    { currentMonthlyGrossSalary: 1500, monthsBeforeNewJob: null },
    { currentMonthlyGrossSalary: 3000, monthsBeforeNewJob: null },
    { currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null },
    { currentMonthlyGrossSalary: 3000, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 },
    { currentMonthlyGrossSalary: 3000, monthsBeforeNewJob: null, seniorityAtLeastOneYear: false },
  ];

  it.each(scenarios)('produces no negative daily, monthly, or cumulative amount for %o', (overrides) => {
    const result = runSimulation({ ...BASE_INPUT, ...overrides });
    for (const point of result.dailySeries) {
      expect(point.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(-0.01);
      expect(point.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(-0.01);
      expect(point.csp.withNewSalaryTotal).toBeGreaterThanOrEqual(-0.01);
      expect(point.classicAre.withNewSalaryTotal).toBeGreaterThanOrEqual(-0.01);
    }
    for (const month of result.monthlySeries) {
      expect(month.csp.benefitsOnlyCumulativeTotal).toBeGreaterThanOrEqual(-0.01);
      expect(month.classicAre.benefitsOnlyCumulativeTotal).toBeGreaterThanOrEqual(-0.01);
    }
  });
});

describe('Invariants — les cumuls ne baissent jamais', () => {
  it('keeps csp/classicAre benefits-only and with-new-salary totals monotonically non-decreasing', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    for (let i = 1; i < result.dailySeries.length; i += 1) {
      const prev = result.dailySeries[i - 1];
      const curr = result.dailySeries[i];
      if (!prev || !curr) continue;
      expect(curr.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(prev.csp.benefitsOnlyTotal - 1e-9);
      expect(curr.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(prev.classicAre.benefitsOnlyTotal - 1e-9);
      expect(curr.csp.withNewSalaryTotal).toBeGreaterThanOrEqual(prev.csp.withNewSalaryTotal - 1e-9);
      expect(curr.classicAre.withNewSalaryTotal).toBeGreaterThanOrEqual(prev.classicAre.withNewSalaryTotal - 1e-9);
    }
  });
});

describe('Invariants — arrêt des allocations à la reprise', () => {
  const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
  const newJobStartDay = Math.round(result.newJobStartDay ?? 0);

  it('stops ASP after the resumption date', () => {
    const before = result.dailySeries[newJobStartDay - 1];
    // +2 jours de marge : newJobStartDay est un jour fractionnaire (ex. 121,667)
    // arrondi à l'entier le plus proche (122) pour l'indexation ; le jour 122
    // seul peut encore se situer légèrement avant la vraie coupure fractionnaire.
    const atCutoff = result.dailySeries[Math.min(result.dailySeries.length - 1, newJobStartDay + 2)];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, newJobStartDay + 60)];
    expect(before?.csp.asp).toBeGreaterThan(0);
    if (atCutoff && wellAfter) expectMoneyClose(atCutoff.csp.asp, wellAfter.csp.asp, 0.01);
  });

  it('never pays classic ARE after the resumption date when it never started', () => {
    expect(result.classicAreNeverStarted).toBe(true);
    const last = result.dailySeries[result.dailySeries.length - 1];
    expect(last?.classicAre.are ?? -1).toBe(0);
  });

  it('never pays ARE-after-CSP after a resumption that happens before the CSP ends', () => {
    expect(result.cspAreAfterCspApplicable).toBe(false);
    const last = result.dailySeries[result.dailySeries.length - 1];
    // Le champ csp.are représente l'ARE restante après CSP, jamais versée ici.
    expect(last?.csp.are ?? -1).toBe(0);
  });
});

describe('Invariants — pas de prime de reclassement sans reprise d’emploi', () => {
  it('never grants the reclassement prime when no new job is planned', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, newMonthlyGrossSalary: null });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.reclassementPrime.primeTotal).toBe(0);
  });
});

describe('Invariants — pas d’ARE classique avant sa date de début', () => {
  it('pays zero classic ARE for every day strictly before classicAreStartDay', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null });
    const startDay = Math.floor(result.classicAreStartDay);
    for (let day = 0; day < startDay; day += 5) {
      expect(result.dailySeries[day]?.classicAre.are).toBe(0);
    }
  });
});

describe('Invariants — pas d’ARE après épuisement des droits', () => {
  it('pays classic ARE for at most the overridden entitlement, then stays at zero', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: null,
      officialAREEntitlementDaysOverride: 30,
      simulationHorizonMode: 'manual',
      simulationHorizonMonths: 30,
    });
    const exhaustionDay = Math.round(result.classicAreExhaustionDay ?? 0);
    // +2 jours de marge pour dépasser la coupure fractionnaire exacte
    // (classicAreExhaustionDay n'est pas un entier).
    const atExhaustion = result.dailySeries[Math.min(result.dailySeries.length - 1, exhaustionDay + 2)];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, exhaustionDay + 60)];
    expect(atExhaustion).toBeDefined();
    expect(wellAfter).toBeDefined();
    if (atExhaustion && wellAfter) {
      expectMoneyClose(atExhaustion.classicAre.are, wellAfter.classicAre.are, 0.01);
    }
  });
});

describe('Invariants — pas d’ASP après 365 jours de CSP', () => {
  it('stops ASP at day 365 with a short affiliation (no rights left for ARE-after-CSP)', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, currentEmployerSeniorityMonths: 12 });
    const at365 = result.dailySeries[CSP_MAX_DAYS];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, CSP_MAX_DAYS + 60)];
    expect(at365).toBeDefined();
    expect(wellAfter).toBeDefined();
    if (at365 && wellAfter) expectMoneyClose(at365.csp.asp, wellAfter.csp.asp, 0.01);
    if (wellAfter) expectMoneyClose(wellAfter.csp.are, 0, 0.01);
  });

  it('switches from ASP to ARE-after-CSP at day 365 with a longer affiliation (remaining rights available)', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, currentEmployerSeniorityMonths: 36 });
    expect(result.cspAreAfterCspApplicable).toBe(true);
    const at365 = result.dailySeries[CSP_MAX_DAYS];
    const wellAfter = result.dailySeries[Math.min(result.dailySeries.length - 1, CSP_MAX_DAYS + 60)];
    expect(at365).toBeDefined();
    expect(wellAfter).toBeDefined();
    if (at365 && wellAfter) {
      expectMoneyClose(at365.csp.asp, wellAfter.csp.asp, 0.01); // ASP figée après 365 jours
      expect(wellAfter.csp.are).toBeGreaterThan(0); // ARE après CSP prend le relais
    }
  });
});

describe('Invariants — benefitsOnlyTotal exclut toujours newSalary, withNewSalaryTotal l’inclut', () => {
  it('reconstructs benefitsOnlyTotal exactly from its components, with no newSalary term', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const last = result.dailySeries[result.dailySeries.length - 1];
    expect(last).toBeDefined();
    if (last) {
      const reconstructedCsp = last.csp.paidLeave + last.csp.notice + last.csp.asp + last.csp.are + last.csp.reclassementPrime + last.csp.idr;
      expectMoneyClose(reconstructedCsp, last.csp.benefitsOnlyTotal, 0.01);
      expectMoneyClose(last.csp.benefitsOnlyTotal + last.csp.newSalary, last.csp.withNewSalaryTotal, 0.01);
      expect(last.csp.newSalary).toBeGreaterThan(0);
    }
  });
});

describe('Invariants — écart cumulé et option gagnante cohérents', () => {
  it('keeps cumulativeDifference equal to cspCumulative - areCumulative for every month', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    for (const month of result.monthlySeries) {
      expectMoneyClose(
        month.cumulativeDifference,
        month.csp.benefitsOnlyCumulativeTotal - month.classicAre.benefitsOnlyCumulativeTotal,
        0.01,
      );
    }
  });

  it('keeps winningScenario consistent with the sign of cumulativeDifference', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    for (const month of result.monthlySeries) {
      if (month.winningScenario === 'CSP') {
        expect(month.cumulativeDifference).toBeGreaterThanOrEqual(-0.02);
      } else if (month.winningScenario === 'ARE + préavis') {
        expect(month.cumulativeDifference).toBeLessThanOrEqual(0.02);
      } else {
        expect(Math.abs(month.cumulativeDifference)).toBeLessThan(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 15. Cas limites
// ---------------------------------------------------------------------------

describe('Cas limites', () => {
  it('handles a zero salary without crashing, NaN, or Infinity', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 0, monthsBeforeNewJob: null });
    expect(result.sjr).toBe(0);
    expect(Number.isFinite(result.aspDaily)).toBe(true);
    expect(Number.isFinite(result.baseAreDaily)).toBe(true);
    for (const point of result.dailySeries) {
      expect(Number.isFinite(point.csp.benefitsOnlyTotal)).toBe(true);
      expect(Number.isFinite(point.classicAre.benefitsOnlyTotal)).toBe(true);
      expect(Number.isNaN(point.csp.benefitsOnlyTotal)).toBe(false);
    }
  });

  it('normalizes negative paid-leave days to zero rather than propagating a negative amount', () => {
    const result = runSimulation({ ...BASE_INPUT, remainingPaidLeaveDays: -5, monthsBeforeNewJob: null });
    expect(result.paidLeaveAmount).toBe(0);
    expect(result.paidLeaveDeferralDays).toBe(0);
  });

  it('normalizes a negative months-before-new-job to an immediate resumption rather than a negative date', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: -1, newMonthlyGrossSalary: 3500 });
    expect(result.hasNewJob).toBe(true);
    expect(result.newJobStartDay).toBe(0);
    expect(Number.isNaN(result.newJobStartDay)).toBe(false);
    for (const point of result.dailySeries) {
      expect(Number.isFinite(point.csp.benefitsOnlyTotal)).toBe(true);
    }
  });

  it('keeps the resumed salary at zero when no resumption is planned, without error', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, newMonthlyGrossSalary: null });
    expect(result.hasNewJob).toBe(false);
    const last = result.dailySeries[result.dailySeries.length - 1];
    expect(last?.csp.newSalary ?? -1).toBe(0);
  });

  it('keeps the reclassement prime eligible for a CDI even when the contract duration is null', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDI',
      newJobContractDurationMonths: null,
    });
    expect(result.reclassementPrime.eligible).toBe(true);
    expect(Number.isNaN(result.reclassementPrime.primeTotal)).toBe(false);
  });

  it('makes the reclassement prime non-eligible (not NaN) for a CDD with a null duration', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDD',
      newJobContractDurationMonths: null,
    });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.reclassementPrime.primeTotal).toBe(0);
    expect(Number.isNaN(result.reclassementPrime.primeTotal)).toBe(false);
  });

  it('applies the correct age-based entitlement ceiling and degressivity eligibility across the 54/55/56/57 boundary', () => {
    expect(getAREEntitlementDays(54)).toBe(548);
    expect(getAREEntitlementDays(55)).toBe(685);
    expect(getAREEntitlementDays(56)).toBe(685);
    expect(getAREEntitlementDays(57)).toBe(822);

    const at54 = runSimulation({ ...BASE_INPUT, age: 54, currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null });
    const at55 = runSimulation({ ...BASE_INPUT, age: 55, currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null });
    const at56 = runSimulation({ ...BASE_INPUT, age: 56, currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null });
    const at57 = runSimulation({ ...BASE_INPUT, age: 57, currentMonthlyGrossSalary: 6000, monthsBeforeNewJob: null });

    expect(at54.areDegressiveApplicableClassic).toBe(true);
    expect(at55.areDegressiveApplicableClassic).toBe(false);
    expect(at56.areDegressiveApplicableClassic).toBe(false);
    expect(at57.areDegressiveApplicableClassic).toBe(false);
  });
});
