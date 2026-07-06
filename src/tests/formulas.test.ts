import { describe, expect, it } from 'vitest';
import {
  calculateAREDailyForIndemnizedDay,
  calculateAREEntitlementDays,
  calculateASPDaily,
  calculateBaseAREDaily,
  getAREEntitlementDays,
  runSimulation,
} from '../lib/calculationEngine';
import {
  ARE_MAX_RATE,
  DAYS_PER_MONTH,
  DEGRESSIVE_ARE_FLOOR_DAILY,
  DEGRESSIVE_ARE_REDUCTION_RATE,
  NOTICE_CONTRIBUTION_CAP_MONTHS,
  WAITING_PERIOD_DAYS,
} from '../lib/regulatoryConstants';
import { BASE_INPUT, expectDayClose, expectMoneyClose, monthsToDays } from './testHelpers';

// ---------------------------------------------------------------------------
// 3. Cas de base — formules (SJR, ASP, ARE)
// ---------------------------------------------------------------------------

describe('Formules de base — SJR / ASP / ARE', () => {
  it('calculates estimated SJR from monthly gross salary (3000 €)', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000 });
    expect(result.annualReferenceSalary).toBe(36000);
    expectMoneyClose(result.sjr, 98.63, 0.01);
  });

  it('pays ASP at 75% of the SJR when seniority is at least one year', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000, seniorityAtLeastOneYear: true });
    expectMoneyClose(result.aspDaily, 73.97, 0.05);
    expectMoneyClose(result.aspDaily * (365 / 12), 2250, 5);
  });

  it('retains the higher of the two ARE options (57% of SJR beats 40.4% + fixed part here)', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000 });
    expectMoneyClose(result.baseAreDaily, 56.22, 0.05);
    expect(result.baseAreDaily).toBeLessThan(result.aspDaily);
  });

  it('never lets ARE exceed 75% of the SJR, even for very low salaries where the daily minimum would otherwise dominate', () => {
    // Salaire très bas : le minimum ARE (32.13 €/j) dépasserait 75% du SJR si le
    // plafond final n'était pas appliqué après le max(option1, option2, minimum).
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 400 });
    expect(result.baseAreDaily).toBeLessThanOrEqual(ARE_MAX_RATE * result.sjr + 0.001);
  });

  it('falls back ASP to the base ARE rate when seniority is under one year (no 75% SJR floor)', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000, seniorityAtLeastOneYear: false });
    expectMoneyClose(result.aspDaily, result.baseAreDaily, 0.05);
    expect(result.aspDaily).toBeLessThan(0.75 * result.sjr - 1);
  });
});

// ---------------------------------------------------------------------------
// 4. Congés payés
// ---------------------------------------------------------------------------

describe('Congés payés', () => {
  it('values paid leave as days × SJR (28 jours)', () => {
    const result = runSimulation({ ...BASE_INPUT, remainingPaidLeaveDays: 28 });
    expectMoneyClose(result.paidLeaveAmount, 2762, 5);
  });

  it('caps the paid-leave deferral at 30 days while still paying the full amount for 45 days', () => {
    const result = runSimulation({ ...BASE_INPUT, remainingPaidLeaveDays: 45 });
    expectMoneyClose(result.paidLeaveAmount, 45 * result.sjr, 1);
    expect(result.paidLeaveDeferralDays).toBe(30);
  });

  it('handles zero paid-leave days without producing NaN or negative amounts', () => {
    const result = runSimulation({ ...BASE_INPUT, remainingPaidLeaveDays: 0 });
    expect(result.paidLeaveAmount).toBe(0);
    expect(result.paidLeaveDeferralDays).toBe(0);
    expect(Number.isNaN(result.paidLeaveAmount)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Préavis
// ---------------------------------------------------------------------------

describe('Préavis', () => {
  it('pays the full notice period to the employee in the ARE + préavis scenario (3 mois)', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 3 });
    expectMoneyClose(result.areNoticePaidToEmployee, 9000, 1);
  });

  it('transfers the notice period to France Travail under the CSP, up to the 3-month cap, when seniority >= 1 year', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 3, seniorityAtLeastOneYear: true });
    expectMoneyClose(result.cspNoticePaidToEmployee, 0, 1);
    expectMoneyClose(result.noticePaidToFranceTravail, 9000, 1);
  });

  it('pays the excess above the 3-month cap directly to the employee under the CSP (4 mois)', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 4, seniorityAtLeastOneYear: true });
    expectMoneyClose(result.noticePaidToFranceTravail, 9000, 1);
    expectMoneyClose(result.cspNoticePaidToEmployee, 3000, 1);
    expect(NOTICE_CONTRIBUTION_CAP_MONTHS).toBe(3);
  });

  it('transfers the full notice to France Travail when it is under the 3-month cap (2 mois)', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 2, seniorityAtLeastOneYear: true });
    expectMoneyClose(result.noticePaidToFranceTravail, 6000, 1);
    expectMoneyClose(result.cspNoticePaidToEmployee, 0, 1);
  });

  it('pays the full notice period to the employee under the CSP when seniority is under one year (no transfer rule)', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 3, seniorityAtLeastOneYear: false });
    expectMoneyClose(result.cspNoticePaidToEmployee, 9000, 1);
    expectMoneyClose(result.noticePaidToFranceTravail, 0, 1);
  });
});

// ---------------------------------------------------------------------------
// 6. Début ARE classique
// ---------------------------------------------------------------------------

describe('Date de début ARE classique', () => {
  it('starts classic ARE after notice + paid-leave deferral + the 7-day waiting period', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 3, remainingPaidLeaveDays: 28, monthsBeforeNewJob: null });
    const expectedDays = monthsToDays(3) + 28 + WAITING_PERIOD_DAYS;
    expectDayClose(result.classicAreStartDay, expectedDays, 0.1);
    expectDayClose(result.classicAreStartDay, 126.25, 0.5);
    expectDayClose(result.classicAreStartDay / DAYS_PER_MONTH, 4.15, 0.05);
  });

  it('starts classic ARE sooner when there is no paid leave to defer', () => {
    const result = runSimulation({ ...BASE_INPUT, noticePeriodMonths: 3, remainingPaidLeaveDays: 0, monthsBeforeNewJob: null });
    expectDayClose(result.classicAreStartDay, 98.25, 0.5);
    expectDayClose(result.classicAreStartDay / DAYS_PER_MONTH, 3.2, 0.05);
  });

  it('never pays classic ARE if the new job starts before the estimated ARE start date', () => {
    const result = runSimulation({
      ...BASE_INPUT,
      noticePeriodMonths: 3,
      remainingPaidLeaveDays: 28,
      monthsBeforeNewJob: 4,
      newMonthlyGrossSalary: 3500,
    });
    expect(result.newJobStartDay).toBeLessThan(result.classicAreStartDay);
    expect(result.classicAreNeverStarted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Durée des droits ARE
// ---------------------------------------------------------------------------

describe('Durée des droits ARE', () => {
  it('estimates ARE duration from a 12-month affiliation as ~365 days, not the 548-day age ceiling', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 12,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expectDayClose(result.totalAREEntitlementDays, 365, 1);
    expect(result.totalAREEntitlementDays).not.toBe(548);
  });

  it('estimates ARE duration from an 8-month affiliation as ~243 days', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 8,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expectDayClose(result.totalAREEntitlementDays, 243, 1);
  });

  it('flags affiliation as insufficient under 6 months and grants no new rights', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 5,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.affiliationInsufficient).toBe(true);
    expect(result.totalAREEntitlementDays).toBe(0);
  });

  it('uses existing remaining rights when affiliation is insufficient but rights are already open', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 5,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 120,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.affiliationInsufficient).toBe(true);
    expect(result.totalAREEntitlementDays).toBe(120);
  });

  it('caps the reference period at 24 months under 55, giving a 548-day maximum', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.referencePeriodMonths).toBe(24);
    expect(result.totalAREEntitlementDays).toBe(548);
  });

  it('gives a 685-day maximum between 55 and 56 (36-month reference period)', () => {
    const result = calculateAREEntitlementDays({
      age: 55,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.referencePeriodMonths).toBe(36);
    expect(result.totalAREEntitlementDays).toBe(685);
  });

  it('gives an 822-day maximum from age 57', () => {
    const result = calculateAREEntitlementDays({
      age: 57,
      currentEmployerSeniorityMonths: 36,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.totalAREEntitlementDays).toBe(822);
  });

  it('uses the officially notified duration exactly, ignoring the automatic estimate', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 3,
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 0,
      officialAREEntitlementDaysOverride: 300,
    });
    expect(result.totalAREEntitlementDays).toBe(300);
    expect(result.usedOfficialOverride).toBe(true);
  });

  it('keeps the larger of (newly estimated rights) vs (already-open remaining rights) — new rights win here', () => {
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 12, // -> ~365 jours de nouveaux droits
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 120,
      officialAREEntitlementDaysOverride: null,
    });
    expectDayClose(result.totalAREEntitlementDays, 365, 1);
  });

  it('keeps the larger of (newly estimated rights) vs (already-open remaining rights) — remaining rights win here', () => {
    // Note d'implémentation : la spec d'origine demandait 120 jours de "nouveaux
    // droits", mais le seuil de suffisance d'affiliation (6 mois -> ~182 jours)
    // rend cette valeur inatteignable par la voie normale (elle basculerait sur
    // la branche "affiliation insuffisante", qui ignore justement les nouveaux
    // droits). On teste donc la même règle (le plus grand des deux l'emporte)
    // avec des valeurs réellement atteignables.
    const result = calculateAREEntitlementDays({
      age: 45,
      currentEmployerSeniorityMonths: 7, // -> ~213 jours de nouveaux droits
      previousEmployerAffiliationMonths: 0,
      existingARERemainingDays: 365,
      officialAREEntitlementDaysOverride: null,
    });
    expect(result.totalAREEntitlementDays).toBe(365);
  });
});

// ---------------------------------------------------------------------------
// 8. Dégressivité haut revenu
// ---------------------------------------------------------------------------

describe('Dégressivité ARE — hauts revenus', () => {
  it('does not apply degressivity below the SJR threshold (salaire 3000 €)', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 3000, age: 45 });
    expect(result.sjr).toBeLessThan(162.4);
    expect(result.areDegressiveApplicableClassic).toBe(false);
  });

  it('reduces ARE to the floor rate for high earners above the SJR threshold (salaire 6000 €)', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 6000, age: 45 });
    expectMoneyClose(result.baseAreDaily, 112.44, 0.1);
    expect(result.areDegressiveApplicableClassic).toBe(true);
    expectMoneyClose(result.areDailyAfterDegressivityClassic ?? 0, DEGRESSIVE_ARE_FLOOR_DAILY, 0.05);
  });

  it('never applies degressivity from age 55, even for high earners', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 6000, age: 55 });
    expect(result.areDegressiveApplicableClassic).toBe(false);
    expect(result.areDailyAfterDegressivityClassic).toBeNull();
  });

  it('starts classic ARE degressivity only from the 183rd indemnized day (0-based day counter: day 182 is still full rate, day 183 is already reduced)', () => {
    const baseAREDaily = 112.44;
    const sjr = 197.26;
    const stillFullRate = calculateAREDailyForIndemnizedDay({
      baseAREDaily,
      sjr,
      age: 45,
      areIndemnizedDay: 182,
      scenario: 'classic_are',
    });
    const alreadyReduced = calculateAREDailyForIndemnizedDay({
      baseAREDaily,
      sjr,
      age: 45,
      areIndemnizedDay: 183,
      scenario: 'classic_are',
    });
    expectMoneyClose(stillFullRate, baseAREDaily, 0.01);
    expectMoneyClose(alreadyReduced, Math.max(baseAREDaily * (1 - DEGRESSIVE_ARE_REDUCTION_RATE), DEGRESSIVE_ARE_FLOOR_DAILY), 0.01);
  });

  it('never reduces the CSP ASP, regardless of income level', () => {
    const result = runSimulation({ ...BASE_INPUT, currentMonthlyGrossSalary: 6000, age: 45, monthsBeforeNewJob: null });
    const dayInAsp = 200;
    const point = result.dailySeries[dayInAsp];
    const prevPoint = result.dailySeries[dayInAsp - 1];
    expect(point).toBeDefined();
    expect(prevPoint).toBeDefined();
    if (point && prevPoint) {
      expectMoneyClose(point.csp.asp - prevPoint.csp.asp, result.aspDaily, 0.01);
    }
  });

  it('can degress the ARE-after-CSP component while leaving the already-paid ASP untouched', () => {
    // Salaire haut revenu + affiliation longue -> des droits ARE restent après
    // les 365 jours de CSP, immédiatement dégressifs car le compteur cumulé
    // CSP + ARE (365 jours) dépasse déjà le seuil de 243 jours.
    const result = runSimulation({
      ...BASE_INPUT,
      currentMonthlyGrossSalary: 6000,
      age: 45,
      currentEmployerSeniorityMonths: 36,
      monthsBeforeNewJob: null,
    });
    expect(result.cspAreAfterCspApplicable).toBe(true);
    expect(result.areDegressiveApplicableAfterCsp).toBe(true);
    expectMoneyClose(result.areDailyAfterDegressivityAfterCsp ?? 0, DEGRESSIVE_ARE_FLOOR_DAILY, 0.05);

    // L'ASP versée pendant les 365 jours de CSP reste au taux plein, non dégressif.
    const dayInAsp = 200;
    const point = result.dailySeries[dayInAsp];
    const prevPoint = result.dailySeries[dayInAsp - 1];
    if (point && prevPoint) {
      expectMoneyClose(point.csp.asp - prevPoint.csp.asp, result.aspDaily, 0.01);
    }
  });
});

describe('getAREEntitlementDays — bornes d’âge', () => {
  it('returns 548 days under 55', () => {
    expect(getAREEntitlementDays(45)).toBe(548);
  });
  it('returns 685 days between 55 and 56', () => {
    expect(getAREEntitlementDays(55)).toBe(685);
    expect(getAREEntitlementDays(56)).toBe(685);
  });
  it('returns 822 days from 57', () => {
    expect(getAREEntitlementDays(57)).toBe(822);
  });
});

describe('calculateBaseAREDaily / calculateASPDaily — sanity checks', () => {
  it('matches the reference SJR = 98.63 case', () => {
    expectMoneyClose(calculateBaseAREDaily(98.63), 56.22, 0.05);
  });
  it('matches the reference ASP case with seniority', () => {
    expectMoneyClose(calculateASPDaily(98.63, 56.22, true), 73.97, 0.05);
  });
});
