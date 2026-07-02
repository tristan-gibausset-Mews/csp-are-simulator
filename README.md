# Simulateur CSP vs ARE

Simulateur indicatif comparant, pour un salarié licencié économique en France, deux
scénarios :

1. **Acceptation du CSP** (Contrat de Sécurisation Professionnelle)
2. **Refus du CSP** — perception du préavis, puis **ARE classique** (Allocation de
   retour à l'emploi)

L'application permet de faire varier les paramètres de sa situation (salaire,
congés payés, reprise d'emploi, âge, ancienneté, affiliation...) et de visualiser
concrètement l'impact sur les indemnités brutes touchées chaque mois et cumulées
dans le temps.

Application 100 % front-end : aucun backend, aucune authentification, aucune base
de données, aucun appel réseau, aucune donnée personnelle stockée. Tous les calculs
sont effectués côté client, dans le navigateur.

## ⚠️ Avertissement juridique

**Cette simulation est strictement indicative et n'a aucune valeur contractuelle
ou juridique. Elle ne remplace pas une notification officielle France Travail, un
conseil juridique ou un calcul RH officiel.**

- Tous les montants affichés sont **bruts**. Aucune cotisation sociale, CSG/CRDS
  ni impôt n'est calculée.
- Le SJR (salaire journalier de référence) est **approximé** à partir du seul
  salaire mensuel brut renseigné (`salaire mensuel * 12 / 365`). Le calcul
  officiel France Travail repose sur l'attestation employeur et peut différer
  significativement selon les primes, absences, périodes non travaillées,
  indemnités de rupture, temps partiel, âge, ancienneté et la situation exacte
  du salarié.
- Les constantes réglementaires utilisées (taux ARE, seuils de dégressivité,
  différés, durées de droits...) évoluent régulièrement au gré des conventions
  Unédic. Elles doivent être vérifiées avant toute décision.

## Sources réglementaires à vérifier régulièrement

Les constantes du fichier [`src/lib/regulatoryConstants.ts`](src/lib/regulatoryConstants.ts)
doivent être recoupées périodiquement avec les sources officielles suivantes :

- [France Travail](https://www.francetravail.fr/) — allocations, droits, simulateurs officiels
- [Unédic](https://www.unedic.org/) — règlement d'assurance chômage, conventions CSP
- [Service-public.fr](https://www.service-public.fr/) — fiches pratiques CSP / licenciement économique

## Stack technique

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) (strict, sans `any`)
- [Tailwind CSS](https://tailwindcss.com/) pour le style
- [Recharts](https://recharts.org/) pour les courbes cumulées
- [Vitest](https://vitest.dev/) pour les tests unitaires
- ESLint + Prettier pour la qualité du code

## Structure du projet

```txt
csp-are-simulator/
  README.md
  package.json
  index.html
  vite.config.ts
  vitest.config.ts
  tsconfig.json / tsconfig.app.json / tsconfig.node.json
  tailwind.config.ts
  postcss.config.js
  eslint.config.js
  prettier.config.js
  public/
    favicon.svg
  src/
    main.tsx
    App.tsx
    index.css
    components/
      InputPanel.tsx           Champs principaux ("Votre situation")
      AdvancedSettings.tsx      Accordéon des paramètres avancés
      DecisionSummary.tsx       "Verdict" : option gagnante par horizon
      ScenarioBreakdown.tsx     Détail complet CSP vs ARE + préavis
      ResultsCards.tsx          Cartes de résultats avec info-bulles
      CumulativeChart.tsx       Courbes cumulées (2 modes d'affichage)
      EventTimeline.tsx         Chronologie des événements
      ComparisonTable.tsx       Tableau de comparaison par horizon
      MonthlyCashflowTable.tsx  Montants touchés chaque mois
      PaymentPeriodsPanel.tsx   Périodes de versement / arrêts
      KeyDatesPanel.tsx         Dates clés d'épuisement des droits
      AssumptionsPanel.tsx      Hypothèses de calcul retenues
      ExplanationPanel.tsx      Explications dynamiques
      DisclaimerBanner.tsx      Bandeau d'avertissement
      ExportButtons.tsx         Export CSV / JSON
      InfoTooltip.tsx           Bouton "i" accessible (info-bulle)
    lib/
      calculationEngine.ts      Fonctions pures + orchestration
      regulatoryConstants.ts    Constantes réglementaires
      types.ts                  Types partagés
      formatters.ts             Formatage à l'affichage (arrondis ici uniquement)
      chartUtils.ts             Préparation des données du graphique
      resultExplanations.ts     Dictionnaire des textes d'info-bulles
    tests/
      calculationEngine.test.ts
```

Le moteur de calcul (`src/lib/calculationEngine.ts`) est composé de **fonctions
pures et déterministes**, sans aucun arrondi interne — les arrondis n'ont lieu
qu'à l'affichage (`src/lib/formatters.ts`). Les séries sont calculées **au jour
le jour**, puis agrégées par mois (`aggregateDailySeriesByMonth`) pour les
tableaux. Cela rend le moteur facile à tester unitairement et réutilisable
indépendamment de l'interface React.

## Installation

Prérequis : [Node.js](https://nodejs.org/) ≥ 18.

```bash
npm install
```

## Lancement en local

```bash
npm run dev
```

L'application est accessible sur `http://localhost:5173` (ou le port suivant
disponible si celui-ci est déjà utilisé).

## Tests unitaires

```bash
npm run test
```

Les tests couvrent notamment :

- les fonctions de base (ARE journalière, ASP, dégressivité, durée des droits
  ARE estimée à partir de l'affiliation, prime de reclassement, IDR, horizon
  automatique) ;
- la monotonie des cumuls (jamais de baisse) ;
- la non-parallélisation artificielle des courbes en mode "indemnités
  uniquement" sans reprise d'emploi ;
- l'exclusion du nouveau salaire des totaux "indemnités uniquement" ;
- les arrêts d'ASP / ARE à la reprise d'emploi, et le cas où l'ARE classique ne
  démarre jamais (reprise avant le début théorique de l'indemnisation) ;
- les bornes de l'horizon automatique selon l'âge (23 / 28 / 32 mois) et le mode
  manuel ;
- la complétude du dictionnaire d'info-bulles.

## Build de production

```bash
npm run build
```

Génère le dossier `dist/`, prêt à être déployé sur n'importe quel hébergeur
statique (Netlify, Vercel, GitHub Pages, Cloudflare Pages...).

```bash
npm run preview
```

permet de prévisualiser le build de production en local.

## Qualité de code

```bash
npm run lint     # ESLint
npm run format   # Prettier (écrit les fichiers)
```

## Publication sur GitHub

```bash
git init
git add .
git commit -m "Initial commit: simulateur CSP vs ARE"
git branch -M main
git remote add origin git@github.com:<votre-organisation>/csp-are-simulator.git
git push -u origin main
```

Un fichier `.gitignore` couvrant `node_modules/`, `dist/` et les fichiers de
build TypeScript est déjà fourni dans ce projet.

## Utilisation avec Lovable

Ce projet est structuré pour être facilement importé dans [Lovable](https://lovable.dev/) :

1. Poussez ce dépôt sur GitHub (voir ci-dessus).
2. Dans Lovable, créez un nouveau projet en important le dépôt GitHub
   (`Import from GitHub`).
3. Comme il s'agit d'un projet Vite + React + TypeScript + Tailwind standard,
   sans backend ni base de données, Lovable peut l'ouvrir et le faire évoluer
   directement sans configuration additionnelle.
4. Le moteur de calcul (`src/lib/calculationEngine.ts`) étant entièrement
   découplé de l'UI, vous pouvez demander à Lovable de retravailler
   l'interface (composants dans `src/components/`) sans risquer de casser la
   logique métier, à condition de ne pas modifier les fonctions exportées de
   `src/lib/`.
5. Si vous modifiez les constantes réglementaires ou les règles métier,
   relancez `npm run test` pour vérifier que les scénarios de référence
   restent cohérents.

## Notions clés du simulateur

### Les deux modes d'affichage

- **Indemnités uniquement** (mode par défaut) : les courbes et tableaux ne
  montrent que les sommes liées à la rupture, au chômage et aux aides CSP
  (préavis, congés payés, indemnité supra-légale, ASP, ARE, prime de
  reclassement, IDR). Le nouveau salaire éventuel est exclu. Après une reprise
  d'emploi, les courbes peuvent devenir plates si plus aucune indemnité n'est
  due.
- **Total avec nouveau salaire** : le nouveau salaire est ajouté aux deux
  scénarios à partir de la date de reprise. Comme il s'agit du même emploi et
  du même salaire dans les deux scénarios, les courbes peuvent devenir
  parallèles après la reprise : l'écart entre CSP et ARE + préavis reste alors
  stable, sauf versement différentiel (prime de reclassement, IDR).

### Durée des droits ARE : estimation vs durée officielle

Par défaut, la durée des droits ARE est **estimée** à partir de l'ancienneté
chez l'employeur actuel et des mois travaillés chez d'anciens employeurs,
plafonnée par la période de référence (24 mois sous 55 ans, 36 mois à partir de
55 ans) puis par la durée maximale selon l'âge (548 / 685 / 822 jours). Cette
estimation est **volontairement simplifiée** : le droit d'option et le
rechargement des droits ne sont pas modélisés.

Si vous connaissez votre durée officielle de droits (notifiée par France
Travail), renseignez-la dans **Durée ARE officielle notifiée** (paramètres
avancés) : elle remplace alors intégralement l'estimation.

### Horizon automatique de simulation

En mode automatique (par défaut), la durée affichée dans le graphique et les
tableaux est calculée pour couvrir le dernier événement utile de la simulation
(fin de préavis, début/fin d'ARE, versements de prime, reprise d'emploi,
croisement des courbes...), avec une marge de lecture, plafonnée à 23 mois sous
55 ans, 28 mois entre 55 et 56 ans, et 32 mois à partir de 57 ans (36 mois
maximum dans tous les cas). En mode manuel, vous forcez la durée affichée sans
changer les droits calculés.

### Reprise d'emploi

- Si la reprise intervient **avant** le début estimé de l'ARE classique,
  aucune ARE classique n'est versée dans cette simulation (le scénario ARE +
  préavis ne repose que sur le préavis, les congés payés et l'indemnité
  supra-légale).
- Si la reprise intervient **après** le début de l'ARE classique, celle-ci
  s'arrête à la date de reprise (version simplifiée, sans réactivation
  ultérieure des droits).
- Côté CSP, l'ASP s'arrête toujours à la date de reprise. Une reprise rapide et
  durable (avant la fin du 10ᵉ mois de CSP) peut ouvrir droit à la prime de
  reclassement ; un nouvel emploi moins rémunéré (à quotité de travail
  identique) peut ouvrir droit à l'IDR. Le simulateur retient automatiquement
  l'aide la plus favorable.

### Dégressivité de l'ARE

Pour les salariés de moins de 55 ans dont le SJR dépasse le seuil réglementaire,
l'ARE classique est réduite de 30 % (avec un plancher journalier) à partir du
183ᵉ jour indemnisé. Après un CSP intégralement suivi (12 mois), le même
mécanisme peut s'appliquer à l'ARE restante dès son premier jour, car le
compteur cumulé CSP + ARE dépasse déjà le seuil de déclenchement. **L'ASP du
CSP n'est en revanche jamais dégressive**, quel que soit le niveau de salaire.

## Limites du simulateur

- Estimation simplifiée du SJR et de la durée des droits ARE (pas
  d'attestation employeur, pas de droit d'option, pas de rechargement des
  droits).
- Pas de modélisation du temps partiel, des primes variables, des absences ou
  des périodes non travaillées.
- Une seule reprise d'emploi modélisée ; pas de réactivation des droits en cas
  de nouvelle perte d'emploi après la reprise.
- Aucun calcul de net, de cotisations sociales, de CSG/CRDS ou d'impôt : tous
  les montants sont bruts.

## Licence et responsabilité

Ce projet est fourni à titre pédagogique et indicatif. Aucune garantie n'est
apportée quant à l'exactitude des calculs au regard de la réglementation en
vigueur au moment de l'utilisation. Voir l'avertissement juridique ci-dessus.
