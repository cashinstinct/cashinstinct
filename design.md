# design.md — cashinstinct.ca

Système de design extrait de StickerMule EN, Chexy EN, homepage FR (2026-07-02).
CSS inline par page — pas de fichier partagé. Ce doc est la source de vérité.

## Convention CSS — variables `:root`

Chaque page redéfinit le **même set de noms de variables**, avec des **valeurs
différentes selon le programme** (couleur brand de l'affilié). C'est voulu, pas
une dérive — ne pas uniformiser les valeurs entre programmes.

```css
:root {
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-soft: #...;      /* teinte très pâle de --accent */
  --surface-muted: #...;
  --text: #...;               /* texte principal, foncé */
  --text-soft: #...;          /* texte secondaire */
  --muted: #...;               /* texte tertiaire, désaturé */
  --border: #...;
  --border-soft: #...;
  --accent: #...;              /* COULEUR BRAND DU PROGRAMME — voir table */
  --accent-dark: #...;         /* accent assombri, pour bouton .btn */
  --warning-bg: #fff8e1 / #fffbeb;
  --warning-text: #7c5800 / #92400e;
  --warning-border: #f59e0b;   /* CONSTANT sur toutes les pages */
  --shadow: 0 10px 30px rgba(0,0,0,0.06);
  --radius: 14px;              /* présent seulement sur homepage — à généraliser? */
}
```

**`--warning-border: #f59e0b`** est la seule valeur figée cross-programme — sert
aux blocs d'avertissement (ex: "le coupon standard ne fonctionne pas").

## Palette par programme (accent)

| Programme | `--accent` | `--accent-dark` | Notes |
|---|---|---|---|
| StickerMule | `#ffaa00` (orange) | `#b0312d` | OK |
| Chexy | `#c4248f` (magenta) | `#1c0e42` | OK |
| EBOX | `#b0312d` (rouge) | **`#1e40af` (bleu)** | ⚠️ **BUG** — paire non cohérente, seul cas où accent/accent-dark sont dans deux teintes différentes. Copier-coller cassé, probablement collé depuis homepage. À corriger. |
| HP Instant Ink | `#058373` (teal) | `#036256` | OK |
| Tangerine | `#ff6600` (orange) | `#e06c00` | OK |
| Rakuten | `#6c00c8` (violet) | `#5500a0` | OK |
| Swagbucks | `#583be6` (indigo) | `#4126c4` | OK |
| Achieva | `#107a47` (vert) | `#0b5933` | OK, en pause |
| Homepage (Cashinstinct) | `--accent: #2563eb` / dark: `#3b82f6` | `--accent-dark: #1e40af` / dark: `#3b82f6` | Renommé le 2026-07-02 (était `--blue`/`--blue-contrast`) |

### `--warning-border` — PAS constant, corrige la V1 de ce doc

Deux valeurs coexistent, pas de règle claire sur laquelle utiliser :
- `#f59e0b` (ambre standard) : StickerMule, Chexy, EBOX, Tangerine, Achieva
- `#ffcc66` (ambre clair) : HP Instant Ink, Rakuten, Swagbucks

Pas grave en soi (les deux sont dans la même famille de couleur), mais pas une
convention volontaire identifiable — probablement deux générations de code.

## Composants — deux familles de CTA, pas une

### Famille A : `.cta-btn-hero` (bouton simple)
Utilisée sur StickerMule, Chexy, HP, Rakuten, Swagbucks — mais **pas
uniforme** :

| Page | border-radius | box-shadow | hover |
|---|---|---|---|
| StickerMule / Chexy | `8px` | aucune | opacity seulement |
| HP / Rakuten / Swagbucks | `24-28px` (pilule) | oui, colorée | `translateY(-1px)` + shadow renforcée |

Deux générations de style pour le même composant nommé pareil. Pas
nécessairement un bug (peut être une évolution volontaire du design), mais à
trancher : tu veux repasser toutes les pages "anciennes" (StickerMule/Chexy)
au style pilule+ombre, ou c'est acceptable que ça diffère ?

### Famille B : `.cta-code-pill` / `.cta-code-row` / `.cta-copy-btn`
Utilisée sur EBOX, Tangerine, Achieva — pattern différent (code affiché +
bouton copier), pas extrait en détail ce tour. Probablement lié au fait que
ces 3 programmes fonctionnent par **code à copier** plutôt que lien direct
(à vérifier — StickerMule a aussi un code CASHINSTINCT mais utilise Famille A,
donc la distinction n'est pas purement fonctionnelle).

## Standard CTA pour nouvelles pages (décidé 2026-07-02)

Aucune des deux versions n'est chronologiquement "la bonne" (vérifié : HP,
la plus ancienne des pages testées, est déjà en style pilule — pas
d'évolution linéaire). Décision arbitraire mais actée : **pilule + ombre**
pour toute nouvelle page à partir de maintenant. Pages existantes en style
plat (StickerMule, Chexy) pas retouchées pour ça seul — trop peu de valeur
pour le coût.

```css
.cta-btn-hero {
  display: inline-block;
  background: var(--accent);
  color: #ffffff;
  font-weight: 800;
  font-size: 1.15rem;
  padding: 18px 48px;
  border-radius: 28px;
  box-shadow: 0 6px 20px rgba(R, G, B, 0.28); /* accent en RGB */
  transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
  text-decoration: none;
}
.cta-btn-hero:hover {
  background: var(--accent-dark);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(R, G, B, 0.35);
}
```

Famille B (`.cta-code-pill`) abandonnée pour les nouvelles pages, même si le
programme a un code — afficher le code dans une carte séparée au-dessus du
bouton plutôt que d'utiliser le composant pill dédié.


```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```
Codes/montants en `"Courier New", Courier, monospace` — constant aussi.
Tailles/poids H1-H4 non extraits systématiquement — à faire si besoin précis.

## Autres composants (`.btn`, inchangé, toujours en usage)
```css
.btn {
  display: inline-block;
  background: var(--accent-dark);
  color: #fff;
  font-weight: 800;
  font-size: 1.05rem;
  padding: 14px 36px;
  border-radius: 8px;
  transition: opacity 0.15s;
}
```

### Bloc section CTA (encadré)
```css
.cta-section {
  background: var(--surface-soft);
  border: 1px solid var(--border);
  text-align: center;
  padding: 52px 20px;
  border-radius: 12px;
  margin-bottom: 40px;
}
```

*(`.cta-btn-hero` → voir section "Standard CTA pour nouvelles pages" plus haut.
Badge "code copié", carte programme homepage, FAQ accordion — pas extraits,
à faire si besoin pour une prochaine page.)*

## Border-radius — valeurs observées (fréquence)

| Valeur | Occurrences | Usage probable |
|---|---|---|
| 8px | 15 | boutons, éléments interactifs |
| 12px | 9 | cards, blocs CTA |
| 6px | 7 | petits éléments (badges) |
| 999px | 4 | pills / badges arrondis complets |
| 50% | 3 | icônes rondes |
| var(--radius) | 3 | homepage seulement (14px) |

Pas de règle unique claire — 8px/12px dominent, cohérent avec les composants
ci-dessus.

## Angles morts / à trancher

- ✅ **Résolu (2026-07-02)** — `--blue`/`--blue-contrast` renommés en
  `--accent`/`--accent-dark` sur homepage FR/EN, uniforme avec les programmes.
- **Nice to have** — `--radius` en variable n'existe que sur homepage. Pages
  programmes hardcodent `8px`/`12px` en dur. Pas de action requise, à
  généraliser en variable la prochaine fois que tu repasses sur une page
  programme (pas une passe dédiée).
- ✅ **Complété (2026-07-02)** — les 8 programmes + homepage extraits. Doc
  fiable pour une nouvelle page.
- **Nouveau, pas encore tranché** : bug couleur EBOX (`--accent-dark` bleu au
  lieu d'une teinte rouge) et divergence de style `.cta-btn-hero` entre pages
  anciennes/récentes — voir sections ci-dessus. Aucune action prise, en
  attente de ta décision.
