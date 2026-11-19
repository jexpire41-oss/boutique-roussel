# Ticket 10 : « NaN € » dans le panier

## Message de Madame Roussel

> Bonjour, une cliente fidèle, qui commandait déjà sur le site l’an dernier, avant la nouvelle version, m’a envoyé une capture d’écran : son panier affiche « NaN € » à la place des prix, et elle ne peut plus commander. Chez moi et chez mes autres clientes, tout fonctionne. Que se passe-t-il ?

## 1. Étapes pour reproduire le problème

Le projet ne contient pas l'ancien format de panier de l'an dernier : je simule le panier d'une cliente fidèle en mettant dans le navigateur un ancien panier **au format différent** de l'actuel (hypothèse de départ : un simple tableau, sans `version`, avec d'autres noms de champs).

1. Ouvrir http://localhost:8080
2. Dans la console du navigateur, simuler l'ancien panier : `localStorage.setItem("panier-roussel", JSON.stringify([{bouquet:"pivoine-poudree", taille:"petit", qte:2}, {bouquet:"champetre", taille:"grand", qte:1}]))`
3. Recharger la page

**Résultat observé :** les lignes du panier affichent « undefined » à la place du nom et « **NaN €** » à la place des prix ; le récapitulatif affiche Sous-total « NaN € » et Total « NaN € ».
**Résultat attendu :** une page qui fonctionne : au pire un panier vide, jamais « NaN € » ; la cliente peut recommencer sa commande.

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande. Le format exact de l'ancien panier est une reconstitution : la cause ne dépend pas de ses détails (voir rubrique 4), mais je n'ai pas pu tester avec le vrai ancien contenu de cette cliente.

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, Stockage).
3. Aucun correctif à ce stade.
4. Réponds en français, avec des mots simples.

[SYMPTOME]
Une cliente fidèle, qui commandait déjà sur le site l'an dernier avant la nouvelle version, voit « NaN € » à la place des prix dans son panier et ne peut plus commander. Chez les autres clientes tout fonctionne.

[ETAPES]
1. Ouvrir http://localhost:8080
2. Mettre dans localStorage (clé panier-roussel) un ancien panier : un tableau [{bouquet, taille, qte}] sans version ni options
3. Recharger la page : « undefined » et « NaN € » dans le panier et le récapitulatif

[ATTENDU]
Aucun « NaN € » : la page fonctionne, même avec un ancien panier.

[CODE_CONCERNE]
Fichier js/stockage.js :

const VERSION = 2;
export function sauverPanier(lignes, codePromo) {
  const donnees = { version: VERSION, lignes, codePromo };
  localStorage.setItem(CLE, JSON.stringify(donnees));
}
export function chargerPanier() {
  const brut = localStorage.getItem(CLE);
  if (!brut) {
    return { lignes: [], codePromo: "" };
  }
  const donnees = JSON.parse(brut);
  return { lignes: donnees.lignes || donnees, codePromo: donnees.codePromo || "" };
}

Fichier js/app.js (dans demarrer) :

const sauvegarde = chargerPanier();
remplacerLignes(sauvegarde.lignes);

Fichier js/prix.js :

export function prixUnitaire(ligne) {
  const bouquet = trouverBouquet(ligne.bouquetId);
  const options = ligne.options || {};
  const taille = trouverTaille(options.taille);
  let prix = bouquet ? bouquet.prix : 0;
  ...
}
export function prixLigne(ligne) {
  return prixUnitaire(ligne) * ligne.quantite;
}
```

## 3. Hypothèses de l'IA

Réponse de l'assistant IA au prompt 1 (aucun correctif demandé) :

1. **(La plus probable) Le panier enregistré est relu sans être vérifié.** `chargerPanier` accepte tel quel ce qu'elle trouve (`donnees.lignes || donnees`) et ne regarde jamais `donnees.version`, alors que `sauverPanier` l'écrit. Un ancien panier, avec d'autres champs, passe donc dans le calcul des prix. Vérification : afficher ce que renvoie `chargerPanier()` avec un ancien panier, et vérifier qu'aucune vérification de version ou de format n'est faite.
2. **Les prix deviennent « NaN » parce qu'un champ attendu manque.** Une ligne ancienne n'a pas `quantite` : `prixUnitaire(ligne) * undefined` donne `NaN`. Vérification : tester `prixUnitaire` et `prixLigne` sur une ligne ancienne.
3. **Le bouquet de l'ancienne ligne n'existe plus dans le catalogue** (ancien identifiant), donc `trouverBouquet` renvoie `undefined`. Vérification : `trouverBouquet(ligne.bouquetId)` sur une ligne ancienne.

*Hypothèses proposées par l'IA, à vérifier dans le navigateur avant tout correctif.*

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. `chargerPanier()` renvoie les anciennes lignes telles quelles (`{bouquet, taille, qte}`) : aucune vérification de version ni de format. De plus, une fois la page ouverte, `rafraichir` appelle `sauverPanier`, qui **réécrit** ces anciennes lignes avec `version: 2` : le navigateur de la cliente contient alors un contenu « version 2 » qui n'en est pas un, et vérifier seulement `version` ne suffirait pas.
- Hypothèse 2 : confirmée (c'est la cause immédiate du `NaN`). Pour une ligne ancienne, `prixUnitaire` vaut 0 et `quantite` est `undefined` : `prixLigne` donne `NaN`.
- Hypothèse 3 : confirmée en partie. `trouverBouquet(undefined)` ne trouve rien, ce qui donne un prix unitaire de 0 et le nom « undefined » dans l'affichage. Ce n'est pas la cause du `NaN` (il vient de la quantité manquante), mais c'est la conséquence du même défaut : on utilise une ligne qu'on n'a pas vérifiée.

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/stockage.js`, `chargerPanier` relit le panier enregistré dans le navigateur et le renvoie **sans le vérifier**. Une cliente venue avant la version 2 a dans son navigateur un panier au format de l'époque, avec d'autres champs. Ces lignes arrivent dans le calcul des prix : il manque `quantite` (donc `prix × undefined = NaN`) et le bouquet est introuvable (donc le nom « undefined » et un prix de 0). Les autres clientes n'ont pas d'ancien panier : c'est pour cela que tout fonctionne chez elles et chez Madame Roussel. Le piège s'aggrave car `rafraichir` réécrit ensuite ces lignes avec `version: 2`, comme si elles étaient valides.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/stockage.js`, `chargerPanier` ne garde que les lignes qui ont le format actuel, grâce à une petite fonction `ligneValide` : un `bouquetId` (texte), des `options` (objet) et une `quantite` (nombre supérieur à 0). Les anciennes lignes sont écartées : la cliente retrouve une page qui fonctionne avec un panier vide (au lieu de « NaN € ») et peut commander. Je vérifie les lignes plutôt que `version`, parce que le contenu ancien a pu être réécrit en « version 2 ». Un seul fichier modifié, à l'endroit où les données du navigateur entrent dans le site.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** variante envisagée avec l'assistant IA : convertir l'ancien panier (migration) vers le nouveau format. Je l'ai écartée : le projet ne contient pas l'ancien format exact, donc une migration serait écrite à l'aveugle et pourrait elle-même produire des prix faux ; et un panier de l'an dernier n'a plus grande valeur. Autre variante écartée : afficher « 0,00 € » ou masquer « NaN » dans l'affichage : elle cacherait le symptôme sans régler le panier faux. Ces choix ont été faits avec l'aide de l'assistant IA. Point à valider avec Madame Roussel : les anciens paniers sont vidés, pas converti.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : avec l'ancien panier simulé (tableau `[{bouquet, taille, qte}]`), la page affiche un panier vide, Sous-total 0,00 € et aucun « NaN » ni « undefined » ; même résultat avec l'ancien contenu déjà réenregistré en « version 2 ». Avec un panier actuel valide mélangé à une ancienne ligne, la bonne ligne est gardée (« Champêtre, Petit, ×2, 59,80 € ») et l'ancienne est écartée. La cliente peut ensuite commander : confirmation « Merci ! Votre commande est enregistrée pour le samedi 21 novembre (matin). ».
- [x] Les tickets déjà clos fonctionnent toujours : ticket 3 (« Merci » donne 4 bouquets), ticket 6 (Blanc pur Moyen avec vase : sous-total exactement 60), ticket 7 (un message de 235 caractères est conservé après rechargement du panier enregistré, le code promo NOEL10 aussi), ticket 8 (confirmation avec le moment choisi). Les tickets 1, 2, 4, 5 et 9 ne passent pas par la lecture du panier enregistré.
- [X] Commit : "ticket 10 : un ancien panier enregistré ne casse plus la page (NaN €)"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande. L'ancien format de panier est une reconstitution (voir rubrique 1) ; le correctif ne dépend pas de ce format, il écarte tout ce qui n'a pas le format actuel. Non traité ici : un fichier enregistré dont le texte est abîmé (`JSON.parse` qui échoue) planterait toujours la page au démarrage.

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci pour votre message. Nous avons trouvé la cause : votre cliente fidèle avait encore dans son navigateur un ancien panier, enregistré avant la nouvelle version du site. Le site n'arrivait pas à le lire et affichait « NaN € » à la place des prix, ce qui bloquait sa commande. C'est pour cela que tout fonctionnait chez vous et chez vos autres clientes : elles n'avaient pas d'ancien panier.

C'est corrigé : le site ignore maintenant les anciens paniers qu'il ne sait pas lire. Votre cliente retrouvera un panier vide et pourra refaire sa commande normalement. Ses anciens articles ne sont pas conservés. Nous avons testé avec un ancien panier, et vérifié que les corrections précédentes fonctionnent toujours.

Cordialement,

Christophe Leroy
