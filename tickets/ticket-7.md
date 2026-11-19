# Ticket 7 : Le message de la carte coupé

## Message de Madame Roussel

> Bonjour, une cliente voulait écrire un long message sur la carte, pour un mariage. Le site l’a bloquée au milieu de sa phrase. Pouvez-vous enlever cette limite ? Mes clientes doivent pouvoir écrire ce qu’elles veulent.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 et cliquer sur « Composer » pour « Blanc pur »
2. Cocher l'option « Carte avec votre message (+ 2,50 €) » : une zone « Votre message » apparaît
3. Saisir (ou coller) un message de plus de 150 caractères, par exemple un message de mariage de 235 caractères

**Résultat observé :** la saisie s'arrête à 150 caractères, au milieu d'un mot (`… rires et de tendresse, aujour`) : la fin du message est perdue sans aucun avertissement.
**Résultat attendu :** la cliente peut écrire le message qu'elle veut (demande de Madame Roussel), ou, à défaut, elle est prévenue avant d'être coupée.

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande (vrai clic et vraie saisie).

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un comportement sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt).
3. Aucun correctif à ce stade.
4. Réponds en français, avec des mots simples.

[SYMPTOME]
Une cliente voulait écrire un long message sur la carte pour un mariage. Le site l'a bloquée au milieu de sa phrase. La cliente de la boutique demande d'enlever cette limite.

[ETAPES]
1. Ouvrir http://localhost:8080, « Composer » pour Blanc pur
2. Cocher « Carte avec votre message »
3. Saisir un message de 235 caractères : seuls 150 sont gardés, la fin est perdue sans avertissement

[ATTENDU]
La cliente peut écrire son message sans être coupée au milieu d'une phrase.

[CODE_CONCERNE]
Fichier js/composition.js :

document.querySelector("#message-carte").maxLength = reglesOptions.carte.longueurMax;

function lireFormulaire() {
  const message = document.querySelector("#message-carte").value;
  options.message = options.carte ? message.slice(0, reglesOptions.carte.longueurMax) : "";
}

Fichier data/catalogue.json : "carte": { "libelle": "Carte avec votre message", "longueurMax": 150, "prix": 2.5 }
```

## 3. Hypothèses de l'IA

Réponse de l'assistant IA au prompt 1 (aucun correctif demandé) :

1. **(La plus probable) Ce n'est pas un bug mais une règle voulue, appliquée à deux endroits.** La valeur `longueurMax: 150` du catalogue est lue par `composition.js` pour bloquer la saisie (`maxLength` sur la zone de texte) et, une seconde fois, pour couper le message mémorisé (`slice(0, longueurMax)` dans `lireFormulaire`). La coupure « au milieu de la phrase » vient de la règle des 150 caractères, sans avertissement.
   - Vérification : lire `catalogue.json`, puis en console afficher `maxLength` de la zone de texte et la longueur du message gardé dans le panier après un ajout.
2. **Enlever une seule des deux limites ne suffit pas.** Si on retire `maxLength`, la zone de texte accepterait tout, mais `slice` couperait quand même le message enregistré dans le panier : la cliente verrait son long message à l'écran et la carte serait coupée sans qu'elle le sache.
   - Vérification : en console, retirer `maxLength` de la zone de texte, saisir un long message, ajouter au panier et regarder la longueur du `message` dans `panier-roussel`.
3. **D'autres endroits dépendent de la limite ou de la longueur du message.** Par exemple le prix, l'affichage du panier, ou la comparaison des lignes (`memesOptions` compare le message).
   - Vérification : chercher `longueurMax` et `message` dans tous les fichiers. Argument contre : la recherche n'en trouve que dans `composition.js` et `panier.js`.

*Hypothèses proposées par l'IA, à vérifier dans le navigateur avant tout correctif. Question à poser à la cliente avant de supprimer une limite : pourquoi 150 ? (place sur la carte imprimée, coût, lisibilité)*

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. `longueurMax` vaut 150 dans `catalogue.json`, la zone de texte a `maxLength = 150` et seuls 150 caractères sur 235 saisis sont gardés. C'est une règle voulue, pas un défaut de calcul.
- Hypothèse 2 : confirmée. En retirant seulement `maxLength` (simulation en console, code non modifié), la zone de texte accepte les 235 caractères, mais le message enregistré dans le panier (`panier-roussel`) n'en contient que **150** et la fin (« FIN ») est perdue : `slice` continue de couper. Il faut donc traiter les deux endroits, ou aucun, sinon la cliente ne voit pas que sa carte est coupée.
- Hypothèse 3 : écartée. Une recherche de `longueurMax` et `.message` dans les fichiers ne trouve que `composition.js` (deux usages de la limite) et `panier.js` (`memesOptions` compare simplement les messages, sans limite de longueur).

## 4. Cause et correctif

**Cause (là où elle naît) :** la coupure n'est pas une erreur de calcul, c'est une règle : `longueurMax: 150` dans `data/catalogue.json`, lue deux fois par `js/composition.js`. La première fois pour bloquer la saisie (`maxLength` sur la zone de texte), la seconde pour couper le message mémorisé dans le panier (`message.slice(0, longueurMax)` dans `lireFormulaire`). Une cliente qui colle un long message est coupée en plein milieu d'une phrase, sans aucun avertissement.

**Décision :** la cliente de la boutique demande d'enlever la limite et ne parle d'aucune contrainte de place sur la carte : j'applique sa demande, en supprimant la règle **partout où elle existe**. Je ne retire pas seulement `maxLength` : il faut aussi retirer `slice`, sinon l'écran montrerait un long message et le panier le couperait quand même (vérifié : 235 caractères à l'écran, 150 dans le panier).

**Correctif (fichier, ce qui change, pourquoi) :**
- `js/composition.js` : suppression de la ligne `...maxLength = reglesOptions.carte.longueurMax;` et `message.slice(0, reglesOptions.carte.longueurMax)` devient `message`.
- `data/catalogue.json` : suppression de `longueurMax` (plus lu nulle part, pour ne pas laisser une règle morte qui laisserait croire qu'une limite existe).

**Proposition de l'IA écartée ou modifiée, et pourquoi :** l'assistant IA a présenté trois options : A supprimer la limite, B la relever (par exemple à 300), C la garder avec un compteur visible. J'ai retenu A parce que c'est la demande explicite de la cliente. J'ai écarté B et C pour l'instant : elles imposent une taille de carte que la cliente n'a pas demandée. L'IA et moi avons aussi écarté un correctif qui ne retirerait que `maxLength`, car il cacherait la coupure au lieu de la supprimer. Ce choix a été fait avec l'aide de l'assistant IA ; la question de la taille de la carte imprimée est renvoyée à la cliente dans la réponse ci-dessous.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : un message de 235 caractères tapé dans la zone de texte est gardé en entier (235 caractères dans le panier, « FIN » inclus), y compris après rechargement de la page ; la ligne du panier s'affiche sans débordement et le prix reste 41,40 € (Blanc pur petit + carte)
- [x] Les tickets déjà clos fonctionnent toujours : ticket 2 (un clic sur + ajoute un seul exemplaire), ticket 3 (« Merci » donne 4 bouquets), ticket 4 (même bouquet avec deux messages différents : deux lignes ; même message : une ligne ×2), ticket 5 (supprimer retire une seule ligne), ticket 6 (Blanc pur Moyen avec vase : sous-total exactement 60). Le ticket 1 n'est pas concerné par ce changement.
- [X] Commit : "ticket 7 : le message de la carte n'est plus coupé à 150 caractères"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande (vrais clics et vraie saisie pour le scénario du ticket).

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci pour votre message. C'est fait : la limite de 150 caractères pour le message de la carte est supprimée. Vos clientes peuvent maintenant écrire un message aussi long qu'elles le souhaitent, il est gardé en entier jusqu'à la commande. Nous avons testé avec un message de mariage de plus de 200 caractères.

Une question pour que la carte soit bien imprimée : y a-t-il une place maximale sur la carte (environ combien de caractères) ? Si oui, nous pouvons afficher un petit compteur pour prévenir vos clientes avant qu'elles écrivent trop long, au lieu de couper leur message.

Cordialement,

Christophe Leroy
