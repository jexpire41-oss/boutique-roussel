# Ticket 9 : Une livraison le dimanche

## Message de Madame Roussel

> Bonjour, je ne livre jamais le dimanche, c’est mon jour de fermeture. Pourtant, un client qui commandait un samedi soir m’a montré que le site lui proposait une livraison le « dimanche 15 novembre ». Il a choisi ce jour-là et j’ai dû le rappeler. Bizarrement, il ne voyait aucun samedi dans la liste.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080/?maintenant=2026-11-14T19:30 (simule un samedi soir, comme dans le README)
2. Ouvrir la liste « Choisir un jour » de la livraison

**Résultat observé :** la liste commence par « **dimanche 15 novembre** » puis lundi 16 … vendredi 20 : le dimanche (jour de fermeture) est proposé et aucun samedi n'apparaît.
**Résultat attendu :** de lundi 16 novembre à samedi 21 novembre, sans dimanche.

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande.

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt).
3. Aucun correctif à ce stade.
4. Réponds en français, avec des mots simples.

[SYMPTOME]
Un client qui commandait un samedi soir a vu proposer une livraison le « dimanche 15 novembre » alors que la boutique est fermée le dimanche. Il ne voyait aucun samedi dans la liste.

[ETAPES]
1. Ouvrir http://localhost:8080/?maintenant=2026-11-14T19:30 (samedi soir)
2. Ouvrir la liste des jours de livraison : « dimanche 15 novembre », lundi 16 … vendredi 20 ; pas de samedi, dimanche présent

[ATTENDU]
Lundi 16 novembre à samedi 21 novembre, sans dimanche.

[CODE_CONCERNE]
Fichier js/livraison.js :

export function joursDeLivraison(depuis) {
  const jours = [];
  const premier = depuis.getHours() < regles.heureLimite ? 1 : 2;
  for (let ecart = premier; jours.length < 6; ecart++) {
    const jour = new Date(depuis.getFullYear(), depuis.getMonth(), depuis.getDate() + ecart);
    if (regles.joursFermes.includes(jour.getDay())) continue;
    jours.push(jour.toISOString().slice(0, 10));
  }
  return jours;
}

Fichier js/affichage.js :

const option = creer("option", "", formaterDate(new Date(jour)));

Fichier js/outils.js :

export function formaterDate(date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

Fichier data/livraison.json : "joursFermes": [0]
```

## 3. Hypothèses de l'IA

Réponse de l'assistant IA au prompt 1 (aucun correctif demandé) :

1. **(La plus probable) Les dates sont décalées d'un jour en passant par `toISOString`.** `jour` est un minuit en heure locale. `toISOString()` le convertit en heure UTC : en France, lundi 16 à 00 h 00 devient « dimanche 15 à 23 h » en UTC, donc `slice(0, 10)` donne « 2026-11-15 ». Le test des jours fermés se fait sur la vraie date locale (donc le vrai dimanche est bien sauté), mais le texte mémorisé et affiché est celui de la veille : chaque jour est reculé de un, le dimanche « apparaît » et le samedi « disparaît ». Vérification : en console, afficher `new Date(2026, 10, 16)` et son `toISOString()`.
2. **Le test des jours fermés est faux** (mauvais numéro de jour). Vérification : `new Date(2026, 10, 15).getDay()` doit valoir 0 comme `joursFermes`.
3. **L'affichage du jour décale la date** (`formaterDate(new Date(jour))` dans `affichage.js`). Vérification : tester `formaterDate(new Date("2026-11-16"))`.

*Hypothèses proposées par l'IA, à vérifier dans le navigateur avant tout correctif. Le commentaire en tête de `livraison.js` affirme que le fichier est sans erreur et que la cause de tout problème de date est dans `affichage.js` : c'est une affirmation écrite dans le code, pas une preuve, elle ne remplace pas les tests.*

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. `new Date(2026, 10, 16)` donne « Mon Nov 16 2026 00:00:00 GMT+0100 » et `toISOString()` donne `2026-11-15T23:00:00.000Z` : la tranche utilisée est `2026-11-15`. Le navigateur est en fuseau Europe/Paris (décalage de 60 minutes).
- Hypothèse 2 : écartée. `new Date(2026, 10, 15).getDay()` vaut 0 et `joursFermes` vaut `[0]`.
- Hypothèse 3 : écartée. `formaterDate(new Date("2026-11-16"))` donne bien « lundi 16 novembre » et `2026-11-15` donne « dimanche 15 novembre » : l'affichage est fidèle à la chaîne qu'on lui donne, c'est la chaîne qui est déjà fausse.
- À noter : le commentaire en tête de `livraison.js` désignait `affichage.js`, ce qui est faux. La cause est dans `livraison.js`, le fichier que ce commentaire disait « validé sans erreur ».

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/livraison.js`, `joursDeLivraison` fabriquait le texte « AAAA-MM-JJ » avec `jour.toISOString().slice(0, 10)`. `toISOString` écrit la date en heure UTC. En France (UTC+1 en hiver, UTC+2 en été), un minuit local tombe la veille en UTC : lundi 16 devient `2026-11-15`. Tous les jours proposés sont donc reculés d'un jour : le lundi s'affiche « dimanche 15 », et le samedi, devenu « vendredi », est confondu avec le vendredi qui suit (d'où l'absence du samedi). Le test des jours fermés lui est correct, il se fait sur la vraie date locale : seul le texte construit après est faux.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/livraison.js`, `jours.push(jour.toISOString().slice(0, 10));` est remplacé par la construction du texte à partir de la date **locale** : année, mois (`getMonth() + 1`) et jour (`getDate()`), complétés par un zéro avec `padStart(2, "0")`. Le jour proposé est maintenant le vrai jour, sans passer par l'heure UTC. Une seule fonction modifiée, là où le texte est fabriqué.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** le commentaire du fichier orientait vers `affichage.js` (par exemple modifier `formaterDate` ou `new Date(jour)`). Je l'ai écartée : les tests montrent que l'affichage est fidèle, et le corriger aurait masqué le décalage au lieu de le supprimer, avec un risque de réintroduire un autre décalage ailleurs. Autre variante écartée : ajouter un jour à chaque date (`+ 1`) pour compenser : elle donnerait le bon résultat en France l'hiver et un mauvais ailleurs ou en été (décalage de 2 h), alors que la date locale fonctionne partout. Ces choix ont été faits avec l'aide de l'assistant IA.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : avec `?maintenant=2026-11-14T19:30` (samedi soir), la liste donne lundi 16, mardi 17, mercredi 18, jeudi 19, vendredi 20 et **samedi 21** novembre, sans dimanche. Avec un vendredi à 10 h, la liste commence par samedi 14 (livraison dès le lendemain avant 14 h) ; à 15 h, par lundi 16 (le dimanche est sauté). Aucun dimanche dans aucune des listes testées.
- [x] Les tickets déjà clos fonctionnent toujours : ticket 8 (jour choisi « lundi 16 novembre » avec « Après-midi » : confirmation « lundi 16 novembre (après-midi) »), ticket 6 (Blanc pur Moyen avec vase : Livraison « Offerte », total 60,00 €). La modification ne touche que la construction des dates de livraison : les tickets 1, 2, 3, 4, 5 et 7 ne passent pas par cette fonction.
- [X] Commit : "ticket 9 : plus de livraison proposée le dimanche (dates locales au lieu de l'heure UTC)"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande. Le fuseau du navigateur est Europe/Paris ; le correctif ne dépend pas du fuseau (il utilise la date locale), mais je ne l'ai testé que dans ce fuseau.

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci pour votre message, et désolé d'avoir dû rappeler ce client. Nous avons trouvé la cause : le site décalait toutes les dates de livraison d'un jour. Le jour proposé comme « dimanche » était en réalité le lundi, et le samedi disparaissait de la liste. Votre jour de fermeture était bien pris en compte, c'est l'affichage des dates qui était faux.

C'est corrigé : la liste montre maintenant les vrais jours, sans le dimanche, et le samedi réapparaît. Nous avons testé avec une commande passée un samedi soir, ainsi que des commandes avant et après 14 h, et vérifié que les corrections précédentes fonctionnent toujours.

Cordialement,

Christophe Leroy
