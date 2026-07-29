# Tests automatisés de Cash Instinct

Cette infrastructure comporte deux niveaux :

- `audit:quick` analyse directement les fichiers HTML, le sitemap, le JSON-LD,
  les métadonnées, les liens et les ressources locales;
- `audit:maintainability` cherche la dette technique probable dans le HTML,
  le CSS, le JavaScript et les ressources, sans modifier ni supprimer de code;
- `audit:full` sert le site localement et parcourt les 28 pages dans Chromium
  aux largeurs 402, 768 et 1280 px.

Elle ne modifie aucune page et ne corrige jamais automatiquement les défauts.

## Installation

```bash
npm install
npx playwright install chromium
```

Node.js 20 ou une version LTS plus récente est recommandé.

## Commandes

```bash
npm run audit:quick
npm run audit:maintainability
npm run audit:full
npm run audit:all
npm run audit:full:ui
npm run serve:test
```

- `audit:quick` doit normalement terminer en moins de dix secondes.
- `audit:maintainability` produit un rapport conservateur : ses avertissements
  et éléments à vérifier demandent toujours une confirmation humaine avant
  toute suppression.
- `audit:full` démarre et arrête automatiquement le serveur local.
- `audit:all` exécute les deux niveaux dans l’ordre.
- `audit:full:ui` ouvre l’interface de diagnostic Playwright.
- `serve:test` sert manuellement le dépôt sur `http://127.0.0.1:4173`.

## Niveaux de résultat

- **Erreur bloquante** : retourne un code non nul et doit être examinée.
- **Avertissement** : signale un sujet réel, mais volontairement non bloquant.
- **Exception intentionnelle** : documente une décision connue du site; elle ne
  sert pas à masquer une erreur inattendue.

L’audit de maintenabilité utilise ses propres niveaux :

- **Erreur certaine** : syntaxe cassée, ID réellement dupliqué ou référence
  locale inexistante; la commande retourne alors un code non nul.
- **Avertissement fort** : preuve statique concordante dans les deux langues,
  mais confirmation humaine requise avant toute modification.
- **Élément facultatif** : piste non urgente qui peut avoir une justification
  éditoriale, dynamique ou historique.
- **Exception intentionnelle** : code dormant ou comportement connu conservé
  par décision explicite, comme le compte à rebours promotionnel EBOX.
- **Information** : parité FR/EN, sélecteur sans correspondance statique ou
  image sans référence locale détectée dans les 28 pages; ce niveau ne
  recommande aucune vérification systématique ni suppression.

L’analyse tient compte des sélecteurs littéraux, des gestionnaires HTML, des
classes et attributs appliqués en JavaScript, ainsi que du balisage construit
dans les chaînes et les gabarits JavaScript. Les répertoires de rapports,
les dépendances, les fichiers générés et l’infrastructure `tests/` sont exclus.
Les images peuvent être utilisées dans Reddit, des publications externes, des
preuves ou des archives : l’absence de référence locale n’implique jamais
qu’une image est orpheline ou inutile.

Les exceptions communes sont définies dans
`tests/config/site-policy.mjs`. Toute nouvelle exception doit comporter une
règle précise et une justification éditoriale ou technique. Il ne faut pas
ajouter une exception uniquement pour rendre l’audit vert.

## Diagnostic Playwright

Lorsqu’un test échoue :

1. lire le nom de la page et de la largeur dans le terminal;
2. ouvrir `playwright-report/index.html`;
3. consulter la capture et la trace conservées dans `test-results/`;
4. relancer le test avec `npm run audit:full:ui`.

Les ressources externes ne font pas échouer l’audit complet. Les erreurs de
console, de chargement et de réponse HTTP ne sont bloquantes que lorsqu’elles
concernent la page ou une ressource servie localement.

## Périmètre volontairement exclu du MVP

- hooks Git et GitHub Actions;
- liens externes;
- Lighthouse;
- tests visuels de référence;
- Firefox et WebKit;
- Axe;
- contrats CTA détaillés;
- validation Schema.org distante;
- comparaison textuelle FR/EN.
