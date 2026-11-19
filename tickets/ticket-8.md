# Ticket 8 : Livrée le matin au lieu de l’après-midi

## Message de Madame Roussel

> Bonjour, une cliente avait choisi une livraison l’après-midi, parce qu’elle travaille le matin. Le message de confirmation disait « matin », et c’est aussi ce qui était écrit dans la commande que j’ai reçue. Mon livreur est passé le matin : personne. Elle a dû venir chercher son bouquet à la boutique.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 avec un bouquet dans le panier (par exemple Blanc pur)
2. Saisir le code postal **37000**, choisir un jour (par exemple lundi 23 novembre) et cocher **Après-midi**
3. Cliquer sur « Commander »

**Résultat observé :** « Merci ! Votre commande est enregistrée pour le lundi 23 novembre (**matin**). » alors que « Après-midi » est bien coché à l'écran.
**Résultat attendu :** le message de confirmation dit « (après-midi) ».

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande (vrais clics).

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt).
3. Aucun correctif à ce stade.

[SYMPTOME]
Une cliente avait choisi une livraison l'après-midi. Le message de confirmation disait « matin » et la commande reçue par la boutique aussi. Le livreur est passé le matin : personne.

[ETAPES]
1. Ouvrir http://localhost:8080 avec un bouquet dans le panier
2. Code postal 37000, jour lundi 23 novembre, cocher « Après-midi »
3. Cliquer sur « Commander » : « ... (matin). »

[ATTENDU]
Le message dit « après-midi ».

[CODE_CONCERNE]
Fichier js/app.js (fonction commander) :

const moment = document.querySelector("input[name=moment]");
...
message.textContent =
  "Merci ! Votre commande est enregistrée pour le " + libelleJour + " (" + moment.nextSibling.textContent.toLowerCase() + ").";

Fichier js/affichage.js (afficherMoments) :

moments.forEach((moment, index) => {
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "moment";
  radio.value = moment.id;
  radio.checked = index === 0;
  ...
  label.append(radio, document.createTextNode(moment.libelle));
});

Fichier data/livraison.json : "moments": [ { "id": "matin", ... }, { "id": "apres-midi", ... } ]
```

### Hypothèses de l'IA

1. **(La plus probable) Le code lit toujours le premier bouton radio, pas celui qui est coché.** `document.querySelector("input[name=moment]")` renvoie le premier élément qui correspond, c'est-à-dire « matin », quel que soit le choix. Vérification : en console, comparer `document.querySelector("input[name=moment]").value` et `document.querySelector("input[name=moment]:checked").value` quand « Après-midi » est coché.
2. **Les boutons ou leurs textes sont mal construits dans `afficherMoments`** (mauvaise valeur, mauvais libellé). Vérification : lister `value` et le texte de chaque bouton radio. Argument contre : `livraison.json` est correct.
3. **Le choix est modifié après coup** (par exemple par un autre code qui recoche « matin »). Vérification : après avoir cliqué sur « Après-midi », lire quel bouton est coché juste avant « Commander ».

## 3. Hypothèses de l'IA

Voir la fin de la rubrique 2 (réponse de l'assistant IA au prompt 1, sans correctif).

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. Avec « Après-midi » coché, `querySelector("input[name=moment]").value` renvoie `"matin"` (et son texte « Matin »), alors que `querySelector("input[name=moment]:checked").value` renvoie `"apres-midi"`.
- Hypothèse 2 : écartée. Les deux boutons sont corrects : `matin|Matin` et `apres-midi|Après-midi`.
- Hypothèse 3 : écartée. Juste avant « Commander », le bouton coché est bien `apres-midi` : le choix n'est pas modifié, c'est la lecture qui est mauvaise.

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/app.js`, la fonction `commander` cherche le moment de livraison avec `document.querySelector("input[name=moment]")`. Ce sélecteur renvoie le **premier** bouton radio de la page, « Matin », et non celui que la cliente a coché. Le message de confirmation lit donc toujours « matin ». Les boutons sont bien construits et le choix de la cliente est bien enregistré dans la page : c'est la lecture qui se trompe d'élément.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/app.js`, `document.querySelector("input[name=moment]")` devient `document.querySelector("input[name=moment]:checked")`. Le `:checked` demande « le bouton radio coché » et non « le premier bouton radio ». Une seule ligne modifiée, là où la lecture est faite.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** variante envisagée avec l'assistant IA : cocher « après-midi » par défaut, ou retirer le bouton « matin ». Je l'ai écartée : elle contournerait le problème sans corriger la lecture, et les clientes qui choisissent le matin recevraient alors un message faux à leur tour. J'ai aussi vérifié que `livraison.js` et `affichage.js` n'étaient pas en cause, comme le montrent les tests de la rubrique 3. Ce choix a été fait avec l'aide de l'assistant IA.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : avec « Après-midi » coché, la confirmation dit « (après-midi) » ; avec « Matin » (choix par défaut), elle dit « (matin) »
- [x] Les tickets déjà clos fonctionnent toujours : ticket 3 (« Merci » donne 4 bouquets), ticket 6 (Blanc pur Moyen avec vase : sous-total exactement 60). La modification ne touche que la lecture du moment dans `commander`, les tickets 1, 2, 4, 5 et 7 ne passent pas par cette ligne.
- [X] Commit : "ticket 8 : la confirmation indique le moment de livraison réellement choisi"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande (vrais clics pour l'après-midi). Ce que la boutique reçoit comme « commande » est ce même message de confirmation : il est maintenant correct.

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci pour votre message, et toutes nos excuses pour la cliente qui a dû venir chercher son bouquet. Nous avons trouvé la cause : quand la cliente choisissait « Après-midi », le site écrivait quand même « matin » dans la confirmation et dans la commande qui vous parvient, car il lisait toujours le premier choix de la liste au lieu de celui qui était coché.

C'est corrigé : la confirmation et la commande indiquent désormais le moment réellement choisi, matin ou après-midi. Nous avons testé les deux cas, et nous avons vérifié que les corrections précédentes fonctionnent toujours.

Cordialement,

Christophe Leroy
