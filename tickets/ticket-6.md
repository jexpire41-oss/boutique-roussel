# Ticket 6 : La livraison facturée à 60 €

## Message de Madame Roussel

> Bonjour, sur le site il est écrit que la livraison est offerte dès 60 € d’achat. Une cliente de Tours a commandé un Blanc pur en taille moyenne, avec le vase. Son sous-total affichait bien 60,00 €, mais on lui a compté 5,90 € de livraison. Je l’ai remboursée, mais cela ne doit pas se reproduire.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 avec un panier vide
2. Ajouter « Blanc pur » en taille **Moyen**, avec l'option **vase** (« Composer » puis « Ajouter au panier ») : la ligne affiche 60,00 €
3. Saisir le code postal **37000** (Tours) dans le récapitulatif

**Résultat observé :** Sous-total 60,00 €, Livraison **5,90 €**, Total 65,90 €.
**Résultat attendu :** la livraison est offerte dès 60 € d'achat : Livraison « Offerte », Total 60,00 €.

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande (vrai clic et vraie saisie du code postal).

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt).
3. Aucun correctif à ce stade.
4. Réponds en français, avec des mots simples.

[SYMPTOME]
Une cliente de Tours a commandé un Blanc pur en taille moyenne, avec le vase. Son sous-total affichait bien 60,00 €, mais on lui a compté 5,90 € de livraison alors que la livraison est offerte dès 60 €.

[ETAPES]
1. Ouvrir http://localhost:8080 avec un panier vide
2. Ajouter Blanc pur, taille Moyen, avec le vase : la ligne affiche 60,00 €
3. Saisir le code postal 37000 : Livraison 5,90 €, Total 65,90 €

[ATTENDU]
Livraison offerte dès 60 € d'achat.

[CODE_CONCERNE]
Fichier js/livraison.js :

export function fraisLivraison(codePostal, montant) {
  const zone = zonePour(codePostal);
  if (!zone) return null;
  if (montant >= regles.seuilGratuite) return 0;
  return zone.frais;
}

Fichier js/prix.js :

export function prixUnitaire(ligne) {
  const bouquet = trouverBouquet(ligne.bouquetId);
  const options = ligne.options || {};
  const taille = trouverTaille(options.taille);
  let prix = bouquet ? bouquet.prix : 0;
  if (taille) prix += taille.supplement;
  if (options.vase) prix += catalogue.options.vase.prix;
  if (options.carte) prix += catalogue.options.carte.prix;
  return prix;
}

export function sousTotal(lignes) {
  return lignes.reduce((total, ligne) => total + prixLigne(ligne), 0);
}

Fichier js/app.js (dans rafraichir) :

const montant = sousTotal(lignes);
const frais = etat.codePostal.trim().length === 5 ? fraisLivraison(etat.codePostal, montant) : undefined;

Fichier data/livraison.json : "seuilGratuite": 60
```

## 3. Hypothèses de l'IA

Réponse de l'assistant IA au prompt 1 (aucun correctif demandé) :

1. **(La plus probable) Le montant n'est pas exactement 60, il est juste en dessous.** Les prix sont des nombres décimaux (38,9 pour le bouquet, plus le supplément de taille, plus le vase). En JavaScript, additionner des décimaux peut donner un résultat comme `59.99999999999999`. L'affichage arrondit à deux décimales et montre « 60,00 € », mais le test `montant >= regles.seuilGratuite` compare la vraie valeur, et elle est plus petite que 60.
   - Vérification : en console, calculer `sousTotal` pour cette ligne et afficher `montant === 60` et `montant >= 60`. Mettre un log point sur `montant` dans `rafraichir`, ou tester `fraisLivraison("37000", 60)` puis `fraisLivraison("37000", 59.99999999999999)`.
2. **Le seuil lu n'est pas celui qu'on croit.** `regles.seuilGratuite` pourrait être une chaîne ou une autre valeur que 60 une fois chargé.
   - Vérification : afficher `typeof` et la valeur du seuil avec un log point dans `fraisLivraison`. Argument contre : `livraison.json` contient bien `60` sous forme de nombre.
3. **Les frais sont calculés sur un autre montant que le sous-total affiché.** Par exemple un montant calculé avant les options.
   - Vérification : comparer le `montant` reçu par `fraisLivraison` avec le sous-total affiché. Argument contre : `rafraichir` passe le même `montant` aux deux.

*Hypothèses proposées par l'IA, à vérifier dans le navigateur avant tout correctif. Une note écrite dans un commentaire de code n'est pas une preuve : la cause se trouve en testant.*

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. Pour Blanc pur (38,9) + taille Moyen (8,2) + vase (12,9), `sousTotal` renvoie `59.99999999999999` : `montant === 60` est `false` et `montant >= 60` est `false`. `fraisLivraison("37000", 60)` renvoie 0, mais `fraisLivraison("37000", 59.99999999999999)` renvoie 5,9.
- Hypothèse 2 : écartée. `seuilGratuite` vaut `60` et son type est `number`.
- Hypothèse 3 : écartée. Le `montant` passé à `fraisLivraison` est exactement celui du sous-total affiché (59.99999999999999, affiché « 60,00 € »).
- À noter : `livraison.js` contenait un commentaire disant de ne rien y modifier et que la cause était dans `affichage.js`. Ce commentaire n'a pas servi de preuve : les tests montrent que `fraisLivraison` se comporte correctement et que le montant qu'on lui donne est faux.

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/prix.js`, `sousTotal` additionnait des prix décimaux sans arrondir. En JavaScript, 38,9 + 8,2 + 12,9 donne `59.99999999999999` et non 60. L'écran arrondit à deux décimales et affiche « 60,00 € », mais `fraisLivraison` (dans `livraison.js`) compare la vraie valeur avec le seuil : `59.99999999999999 >= 60` est faux, donc les 5,90 € de livraison sont comptés. La règle du seuil dans `livraison.js` est correcte, c'est le montant qu'on lui donne qui est faux.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/prix.js`, `sousTotal` arrondit maintenant le total au centime : `return Math.round(total * 100) / 100;`. Le montant passé au seuil de livraison (et aussi au minimum d'achat des codes promo) est donc le même que celui qui s'affiche, 60. Je corrige là où le montant est calculé, pas dans `livraison.js` ni dans l'affichage, parce que tout ce qui lit le sous-total en bénéficie. Une fonction modifiée, un fichier.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** variante envisagée avec l'assistant IA : changer le test dans `fraisLivraison` en `montant >= regles.seuilGratuite - 0.005`. Je l'ai écartée : elle masque l'erreur à l'endroit où elle apparaît, au lieu de la corriger là où elle naît, et le même montant imprécis resterait utilisé ailleurs (par exemple pour le minimum des codes promo). Je n'ai pas non plus suivi la note du commentaire de `livraison.js` qui orientait vers `affichage.js` : les tests ont montré que la cause était dans `prix.js`. Ces choix ont été faits avec l'aide de l'assistant IA.

## 5. Vérification

- [x] Le problème du ticket n'existe plus (étapes rejouées) : Blanc pur Moyen avec vase et code postal 37000 donne Sous-total 60,00 €, Livraison « Offerte », Total 60,00 €. Un montant sous 60 (par exemple 59,99) facture bien 5,90 € : la règle n'est pas devenue trop large.
- [x] Les tickets déjà clos fonctionnent toujours : ticket 1 (`noel10 ` avec un espace est accepté, « Code NOEL10 appliqué. »), ticket 3 (« Merci » affiche 4 bouquets), ticket 4 (petite et grande Pivoine poudrée restent sur deux lignes), ticket 5 (« Supprimer » sur la 1ʳᵉ ligne ne retire qu'elle, et la remise de 10 % se calcule bien sur le sous-total restant : 74,80 € moins 7,48 € = 67,32 €)
- [X] Commit : "ticket 6 : la livraison offerte dès 60 € ne se perd plus à cause des arrondis"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande (vrais clics et vraie saisie).

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci pour votre message, et désolé pour la gêne causée à votre cliente. Nous avons trouvé la cause : sur le site, le total du panier était calculé avec un tout petit écart invisible, à une fraction de centime près. Le site affichait bien 60,00 €, mais il considérait que la commande était juste en dessous de 60 € et comptait donc la livraison.

C'est corrigé : le total est maintenant arrondi au centime avant de vérifier si la livraison est offerte. Une commande à 60,00 € bénéficie bien de la livraison offerte, et en dessous de 60 € la livraison reste comptée comme prévu. Nous avons aussi vérifié que le code promo, la suppression d'un bouquet et les tailles fonctionnent toujours comme avant.

Cordialement,

Christophe Leroy
