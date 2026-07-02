/**
 * Dictionnaire centralisé des textes d'explication affichés dans les
 * info-bulles (InfoTooltip) des cartes de résultats et des champs de saisie.
 *
 * Garder ces textes courts, factuels et cohérents avec le disclaimer général
 * de l'application (simulation indicative en brut).
 */

export type ResultExplanationKey =
  | 'estimatedSjr'
  | 'annualReferenceSalary'
  | 'aspDaily'
  | 'aspMonthly'
  | 'areDailyBeforeDegressivity'
  | 'areDailyAfterDegressivity'
  | 'areMonthlyBeforeDegressivity'
  | 'areMonthlyAfterDegressivity'
  | 'noticePaidToEmployeeAre'
  | 'noticeNotPaidToEmployeeCsp'
  | 'paidLeaveAmount'
  | 'supraLegalSeveranceAmount'
  | 'paidLeaveDeferralDays'
  | 'specificDeferralDays'
  | 'waitingPeriodDays'
  | 'classicAreStartDate'
  | 'cspReclassementPrime'
  | 'idr'
  | 'areEntitlementDays'
  | 'areEntitlementMonths'
  | 'currentEmployerSeniorityMonths'
  | 'previousEmployerAffiliationMonths'
  | 'existingAreRemainingDays'
  | 'officialAreEntitlementDaysOverride'
  | 'degressivityThreshold'
  | 'degressivityStart'
  | 'simulationHorizon'
  | 'cspExhaustionDate'
  | 'classicAreExhaustionDate'
  | 'winningOptionM6'
  | 'winningOptionM9'
  | 'winningOptionM15'
  | 'winningOptionM20'
  | 'winningOptionAtRightsExhaustion';

export const resultExplanations: Record<ResultExplanationKey, string> = {
  estimatedSjr:
    'Le SJR, ou salaire journalier de référence, sert de base au calcul de l’ARE et du CSP. Ici, il est estimé à partir du salaire brut mensuel : salaire brut mensuel × 12 ÷ 365. Le SJR officiel France Travail peut être différent si vous avez eu des primes, absences, périodes non travaillées ou variations de salaire.',

  annualReferenceSalary:
    'C’est l’estimation du salaire brut annuel utilisée par le simulateur. Elle correspond au salaire brut mensuel actuel multiplié par 12. Le calcul officiel peut intégrer d’autres éléments selon l’attestation employeur.',

  aspDaily:
    'L’ASP est l’allocation versée dans le cadre du CSP. Pour un salarié ayant au moins un an d’ancienneté, elle correspond généralement à 75 % du SJR. Elle démarre sans différé ni délai d’attente.',

  aspMonthly:
    'C’est l’équivalent mensuel moyen de l’ASP journalière. Le simulateur le calcule en convertissant le montant journalier sur une moyenne annuelle : ASP journalière × 365 ÷ 12.',

  areDailyBeforeDegressivity:
    'C’est le montant journalier estimé de l’allocation chômage classique avant éventuelle réduction pour haut revenu. Le simulateur retient le plus favorable entre 40,4 % du SJR + part fixe et 57 % du SJR, dans la limite de 75 % du SJR.',

  areDailyAfterDegressivity:
    'Pour les hauts revenus, l’ARE peut être réduite à partir du 7e mois d’indemnisation. Cette réduction ne concerne pas l’ASP du CSP. Si la dégressivité ne s’applique pas, ce champ indique "Non applicable".',

  areMonthlyBeforeDegressivity:
    'C’est l’équivalent mensuel moyen de l’ARE journalière avant éventuelle dégressivité. Le simulateur le calcule avec la formule : ARE journalière × 365 ÷ 12.',

  areMonthlyAfterDegressivity:
    'C’est l’équivalent mensuel moyen de l’ARE après application éventuelle de la réduction pour haut revenu. Ce montant n’est affiché que si la dégressivité s’applique.',

  noticePaidToEmployeeAre:
    'Si le salarié refuse le CSP, il conserve en principe son préavis. Le simulateur l’ajoute au scénario ARE + préavis sur la durée renseignée dans les paramètres avancés.',

  noticeNotPaidToEmployeeCsp:
    'En cas d’acceptation du CSP, le préavis n’est généralement pas versé directement au salarié dans la limite de 3 mois si l’ancienneté est d’au moins un an. L’équivalent est versé à France Travail pour financer le dispositif. Si le préavis dépasse 3 mois, l’excédent reste versé au salarié.',

  paidLeaveAmount:
    'Montant brut estimé des congés payés restants. Le simulateur le calcule avec : nombre de jours de congés payés restants × SJR estimé. En ARE classique, ces congés créent aussi un différé d’indemnisation.',

  supraLegalSeveranceAmount:
    'Montant versé au-delà des indemnités légales ou conventionnelles. Le simulateur l’exprime en mois de salaire brut. En ARE classique, cette somme crée un différé spécifique qui repousse le début de l’indemnisation.',

  paidLeaveDeferralDays:
    'Nombre de jours pendant lesquels le début de l’ARE est repoussé à cause des congés payés versés à la rupture. Dans ce simulateur, il est plafonné à 30 jours.',

  specificDeferralDays:
    'Nombre de jours de décalage de l’ARE lié aux indemnités supra-légales. Le simulateur l’estime en divisant l’indemnité supra-légale par le diviseur réglementaire utilisé dans les constantes, puis en appliquant le plafond de 150 jours.',

  waitingPeriodDays:
    'Délai fixe de 7 jours appliqué avant le démarrage de l’ARE, après les éventuels différés. Il ne s’applique pas à l’ASP du CSP.',

  classicAreStartDate:
    'Date approximative à laquelle l’ARE classique commence, après le préavis, le différé congés payés, le différé spécifique et le délai d’attente de 7 jours.',

  cspReclassementPrime:
    'Prime possible en cas de reprise d’un emploi durable avant la fin du 10e mois de CSP. Elle correspond à 50 % des droits ASP restants au moment de la reprise et est versée en deux fois : à la reprise, puis environ 3 mois plus tard si le contrat est toujours en cours.',

  idr:
    'Aide possible si le salarié reprend un emploi moins rémunéré que l’ancien, à quotité de travail équivalente. Elle compense une partie de la baisse de salaire, dans la limite de 50 % des droits ASP restants. Elle ne se cumule pas avec la prime de reclassement pour le même emploi.',

  areEntitlementDays:
    'Durée estimée pendant laquelle l’ARE peut être versée. Le simulateur l’estime à partir de l’âge et de la durée d’affiliation renseignée. Elle peut différer de la durée officielle France Travail.',

  areEntitlementMonths:
    'Équivalent approximatif en mois de la durée de droits ARE estimée ou renseignée. Le simulateur convertit les jours en mois avec une moyenne de 365 ÷ 12 jours par mois.',

  currentEmployerSeniorityMonths:
    'Nombre de mois travaillés chez l’employeur actuel. Cette donnée sert à estimer la durée d’affiliation et donc la durée potentielle des droits ARE. Elle sert aussi à vérifier l’ancienneté d’au moins un an pour le CSP.',

  previousEmployerAffiliationMonths:
    'Mois travaillés chez d’autres employeurs dans la période de référence. Cette donnée permet d’améliorer l’estimation de la durée de droits ARE.',

  existingAreRemainingDays:
    'Reliquat de droits chômage déjà notifié par France Travail. À renseigner uniquement si vous avez déjà des droits ouverts. Le simulateur peut utiliser ce reliquat pour éviter de sous-estimer vos droits.',

  officialAreEntitlementDaysOverride:
    'Durée de droits ARE officiellement notifiée par France Travail, en jours. Si ce champ est renseigné, le simulateur l’utilise à la place de son estimation.',

  degressivityThreshold:
    'Seuil à partir duquel l’ARE peut être réduite pour les hauts revenus. Le simulateur compare le SJR estimé au seuil réglementaire intégré dans les constantes. Cette dégressivité ne s’applique pas à l’ASP du CSP.',

  degressivityStart:
    'Moment à partir duquel l’ARE est réduite si les conditions sont réunies. Pour l’ARE classique, le simulateur applique la réduction à partir du 183e jour indemnisé. Pour l’ARE après CSP, la réduction ne touche jamais l’ASP et ne s’applique qu’à l’ARE restante.',

  simulationHorizon:
    'Le graphique s’arrête après le dernier événement utile de la simulation, avec une marge de lecture. Pour les moins de 55 ans, l’affichage est généralement borné autour de 23 mois : 18 mois de droits ARE, auxquels peuvent s’ajouter le préavis, les différés et une marge.',

  cspExhaustionDate:
    'Date à laquelle les droits CSP / ASP sont terminés, sauf reprise d’emploi avant cette date. Après le CSP, une ARE restante peut exister si les droits ne sont pas épuisés.',

  classicAreExhaustionDate:
    'Date approximative à laquelle les droits ARE classiques sont épuisés dans le scénario ARE + préavis, en tenant compte du préavis, des différés et du délai d’attente.',

  winningOptionM6:
    'Compare le cumul CSP et le cumul ARE + préavis au mois 6, selon le mode d’affichage sélectionné : indemnités uniquement ou total avec nouveau salaire.',

  winningOptionM9:
    'Compare le cumul CSP et le cumul ARE + préavis au mois 9. Cet horizon montre souvent l’impact de la prime de reclassement si une reprise d’emploi rapide a eu lieu.',

  winningOptionM15:
    'Compare le cumul CSP et le cumul ARE + préavis au mois 15. Cet horizon permet de voir l’effet de l’ASP sur 12 mois et de l’éventuelle ARE restante.',

  winningOptionM20:
    'Compare le cumul CSP et le cumul ARE + préavis au mois 20. Cet horizon permet d’observer si l’ARE classique rattrape une partie de son retard grâce à une durée d’indemnisation plus longue.',

  winningOptionAtRightsExhaustion:
    'Compare les deux scénarios au moment où les droits chômage sont épuisés. Ce résultat doit être séparé des cumuls avec nouveau salaire, sinon l’interprétation peut être trompeuse.',
};

/** Textes d'explication pour les champs de saisie (InputPanel / AdvancedSettings). */
export type InputExplanationKey =
  | 'currentMonthlyGrossSalary'
  | 'remainingPaidLeaveDays'
  | 'monthsBeforeNewJob'
  | 'newMonthlyGrossSalary'
  | 'age'
  | 'seniorityAtLeastOneYear'
  | 'currentEmployerSeniorityMonthsInput'
  | 'noticePeriodMonths'
  | 'newJobContractType'
  | 'newJobContractDurationMonths'
  | 'sameWorkingTime'
  | 'supraLegalSeveranceMonthsInput'
  | 'previousEmployerAffiliationMonthsInput'
  | 'existingARERemainingDaysInput'
  | 'officialAREEntitlementDaysOverrideInput'
  | 'simulationHorizonMode'
  | 'simulationHorizonMonthsInput';

export const inputExplanations: Record<InputExplanationKey, string> = {
  currentMonthlyGrossSalary:
    'Base principale de la simulation. Elle sert à estimer le SJR, l’ASP, l’ARE, le préavis et les indemnités exprimées en mois de salaire.',

  remainingPaidLeaveDays:
    'Nombre de jours de congés payés qui seront indemnisés à la rupture. Ils créent aussi un différé dans le scénario ARE classique.',

  monthsBeforeNewJob:
    'Nombre de mois entre le début de la simulation et la reprise d’un nouvel emploi. Si aucune reprise n’est prévue, cochez "Pas de reprise d’emploi".',

  newMonthlyGrossSalary:
    'Salaire brut mensuel du poste repris. Il est ajouté aux deux scénarios dans le mode "Total avec nouveau salaire".',

  age: 'L’âge sert à estimer la durée maximale des droits ARE et à déterminer si la dégressivité haut revenu peut s’appliquer.',

  seniorityAtLeastOneYear:
    'Condition importante pour le CSP. Avec au moins un an d’ancienneté, l’ASP est généralement calculée à 75 % du SJR et le préavis est versé à France Travail dans la limite de 3 mois.',

  currentEmployerSeniorityMonthsInput:
    'Nombre de mois travaillés chez l’employeur actuel. Sert à estimer la durée d’affiliation et donc les droits ARE.',

  noticePeriodMonths:
    'Durée du préavis théorique en cas de refus du CSP. Dans le scénario CSP, le préavis n’est généralement pas versé au salarié dans la limite de 3 mois si l’ancienneté est d’au moins un an.',

  newJobContractType:
    'Sert à vérifier l’éligibilité à la prime de reclassement CSP. Un CDI est éligible. Un CDD ou contrat d’intérim doit généralement durer au moins 6 mois.',

  newJobContractDurationMonths:
    'Sert à vérifier si un CDD ou un contrat d’intérim est suffisamment long pour ouvrir droit à la prime de reclassement CSP.',

  sameWorkingTime: 'Sert à vérifier l’éligibilité à l’IDR si le nouvel emploi est moins rémunéré que l’ancien.',

  supraLegalSeveranceMonthsInput:
    'Montant versé au-delà des indemnités légales ou conventionnelles, exprimé en mois de salaire. Elle repousse le démarrage de l’ARE classique via un différé spécifique.',

  previousEmployerAffiliationMonthsInput:
    'Mois travaillés chez d’autres employeurs dans la période de référence. Sert à améliorer l’estimation de la durée ARE.',

  existingARERemainingDaysInput:
    'Reliquat de droits déjà notifié par France Travail. À renseigner si vous avez déjà des droits chômage ouverts.',

  officialAREEntitlementDaysOverrideInput:
    'Durée officielle de droits ARE, en jours. Si renseignée, elle remplace l’estimation automatique.',

  simulationHorizonMode:
    'En mode automatique, le simulateur choisit un horizon suffisant pour couvrir les principaux événements. En mode manuel, vous forcez la durée affichée.',

  simulationHorizonMonthsInput:
    'Nombre de mois affichés dans le graphique et les tableaux. Cela ne change pas les droits, seulement la période visible.',
};
