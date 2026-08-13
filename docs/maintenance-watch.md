# Registre de surveillance de maintenance

Document opérationnel interne pour les audits et mises à jour factuelles de
Cash Instinct. Il centralise les déclencheurs, les sources à recharger, les
surfaces à contrôler et la décision attendue. Il ne constitue pas du contenu
destiné aux visiteurs ni une nouvelle vérification des fournisseurs.

## Mode d’emploi

- Consulter ce registre avant toute modification d’une offre, d’un programme,
  d’un montant, d’une condition ou d’une promotion.
- Quand un déclencheur arrive, vérifier les sources officielles puis traiter
  les pages FR/EN, les métadonnées, les données structurées, le JavaScript, les
  homepages et `llms.txt` comme un même ensemble.
- Mettre à jour l’entrée existante avec `last_checked`, la preuve et la
  décision. Ne pas créer un historique infini : marquer l’entrée `résolue` ou
  remplacer son déclencheur par la nouvelle offre.
- Ne jamais laisser une automation modifier ou publier seule du HTML. Elle peut
  signaler une échéance; la décision éditoriale et la revue du diff restent
  manuelles.

Statuts utilisés : `active`, `à vérifier le [date]`, `conditionnelle` et
`résolue`.

## Échéances prioritaires

| ID | Statut | Déclencheur | Pages principales |
| --- | --- | --- | --- |
| M-01 | `à vérifier le 2026-09-07` | Carte EBOX de 100 $ : fin commerciale le 2026-09-06; bascule technique à 00:00 America/Toronto le 2026-09-07 | `ebox/fr/index.html`, `ebox/en/index.html` |
| M-02 | `à vérifier le 2026-11-01` | Tangerine : fin annoncée le 2026-10-31 de la fenêtre de création du numéro client pour la prime de paie de 250 $ | `tangerine/fr/index.html`, `tangerine/en/index.html` |
| M-03 | `à vérifier le 2026-12-01` | Tangerine : fin annoncée le 2026-11-30 de la fenêtre de création du numéro client pour les taux promotionnels d’épargne | `tangerine/fr/index.html`, `tangerine/en/index.html` |
| M-04 | `conditionnelle — vérifier maintenant` | Achieva a annoncé une reprise été 2026 sans date ni nouvelles modalités confirmées | `achieva/fr/index.html`, `achieva/en/index.html`, `index.html`, `en/index.html` |

### M-01 — EBOX, carte prépayée de 100 $

**Dernière vérification locale enregistrée :** 2026-08-10

**Sources officielles à recharger :**

- [FR Québec](https://promo.ebox.ca/v-fibre/fr-qc/)
- [FR Ontario](https://promo.ebox.ca/r-fibre/fr-on/)
- [EN Québec](https://promo.ebox.ca/v-fibre/en-qc)
- [EN Ontario](https://promo.ebox.ca/r-fibre/en-on)

À l’échéance, vérifier dans les quatre parcours provinciaux si la carte est
terminée, prolongée ou remplacée. Contrôler séparément le crédit GE911 de 25 $:
son programme ne doit pas disparaître avec la carte temporaire.

Surfaces à revérifier :

- hero, résumé, `#promo-100`, admissibilité, détails et FAQ visibles;
- `<title>`, meta description, Open Graph, Twitter, canonical et hreflang;
- `WebPage`/`FAQPage` JSON-LD et le traitement historique `Product/Offer` de
  GE911;
- `PROMO_ACTIVE`, `PROMO_CUMUL_100_ACTIVE`, `PROMO_END`, compte à rebours et
  blocs masqués;
- HTML brut et JSON-LD après expiration : masquer le compteur ne retire pas
  les affirmations statiques;
- URL absolues des parcours QC/ON et attributs des liens externes.

Décision :

- **prolongée/remplacée** : vérifier les nouvelles conditions puis synchroniser
  toutes les surfaces FR/EN et `llms.txt`;
- **terminée** : retirer ou qualifier toutes les mentions de 100 $/125 $,
  masquer le bloc promotionnel, conserver GE911 et ne pas modifier
  automatiquement son `Product/Offer` historique.

### M-02 — Tangerine, prime de paie de 250 $

**Dernière vérification locale enregistrée :** 2026-08-05

**Sources officielles à recharger :**

- [FR — compte-chèques promotion](https://www.tangerine.ca/fr/offres/compte-cheques-promotion)
- [EN — chequing account promotion](https://www.tangerine.ca/en/offers/chequing-account-promotion)

Après le 31 octobre, déterminer si l’offre est prolongée, remplacée, modifiée
ou terminée; ne pas la supprimer par simple déduction calendaire. Revalider le
montant, la fenêtre de création du numéro client, le délai d’ouverture, le
premier dépôt, le seuil de 200 $/mois pendant deux mois consécutifs et le mois
de versement.

Surfaces à revérifier : titres et métadonnées, résumé, carte de l’offre,
tableau, étapes, calculatrice, divulgation, 16 FAQ visibles et `FAQPage`, quatre
étapes et `HowTo`, ainsi que l’entrée Tangerine de `llms.txt`. La Clé Orange
14130944S1 de 50 $ reste une offre indépendante.

### M-03 — Tangerine, taux promotionnels d’épargne

**Dernière vérification locale enregistrée :** 2026-08-05

**Sources officielles à recharger :**

- [FR — compte d’épargne promotion](https://www.tangerine.ca/fr/offres/compte-d-epargne-promotion)
- [FR — compte d’épargne enregistré](https://www.tangerine.ca/fr/offres/promotion-compte-d-epargne-enregistre)
- Recharger aussi les équivalents anglais depuis la page officielle actuelle.

Après le 30 novembre, vérifier si les taux 4,50 %/5,00 % et la fenêtre sont
prolongés, remplacés ou terminés. Lire le rendu officiel après exécution
JavaScript, pas seulement le titre, le HTML brut ou un placeholder.

Revoir le bloc d’offre, le tableau, la calculatrice, les FAQ visibles et leur
JSON-LD, les notes d’admissibilité, les comptes enregistrés/non enregistrés et
la durée de 153 jours. Maintenir l’indépendance de cette offre par rapport aux
primes de 50 $ et 250 $ et garder l’estimation de la calculatrice indicative.

### M-04 — Achieva, reprise du programme de parrainage

**Statut :** `conditionnelle — vérifier maintenant`, puis à chaque annonce
officielle.

**Dernière revue locale du statut de pause :** 2026-08-12

**Sources officielles à recharger :**

- [Programme 2026](https://www.achieva.mb.ca/referral-program-2026)
- [Programme actuel](https://www.achieva.mb.ca/referral-program)
- [Ouverture de compte](https://openaccount.achieva.mb.ca)

Confirmer qu’un programme est réellement publié et utilisable, puis vérifier
le code (ancien `V381566198` ou nouveau), le montant, les dépôts, le solde, les
délais, les plafonds, l’admissibilité et le parcours mobile/en ligne.

Ne retirer le bandeau et les qualificatifs de pause qu’après cette preuve.
Garder l’ancien montant, les anciennes étapes et l’ancien `Product/Offer`
qualifiés d’historiques tant que la nouvelle offre n’est pas vérifiée. Si le
code ou le montant change, revoir les images OG, les deux langues, les deux
homepages, `llms.txt` et la réindexation éventuelle.

## Surveillance périodique ou déclenchée

Ces entrées n’ont pas de date fixe dans le dépôt. Elles deviennent prioritaires
après une modification du parcours fournisseur ou selon la cadence indiquée.

| Programme | Statut / cadence | Contrôles minimums |
| --- | --- | --- |
| Rakuten Canada | `active` — mensuel ou changement du parcours | 30 $, lien, premier achat admissible, conditions, FAQ/HowTo, métadonnées, date de vérification; surfaces FR/EN, homepages et `llms.txt`. |
| Swagbucks | `active` — mensuel ou changement du catalogue/bonus | 10 $/1 000 SB, achat unique d’au moins 25 $, au moins 25 SB, 30 jours, exclusions et séparation du 300 SB conflictuel; surfaces FR/EN, homepages et `llms.txt`. |
| HP Instant Ink | `active` — trimestriel ou changement du parcours | Parcours public et compte connecté séparément, 1 mois, code SVdn7, plans, expiration publique; surfaces FR/EN, homepages et `llms.txt`. |
| Sticker Mule | `active` — trimestriel ou changement du flux | Montants régionaux, minimums, champ de parrainage, durée des crédits et conditions de cumul; surfaces FR/EN, homepages et `llms.txt`. |
| Chexy | `conditionnelle` — trimestriel ou changement de source | Confirmer le 20 $ contre toute surface officielle affichant 15 $, en arbitrant l’article 2026 du centre d’aide, la landing publique et la preuve de compte selon la surface/parcours applicable; vérifier lien, premier paiement complété, frais et distinction du code promo. Ne pas rétrograder le contenu actuel sans nouvelle preuve arbitrée. |
| Comparatifs Internet | `active` — audit GSC mensuel ou changement fournisseur | Prix, vitesses, technologie, couverture, matériel, promotions, adresse, date de relevé, contradictions officielles et snapshots historiques; synchroniser `llms.txt`. |

Les pages `ftth-vs-hfc-vs-fttn`, `valeur-points` et `rht` sont hors calendrier
promotionnel : les revoir lorsqu’une définition, une source, un taux officiel
ou une expérience documentée change.

## Surfaces communes à traiter

Pour toute entrée, rechercher le fait dans le même passage de maintenance :

- contenu visible : titre, hero, résumé, tableaux, étapes, FAQ et CTA;
- métadonnées : `<title>`, description, Open Graph/Twitter, canonical et
  hreflang;
- données structurées : `WebPage`, `FAQPage`, `HowTo`, et `Product/Offer` seulement
  si les modalités le justifient;
- comportement : variables JavaScript, compte à rebours, calculatrice, blocs
  masqués et messages post-promo;
- navigation/publication : homepages, `llms.txt`, liens internes, sources
  officielles et `sitemap.xml`;
- FR/EN : mêmes faits et conditions, avec les asymétries intentionnelles
  conservées;
- preuve : URL officielle, date de consultation, type de preuve (landing,
  rendu JS, compte connecté ou expérience).

## Règle de publication

Une vérification fournisseur ne justifie pas à elle seule une nouvelle
`dateModified`. Lorsqu’une page est réellement modifiée :

1. synchroniser la date visible, `dateModified` JSON-LD et `sitemap.xml`;
2. séparer la date de révision éditoriale de la date de vérification fournisseur;
3. synchroniser `llms.txt` si l’affirmation y figure;
4. relancer `npm run audit:quick`, `npm run audit:maintainability`,
   `git diff --check` et les tests navigateur proportionnels;
5. vérifier les liens 404/410 comme erreurs et documenter les 403/429, timeouts
   et 5xx comme incertitudes;
6. relire le diff ciblé avant toute publication.
