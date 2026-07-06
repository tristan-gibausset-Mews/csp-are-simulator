import { describe, expect, it } from 'vitest';
import { runSimulation } from '../lib/calculationEngine';
import { DAYS_PER_MONTH } from '../lib/regulatoryConstants';
import { BASE_INPUT, expectDayClose, expectMoneyClose } from './testHelpers';

// ---------------------------------------------------------------------------
// 9. Reprise d'emploi
// ---------------------------------------------------------------------------

describe('Reprise d’emploi — avant le début de l’ARE classique (mois 4)', () => {
  const input = {
    ...BASE_INPUT,
    currentMonthlyGrossSalary: 3000,
    remainingPaidLeaveDays: 28,
    noticePeriodMonths: 3,
    monthsBeforeNewJob: 4,
    newMonthlyGrossSalary: 3500,
    newJobContractType: 'CDI' as const,
    seniorityAtLeastOneYear: true,
  };
  const result = runSimulation(input);

  it('does not pay classic ARE if the new job starts before ARE begins', () => {
    expectDayClose(result.classicAreStartDay / DAYS_PER_MONTH, 4.15, 0.05);
    expect(result.classicAreNeverStarted).toBe(true);
    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint?.classicAre.are ?? -1).toBe(0);
    const event = result.events.find((e) => e.id === 'classic_are_never_started');
    expect(event).toBeDefined();
  });

  it('keeps the ARE + préavis scenario limited to notice + paid leave (~11 762 € hors nouveau salaire)', () => {
    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint).toBeDefined();
    if (lastPoint) {
      expectMoneyClose(lastPoint.classicAre.benefitsOnlyTotal, 11762, 5);
    }
  });

  it('stops ASP when a new job starts', () => {
    expect(result.cspAspStoppedByNewJob).toBe(true);
    const newJobStartDay = result.newJobStartDay ?? 0;
    const before = result.dailySeries[Math.round(newJobStartDay) - 5];
    const afterA = result.dailySeries[Math.round(newJobStartDay) + 5];
    const afterB = result.dailySeries[Math.round(newJobStartDay) + 35];
    expect(before).toBeDefined();
    expect(afterA).toBeDefined();
    expect(afterB).toBeDefined();
    if (before && afterA && afterB) {
      expect(before.csp.asp).toBeGreaterThan(0);
      expectMoneyClose(afterA.csp.asp, afterB.csp.asp, 0.01);
    }
    expectMoneyClose(result.cspAspEndDay, 121.67, 0.5);
    const stopEvent = result.events.find((e) => e.type === 'asp_stop' && e.label === 'Arrêt ASP');
    expect(stopEvent).toBeDefined();
  });

  it('makes the reclassement prime eligible, worth ~9 000 € in two 50/50 payments', () => {
    expect(result.chosenAid).toBe('RECLASSEMENT_PRIME');
    expect(result.reclassementPrime.eligible).toBe(true);
    expectMoneyClose(result.reclassementPrime.remainingAspRightsAtNewJob, 18000, 5);
    expectMoneyClose(result.reclassementPrime.primeTotal, 9000, 5);
    expectMoneyClose(result.reclassementPrime.firstPaymentAmount, 4500, 3);
    expectDayClose((result.reclassementPrime.firstPaymentDay ?? 0) / DAYS_PER_MONTH, 4, 0.1);
    expectDayClose((result.reclassementPrime.secondPaymentDay ?? 0) / DAYS_PER_MONTH, 7, 0.2);
  });

  it('keeps the CSP total (paid leave + ASP + prime, no new salary) at ~20 762 €, a ~9 000 € edge over ARE + préavis', () => {
    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint).toBeDefined();
    if (lastPoint) {
      expectMoneyClose(lastPoint.csp.benefitsOnlyTotal, 20762, 5);
      const areTotal = lastPoint.classicAre.benefitsOnlyTotal;
      expectMoneyClose(lastPoint.csp.benefitsOnlyTotal - areTotal, 9000, 6);
    }
  });
});

describe('Reprise d’emploi — après le début de l’ARE classique (mois 8)', () => {
  const result = runSimulation({
    ...BASE_INPUT,
    currentMonthlyGrossSalary: 3000,
    noticePeriodMonths: 3,
    remainingPaidLeaveDays: 0,
    monthsBeforeNewJob: 8,
    newMonthlyGrossSalary: 3500,
  });

  it('pays classic ARE from its start date until the new job stops it', () => {
    expectDayClose(result.classicAreStartDay, 98.25, 0.5);
    expect(result.classicAreNeverStarted).toBe(false);
    expect(result.classicAreStoppedByNewJob).toBe(true);
    const newJobStartDay = result.newJobStartDay ?? 0;
    const before = result.dailySeries[Math.round(newJobStartDay) - 5];
    const afterA = result.dailySeries[Math.round(newJobStartDay) + 5];
    const afterB = result.dailySeries[Math.round(newJobStartDay) + 35];
    expect(before).toBeDefined();
    if (before) expect(before.classicAre.are).toBeGreaterThan(0);
    if (afterA && afterB) expectMoneyClose(afterA.classicAre.are, afterB.classicAre.are, 0.01);
    const event = result.events.find((e) => e.id === 'classic_are_stopped');
    expect(event).toBeDefined();
  });
});

describe('Pas de reprise d’emploi', () => {
  const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, newMonthlyGrossSalary: null });

  it('never pays a new salary, a reclassement prime, or an IDR', () => {
    expect(result.hasNewJob).toBe(false);
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.idr.eligible).toBe(false);
    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint?.csp.newSalary ?? -1).toBe(0);
    expect(lastPoint?.classicAre.newSalary ?? -1).toBe(0);
  });

  it('continues CSP up to 365 days, then classic ARE resumes after notice + deferrals + waiting period, without ever crashing', () => {
    expect(result.cspAspEndDay).toBe(365);
    expect(result.classicAreNeverStarted).toBe(false);
    expect(Number.isFinite(result.classicAreStartDay)).toBe(true);
    for (const point of result.dailySeries) {
      expect(Number.isFinite(point.csp.benefitsOnlyTotal)).toBe(true);
      expect(Number.isFinite(point.classicAre.benefitsOnlyTotal)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Prime de reclassement — éligibilité
// ---------------------------------------------------------------------------

describe('Prime de reclassement — éligibilité', () => {
  it('is eligible for a CDI resumed before the 10th month of CSP', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newJobContractType: 'CDI' });
    expect(result.reclassementPrime.eligible).toBe(true);
    expect(result.reclassementPrime.primeTotal).toBeGreaterThan(0);
  });

  it('is eligible for a 6-month CDD resumed before the 10th month of CSP', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDD',
      newJobContractDurationMonths: 6,
    });
    expect(result.reclassementPrime.eligible).toBe(true);
  });

  it('is eligible for a 6-month INTERIM contract resumed before the 10th month of CSP', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'INTERIM',
      newJobContractDurationMonths: 6,
    });
    expect(result.reclassementPrime.eligible).toBe(true);
  });

  it('is not eligible for a 3-month CDD (too short to count as durable)', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDD',
      newJobContractDurationMonths: 3,
    });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.reclassementPrime.primeTotal).toBe(0);
  });

  it('is not eligible for a resumption after the 10th month of CSP', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 11, newJobContractType: 'CDI' });
    expect(result.reclassementPrime.eligible).toBe(false);
  });

  it('is not eligible for a resumption after the CSP itself has ended', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 13, newJobContractType: 'CDI' });
    expect(result.reclassementPrime.eligible).toBe(false);
  });

  it('is not eligible when seniority is under one year', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDI',
      seniorityAtLeastOneYear: false,
    });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.reclassementPrime.primeTotal).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 11. IDR — indemnité différentielle de reclassement
// ---------------------------------------------------------------------------

describe('IDR — indemnité différentielle de reclassement', () => {
  it('is not applicable when the new salary is higher than or equal to the previous one', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      newMonthlyGrossSalary: 3500,
      sameWorkingTime: true,
      monthsBeforeNewJob: 4,
    });
    expect(result.idr.eligible).toBe(false);
    expect(result.idr.idrTotal).toBe(0);
  });

  it('is applicable and capped at 50% of remaining ASP rights when the new salary is lower', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      newMonthlyGrossSalary: 2500,
      sameWorkingTime: true,
      monthsBeforeNewJob: 4,
      newJobContractType: 'CDD',
      newJobContractDurationMonths: 3, // pas de prime concurrente pour isoler l'IDR
    });
    expect(result.idr.eligible).toBe(true);
    expectMoneyClose(result.idr.idrDaily * (365 / 12), 500, 1);
    expect(result.idr.idrTotal).toBeLessThanOrEqual(result.idr.idrTotalCap + 0.01);
  });

  it('is not applicable when the new job has a different working-time quotity', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      newMonthlyGrossSalary: 2500,
      sameWorkingTime: false,
      monthsBeforeNewJob: 4,
    });
    expect(result.idr.eligible).toBe(false);
  });

  it('picks the reclassement prime over the IDR when both are eligible and the prime is worth more', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      newMonthlyGrossSalary: 2500,
      newJobContractType: 'CDI',
      monthsBeforeNewJob: 4,
      sameWorkingTime: true,
    });
    expect(result.reclassementPrime.eligible).toBe(true);
    expect(result.idr.eligible).toBe(true);
    expectMoneyClose(result.reclassementPrime.primeTotal, 9000, 5);
    expect(result.idr.idrTotal).toBeLessThan(result.reclassementPrime.primeTotal);
    expect(result.chosenAid).toBe('RECLASSEMENT_PRIME');
  });

  it('picks the IDR when the reclassement prime is not applicable (short CDD)', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      newMonthlyGrossSalary: 2500,
      newJobContractType: 'CDD',
      newJobContractDurationMonths: 3,
      monthsBeforeNewJob: 4,
      sameWorkingTime: true,
    });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.idr.eligible).toBe(true);
    expect(result.chosenAid).toBe('IDR');
  });
});

// ---------------------------------------------------------------------------
// 12. Nouveau salaire — modes d'affichage
// ---------------------------------------------------------------------------

describe('Nouveau salaire — modes d’affichage', () => {
  it('keeps benefits-only total independent from the new salary amount', () => {
    // benefitsOnlyTotal ne doit dépendre que des indemnités liées à la rupture
    // et au chômage, jamais du montant du nouveau salaire : deux simulations
    // ne différant que par newMonthlyGrossSalary doivent donner un
    // benefitsOnlyTotal strictement identique au même jour.
    const lowSalary = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const highSalary = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 8000 });
    const newJobStartDay = lowSalary.newJobStartDay ?? 0;
    const day = Math.min(lowSalary.dailySeries.length - 1, highSalary.dailySeries.length - 1, Math.round(newJobStartDay + 60));
    const pointLow = lowSalary.dailySeries[day];
    const pointHigh = highSalary.dailySeries[day];
    expect(pointLow).toBeDefined();
    expect(pointHigh).toBeDefined();
    if (pointLow && pointHigh) {
      expect(pointLow.csp.newSalary).toBeGreaterThan(0);
      expect(pointHigh.csp.newSalary).toBeGreaterThan(pointLow.csp.newSalary);
      expectMoneyClose(pointLow.csp.benefitsOnlyTotal, pointHigh.csp.benefitsOnlyTotal, 0.01);
      expectMoneyClose(pointLow.classicAre.benefitsOnlyTotal, pointHigh.classicAre.benefitsOnlyTotal, 0.01);
    }
  });

  it('includes new salary in the with-new-salary total, identically for both scenarios', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: 4, newMonthlyGrossSalary: 3500 });
    const newJobStartDay = result.newJobStartDay ?? 0;
    const day = Math.min(result.dailySeries.length - 1, Math.round(newJobStartDay + 60));
    const point = result.dailySeries[day];
    expect(point).toBeDefined();
    if (point) {
      expectMoneyClose(point.csp.newSalary, point.classicAre.newSalary, 0.01);
      expectMoneyClose(point.csp.benefitsOnlyTotal + point.csp.newSalary, point.csp.withNewSalaryTotal, 0.01);
    }
  });

  it('keeps everything at zero for the new-job fields when no resumption is planned', () => {
    const result = runSimulation({ ...BASE_INPUT, monthsBeforeNewJob: null, newMonthlyGrossSalary: null });
    expect(result.hasNewJob).toBe(false);
    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint?.csp.newSalary ?? -1).toBe(0);
    expect(result.events.some((e) => e.type === 'new_job')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 16. Tests de régression sur cas métier principaux
// ---------------------------------------------------------------------------

describe('Régression — scénario utilisateur principal', () => {
  const input = {
    ...BASE_INPUT,
    currentMonthlyGrossSalary: 3000,
    remainingPaidLeaveDays: 28,
    monthsBeforeNewJob: 4,
    newMonthlyGrossSalary: 3500,
    age: 45,
    seniorityAtLeastOneYear: true,
    noticePeriodMonths: 3,
    newJobContractType: 'CDI' as const,
    sameWorkingTime: true,
    currentEmployerSeniorityMonths: 12,
    previousEmployerAffiliationMonths: 0,
  };

  it('matches every reference figure of the flagship scenario (CSP wins by ~9 000 €)', () => {
    const result = runSimulation(input);
    expectMoneyClose(result.sjr, 98.63, 0.01);
    expectMoneyClose(result.aspDaily, 73.97, 0.05);
    expectMoneyClose(result.baseAreDaily, 56.22, 0.05);
    expectMoneyClose(result.paidLeaveAmount, 2762, 5);
    expectMoneyClose(result.areNoticePaidToEmployee, 9000, 1);
    expectDayClose(result.classicAreStartDay / DAYS_PER_MONTH, 4.15, 0.05);
    expect(result.classicAreNeverStarted).toBe(true);

    const lastPoint = result.dailySeries[result.dailySeries.length - 1];
    expect(lastPoint).toBeDefined();
    if (lastPoint) {
      expectMoneyClose(lastPoint.csp.benefitsOnlyTotal, 20762, 5);
      expectMoneyClose(lastPoint.classicAre.benefitsOnlyTotal, 11762, 5);
      expectMoneyClose(lastPoint.csp.benefitsOnlyTotal - lastPoint.classicAre.benefitsOnlyTotal, 9000, 6);
    }
    const finalDecision = result.decisionPoints[result.decisionPoints.length - 1];
    expect(finalDecision?.winner).toBe('CSP');
  });
});

describe('Régression — même scénario sans reprise d’emploi', () => {
  it('never crashes, pays no prime/IDR, and keeps cumulative totals coherent', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 3000,
      remainingPaidLeaveDays: 28,
      monthsBeforeNewJob: null,
      newMonthlyGrossSalary: null,
      age: 45,
      seniorityAtLeastOneYear: true,
      noticePeriodMonths: 3,
    });
    expect(result.reclassementPrime.eligible).toBe(false);
    expect(result.idr.eligible).toBe(false);
    expect(result.cspAspEndDay).toBe(365);
    for (const point of result.dailySeries) {
      expect(point.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
      expect(point.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Régression — haut salaire sans reprise', () => {
  it('applies a non-degressive ASP and a degressive classic ARE without ever going negative', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 6000,
      age: 45,
      seniorityAtLeastOneYear: true,
      monthsBeforeNewJob: null,
    });
    expect(result.areDegressiveApplicableClassic).toBe(true);
    for (const point of result.dailySeries) {
      expect(point.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
      expect(point.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Régression — bas salaire', () => {
  it('respects the ARE minimum/75% cap and never goes negative, with no degressivity', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 1500,
      age: 45,
      seniorityAtLeastOneYear: true,
      monthsBeforeNewJob: null,
    });
    expect(result.baseAreDaily).toBeLessThanOrEqual(0.75 * result.sjr + 0.01);
    expect(result.areDegressiveApplicableClassic).toBe(false);
    for (const point of result.dailySeries) {
      expect(point.csp.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
      expect(point.classicAre.benefitsOnlyTotal).toBeGreaterThanOrEqual(0);
    }
  });
});
