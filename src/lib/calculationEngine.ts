/**
 * Moteur de calcul du simulateur CSP vs ARE.
 *
 * Toutes les fonctions sont pures et déterministes. Aucun arrondi n'est
 * effectué ici : les arrondis n'ont lieu qu'à l'affichage (voir formatters.ts).
 *
 * Hypothèse de simplification : le SJR (salaire journalier de référence) est
 * approximé à partir du seul salaire mensuel brut renseigné par l'utilisateur :
 *   annualReferenceSalary = currentMonthlyGrossSalary * 12
 *   sjr = annualReferenceSalary / 365
 * Le calcul officiel France Travail est plus complexe (attestation employeur,
 * primes, absences, périodes non travaillées...). Voir le disclaimer affiché
 * dans l'application.
 */

import {
  ABSOLUTE_MAX_SIMULATION_MONTHS,
  ARE_DURATION_DAYS_55_TO_56,
  ARE_DURATION_DAYS_57_PLUS,
  ARE_DURATION_DAYS_UNDER_55,
  ARE_FIXED_PART,
  ARE_MAX_RATE,
  ARE_MIN_DAILY,
  ARE_RATE_OPTION_1,
  ARE_RATE_OPTION_2,
  ASP_RATE,
  CSP_MAX_DAYS,
  DAYS_PER_MONTH,
  DEFAULT_MAX_SIMULATION_MONTHS_55_TO_56,
  DEFAULT_MAX_SIMULATION_MONTHS_57_PLUS,
  DEFAULT_MAX_SIMULATION_MONTHS_UNDER_55,
  DEGRESSIVE_ARE_FLOOR_DAILY,
  DEGRESSIVE_ARE_REDUCTION_RATE,
  DEGRESSIVE_ARE_SJR_THRESHOLD,
  DEGRESSIVE_ARE_START_DAY_AFTER_CSP_TOTAL_INDEMNIZED,
  DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE,
  IDR_MAX_DURATION_MONTHS,
  NOTICE_CONTRIBUTION_CAP_MONTHS,
  PAID_LEAVE_DEFERRAL_CAP_DAYS,
  PRIME_RECLASSEMENT_ELIGIBILITY_LIMIT_MONTH,
  PRIME_RECLASSEMENT_PAYMENT_2_DELAY_DAYS,
  PRIME_RECLASSEMENT_RATE,
  SPECIFIC_DEFERRAL_CAP_DAYS,
  SPECIFIC_DEFERRAL_DIVISOR_2026,
  WAITING_PERIOD_DAYS,
} from './regulatoryConstants';
import type {
  AREEntitlementResult,
  ChosenAid,
  ComparisonRow,
  ContractType,
  CurveInterpretation,
  DailyScenarioCashflow,
  DailySimulationPoint,
  DecisionPoint,
  DisplayMode,
  HorizonInfo,
  IdrResult,
  KeyDateEntry,
  MonthlyCashflow,
  MonthlyScenarioCashflow,
  PaymentPeriod,
  ReclassementPrimeResult,
  ScenarioLabel,
  SimulationEvent,
  SimulationInput,
  SimulationResult,
  WinningScenario,
} from './types';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// ---------------------------------------------------------------------------
// 1. Fonctions de base : ARE, ASP, dégressivité
// ---------------------------------------------------------------------------

/** Durée maximale des droits ARE (en jours) selon l'âge du salarié. */
export function getAREEntitlementDays(age: number): number {
  if (age < 55) return ARE_DURATION_DAYS_UNDER_55;
  if (age < 57) return ARE_DURATION_DAYS_55_TO_56;
  return ARE_DURATION_DAYS_57_PLUS;
}

/** ARE journalière de base, avant toute dégressivité. */
export function calculateBaseAREDaily(sjr: number): number {
  const option1 = ARE_RATE_OPTION_1 * sjr + ARE_FIXED_PART;
  const option2 = ARE_RATE_OPTION_2 * sjr;
  const rawARE = Math.max(option1, option2, ARE_MIN_DAILY);
  return Math.min(rawARE, ARE_MAX_RATE * sjr);
}

/** ASP journalière du CSP. Jamais dégressive. */
export function calculateASPDaily(
  sjr: number,
  baseAREDaily: number,
  seniorityAtLeastOneYear: boolean,
): number {
  if (seniorityAtLeastOneYear) {
    return Math.max(ASP_RATE * sjr, baseAREDaily);
  }
  return baseAREDaily;
}

export interface AREDailyForIndemnizedDayParams {
  baseAREDaily: number;
  sjr: number;
  age: number;
  areIndemnizedDay: number;
  scenario: 'classic_are' | 'after_csp';
  totalCspAndAreIndemnizedDay?: number;
}

/**
 * ARE journalière effective pour un jour d'indemnisation ARE donné, en tenant
 * compte de la dégressivité.
 *
 * Règle métier importante : l'ASP du CSP n'est jamais dégressive ; seule l'ARE
 * peut être réduite. Lorsque l'ARE reprend après un CSP, la dégressivité ne
 * peut réduire que les jours d'ARE versés après le CSP, jamais l'ASP déjà
 * versée. Le seuil de déclenchement (243 jours) s'apprécie sur un compteur
 * cumulé CSP + ARE, car l'indemnisation continue d'un point de vue "durée
 * totale indemnisée" même si la nature de l'allocation change (ASP -> ARE).
 */
export function calculateAREDailyForIndemnizedDay({
  baseAREDaily,
  sjr,
  age,
  areIndemnizedDay,
  scenario,
  totalCspAndAreIndemnizedDay,
}: AREDailyForIndemnizedDayParams): number {
  const eligibleByAgeAndSjr = age < 55 && sjr > DEGRESSIVE_ARE_SJR_THRESHOLD;
  if (!eligibleByAgeAndSjr) return baseAREDaily;

  const degressiveDaily = Math.max(
    baseAREDaily * (1 - DEGRESSIVE_ARE_REDUCTION_RATE),
    DEGRESSIVE_ARE_FLOOR_DAILY,
  );

  if (scenario === 'classic_are') {
    return areIndemnizedDay >= DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE ? degressiveDaily : baseAREDaily;
  }

  const totalDay = totalCspAndAreIndemnizedDay ?? areIndemnizedDay;
  return totalDay >= DEGRESSIVE_ARE_START_DAY_AFTER_CSP_TOTAL_INDEMNIZED ? degressiveDaily : baseAREDaily;
}

// ---------------------------------------------------------------------------
// 2. Durée des droits ARE (estimation à partir de l'affiliation)
// ---------------------------------------------------------------------------

export interface AREEntitlementParams {
  age: number;
  currentEmployerSeniorityMonths: number;
  previousEmployerAffiliationMonths: number;
  existingARERemainingDays: number;
  officialAREEntitlementDaysOverride: number | null;
}

/**
 * Estime la durée totale des droits ARE, en jours.
 *
 * Si une durée officielle notifiée par France Travail est renseignée, elle
 * remplace intégralement l'estimation. Sinon, l'estimation repose sur les
 * mois d'affiliation déclarés (employeur actuel + employeurs précédents),
 * plafonnés à la période de référence (24 mois sous 55 ans, 36 mois à partir
 * de 55 ans) puis à la durée maximale de droits selon l'âge. Le droit
 * d'option et le rechargement des droits ne sont pas modélisés dans cette
 * version.
 */
export function calculateAREEntitlementDays(params: AREEntitlementParams): AREEntitlementResult {
  const {
    age,
    currentEmployerSeniorityMonths,
    previousEmployerAffiliationMonths,
    existingARERemainingDays,
    officialAREEntitlementDaysOverride,
  } = params;

  const referencePeriodMonths = age < 55 ? 24 : 36;
  const maxEntitlementDaysByAge = getAREEntitlementDays(age);
  const estimatedAffiliationMonths = currentEmployerSeniorityMonths + previousEmployerAffiliationMonths;
  const cappedAffiliationMonths = Math.min(estimatedAffiliationMonths, referencePeriodMonths);

  if (officialAREEntitlementDaysOverride !== null) {
    return {
      totalAREEntitlementDays: officialAREEntitlementDaysOverride,
      usedOfficialOverride: true,
      affiliationInsufficient: false,
      estimatedAffiliationMonths,
      cappedAffiliationMonths,
      referencePeriodMonths,
      maxEntitlementDaysByAge,
      estimatedEntitlementDays: cappedAffiliationMonths * DAYS_PER_MONTH,
      newEntitlementDays: 0,
    };
  }

  const affiliationInsufficient = cappedAffiliationMonths < 6;

  if (affiliationInsufficient) {
    return {
      totalAREEntitlementDays: existingARERemainingDays > 0 ? existingARERemainingDays : 0,
      usedOfficialOverride: false,
      affiliationInsufficient: true,
      estimatedAffiliationMonths,
      cappedAffiliationMonths,
      referencePeriodMonths,
      maxEntitlementDaysByAge,
      estimatedEntitlementDays: 0,
      newEntitlementDays: 0,
    };
  }

  const estimatedEntitlementDays = cappedAffiliationMonths * DAYS_PER_MONTH;
  const newEntitlementDays = Math.min(estimatedEntitlementDays, maxEntitlementDaysByAge);
  const totalAREEntitlementDays = Math.max(existingARERemainingDays, newEntitlementDays);

  return {
    totalAREEntitlementDays,
    usedOfficialOverride: false,
    affiliationInsufficient: false,
    estimatedAffiliationMonths,
    cappedAffiliationMonths,
    referencePeriodMonths,
    maxEntitlementDaysByAge,
    estimatedEntitlementDays,
    newEntitlementDays,
  };
}

// ---------------------------------------------------------------------------
// 3. Prime de reclassement CSP et IDR
// ---------------------------------------------------------------------------

export interface ReclassementPrimeParams {
  seniorityAtLeastOneYear: boolean;
  newJobStartDay: number | null;
  newJobContractType: ContractType;
  newJobContractDurationMonths: number | null;
  aspDaily: number;
}

function isDurableContract(type: ContractType, durationMonths: number | null): boolean {
  if (type === 'CDI') return true;
  if (type === 'CDD' || type === 'INTERIM') return (durationMonths ?? 0) >= 6;
  return false;
}

/** Prime de reclassement CSP en cas de reprise rapide d'un emploi durable. */
export function calculateReclassementPrime({
  seniorityAtLeastOneYear,
  newJobStartDay,
  newJobContractType,
  newJobContractDurationMonths,
  aspDaily,
}: ReclassementPrimeParams): ReclassementPrimeResult {
  const eligibilityLimitDay = PRIME_RECLASSEMENT_ELIGIBILITY_LIMIT_MONTH * DAYS_PER_MONTH;

  const remainingAspRightsAtNewJob =
    newJobStartDay !== null ? Math.max(0, CSP_MAX_DAYS - newJobStartDay) * aspDaily : 0;
  const primeTotal = PRIME_RECLASSEMENT_RATE * remainingAspRightsAtNewJob;

  const eligible =
    seniorityAtLeastOneYear &&
    newJobStartDay !== null &&
    newJobStartDay < eligibilityLimitDay &&
    newJobStartDay < CSP_MAX_DAYS &&
    isDurableContract(newJobContractType, newJobContractDurationMonths);

  if (!eligible || newJobStartDay === null) {
    return {
      eligible: false,
      remainingAspRightsAtNewJob: 0,
      primeTotal: 0,
      firstPaymentDay: null,
      firstPaymentAmount: 0,
      secondPaymentDay: null,
      secondPaymentAmount: 0,
      secondPaymentPaid: false,
    };
  }

  const secondPaymentDay = newJobStartDay + PRIME_RECLASSEMENT_PAYMENT_2_DELAY_DAYS;
  const contractEndDay =
    newJobContractType === 'CDI'
      ? Infinity
      : newJobStartDay + (newJobContractDurationMonths ?? 0) * DAYS_PER_MONTH;
  const secondPaymentPaid = contractEndDay >= secondPaymentDay;

  return {
    eligible: true,
    remainingAspRightsAtNewJob,
    primeTotal,
    firstPaymentDay: newJobStartDay,
    firstPaymentAmount: primeTotal / 2,
    secondPaymentDay,
    secondPaymentAmount: secondPaymentPaid ? primeTotal / 2 : 0,
    secondPaymentPaid,
  };
}

export interface IdrParams {
  currentMonthlyGrossSalary: number;
  newMonthlyGrossSalary: number | null;
  newJobStartDay: number | null;
  sameWorkingTime: boolean;
  newJobContractType: ContractType;
  newJobContractDurationMonths: number | null;
  remainingAspRightsAtNewJob: number;
}

/** Indemnité différentielle de reclassement (IDR). */
export function calculateIDR({
  currentMonthlyGrossSalary,
  newMonthlyGrossSalary,
  newJobStartDay,
  sameWorkingTime,
  newJobContractType,
  newJobContractDurationMonths,
  remainingAspRightsAtNewJob,
}: IdrParams): IdrResult {
  const eligible =
    newJobStartDay !== null &&
    newJobStartDay < CSP_MAX_DAYS &&
    newMonthlyGrossSalary !== null &&
    newMonthlyGrossSalary < currentMonthlyGrossSalary &&
    sameWorkingTime;

  if (!eligible || newJobStartDay === null || newMonthlyGrossSalary === null) {
    return { eligible: false, idrDaily: 0, idrTotalCap: 0, startDay: null, endDay: null, idrTotal: 0 };
  }

  const idrMonthly = Math.max(0, currentMonthlyGrossSalary - newMonthlyGrossSalary);
  const idrDaily = (idrMonthly * 12) / 365;
  const idrTotalCap = 0.5 * remainingAspRightsAtNewJob;

  const contractDurationDays =
    newJobContractType === 'CDI' ? Infinity : (newJobContractDurationMonths ?? 0) * DAYS_PER_MONTH;
  const maxDurationDays = IDR_MAX_DURATION_MONTHS * DAYS_PER_MONTH;
  const idrDurationDays = Math.min(maxDurationDays, contractDurationDays);
  const endDay = newJobStartDay + idrDurationDays;

  const idrTotal = Math.min(idrDaily * idrDurationDays, idrTotalCap);

  return { eligible: true, idrDaily, idrTotalCap, startDay: newJobStartDay, endDay, idrTotal };
}

// ---------------------------------------------------------------------------
// 4. Horizon automatique de simulation
// ---------------------------------------------------------------------------

export function getDefaultMaxHorizonByAge(age: number): number {
  if (age < 55) return DEFAULT_MAX_SIMULATION_MONTHS_UNDER_55;
  if (age < 57) return DEFAULT_MAX_SIMULATION_MONTHS_55_TO_56;
  return DEFAULT_MAX_SIMULATION_MONTHS_57_PLUS;
}

export interface RecommendedHorizonInputs {
  age: number;
  classicAreStartDay: number | null;
  classicAreExhaustionDay: number | null;
  cspAspEndDay: number | null;
  cspAreAfterCspStartDay: number | null;
  cspAreAfterCspExhaustionDay: number | null;
  newJobStartDay: number | null;
  reclassementPrimeFirstPaymentDay: number | null;
  reclassementPrimeSecondPaymentDay: number | null;
  idrEndDay: number | null;
  crossingDay: number | null;
}

/**
 * Détermine l'horizon d'affichage recommandé : le dernier événement utile de
 * la simulation, plus une marge de lecture, borné par un plafond qui dépend
 * de l'âge (droits ARE plus longs après 55 ans) et par un plafond absolu.
 */
export function calculateRecommendedSimulationHorizonMonths(inputs: RecommendedHorizonInputs): number {
  const latestUsefulDay = Math.max(
    inputs.classicAreStartDay ?? 0,
    inputs.classicAreExhaustionDay ?? 0,
    inputs.cspAspEndDay ?? 0,
    inputs.cspAreAfterCspStartDay ?? 0,
    inputs.cspAreAfterCspExhaustionDay ?? 0,
    inputs.newJobStartDay ?? 0,
    inputs.reclassementPrimeFirstPaymentDay ?? 0,
    inputs.reclassementPrimeSecondPaymentDay ?? 0,
    inputs.idrEndDay ?? 0,
    inputs.crossingDay ?? 0,
  );

  const recommendedMonths = Math.ceil(latestUsefulDay / DAYS_PER_MONTH) + 1;
  const defaultMax = getDefaultMaxHorizonByAge(inputs.age);

  return Math.min(Math.max(recommendedMonths, 6), defaultMax, ABSOLUTE_MAX_SIMULATION_MONTHS);
}

// ---------------------------------------------------------------------------
// 5. Contexte interne dérivé des inputs
// ---------------------------------------------------------------------------

interface EngineContext {
  input: SimulationInput;
  sjr: number;
  annualReferenceSalary: number;
  baseAreDaily: number;
  aspDaily: number;
  areEntitlement: AREEntitlementResult;
  totalAREEntitlementDays: number;

  paidLeaveAmount: number;
  supraLegalSeveranceAmount: number;
  cspNoticePaidToEmployee: number;
  noticePaidToFranceTravail: number;
  areNoticePaidToEmployee: number;

  noticePeriodDays: number;
  paidLeaveDeferralDays: number;
  specificDeferralDays: number;
  classicAreStartDay: number;

  hasNewJob: boolean;
  newJobStartDay: number | null;
  effectiveNewJobStartDay: number;
  newJobDailySalary: number;

  cspAspEndDay: number;
  cspAspStoppedByNewJob: boolean;
  cspAreAfterCspApplicable: boolean;
  remainingAreDaysAfterCsp: number;
  cspAreAfterCspStartDay: number;
  cspAreAfterCspExhaustionDay: number;
  cspAreAfterCspStoppedByNewJob: boolean;

  areDegressiveApplicableClassic: boolean;
  degressivityStartDayClassic: number | null;
  areRestanteDegressive: boolean;
  areRestanteDailyRate: number;

  classicAreNaturalExhaustionDay: number;
  classicAreNeverStarted: boolean;
  classicAreStoppedByNewJob: boolean;
  classicAreExhaustionDay: number;

  reclassementPrime: ReclassementPrimeResult;
  idr: IdrResult;
  chosenAid: ChosenAid;
}

function buildContext(input: SimulationInput): EngineContext {
  const {
    currentMonthlyGrossSalary,
    remainingPaidLeaveDays,
    monthsBeforeNewJob,
    newMonthlyGrossSalary,
    age,
    seniorityAtLeastOneYear,
    currentEmployerSeniorityMonths,
    previousEmployerAffiliationMonths,
    existingARERemainingDays,
    officialAREEntitlementDaysOverride,
    noticePeriodMonths,
    newJobContractType,
    newJobContractDurationMonths,
    sameWorkingTime,
    supraLegalSeveranceMonths,
  } = input;

  const sjr = (currentMonthlyGrossSalary * 12) / 365;
  const annualReferenceSalary = currentMonthlyGrossSalary * 12;
  const baseAreDaily = calculateBaseAREDaily(sjr);
  const aspDaily = calculateASPDaily(sjr, baseAreDaily, seniorityAtLeastOneYear);

  const areEntitlement = calculateAREEntitlementDays({
    age,
    currentEmployerSeniorityMonths,
    previousEmployerAffiliationMonths,
    existingARERemainingDays,
    officialAREEntitlementDaysOverride,
  });
  const totalAREEntitlementDays = areEntitlement.totalAREEntitlementDays;

  const paidLeaveAmount = remainingPaidLeaveDays * sjr;
  const supraLegalSeveranceAmount = supraLegalSeveranceMonths * currentMonthlyGrossSalary;

  const cspNoticePaidToEmployee = seniorityAtLeastOneYear
    ? Math.max(0, noticePeriodMonths - NOTICE_CONTRIBUTION_CAP_MONTHS) * currentMonthlyGrossSalary
    : noticePeriodMonths * currentMonthlyGrossSalary;
  const noticePaidToFranceTravail = seniorityAtLeastOneYear
    ? Math.min(noticePeriodMonths, NOTICE_CONTRIBUTION_CAP_MONTHS) * currentMonthlyGrossSalary
    : 0;
  const areNoticePaidToEmployee = noticePeriodMonths * currentMonthlyGrossSalary;

  const noticePeriodDays = noticePeriodMonths * DAYS_PER_MONTH;
  const paidLeaveDeferralDays = Math.min(remainingPaidLeaveDays, PAID_LEAVE_DEFERRAL_CAP_DAYS);
  const rawSpecificDeferralDays = Math.floor(supraLegalSeveranceAmount / SPECIFIC_DEFERRAL_DIVISOR_2026);
  const specificDeferralDays = Math.min(rawSpecificDeferralDays, SPECIFIC_DEFERRAL_CAP_DAYS);
  const classicAreStartDay = noticePeriodDays + paidLeaveDeferralDays + specificDeferralDays + WAITING_PERIOD_DAYS;

  const hasNewJob = monthsBeforeNewJob !== null;
  const newJobStartDay = hasNewJob ? (monthsBeforeNewJob as number) * DAYS_PER_MONTH : null;
  const effectiveNewJobStartDay = newJobStartDay ?? Infinity;
  const newJobDailySalary = newMonthlyGrossSalary !== null ? (newMonthlyGrossSalary * 12) / 365 : 0;

  const cspAspEndDay = Math.min(effectiveNewJobStartDay, CSP_MAX_DAYS);
  const cspAspStoppedByNewJob = hasNewJob && effectiveNewJobStartDay < CSP_MAX_DAYS;
  const cspAreAfterCspApplicable = cspAspEndDay >= CSP_MAX_DAYS;
  const remainingAreDaysAfterCsp = Math.max(0, totalAREEntitlementDays - CSP_MAX_DAYS);

  const cspAreAfterCspStartDay = CSP_MAX_DAYS;
  const cspAreAfterCspNaturalExhaustionDay = CSP_MAX_DAYS + remainingAreDaysAfterCsp;
  const cspAreAfterCspStoppedByNewJob =
    cspAreAfterCspApplicable && hasNewJob && effectiveNewJobStartDay < cspAreAfterCspNaturalExhaustionDay;
  const cspAreAfterCspExhaustionDay = cspAreAfterCspStoppedByNewJob
    ? effectiveNewJobStartDay
    : cspAreAfterCspNaturalExhaustionDay;

  const areDegressiveApplicableClassic = age < 55 && sjr > DEGRESSIVE_ARE_SJR_THRESHOLD;
  const degressivityStartDayClassic = areDegressiveApplicableClassic
    ? classicAreStartDay + DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE
    : null;
  const areRestanteDegressive = age < 55 && sjr > DEGRESSIVE_ARE_SJR_THRESHOLD;
  const areRestanteDailyRate = areRestanteDegressive
    ? Math.max(baseAreDaily * (1 - DEGRESSIVE_ARE_REDUCTION_RATE), DEGRESSIVE_ARE_FLOOR_DAILY)
    : baseAreDaily;

  const classicAreNaturalExhaustionDay = classicAreStartDay + totalAREEntitlementDays;
  const classicAreNeverStarted = hasNewJob && effectiveNewJobStartDay < classicAreStartDay;
  const classicAreStoppedByNewJob =
    hasNewJob && !classicAreNeverStarted && effectiveNewJobStartDay < classicAreNaturalExhaustionDay;
  const classicAreExhaustionDay = classicAreStoppedByNewJob
    ? effectiveNewJobStartDay
    : classicAreNaturalExhaustionDay;

  const reclassementPrime = calculateReclassementPrime({
    seniorityAtLeastOneYear,
    newJobStartDay,
    newJobContractType,
    newJobContractDurationMonths,
    aspDaily,
  });

  const idr = calculateIDR({
    currentMonthlyGrossSalary,
    newMonthlyGrossSalary,
    newJobStartDay,
    sameWorkingTime,
    newJobContractType,
    newJobContractDurationMonths,
    remainingAspRightsAtNewJob: reclassementPrime.remainingAspRightsAtNewJob,
  });

  // Si les deux aides sont possibles, on retient celle dont la valeur totale
  // (sur toute sa durée de versement propre) est la plus élevée.
  const primeFullValue = reclassementPrime.eligible
    ? reclassementPrime.firstPaymentAmount +
      (reclassementPrime.secondPaymentPaid ? reclassementPrime.secondPaymentAmount : 0)
    : 0;
  const idrFullValue = idr.eligible ? idr.idrTotal : 0;

  let chosenAid: ChosenAid = 'NONE';
  if (reclassementPrime.eligible && idr.eligible) {
    chosenAid = primeFullValue >= idrFullValue ? 'RECLASSEMENT_PRIME' : 'IDR';
  } else if (reclassementPrime.eligible) {
    chosenAid = 'RECLASSEMENT_PRIME';
  } else if (idr.eligible) {
    chosenAid = 'IDR';
  }

  return {
    input,
    sjr,
    annualReferenceSalary,
    baseAreDaily,
    aspDaily,
    areEntitlement,
    totalAREEntitlementDays,
    paidLeaveAmount,
    supraLegalSeveranceAmount,
    cspNoticePaidToEmployee,
    noticePaidToFranceTravail,
    areNoticePaidToEmployee,
    noticePeriodDays,
    paidLeaveDeferralDays,
    specificDeferralDays,
    classicAreStartDay,
    hasNewJob,
    newJobStartDay,
    effectiveNewJobStartDay,
    newJobDailySalary,
    cspAspEndDay,
    cspAspStoppedByNewJob,
    cspAreAfterCspApplicable,
    remainingAreDaysAfterCsp,
    cspAreAfterCspStartDay,
    cspAreAfterCspExhaustionDay,
    cspAreAfterCspStoppedByNewJob,
    areDegressiveApplicableClassic,
    degressivityStartDayClassic,
    areRestanteDegressive,
    areRestanteDailyRate,
    classicAreNaturalExhaustionDay,
    classicAreNeverStarted,
    classicAreStoppedByNewJob,
    classicAreExhaustionDay,
    reclassementPrime,
    idr,
    chosenAid,
  };
}

// ---------------------------------------------------------------------------
// 6. Séries journalières (cumulées depuis le jour 0)
// ---------------------------------------------------------------------------

function cspBreakdownAtDay(ctx: EngineContext, day: number): DailyScenarioCashflow {
  const d = Math.max(0, day);

  const paidLeave = ctx.paidLeaveAmount;
  const notice = ctx.cspNoticePaidToEmployee;
  const supraLegalSeverance = ctx.supraLegalSeveranceAmount;

  // aspIsPaidToday = day < CSP_MAX_DAYS && day < newJobStartDay (ou pas de reprise)
  const asp = ctx.aspDaily * clamp(d, 0, ctx.cspAspEndDay);

  // cspAreAfterCspIsPaidToday = day >= CSP_MAX_DAYS && jours restants > 0 && pas encore repris
  let are = 0;
  if (ctx.cspAreAfterCspApplicable) {
    const daysIntoAreRestante = clamp(d, CSP_MAX_DAYS, Math.max(CSP_MAX_DAYS, ctx.cspAreAfterCspExhaustionDay)) - CSP_MAX_DAYS;
    are = ctx.areRestanteDailyRate * daysIntoAreRestante;
  }

  let reclassementPrime = 0;
  if (ctx.chosenAid === 'RECLASSEMENT_PRIME' && ctx.reclassementPrime.eligible) {
    const rp = ctx.reclassementPrime;
    if (rp.firstPaymentDay !== null && d >= rp.firstPaymentDay) reclassementPrime += rp.firstPaymentAmount;
    if (rp.secondPaymentDay !== null && rp.secondPaymentPaid && d >= rp.secondPaymentDay) {
      reclassementPrime += rp.secondPaymentAmount;
    }
  }

  let idr = 0;
  if (ctx.chosenAid === 'IDR' && ctx.idr.eligible && ctx.idr.startDay !== null && ctx.idr.endDay !== null) {
    const elapsed = clamp(d - ctx.idr.startDay, 0, ctx.idr.endDay - ctx.idr.startDay);
    idr = Math.min(ctx.idr.idrDaily * elapsed, ctx.idr.idrTotalCap);
  }

  const newSalary = ctx.hasNewJob ? ctx.newJobDailySalary * Math.max(0, d - (ctx.newJobStartDay ?? 0)) : 0;

  const benefitsOnlyTotal = paidLeave + notice + supraLegalSeverance + asp + are + reclassementPrime + idr;
  const withNewSalaryTotal = benefitsOnlyTotal + newSalary;

  return { paidLeave, notice, supraLegalSeverance, asp, are, reclassementPrime, idr, newSalary, benefitsOnlyTotal, withNewSalaryTotal };
}

function classicAreBreakdownAtDay(ctx: EngineContext, day: number): DailyScenarioCashflow {
  const d = Math.max(0, day);

  // Le taux de salaire journalier du préavis correspond au SJR (salaire * 12 / 365).
  const notice = ctx.sjr * clamp(d, 0, ctx.noticePeriodDays);
  const paidLeave = d >= ctx.noticePeriodDays ? ctx.paidLeaveAmount : 0;
  const supraLegalSeverance = d >= ctx.noticePeriodDays ? ctx.supraLegalSeveranceAmount : 0;

  // classicAreIsPaidToday = day >= classicAreStartDay && jours indemnisés < droits && pas encore repris
  let are = 0;
  if (!ctx.classicAreNeverStarted) {
    const daysIndemnized =
      clamp(d, ctx.classicAreStartDay, Math.max(ctx.classicAreStartDay, ctx.classicAreExhaustionDay)) -
      ctx.classicAreStartDay;

    if (ctx.areDegressiveApplicableClassic) {
      const preThreshold = Math.min(daysIndemnized, DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE);
      const postThreshold = Math.max(0, daysIndemnized - DEGRESSIVE_ARE_START_DAY_CLASSIC_ARE);
      const degressiveDaily = Math.max(
        ctx.baseAreDaily * (1 - DEGRESSIVE_ARE_REDUCTION_RATE),
        DEGRESSIVE_ARE_FLOOR_DAILY,
      );
      are = ctx.baseAreDaily * preThreshold + degressiveDaily * postThreshold;
    } else {
      are = ctx.baseAreDaily * daysIndemnized;
    }
  }

  const newSalary = ctx.hasNewJob ? ctx.newJobDailySalary * Math.max(0, d - (ctx.newJobStartDay ?? 0)) : 0;

  const asp = 0;
  const reclassementPrime = 0;
  const idr = 0;
  const benefitsOnlyTotal = paidLeave + notice + supraLegalSeverance + asp + are + reclassementPrime + idr;
  const withNewSalaryTotal = benefitsOnlyTotal + newSalary;

  return { paidLeave, notice, supraLegalSeverance, asp, are, reclassementPrime, idr, newSalary, benefitsOnlyTotal, withNewSalaryTotal };
}

function buildDailySeries(ctx: EngineContext, totalDays: number): DailySimulationPoint[] {
  const dayCount = Math.max(1, Math.ceil(totalDays));
  const points: DailySimulationPoint[] = [];
  for (let day = 0; day <= dayCount; day += 1) {
    points.push({
      day,
      month: day / DAYS_PER_MONTH,
      csp: cspBreakdownAtDay(ctx, day),
      classicAre: classicAreBreakdownAtDay(ctx, day),
    });
  }
  return points;
}

function pointAtDay(series: DailySimulationPoint[], day: number): DailySimulationPoint | undefined {
  if (series.length === 0) return undefined;
  const idx = Math.min(series.length - 1, Math.max(0, Math.round(day)));
  return series[idx];
}

function findCrossoverDay(series: DailySimulationPoint[]): number | null {
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1];
    const curr = series[i];
    if (!prev || !curr) continue;
    const prevDiff = prev.csp.benefitsOnlyTotal - prev.classicAre.benefitsOnlyTotal;
    const currDiff = curr.csp.benefitsOnlyTotal - curr.classicAre.benefitsOnlyTotal;
    if (prevDiff === 0) return prev.day;
    if ((prevDiff < 0 && currDiff >= 0) || (prevDiff > 0 && currDiff <= 0)) return curr.day;
  }
  return null;
}

function determineWinner(totalCsp: number, totalAre: number): WinningScenario {
  if (Math.abs(totalCsp - totalAre) < 0.01) return 'Égalité';
  return totalCsp > totalAre ? 'CSP' : 'ARE + préavis';
}

// ---------------------------------------------------------------------------
// 7. Agrégation mensuelle
// ---------------------------------------------------------------------------

function diffScenario(start: DailyScenarioCashflow, end: DailyScenarioCashflow): MonthlyScenarioCashflow {
  return {
    paidLeave: end.paidLeave - start.paidLeave,
    notice: end.notice - start.notice,
    supraLegalSeverance: end.supraLegalSeverance - start.supraLegalSeverance,
    asp: end.asp - start.asp,
    are: end.are - start.are,
    reclassementPrime: end.reclassementPrime - start.reclassementPrime,
    idr: end.idr - start.idr,
    newSalary: end.newSalary - start.newSalary,
    benefitsOnlyMonthlyTotal: end.benefitsOnlyTotal - start.benefitsOnlyTotal,
    withNewSalaryMonthlyTotal: end.withNewSalaryTotal - start.withNewSalaryTotal,
    benefitsOnlyCumulativeTotal: end.benefitsOnlyTotal,
    withNewSalaryCumulativeTotal: end.withNewSalaryTotal,
  };
}

const ZERO_CASHFLOW: DailyScenarioCashflow = {
  paidLeave: 0,
  notice: 0,
  supraLegalSeverance: 0,
  asp: 0,
  are: 0,
  reclassementPrime: 0,
  idr: 0,
  newSalary: 0,
  benefitsOnlyTotal: 0,
  withNewSalaryTotal: 0,
};

/**
 * Agrège une série journalière en flux mensuels (montants touchés chaque
 * mois, et cumuls de fin de mois). Le nombre de mois est déduit de la
 * longueur de la série fournie.
 *
 * Le mois 1 utilise une référence de départ à zéro (et non le point du jour
 * 0) : les versements en un seul coup au jour 0 (congés payés, indemnité
 * supra-légale, excédent de préavis CSP...) sont déjà inclus dans le cumul
 * du jour 0 lui-même, donc une simple différence point[0] -> point[30]
 * masquerait entièrement ces versements du premier mois.
 */
export function aggregateDailySeriesByMonth(series: DailySimulationPoint[]): MonthlyCashflow[] {
  if (series.length === 0) return [];

  const monthsCount = Math.max(1, Math.floor((series.length - 1) / DAYS_PER_MONTH));
  const months: MonthlyCashflow[] = [];

  for (let m = 0; m < monthsCount; m += 1) {
    const startDay = m * DAYS_PER_MONTH;
    const endDay = (m + 1) * DAYS_PER_MONTH;
    const startPoint = m === 0 ? undefined : pointAtDay(series, startDay);
    const endPoint = pointAtDay(series, endDay);
    if (!endPoint) continue;

    const cspStart = startPoint ? startPoint.csp : ZERO_CASHFLOW;
    const classicAreStart = startPoint ? startPoint.classicAre : ZERO_CASHFLOW;

    const csp = diffScenario(cspStart, endPoint.csp);
    const classicAre = diffScenario(classicAreStart, endPoint.classicAre);

    months.push({
      monthIndex: m,
      monthLabel: `Mois ${m + 1}`,
      csp,
      classicAre,
      monthlyDifference: csp.benefitsOnlyMonthlyTotal - classicAre.benefitsOnlyMonthlyTotal,
      cumulativeDifference: csp.benefitsOnlyCumulativeTotal - classicAre.benefitsOnlyCumulativeTotal,
      winningScenario: determineWinner(csp.benefitsOnlyCumulativeTotal, classicAre.benefitsOnlyCumulativeTotal),
    });
  }

  return months;
}

// ---------------------------------------------------------------------------
// 8. Tableau de comparaison et points de décision
// ---------------------------------------------------------------------------

function makeComparisonRow(label: string, day: number, series: DailySimulationPoint[]): ComparisonRow {
  const point = pointAtDay(series, day);
  const totalCsp = point?.csp.benefitsOnlyTotal ?? 0;
  const totalAre = point?.classicAre.benefitsOnlyTotal ?? 0;
  return { label, day, totalCsp, totalAre, diff: totalCsp - totalAre, winner: determineWinner(totalCsp, totalAre) };
}

function buildComparisonTable(series: DailySimulationPoint[], displayHorizonMonths: number): ComparisonRow[] {
  const fixedMonths = [3, 6, 9, 12, 15, 18, 20].filter((m) => m <= displayHorizonMonths);
  const rows = fixedMonths.map((m) => makeComparisonRow(`M${m}`, m * DAYS_PER_MONTH, series));
  const lastMonthRounded = Math.round(displayHorizonMonths);
  rows.push(
    makeComparisonRow(`Dernier mois affiché (M${lastMonthRounded})`, displayHorizonMonths * DAYS_PER_MONTH, series),
  );
  return rows;
}

function explainDecision(day: number, winner: WinningScenario, ctx: EngineContext): string {
  if (winner === 'Égalité') return 'les deux options sont quasiment équivalentes à cet horizon';

  if (winner === 'CSP') {
    if (
      ctx.chosenAid === 'RECLASSEMENT_PRIME' &&
      ctx.reclassementPrime.eligible &&
      ctx.reclassementPrime.firstPaymentDay !== null &&
      day >= ctx.reclassementPrime.firstPaymentDay
    ) {
      return 'la prime de reclassement du CSP';
    }
    if (ctx.chosenAid === 'IDR' && ctx.idr.eligible && ctx.idr.startDay !== null && day >= ctx.idr.startDay) {
      return "l'indemnité différentielle de reclassement (IDR)";
    }
    if (day < ctx.classicAreStartDay) {
      return "l'ASP du CSP, versée sans différé ni délai d'attente, alors que l'ARE classique n'a pas encore démarré";
    }
    return "le cumul de l'ASP puis, le cas échéant, de l'ARE restante après CSP";
  }

  if (day <= ctx.classicAreStartDay) {
    return 'le préavis versé intégralement au salarié';
  }
  return 'le préavis et les indemnités versées intégralement au salarié, ainsi que la durée des droits ARE';
}

function buildDecisionPoints(
  series: DailySimulationPoint[],
  ctx: EngineContext,
  displayHorizonMonths: number,
): DecisionPoint[] {
  const labelsAndMonths: [string, number][] = [
    ['M6', 6],
    ['M9', 9],
    ['M15', 15],
    ['M20', 20],
    ['Dernier mois utile', displayHorizonMonths],
  ];

  return labelsAndMonths.map(([label, month]) => {
    const day = month * DAYS_PER_MONTH;
    const point = pointAtDay(series, day);
    const totalCspBenefits = point?.csp.benefitsOnlyTotal ?? 0;
    const totalAreBenefits = point?.classicAre.benefitsOnlyTotal ?? 0;
    const totalCspWithSalary = point?.csp.withNewSalaryTotal ?? 0;
    const totalAreWithSalary = point?.classicAre.withNewSalaryTotal ?? 0;
    const winner = determineWinner(totalCspBenefits, totalAreBenefits);

    return {
      label,
      day,
      winner,
      diffBenefitsOnly: totalCspBenefits - totalAreBenefits,
      diffWithNewSalary: totalCspWithSalary - totalAreWithSalary,
      reason: explainDecision(day, winner, ctx),
    };
  });
}

// ---------------------------------------------------------------------------
// 9. Événements, périodes de versement, dates clés
// ---------------------------------------------------------------------------

function buildEvents(ctx: EngineContext, crossoverDay: number | null): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const push = (e: { id: string; day: number; label: string; scenario: ScenarioLabel | 'both'; explanation: string; type: SimulationEvent['type'] }) => {
    events.push({ ...e, month: e.day / DAYS_PER_MONTH });
  };

  push({
    id: 'notice_end',
    day: ctx.noticePeriodDays,
    label: 'Fin du préavis',
    scenario: 'ARE + préavis',
    type: 'notice',
    explanation:
      "Le préavis se termine. Les congés payés et l'indemnité supra-légale sont versés, et le décompte des différés avant l'ARE classique commence.",
  });

  push({
    id: 'paid_leave_are',
    day: ctx.noticePeriodDays,
    label: 'Versement congés payés',
    scenario: 'ARE + préavis',
    type: 'paid_leave',
    explanation: 'Versement des congés payés restants à la fin du préavis. Ce versement crée aussi un différé avant le début de l’ARE.',
  });

  push({
    id: 'supra_legal_are',
    day: ctx.noticePeriodDays,
    label: 'Versement indemnité supra-légale',
    scenario: 'ARE + préavis',
    type: 'supra_legal',
    explanation: 'Versement de l’indemnité supra-légale à la fin du préavis. Ce versement crée un différé spécifique avant le début de l’ARE.',
  });

  if (!ctx.classicAreNeverStarted) {
    push({
      id: 'are_start',
      day: ctx.classicAreStartDay,
      label: 'Début ARE classique',
      scenario: 'ARE + préavis',
      type: 'are_start',
      explanation: 'Début du versement de l’ARE classique, après le préavis, les différés et le délai d’attente de 7 jours.',
    });

    if (ctx.areDegressiveApplicableClassic && ctx.degressivityStartDayClassic !== null) {
      push({
        id: 'are_degressivity',
        day: ctx.degressivityStartDayClassic,
        label: 'Dégressivité ARE classique',
        scenario: 'ARE + préavis',
        type: 'degressivity',
        explanation: 'À partir du 183e jour indemnisé, l’ARE classique est réduite de 30 % (avec un plancher de 92,57 € brut/jour) pour les hauts revenus.',
      });
    }
  }

  push({
    id: 'csp_asp_end',
    day: ctx.cspAspEndDay,
    label: ctx.cspAspStoppedByNewJob ? 'Arrêt ASP' : 'Fin ASP CSP',
    scenario: 'CSP',
    type: 'asp_stop',
    explanation: ctx.cspAspStoppedByNewJob
      ? 'L’ASP du CSP s’arrête à la reprise d’emploi. Le simulateur ne verse plus d’ASP après cette date.'
      : 'Fin de la période d’indemnisation ASP de 12 mois du CSP.',
  });

  if (ctx.cspAreAfterCspApplicable) {
    push({
      id: 'csp_are_after_csp_start',
      day: ctx.cspAreAfterCspStartDay,
      label: 'Début ARE après CSP',
      scenario: 'CSP',
      type: 'are_start',
      explanation: 'Le CSP est arrivé à son terme sans reprise d’emploi. L’ARE restante démarre sans différé ni délai d’attente.',
    });

    if (ctx.areRestanteDegressive) {
      push({
        id: 'csp_are_after_csp_degressivity',
        day: ctx.cspAreAfterCspStartDay,
        label: 'Dégressivité ARE après CSP',
        scenario: 'CSP',
        type: 'degressivity',
        explanation: 'Le compteur cumulé CSP + ARE dépasse déjà 243 jours : l’ARE restante après CSP est réduite dès son démarrage pour les hauts revenus. L’ASP déjà versée n’est jamais concernée.',
      });
    }
  } else if (ctx.hasNewJob) {
    push({
      id: 'csp_are_after_csp_not_started',
      day: ctx.newJobStartDay ?? 0,
      label: 'ARE après CSP non démarrée',
      scenario: 'CSP',
      type: 'are_stop',
      explanation: 'La reprise d’emploi intervient avant la fin du CSP. L’ARE restante après CSP ne démarre donc pas dans cette simulation.',
    });
  }

  if (ctx.hasNewJob && ctx.newJobStartDay !== null) {
    push({
      id: 'new_job',
      day: ctx.newJobStartDay,
      label: 'Reprise d’emploi',
      scenario: 'both',
      type: 'new_job',
      explanation: 'À partir de cette date, le nouveau salaire est ajouté uniquement dans le mode "Total avec nouveau salaire".',
    });

    if (ctx.classicAreNeverStarted) {
      push({
        id: 'classic_are_never_started',
        day: ctx.newJobStartDay,
        label: 'ARE non démarrée',
        scenario: 'ARE + préavis',
        type: 'are_stop',
        explanation: 'La reprise d’emploi intervient avant le début estimé de l’ARE classique. Dans cette simulation, aucune ARE classique n’est donc versée.',
      });
    } else if (ctx.classicAreStoppedByNewJob) {
      push({
        id: 'classic_are_stopped',
        day: ctx.newJobStartDay,
        label: 'Arrêt ARE',
        scenario: 'ARE + préavis',
        type: 'are_stop',
        explanation: 'L’ARE classique s’arrête à la reprise d’emploi dans cette version simplifiée du simulateur.',
      });
    }
  }

  if (!ctx.classicAreNeverStarted && !ctx.classicAreStoppedByNewJob) {
    push({
      id: 'classic_are_exhaustion',
      day: ctx.classicAreExhaustionDay,
      label: 'Épuisement ARE classique',
      scenario: 'ARE + préavis',
      type: 'exhaustion',
      explanation: 'Les droits ARE classiques estimés sont entièrement consommés à cette date.',
    });
  }

  if (ctx.cspAreAfterCspApplicable && !ctx.cspAreAfterCspStoppedByNewJob) {
    push({
      id: 'csp_are_after_csp_exhaustion',
      day: ctx.cspAreAfterCspExhaustionDay,
      label: 'Épuisement droits CSP',
      scenario: 'CSP',
      type: 'exhaustion',
      explanation: 'Les droits ARE restants après le CSP sont entièrement consommés à cette date.',
    });
  }

  if (ctx.chosenAid === 'RECLASSEMENT_PRIME' && ctx.reclassementPrime.eligible) {
    if (ctx.reclassementPrime.firstPaymentDay !== null) {
      push({
        id: 'prime_1',
        day: ctx.reclassementPrime.firstPaymentDay,
        label: 'Prime de reclassement (1/2)',
        scenario: 'CSP',
        type: 'prime',
        explanation: '50 % de la prime de reclassement sont versés à la date de reprise d’emploi.',
      });
    }
    if (ctx.reclassementPrime.secondPaymentDay !== null && ctx.reclassementPrime.secondPaymentPaid) {
      push({
        id: 'prime_2',
        day: ctx.reclassementPrime.secondPaymentDay,
        label: 'Prime de reclassement (2/2)',
        scenario: 'CSP',
        type: 'prime',
        explanation: 'Les 50 % restants de la prime de reclassement sont versés 91 jours après la reprise, le contrat étant toujours en cours.',
      });
    }
  }

  if (crossoverDay !== null) {
    push({
      id: 'crossing',
      day: crossoverDay,
      label: 'Croisement des courbes',
      scenario: 'both',
      type: 'crossing',
      explanation: 'À partir de cette date, l’option la plus favorable (hors nouveau salaire) change.',
    });
  }

  return events.sort((a, b) => a.day - b.day);
}

function buildPaymentPeriods(ctx: EngineContext): PaymentPeriod[] {
  const periods: PaymentPeriod[] = [];

  periods.push({
    scenario: 'CSP',
    label: 'ASP',
    startDay: 0,
    endDay: ctx.cspAspEndDay,
    status: ctx.cspAspStoppedByNewJob ? 'stopped' : 'paid',
    explanation: ctx.cspAspStoppedByNewJob
      ? 'Versée du jour 0 jusqu’à la reprise d’emploi, qui l’interrompt.'
      : 'Versée sans différé ni délai d’attente pendant les 12 mois du CSP, sauf reprise d’emploi anticipée.',
  });

  periods.push({
    scenario: 'CSP',
    label: 'Prime de reclassement',
    startDay: ctx.reclassementPrime.firstPaymentDay,
    endDay: ctx.reclassementPrime.secondPaymentDay ?? ctx.reclassementPrime.firstPaymentDay,
    status: ctx.chosenAid === 'RECLASSEMENT_PRIME' && ctx.reclassementPrime.eligible ? 'paid' : 'not_applicable',
    explanation:
      ctx.chosenAid === 'RECLASSEMENT_PRIME' && ctx.reclassementPrime.eligible
        ? 'Versée en deux fois : à la reprise d’emploi, puis 91 jours plus tard si le contrat est toujours en cours.'
        : 'Non applicable dans cette simulation.',
  });

  periods.push({
    scenario: 'CSP',
    label: 'ARE après CSP',
    startDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspStartDay : null,
    endDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspExhaustionDay : null,
    status: !ctx.cspAreAfterCspApplicable
      ? ctx.hasNewJob
        ? 'not_started'
        : 'not_applicable'
      : ctx.cspAreAfterCspStoppedByNewJob
        ? 'stopped'
        : 'paid',
    explanation: !ctx.cspAreAfterCspApplicable
      ? 'Non versée : la reprise d’emploi intervient avant la fin du CSP.'
      : 'Démarre sans différé ni délai d’attente à la fin du CSP.',
  });

  periods.push({
    scenario: 'ARE + préavis',
    label: 'Préavis',
    startDay: 0,
    endDay: ctx.noticePeriodDays,
    status: 'paid',
    explanation: 'Versé intégralement pendant la durée du préavis.',
  });

  periods.push({
    scenario: 'ARE + préavis',
    label: 'Congés payés et indemnité supra-légale',
    startDay: ctx.noticePeriodDays,
    endDay: ctx.noticePeriodDays,
    status: 'paid',
    explanation: 'Versés en une fois à la fin du préavis.',
  });

  periods.push({
    scenario: 'ARE + préavis',
    label: 'ARE classique',
    startDay: ctx.classicAreNeverStarted ? null : ctx.classicAreStartDay,
    endDay: ctx.classicAreNeverStarted ? null : ctx.classicAreExhaustionDay,
    status: ctx.classicAreNeverStarted ? 'not_started' : ctx.classicAreStoppedByNewJob ? 'stopped' : 'paid',
    explanation: ctx.classicAreNeverStarted
      ? 'Non versée : la reprise d’emploi intervient avant le début estimé de l’ARE classique.'
      : ctx.classicAreStoppedByNewJob
        ? 'Versée du début de l’indemnisation jusqu’à la reprise d’emploi, qui l’interrompt.'
        : 'Versée du début de l’indemnisation jusqu’à épuisement des droits estimés.',
  });

  return periods;
}

function buildKeyDates(ctx: EngineContext): KeyDateEntry[] {
  const entries: KeyDateEntry[] = [];
  const add = (
    id: string,
    label: string,
    day: number | null,
    scenario: ScenarioLabel | 'both',
    explanation: string,
  ) => entries.push({ id, label, day, scenario, explanation });

  add(
    'csp_asp_exhaustion',
    'Épuisement / arrêt ASP CSP',
    ctx.cspAspEndDay,
    'CSP',
    ctx.cspAspStoppedByNewJob ? 'Arrêtée par la reprise d’emploi.' : 'Fin naturelle des 12 mois d’ASP.',
  );

  add(
    'csp_are_after_csp_start',
    'Début ARE après CSP',
    ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspStartDay : null,
    'CSP',
    ctx.cspAreAfterCspApplicable
      ? 'Démarre sans différé ni délai d’attente à la fin du CSP.'
      : 'Non applicable : reprise avant la fin du CSP.',
  );

  add(
    'csp_are_after_csp_exhaustion',
    'Épuisement ARE après CSP',
    ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspExhaustionDay : null,
    'CSP',
    ctx.cspAreAfterCspApplicable ? 'Date estimée d’épuisement des droits restants.' : 'Non applicable.',
  );

  add(
    'classic_are_start',
    'Début ARE classique',
    ctx.classicAreNeverStarted ? null : ctx.classicAreStartDay,
    'ARE + préavis',
    ctx.classicAreNeverStarted ? 'Non atteint : reprise d’emploi avant cette date.' : 'Après préavis, différés et délai d’attente.',
  );

  add(
    'classic_are_exhaustion',
    'Épuisement / arrêt ARE classique',
    ctx.classicAreNeverStarted ? null : ctx.classicAreExhaustionDay,
    'ARE + préavis',
    ctx.classicAreNeverStarted ? 'Non applicable : l’ARE n’a jamais démarré.' : 'Date estimée d’épuisement ou d’arrêt des droits ARE.',
  );

  add('new_job', 'Reprise d’emploi', ctx.newJobStartDay, 'both', 'Date de reprise renseignée dans les paramètres.');

  add(
    'are_never_started',
    'ARE classique non démarrée',
    ctx.classicAreNeverStarted ? ctx.newJobStartDay : null,
    'ARE + préavis',
    'La reprise d’emploi intervient avant le début estimé de l’ARE.',
  );

  add(
    'prime_1',
    'Versement 1 — prime de reclassement',
    ctx.chosenAid === 'RECLASSEMENT_PRIME' ? ctx.reclassementPrime.firstPaymentDay : null,
    'CSP',
    '50 % de la prime versés à la reprise d’emploi.',
  );

  add(
    'prime_2',
    'Versement 2 — prime de reclassement',
    ctx.chosenAid === 'RECLASSEMENT_PRIME' && ctx.reclassementPrime.secondPaymentPaid
      ? ctx.reclassementPrime.secondPaymentDay
      : null,
    'CSP',
    '50 % restants versés 91 jours après la reprise, contrat toujours en cours.',
  );

  return entries;
}

// ---------------------------------------------------------------------------
// 10. Interprétation des courbes (diagnostic)
// ---------------------------------------------------------------------------

function isParallelTail(series: DailySimulationPoint[], field: 'benefitsOnlyTotal' | 'withNewSalaryTotal'): boolean {
  if (series.length < 10) return false;
  const last = series[series.length - 1];
  const earlier = series[series.length - 10];
  if (!last || !earlier) return false;
  const diffLast = last.csp[field] - last.classicAre[field];
  const diffEarlier = earlier.csp[field] - earlier.classicAre[field];
  return Math.abs(diffLast - diffEarlier) < 1;
}

/**
 * Vérifie, sur la MÊME fenêtre de fin de série que isParallelTail (10 derniers
 * jours), si les flux journaliers des deux scénarios diffèrent réellement.
 * Si oui alors que l'écart cumulé sur cette fenêtre est resté stable, il y a
 * une contradiction mathématique qui trahit un bug d'agrégation. On ne
 * regarde volontairement pas tout l'historique : des flux différents plus tôt
 * dans la simulation (avant épuisement des droits) sont normaux et ne
 * doivent pas déclencher l'alerte.
 */
function hasDivergentMonthlyFlows(series: DailySimulationPoint[]): boolean {
  if (series.length < 10) return false;
  for (let i = series.length - 9; i < series.length; i += 1) {
    const prev = series[i - 1];
    const curr = series[i];
    if (!prev || !curr) continue;
    const cspDelta = curr.csp.benefitsOnlyTotal - prev.csp.benefitsOnlyTotal;
    const areDelta = curr.classicAre.benefitsOnlyTotal - prev.classicAre.benefitsOnlyTotal;
    if (Math.abs(cspDelta - areDelta) > 1) return true;
  }
  return false;
}

export interface CurveInterpretationParams {
  hasNewJob: boolean;
}

/**
 * Explique pourquoi les courbes évoluent (ou stagnent) comme elles le font,
 * selon le mode d'affichage actif. Sert aussi de garde-fou : si les courbes
 * apparaissent parallèles en mode "indemnités uniquement" malgré des flux
 * mensuels différents entre CSP et ARE, un avertissement est loggé en
 * console pour signaler une possible régression d'agrégation.
 */
export function getCurveInterpretation(
  params: CurveInterpretationParams,
  series: DailySimulationPoint[],
  displayMode: DisplayMode,
): CurveInterpretation {
  if (params.hasNewJob && displayMode === 'with_new_salary') {
    return {
      message:
        'Après la reprise d’emploi, le même salaire est ajouté aux deux scénarios. Les courbes peuvent donc devenir parallèles : l’écart reste stable sauf versement supplémentaire, par exemple une prime de reclassement ou une IDR.',
      parallelAfterNewJob: isParallelTail(series, 'withNewSalaryTotal'),
    };
  }

  if (params.hasNewJob && displayMode === 'benefits_only') {
    const parallel = isParallelTail(series, 'benefitsOnlyTotal');
    if (parallel && hasDivergentMonthlyFlows(series)) {
      console.warn(
        'Warning: curves appear parallel in benefits-only mode despite different monthly cashflows. Check daily aggregation.',
      );
    }
    return {
      message:
        'En mode indemnités uniquement, le nouveau salaire est exclu. Les courbes montrent seulement les sommes liées à la rupture, au chômage et aux aides CSP. Elles peuvent se stabiliser après la reprise d’emploi si plus aucune indemnité n’est versée.',
      parallelAfterNewJob: parallel,
    };
  }

  return {
    message:
      'Sans reprise d’emploi, les courbes doivent évoluer selon les montants ASP et ARE versés chaque mois, jusqu’à épuisement des droits. Si les allocations mensuelles diffèrent, l’écart cumulé doit évoluer.',
    parallelAfterNewJob: false,
  };
}

// ---------------------------------------------------------------------------
// 11. Orchestration
// ---------------------------------------------------------------------------

export function runSimulation(input: SimulationInput): SimulationResult {
  const ctx = buildContext(input);

  const naturalMaxDay = Math.max(
    ctx.classicAreNaturalExhaustionDay,
    CSP_MAX_DAYS + ctx.remainingAreDaysAfterCsp,
    ctx.effectiveNewJobStartDay === Infinity ? 0 : ctx.effectiveNewJobStartDay,
    ctx.reclassementPrime.secondPaymentDay ?? ctx.reclassementPrime.firstPaymentDay ?? 0,
    ctx.idr.endDay ?? 0,
  );
  const manualHorizonDays =
    input.simulationHorizonMode === 'manual' ? input.simulationHorizonMonths * DAYS_PER_MONTH : 0;
  const computationHorizonDays = Math.min(
    Math.max(naturalMaxDay + 30, manualHorizonDays + 5, 90),
    (ABSOLUTE_MAX_SIMULATION_MONTHS + 12) * DAYS_PER_MONTH,
  );

  const fullSeries = buildDailySeries(ctx, computationHorizonDays);
  const crossoverDay = findCrossoverDay(fullSeries);

  const autoRecommendedMonths = calculateRecommendedSimulationHorizonMonths({
    age: input.age,
    classicAreStartDay: ctx.classicAreNeverStarted ? null : ctx.classicAreStartDay,
    classicAreExhaustionDay: ctx.classicAreNeverStarted ? null : ctx.classicAreExhaustionDay,
    cspAspEndDay: ctx.cspAspEndDay,
    cspAreAfterCspStartDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspStartDay : null,
    cspAreAfterCspExhaustionDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspExhaustionDay : null,
    newJobStartDay: ctx.newJobStartDay,
    reclassementPrimeFirstPaymentDay: ctx.reclassementPrime.firstPaymentDay,
    reclassementPrimeSecondPaymentDay: ctx.reclassementPrime.secondPaymentPaid ? ctx.reclassementPrime.secondPaymentDay : null,
    idrEndDay: ctx.idr.endDay,
    crossingDay: crossoverDay,
  });

  const defaultMaxForAge = getDefaultMaxHorizonByAge(input.age);
  const displayedMonths = input.simulationHorizonMode === 'manual' ? input.simulationHorizonMonths : autoRecommendedMonths;

  const horizon: HorizonInfo = {
    mode: input.simulationHorizonMode,
    autoRecommendedMonths,
    displayedMonths,
    defaultMaxForAge,
    cappedByAgeMax: input.simulationHorizonMode === 'auto' && autoRecommendedMonths >= defaultMaxForAge,
  };

  const displayDayCount = Math.min(Math.ceil(displayedMonths * DAYS_PER_MONTH), fullSeries.length - 1);
  const dailySeries = fullSeries.slice(0, displayDayCount + 1);
  const monthlySeries = aggregateDailySeriesByMonth(dailySeries);

  const events = buildEvents(ctx, crossoverDay);
  const paymentPeriods = buildPaymentPeriods(ctx);
  const comparisonTable = buildComparisonTable(fullSeries, displayedMonths);
  const decisionPoints = buildDecisionPoints(fullSeries, ctx, displayedMonths);
  const keyDates = buildKeyDates(ctx);

  const warnings: string[] = [];
  if (!input.seniorityAtLeastOneYear) {
    warnings.push(
      'Ancienneté inférieure à 1 an : le CSP est calculé différemment de la règle générale présentée ici. Ce simulateur applique une hypothèse simplifiée.',
    );
  }
  if (ctx.areEntitlement.affiliationInsufficient && !ctx.areEntitlement.usedOfficialOverride) {
    warnings.push('Durée d’affiliation probablement insuffisante pour ouvrir de nouveaux droits ARE, sauf cas particuliers.');
  }

  return {
    input,
    sjr: ctx.sjr,
    annualReferenceSalary: ctx.annualReferenceSalary,
    baseAreDaily: ctx.baseAreDaily,
    aspDaily: ctx.aspDaily,
    areEntitlement: ctx.areEntitlement,
    paidLeaveAmount: ctx.paidLeaveAmount,
    supraLegalSeveranceAmount: ctx.supraLegalSeveranceAmount,
    areNoticePaidToEmployee: ctx.areNoticePaidToEmployee,
    cspNoticePaidToEmployee: ctx.cspNoticePaidToEmployee,
    noticePaidToFranceTravail: ctx.noticePaidToFranceTravail,
    paidLeaveDeferralDays: ctx.paidLeaveDeferralDays,
    specificDeferralDays: ctx.specificDeferralDays,
    waitingPeriodDays: WAITING_PERIOD_DAYS,
    classicAreStartDay: ctx.classicAreStartDay,
    areDegressiveApplicableClassic: ctx.areDegressiveApplicableClassic,
    areDailyAfterDegressivityClassic: ctx.areDegressiveApplicableClassic
      ? Math.max(ctx.baseAreDaily * (1 - DEGRESSIVE_ARE_REDUCTION_RATE), DEGRESSIVE_ARE_FLOOR_DAILY)
      : null,
    degressivityStartDayClassic: ctx.degressivityStartDayClassic,
    hasNewJob: ctx.hasNewJob,
    newJobStartDay: ctx.newJobStartDay,
    cspAspEndDay: ctx.cspAspEndDay,
    cspAspStoppedByNewJob: ctx.cspAspStoppedByNewJob,
    cspAreAfterCspApplicable: ctx.cspAreAfterCspApplicable,
    cspAreAfterCspStartDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspStartDay : null,
    cspAreAfterCspExhaustionDay: ctx.cspAreAfterCspApplicable ? ctx.cspAreAfterCspExhaustionDay : null,
    areDegressiveApplicableAfterCsp: ctx.cspAreAfterCspApplicable && ctx.areRestanteDegressive,
    areDailyAfterDegressivityAfterCsp:
      ctx.cspAreAfterCspApplicable && ctx.areRestanteDegressive ? ctx.areRestanteDailyRate : null,
    classicAreNeverStarted: ctx.classicAreNeverStarted,
    classicAreStoppedByNewJob: ctx.classicAreStoppedByNewJob,
    classicAreExhaustionDay: ctx.classicAreNeverStarted ? null : ctx.classicAreExhaustionDay,
    reclassementPrime: ctx.reclassementPrime,
    idr: ctx.idr,
    chosenAid: ctx.chosenAid,
    warnings,
    events,
    paymentPeriods,
    dailySeries,
    monthlySeries,
    comparisonTable,
    decisionPoints,
    keyDates,
    crossoverDay,
    horizon,
  };
}
