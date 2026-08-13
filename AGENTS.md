# Conventions du projet Cash Instinct

Respecter systématiquement les conventions déjà présentes dans le dépôt.

Avant toute modification, inspecter les fichiers live, les scripts, les tests
et la structure concernés. Les commentaires de maintenance et les « source
records » placés dans certaines pages font partie du contexte éditorial : les
lire avant de modifier une affirmation, une date ou un lien.

Avant d’ajouter ou de modifier un élément, observer comment cette même chose
est réalisée ailleurs sur le site et reproduire exactement la convention
existante. Ne jamais créer une nouvelle convention sans demande explicite.

Exemples non limitatifs :

- utiliser systématiquement des URL absolues canoniques
  (`https://cashinstinct.ca/...`) pour les liens de navigation interne et
  institutionnelle; cette règle explicite prévaut sur les anciens fichiers qui
  pourraient encore contenir des chemins relatifs;
- conserver le même style de liens internes;
- conserver les mêmes conventions HTML, JSON-LD, CSS et JavaScript;
- conserver les mêmes textes de transparence, d’affiliation et de navigation
  lorsqu’ils existent déjà;
- distinguer une source publique, un parcours officiel rendu, une vérification
  dans un compte authentifié et une expérience personnelle. Une information
  absente d’une landing publique ne suffit pas, à elle seule, à invalider une
  observation issue d’un parcours officiel ou d’un compte;
- séparer clairement l’expérience personnelle des règles générales et
  conserver les limites de l’observation lorsqu’elles sont documentées;
- ne pas remplacer une source officielle pertinente par une page générique
  moins probante simplement parce qu’elle est plus facile à trouver;
- pour une paire FR/EN, préserver les asymétries intentionnelles de contenu,
  de devise, de statut, de vidéo ou de données structurées; la parité
  sémantique ne signifie pas une égalité textuelle ou binaire;
- utiliser l’équivalent dans la même langue lorsqu’il existe. Le sélecteur de
  langue peut naturellement pointer vers l’autre langue;
- conserver la parité des destinations essentielles dans les navigations
  principales et les footers des paires, et vérifier `_redirects`, le sitemap
  et les destinations réelles avant de réutiliser une ancienne URL;
- conserver `rel="noopener noreferrer"` sur les liens externes
  `target="_blank"`, ainsi que les attributs éditoriaux déjà présents comme
  `sponsored` lorsqu’ils sont pertinents;
- les données structurées sont choisies selon le type de page : `Product` et
  `Offer` ne sont pas obligatoires. Ne pas les inventer pour uniformiser les
  pages, et ne pas ajouter de `Review` ou `AggregateRating`;
- utiliser les audits existants et consulter [`TESTING.md`](TESTING.md) pour
  leur périmètre au lieu de dupliquer leurs contrôles;
- respecter la typographie française existante du projet : utiliser une espace
  insécable avant `:`, `;`, `?` et `!` lorsque cette convention est
  présente, ainsi que dans les expressions figées qui ne doivent pas être
  coupées sur deux lignes, comme `À&nbsp;propos`; ne jamais remplacer ces
  espaces insécables par des espaces ordinaires;
- ne pas modifier les `dateModified`, dans le HTML ou les données structurées,
  sauf demande explicite;
- ne pas reformater du code ou remplacer une convention existante par une
  autre simplement parce qu’elle fonctionne aussi.

Les dates de vérification d’une offre, lorsqu’elles existent, ne sont pas
automatiquement des dates de révision éditoriale. Les `dateModified`, dates de
footer et `lastmod` restent statiques; ne pas les changer sans révision
éditoriale réelle et sans vérifier les surfaces liées. Ne pas supprimer ni
contourner un commentaire de maintenance pour simplifier une page.

Une erreur 404/410 de lien externe ou une erreur bloquante d’audit doit être
traitée. Un timeout, un 403/429 ou une réponse serveur incertaine reste une
incertitude à documenter et à revoir, pas une preuve automatique que la page
est supprimée. Ne pas ajouter d’exception uniquement pour obtenir une sortie
verte.

En cas de doute entre deux approches valides, toujours privilégier la
cohérence avec le reste du projet plutôt que des préférences personnelles.
