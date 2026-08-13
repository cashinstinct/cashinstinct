# Cash Instinct

Cash Instinct est un site statique bilingue consacré aux offres, codes de
parrainage, comparatifs et outils utiles aux consommateurs canadiens. Les
pages françaises et anglaises sont publiées comme des pages HTML autonomes;
chaque guide indique ses conditions, son parcours d'activation, ses sources
et ses limites.

Site : [cashinstinct.ca](https://cashinstinct.ca/)

## Contenu du dépôt

### Guides de programmes

| Programme | Français | English |
|---|---|---|
| EBOX | [guide FR](https://cashinstinct.ca/ebox/fr/) | [guide EN](https://cashinstinct.ca/ebox/en/) |
| Sticker Mule | [guide FR](https://cashinstinct.ca/stickermule/fr/) | [guide EN](https://cashinstinct.ca/stickermule/en/) |
| HP Instant Ink | [guide FR](https://cashinstinct.ca/hp-instant-ink/fr/) | [guide EN](https://cashinstinct.ca/hp-instant-ink/en/) |
| Tangerine | [guide FR](https://cashinstinct.ca/tangerine/fr/) | [guide EN](https://cashinstinct.ca/tangerine/en/) |
| Chexy | [guide FR](https://cashinstinct.ca/chexy/fr/) | [guide EN](https://cashinstinct.ca/chexy/en/) |
| Achieva Financial | [guide FR](https://cashinstinct.ca/achieva/fr/) | [guide EN](https://cashinstinct.ca/achieva/en/) |
| Rakuten Canada | [guide FR](https://cashinstinct.ca/rakuten-canada/fr/) | [guide EN](https://cashinstinct.ca/rakuten-canada/en/) |
| Swagbucks | [guide FR](https://cashinstinct.ca/swagbucks/fr/) | [guide EN](https://cashinstinct.ca/swagbucks/en/) |

### Comparatifs et outils

- Comparatifs Internet : [EBOX, Fizz et oxio](https://cashinstinct.ca/ebox-vs-fizz-vs-oxio/fr/),
  [EBOX, Bell et Vidéotron](https://cashinstinct.ca/ebox-vs-bell-vs-videotron/fr/) et
  [FTTH, HFC et FTTN](https://cashinstinct.ca/ftth-vs-hfc-vs-fttn/fr/).
- Outils et guides spécialisés : [valeur des points](https://cashinstinct.ca/valeur-points/fr/),
  le [calculateur de coût Internet réel](https://cashinstinct.ca/internet-cout-reel/fr/) — un outil
  monétaire permettant de comparer le coût réel de deux offres saisies par l’utilisateur — et
  [Refundable Hotel Trick](https://cashinstinct.ca/rht/fr/).
- Méthodologie : [À propos de Cash Instinct](https://cashinstinct.ca/about/fr/) et [valeur réelle
  d’une promotion](https://cashinstinct.ca/valeur-reelle-promotion-canada/fr/) — un guide fondé sur
  des études de cas documentées pour distinguer valeur annoncée, valeur utilisable et valeur réelle.

La page [d'accueil française](https://cashinstinct.ca/) et la [page d'accueil
anglaise](https://cashinstinct.ca/en/) servent d'annuaires. Les chemins
`/fr/` et `/en/` correspondent aux pages publiées; les anciennes formes sont
redirigées par `_redirects` lorsqu'une redirection est nécessaire.

## Structure technique

```text
cashinstinct.ca/
├── index.html / en/index.html        ← annuaires FR et EN
├── */fr/index.html / */en/index.html ← pages bilingues autonomes
├── tests/                             ← régressions et audits
├── sitemap.xml                        ← URLs canoniques publiées
├── _redirects                         ← anciennes routes prises en charge
├── package.json                       ← commandes d'audit
└── AGENTS.md, TESTING.md, design.md   ← conventions et documentation
```

Les styles et scripts sont principalement intégrés à chaque page. Les
conventions observées sont décrites dans [`design.md`](design.md); les
commandes et limites de validation sont dans [`TESTING.md`](TESTING.md).

## Transparence

Les liens de parrainage ou d'affiliation peuvent donner lieu à une
rémunération, sans coût additionnel pour l'utilisateur. Les pages distinguent,
lorsque c'est pertinent, les sources publiques, les parcours officiels rendus,
les vérifications dans un compte authentifié et l'expérience personnelle.
Les conditions et dates sont donc à relire sur la page concernée plutôt qu'à
être résumées ici en montants susceptibles de changer.

Pour signaler une information factuelle, un lien brisé ou une modification de
conditions, [ouvrir un billet GitHub](https://github.com/cashinstinct/cashinstinct/issues/new).
