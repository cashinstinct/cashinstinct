# Tests automatisés de Cash Instinct

Les audits sont locaux et ne modifient pas les pages. Ils ne remplacent pas
la vérification éditoriale des conditions d'une offre, des parcours authentifiés
ou de la pertinence d'une source officielle.

## Installation

```bash
npm install
npx playwright install chromium
```

Node.js 20 ou une version LTS plus récente est recommandé. Les suites
Playwright utilisent le serveur local `http://127.0.0.1:4173`.

## Commandes disponibles

```bash
npm run test:regression
npm run audit:quick
npm run audit:maintainability
npm run audit:full
npm run audit:all
npm run audit:full:ui
npm run serve:test
```

- `test:regression` exécute les fixtures Node des politiques de liens internes,
  de liens externes et de noms accessibles.
- `audit:quick` exécute d'abord `test:regression`, puis l'audit statique.
- `audit:maintainability` produit le rapport conservateur de maintenabilité.
- `audit:full` vérifie les URLs externes, puis exécute `playwright test`.
- `audit:all` lance `audit:quick` puis `audit:full`, même si la première
  commande échoue, et retourne un échec si l'une des deux échoue.
- `audit:full:ui` lance l'interface Playwright pour diagnostiquer les tests.
- `serve:test` sert le dépôt sans cache sur le port 4173; il est lancé
  automatiquement par Playwright dans `audit:full`.

Les nombres de pages, de tests et d'URLs sont découverts depuis le checkout;
ils ne constituent pas une garantie documentaire fixe.

## `audit:quick` — statique et sans réseau

`audit:quick` découvre les `index.html` du dépôt et le sitemap, puis vérifie :

- les fixtures de régression;
- la validité HTML, les titres, descriptions, robots, canonical, Open Graph,
  Twitter Cards, H1 et ordre des titres;
- `lang`, `og:locale`, les liens `hreflang` réciproques et `x-default`;
- les références ARIA, les noms accessibles des liens et contrôles, les IDs,
  les ancres et les URLs `file://` interdites;
- les liens internes et ressources locales, les images Open Graph et leur
  signature, extension et dimensions déclarées;
- les liens externes statiques pour HTTPS et, avec `target="_blank"`,
  `noopener` et `noreferrer` — sans ouvrir ces URLs;
- le JSON-LD : parsing, contexte, types racines, cohérence des surfaces
  `WebPage`/meta, origines internes canoniques, dates, conflits d'identifiants,
  interdiction de `Review`/`AggregateRating` et compatibilité sitemap;
- les FAQ : même nombre de questions visibles et JSON-LD, mêmes libellés,
  réponses visibles et `acceptedAnswer.text` non vide;
- la présence des codes attendus sur les paires de pages concernées.

L'audit est déterministe par rapport aux fichiers et aux politiques du dépôt,
et ne fait aucun appel réseau. Il retourne un code non nul lorsqu'une erreur
bloquante est trouvée. Les avertissements et les exceptions intentionnelles
sont affichés sans rendre la commande non nulle. Le calcul des réponses FAQ
exactement identiques reste un rapport informatif : un écart de texte
compatible n'est pas, à lui seul, une erreur bloquante.

Les règles de liens internes sont centralisées dans
`tests/lib/internal-link-policy.mjs` et celles des liens externes dans
`tests/lib/external-link-policy.mjs`. La configuration commune, l'origine
canonique, les routes `x-default`, les codes attendus et les exceptions sont
dans `tests/config/site-policy.mjs`.

## `audit:maintainability` — signaux conservateurs

Ce parcours inspecte localement le HTML, le CSS, le JavaScript et les images;
il exclut les tests, les dépendances, les rapports, les résultats générés et
les fichiers ignorés de la configuration de site. Il recherche notamment les
IDs potentiellement orphelins, sélecteurs sans correspondance, fonctions ou
blocs dupliqués, règles CSS masquées et images sans référence locale.

Ses niveaux ne sont pas des ordres de suppression :

- **erreur certaine** : défaut statique suffisamment établi; la commande
  retourne un code non nul;
- **avertissement fort** : signal concordant qui exige une confirmation
  humaine;
- **élément facultatif** : piste pouvant avoir une justification éditoriale,
  dynamique ou historique;
- **exception intentionnelle** : comportement explicitement conservé, comme
  le code dormant du compte à rebours EBOX;
- **information** : duplication FR/EN, sélecteur dynamique ou ressource pouvant
  être utilisée hors du site; aucune suppression n'est recommandée sur ce
  seul constat.

L'analyse reconnaît des sélecteurs, gestionnaires HTML, mutations JavaScript,
classes et attributs générés, mais elle ne prouve pas toute l'exécution d'une
page. Toute correction doit donc être vérifiée dans les deux langues et dans
le navigateur.

## `audit:full` — réseau externe et navigateur

La première étape, `tests/full/external-links.mjs`, collecte les URLs externes
statiques uniques des ancres HTML. Pour chaque URL, la politique :

1. essaie `HEAD`;
2. suit les redirections, jusqu'à la limite prévue;
3. utilise un `GET` limité comme repli si `HEAD` échoue ou ne renvoie pas une
   réponse 2xx;
4. réessaie les erreurs réseau, les 5xx et les 429 selon les options prévues;
5. conserve la méthode, l'URL finale et les sources de chaque lien dans le
   rapport.

La classification est la suivante :

- **bloquant** : réponse finale 404 ou 410, y compris après redirection;
- **réussi** : réponse 2xx;
- **information** : réponse 2xx obtenue après redirection;
- **avertissement indéterminé** : 401/403/429, 5xx après réessai, timeout,
  erreur réseau, boucle ou redirection incomplète, ou autre statut inattendu.

Un 403, 429, 5xx ou timeout n'est donc pas assimilé automatiquement à un lien
supprimé. Le code de sortie de l'étape réseau ne bloque que les erreurs 404/410.
La vérification de portée réseau ne démontre pas que le contenu du fournisseur
est celui attendu.

La seconde étape démarre le serveur local et exécute Chromium à trois largeurs
définies dans `playwright.config.mjs` (`402`, `768` et `1280` pixels) pour
chaque page découverte. Elle vérifie notamment :

- le chargement local et l'absence d'erreurs de page, de console ou de
  ressources locales;
- la politique des liens internes, la navigation et le rendu global;
- la cohérence rendue du titre, de la description, du JSON-LD et des FAQ;
- un H1 et une navigation visibles;
- l'absence de débordement horizontal, de liens aux couleurs natives et de
  contrôles interactifs cachés en clair;
- le basculement clair/sombre, `aria-pressed` du contrôle de thème et, si elle
  existe, la visibilité au focus de la skip link.

À `402` pixels, les ancres après hydratation JavaScript sont inventoriées.
Les URLs externes apparues dans le DOM sont contrôlées avec la même politique;
les 404/410 sont bloquants, les autres incertitudes sont annotées comme
avertissements. L'audit réseau externe initial ne voit que les ancres statiques;
cette passe runtime couvre le complément injecté après chargement.

## Fixtures de régression

Les tests sous `tests/regression/` couvrent notamment :

- URL interne relative, origines `http`/`www` non canoniques, croisements FR/EN
  inutiles lorsqu'une traduction existe, sélecteur de langue, parité des
  navigations principales et des footers;
- déduplication des URLs externes, collecte après hydratation, HTTPS et `rel`,
  fallback HEAD/GET, redirections, 404/410, 403/429, 5xx, timeouts et limites
  de redirection;
- calcul des noms accessibles à partir du texte, `aria-label`,
  `aria-labelledby`, `img alt`, titre SVG et `title`.

Ces fixtures vérifient les politiques isolément; elles ne remplacent pas les
audits sur les pages réelles.

## Limites volontaires

L'automatisation ne couvre pas actuellement :

- la validité factuelle d'une offre, l'accès à un compte authentifié ou la
  réussite commerciale d'un parcours;
- Lighthouse, Axe, tests visuels de référence, comparaison textuelle complète
  FR/EN ou validation Schema.org distante;
- Firefox et WebKit;
- les hooks Git et GitHub Actions;
- la décision éditoriale sur une source, une date de vérification, une
  expérience personnelle ou une exception documentée.

Les rapports `playwright-report/` et `test-results/` sont des artefacts de
diagnostic et ne doivent pas être traités comme des fichiers source.
