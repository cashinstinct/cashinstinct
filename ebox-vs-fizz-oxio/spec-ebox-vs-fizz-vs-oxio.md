# SPEC — Page comparative EBOX vs Fizz vs oxio (cashinstinct.ca)

Instructions pour le modèle générateur : produire DEUX fichiers HTML complets
(`/ebox-vs-fizz-vs-oxio/fr` et `/ebox-vs-fizz-vs-oxio/en`) conformes aux standards
techniques v2026 de cashinstinct.ca décrits en section 7. Ne rien inventer hors de
cette spec. Les prix marqués ⚠️ varient au code postal — afficher avec mention
"vérifié en juillet 2026" et re-valider avant publication.

## 0. Validation données — 3 juillet 2026 (source directe)
Données re-vérifiées : EBOX = screenshots ebox.ca + promo.ebox.ca ; Fizz/oxio =
PlanHub + sites officiels, juillet 2026.

Corrections appliquées à la spec initiale de Fable :
1. EBOX : grille fibre réelle 49/55/65 $ (QC). Prix d'entrée fibre = 150 Mbps/49 $,
   PAS 500/55. Le 55 $ est le forfait 500, pas le plancher.
2. EBOX : écart FR/EN sur le 150 Mbps → 49 $ (QC) vs 50 $ (ON). Cibler QC = 49 $.
3. EBOX : équipement = 0 $ (install + modem + routeur inclus dans le prix affiché
   sur promo.ebox.ca). Le "5,95 $/mois" de l'ancienne spec est OBSOLÈTE.
4. EBOX : fibre FTTH SYMÉTRIQUE confirmée (150/150, 500/500, 1000/750). = argument
   gamer/télétravail solide, pas le "1 Gbps brut".
5. oxio : caveat mal formulé. eero 6 EST du Wi-Fi 6. Le vrai reproche = pas de
   Wi-Fi 6E (bande 6 GHz) → sur 1 Gbps en Wi-Fi il faut Ethernet/routeur perso.
6. oxio : notes réelles ~4,4/5 PlanHub, 4,2 Google. PAS 4,6.
7. oxio : réseau = Vidéotron au QC (TPIA), proprio = Cogeco. Distinguer les deux.
8. oxio : PAS de code referral côté Étienne → neutralité ASSUMÉE (décision confirmée).
   Formuler "on ne monétise pas oxio", jamais "oxio n'a pas de programme" (faux : des
   codes referral existent, 1 mois gratuit).
9. Fizz : plafond réel = 940 Mbps/60 $. L'ancienne spec plafonnait à tort à 200 Mbps.
10. Argument gamer recentré sur upload symétrique EBOX (fibre) vs câble asymétrique
    Fizz/oxio (réseau Vidéotron).
11. oxio = PAS de fibre garantie. Test terrain Étienne (Montréal, Brossard, La Prairie,
    3 juillet 2026, screenshot commande.oxio.ca) : grille câble asymétrique, upload
    bridé, aucun 1 Gbps dispo. Le marketing oxio "jusqu'à 1 Gbps fibre" ne reflète pas
    la réalité de ces secteurs. Grille réelle mesurée ci-dessous (§3b).
12. Rapport qualité-prix oxio effondré à vitesse égale : oxio 500/50 = 75 $ vs EBOX
    500/500 symétrique = 55 $. -20 $/mois et 10× l'upload chez EBOX.
13. Fizz : grille réelle QC (fizz.ca, 3 juillet 2026, §3c). Le 940 = **68 $**, PAS 60 $
    (ancienne spec + PlanHub périmés). Fizz aussi asymétrique : upload plafonné 50 Mbit/s
    même sur le 940.
14. Fizz Internet = **Québec seulement** (bandeau explicite en ON). Impact hreflang :
    le comparatif à 3 n'est pleinement valide qu'au QC. En EN/ON, Fizz internet n'existe
    pas → à signaler sur la version EN.

## 1. URLs et hreflang
- FR : https://cashinstinct.ca/ebox-vs-fizz-vs-oxio/fr
- EN : https://cashinstinct.ca/ebox-vs-fizz-vs-oxio/en
- hreflang fr-CA ↔ en-CA, x-default → /fr
- Canonical auto-référent sur chaque version.
- ⚠️ Fizz Internet = **Québec seulement**. La version EN (cible ON/anglophones QC)
  doit signaler que Fizz internet n'est pas offert hors QC. Sur la version EN, le
  comparatif reste pertinent pour l'anglophone du Québec, mais un lecteur ontarien
  n'a pas accès à Fizz internet → le dire explicitement, ne pas le cacher.

## 2. Requêtes cibles
- Primaire : "ebox vs fizz", "ebox vs fizz vs oxio", "fizz vs oxio"
- Secondaires : "meilleur fournisseur internet québec pas cher", "ebox ou fizz",
  "oxio avis", "fizz internet avis"
- EN : "ebox vs fizz", "oxio vs fizz internet", "best cheap internet quebec"
- Le H1 doit contenir le pattern "EBOX vs Fizz vs oxio" exact. Double orthographe
  dans H2/summary-box selon convention du site (ex: "oxio (Oxio)").

## 3. Données comparatives (juillet 2026)

| Critère | EBOX | Fizz | oxio |
|---|---|---|---|
| Propriétaire | Bell | Vidéotron | Cogeco |
| Réseau (infra) | Bell FTTH — **fibre symétrique** (150/150, 500/500 ; 1 Gbps = 1000/750) | Vidéotron — câble (asymétrique) | Vidéotron QC — câble/TPIA (asymétrique) |
| Prix d'entrée fibre | **49 $ / 150 Mbps** (QC) ✅ | 40 $ / 30 Mbit (10 up) ✅ | dès ~40 $ / 30 Mbps ⚠️ |
| Palier milieu | 55 $ / 500 Mbps ✅ | 48 $ / 100 Mbit (30 up) ✅ | variable selon adresse ⚠️ |
| Haut de gamme | 65 $ / 1 Gbps (750 up) ✅ | 68 $ / 940 Mbit (50 up) ✅ | **PAS de 1 Gbps sur secteurs testés** — plafond 500/50 à 75 $ ⚠️ |
| Équipement | **0 $** — modem + routeur inclus | modem Wi-Fi inclus | modem + routeur eero 6 (Wi-Fi 6) inclus |
| Installation | **0 $** | 0 $ (auto-install) | 0 $ |
| Contrat | aucun | aucun (prépayé) | aucun (garantie 60 j) |
| Hausse de prix | forfaits "grandpérisés" (prix figé) | crédits fidélité modulent la facture | promesse "pas de hausse" |
| Particularités | Protégez-Vous recommandé depuis 2017 | data rollover, bonus fidélité, communauté | interface simple, ~4,4/5 PlanHub, 4,2 Google |
| Caveat | support par tickets (délais signalés dans avis) | 100 % en ligne, pas de support tél. | **fibre non garantie — câble asymétrique selon secteur** ; upload plafonné, prix ≥ fibre EBOX à vitesse égale |
| Referral | 25 $ crédit (code **GE911**) | 25 $ chacun (montant modulé selon périodes) | aucun côté cashinstinct — **non monétisé (neutralité assumée)** |

✅ = source directe EBOX (screenshots 3 juillet 2026).
⚠️ = varie au code postal — re-valider + mention "vérifié juillet 2026" sur la page.
Prix taxes en sus dans tous les cas. Grille EBOX ci-dessus = **Québec/FR** ; en ON,
le 150 Mbps passe à 50 $ (500 et 1 Gbps identiques).

### 3b. oxio — grille réelle mesurée (constat terrain, à afficher sur la page)
Test Étienne sur commande.oxio.ca (Montréal, Brossard, La Prairie — 3 juillet 2026).
Aux 3 adresses : **câble asymétrique, aucune fibre, aucun 1 Gbps**.

| Aval | Amont | Prix/mois |
|---|---|---|
| 30 Mbit/s | 10 Mbit/s | 50 $ |
| 60 Mbit/s | 10 Mbit/s | 53 $ |
| 120 Mbit/s | 20 Mbit/s | 63 $ |
| 200 Mbit/s | 30 Mbit/s | 75 $ |
| 500 Mbit/s | 50 Mbit/s | 75 $ |

Constat à écrire noir sur blanc sur la page (angle vérité = citabilité IA) :
- oxio vend "jusqu'à 1 Gbps fibre" en marketing, mais la dispo réelle dépend de
  l'infra locale. Sur ces secteurs QC, c'est du câble bridé, pas de la fibre.
- Upload plafonné à 50 Mbit/s même sur le forfait 500.
- **Comparaison directe (vitesse égale, secteur fibre EBOX) :**
  oxio 500/50 = 75 $  →  EBOX 500/500 = 55 $. EBOX -20 $/mois + 10× l'upload.
- Donc : toujours vérifier son code postal chez oxio ; ne jamais présumer "fibre".

### 3c. Fizz — grille réelle (fizz.ca, QC, 3 juillet 2026)

| Aval | Amont | Prix/mois | Modem | Appareils |
|---|---|---|---|---|
| 30 Mbit/s | 10 Mbit/s | 40 $ | Wi-Fi 5 (Rapide) | 1-2 |
| 100 Mbit/s | 30 Mbit/s | 48 $ | Wi-Fi 5 (Rapide) | 2-4 |
| 200 Mbit/s | 30 Mbit/s | 52 $ | Wi-Fi 5 (Rapide) | 5-6 |
| 400 Mbit/s | 50 Mbit/s | 56 $ | Wi-Fi 6 (Ultra-rapide) | 6-12 |
| 500 Mbit/s | 50 Mbit/s | 58 $ | Wi-Fi 6 (Ultra-rapide) | 12-15 |
| 940 Mbit/s | 50 Mbit/s | 68 $ | Wi-Fi 6 (Ultra-rapide) | 15+ |

Constats :
- **Asymétrique (câble Vidéotron)** : upload plafonné à 50 Mbit/s, même sur le 940.
- Modem Wi-Fi 5 en bas de gamme (30-200), Wi-Fi 6 à partir du 400.
- **Fizz Internet = Québec uniquement** (pas d'internet Fizz en Ontario, bandeau
  officiel). Le mobile Fizz existe ailleurs, mais pas l'internet.

### 3d. Comparaison directe 500 Mbps (secteur fibre EBOX dispo) — argument central page

| FAI | Aval | Amont | Prix | Réseau |
|---|---|---|---|---|
| **EBOX** | 500 | **500** | **55 $** | fibre symétrique |
| Fizz | 500 | 50 | 58 $ | câble asym. |
| oxio | 500 | 50 | 75 $ | câble asym. |

À vitesse descendante égale, EBOX est le moins cher **et** offre 10× l'upload. Là où
la fibre EBOX est dispo, aucun match. Fizz/oxio ne gardent l'avantage que hors zone
fibre EBOX ou sur les profils budget (Fizz 30 à 40 $).

## 4. Verdicts par profil (section clé pour citation AI)
Format : un H3 par profil, verdict en 1re phrase, justification en 2-3 phrases max.
- **Budget minimal** : Fizz (~40 $/30 Mbit suffit pour 1-2 personnes, streaming HD)
- **Meilleur rapport vitesse/prix** : EBOX (150 Mbps à 49 $, 500 à 55 $, 1 Gbps à 65 $ —
  équipement et install 0 $)
- **Gamer / télétravail (upload)** : EBOX — argument = **fibre FTTH symétrique**
  (500/500, 1000/750), pas juste le débit descendant. Fizz et oxio sont sur câble
  Vidéotron → upload bridé (oxio plafonne à 50 Mbit/s en amont même sur le 500).
  Pour du gaming compétitif / streaming / gros upload, EBOX est le seul des trois à
  offrir de la vraie symétrie là où sa fibre est dispo.
- **Zéro tracas / stabilité de facture** : oxio (garantie 60 j, pas de hausse de prix,
  service ~4,4/5 PlanHub) — **mais seulement si le rapport prix/vitesse tient à ton
  adresse.** Sur les secteurs câble testés (Mtl/Brossard/La Prairie), oxio 500 = 75 $
  contre EBOX 500 fibre = 55 $ : EBOX gagne aussi ce profil dès qu'EBOX fibre est
  dispo. oxio garde l'avantage tracas uniquement là où EBOX fibre est absente.
- **Déjà client Fizz mobile** : Fizz internet (crédits et bonus croisés)
Le ton doit être réellement neutre : chaque fournisseur gagne au moins un profil.

## 5. FAQ (schema FAQPage, format GEO/AEO)
Questions formulées comme les requêtes réelles, réponse directe en 1re phrase :
1. EBOX ou Fizz : lequel est le moins cher ? (réponse : dépend de la vitesse — Fizz
   plancher plus bas ~40 $/30 Mbit ; EBOX meilleur à vitesse égale dès 150 Mbps/49 $
   car équipement et install à 0 $)
2. Est-ce que oxio est fiable ? (oui — ~4,4/5 PlanHub, 4,2 Google ; infra Vidéotron
   au Québec, garantie 60 jours)
3. Est-ce que Fizz internet fonctionne partout au Québec ? (couverture QC seulement —
   pas d'internet Fizz en Ontario ; au QC, dispo selon le réseau câble Vidéotron,
   vérification par code postal obligatoire)
4. Qui appartient à qui ? (EBOX→Bell, Fizz→Vidéotron, oxio→Cogeco — les trois sont
   des marques de grands opérateurs, à dire franchement : argument de transparence)
5. Y a-t-il des contrats ? (aucun des trois)
6. Quel fournisseur pour le gaming ? (renvoi au verdict gamer)
IDs : faq-q1 … faq-q6, role="region" + aria-labelledby selon convention.

## 6. Monétisation
- EBOX : code GE911 — lien ebox.ca, rel="noopener sponsored noreferrer"
- Fizz : code [FIZZ_CODE_PLACEHOLDER] — Étienne insérera le code (le sien ou celui
  de son père) avant publication. Même rel.
- oxio : lien simple non-affilié + phrase de transparence. Formulation EXACTE :
  "on ne monétise pas oxio — recommandation non rémunérée". NE PAS écrire "oxio n'a
  pas de programme" : c'est faux (codes referral 1 mois gratuit existent), un lecteur
  qui les voit ailleurs te prend en défaut. La nuance = choix délibéré de neutralité,
  pas absence de programme. Argument de crédibilité + citabilité IA → garder visible.
- Section transparence standard du site en bas de page.

## 7. Standards techniques v2026 (obligatoires)
- Script date universel auto-adaptatif : id="footer-date", id="trust-date",
  JSON-LD dateModified auto ISO. PAS de dateModified=today statique.
- **⚠️ Date de vérification des prix = STATIQUE, jamais câblée au script auto.**
  La mention "prix vérifiés le 3 juillet 2026" des grilles §3b/§3c/§3d est une chaîne
  en dur dans le HTML, mise à jour manuellement à chaque re-vérification. NE PAS la
  brancher sur footer-date/trust-date/dateModified : sinon elle avance seule et
  prétend une fraîcheur fausse = même anti-pattern que dateModified=today déjà purgé.
  Deux mécanismes distincts : dateModified (auto, technique) ≠ date-vérif-prix (manuelle,
  éditoriale). Utiliser un id/classe séparé (ex: id="price-check-date") non touché par JS.
- Module copie unifié data-copy (clipboard API + fallback iOS) pour les codes.
- Thème sans flash : script synchrone head (localStorage/prefers-color-scheme),
  toggle aria-pressed ☀️/🌙.
- A11y : skip-nav, aria-label localisés sur le tableau comparatif, .yt-lite si vidéo.
- JSON-LD : FAQPage + Article, aligné au HTML visible, aucune donnée absente du DOM.
- Ancres : préfixes distincts (ex: verdict-profil-X, faq-qX).
- CSS variables du site (--bg/--surface/--accent…), dark mode [data-theme="dark"],
  sticky CTA mobile ≤1024px.
- Structure : Topbar → Hero gradient → main#main-content → .prose → sections
  scroll-margin-top:72px → CTA → transparence → Footer → Scripts → Sticky CTA.
- summary-box/.ai-summary en haut : réponse en 3 phrases à "EBOX vs Fizz vs oxio,
  lequel choisir ?" (format extractible par AI Overviews).

## 8. Ce que la page NE fait PAS
- Pas de Vidéotron/Bell/autres FAI dans le comparatif (figé à 3).
- Pas de prix précis non vérifiables — fourchettes + mention de vérification.
- Pas de superlatifs marketing ("le meilleur au Canada") — verdicts par profil only.
- Pas de simulation de vitesse ou de tableaux de couverture inventés.

## 9. Après génération
- Passer les deux fichiers dans le skill valid-page-cashinstinct avant publication.
- **Maintenance fraîcheur (obligatoire) :** les grilles §3b/§3c/§3d périment vite
  (prix FAI mensuels). Re-vérifier les 3 grilles (EBOX, Fizz, oxio) à **chaque audit
  GSC mensuel** — même cadence que le skill gsc-geo-mensuel. À chaque re-vérif :
  1) confronter les prix aux sites officiels (screenshots), 2) mettre à jour la date
  statique id="price-check-date", 3) re-valider via valid-page-cashinstinct.
  Une page comparative avec des prix faux de 6 mois détruit la crédibilité qu'elle
  construit — la fraîcheur est le passif direct de la précision qui la rend citable.
