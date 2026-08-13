# design.md — cashinstinct.ca

Ce document décrit les patterns actuellement observés dans les pages live. Il
sert de repère pour une nouvelle page ou une retouche ciblée; les fichiers HTML
restent l'autorité pour les détails d'implémentation. Le site n'a pas de feuille
CSS partagée : les styles sont principalement intégrés à chaque page.

## Familles de tokens

Les pages ne forment pas un thème unique. Elles reprennent souvent des noms de
variables communs, mais leurs valeurs et leurs surcharges en mode sombre sont
locales à la famille éditoriale ou au programme.

| Famille observée | Tokens ou usage |
|---|---|
| Accueil et À propos | `--blue`, `--blue-soft`, `--blue-contrast` et `--radius`; cette famille a ses propres variantes clair/sombre. |
| Guides de programmes | `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent` et `--accent-dark`, avec une couleur d'accent choisie pour le programme. |
| Comparatifs Internet | même logique de surfaces et d'accent, souvent dans une famille rouge dédiée aux comparaisons EBOX/Internet. |
| Outils et tutoriels | réutilisation partielle des tokens de guide, sans obligation de reprendre l'accent d'un programme de parrainage. |

Ne pas uniformiser les valeurs d'accent entre programmes et ne pas transformer
les pages en composants partagés sans demande explicite. La présence de mêmes
noms de variables ne prouve pas que les valeurs doivent être identiques.

`--warning-border` n'est pas une constante cross-site : les pages utilisent
notamment `#f59e0b` ou `#ffcc66`, avec des valeurs de mode sombre distinctes.
Les blocs d'avertissement doivent donc reprendre la palette de leur page au
lieu d'imposer une valeur globale.

## Composants et CTA

Les composants suivants sont des familles observées, pas un contrat que toutes
les pages doivent adopter :

- la navigation, le footer, le fil d'Ariane, les cartes, les FAQ et les tables
  sont redéfinis localement; les paires FR/EN partagent généralement leur
  structure tout en conservant leurs textes et certaines surfaces propres;
- `.cta-btn-hero` apparaît sur plusieurs guides et possède plusieurs versions,
  d'un bouton plat à un bouton en pilule avec ombre. Son nom ne garantit pas
  une géométrie ou une interaction identique;
- `.btn` et `.cta-section` existent dans plusieurs pages, mais leurs couleurs,
  rayons et traitements dépendent du contexte;
- `.cta-code-row`, `.cta-code-pill` et `.cta-copy-btn` servent au parcours de
  copie d'un code sur certaines pages, notamment EBOX, Tangerine et Achieva.
  Ce pattern n'est pas requis pour toutes les pages qui mentionnent un code;
- les codes et montants utilisent fréquemment une police monospace de type
  `"Courier New", Courier, monospace`, tandis que le texte courant s'appuie
  sur une pile sans-serif système.

Une différence de CTA entre deux pages existantes n'est pas, à elle seule, une
régression. Pour une nouvelle page, choisir la famille qui correspond à son
parcours et vérifier les deux langues avant de copier un bloc CSS.

## Responsive et thèmes

Les pages prévoient un mode sombre via `data-theme="dark"` et un contrôle de
thème, mais les variables et détails visuels sont définis localement. Les
layouts doivent rester utilisables sur petits écrans, éviter le débordement
horizontal et conserver des contrôles visibles et accessibles au clavier.
Les audits Playwright vérifient ces invariants à plusieurs largeurs; ils ne
constituent pas une autorisation de modifier les styles d'une page non incluse
dans la tâche.

## Règles de maintenance visuelle

- Observer la page live et son équivalent linguistique avant toute retouche;
  conserver la hiérarchie, les espacements, les états de focus et les
  composants locaux déjà utilisés.
- Préserver les conventions d'accessibilité associées aux composants : nom
  accessible des boutons/liens, `alt`, références ARIA, focus visible et
  comportement du contrôle de thème.
- Ne pas créer une règle globale à partir d'un pattern observé sur une seule
  page. Ne pas retoucher les anciennes variantes uniquement pour rendre les
  rayons ou les ombres identiques.
- Les commentaires de maintenance et les source records dans les pages ont
  priorité sur une simplification visuelle qui ferait perdre le contexte d'une
  preuve, d'une date ou d'un parcours.
