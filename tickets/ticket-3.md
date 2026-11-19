# Ticket 3 : Un bouquet absent de l’occasion « Merci »

## Message de Madame Roussel

> Bonjour, quand on choisit l’occasion « Merci », le bouquet « Le petit mot » n’apparaît pas. C’est pourtant celui que je vends le plus pour dire merci ! Il est bien là quand on affiche tous les bouquets.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 et recharger la page (Cmd+R)
2. Avec l'occasion « Toutes » sélectionnée : tous les bouquets s'affichent, dont « Le petit mot »
3. Cliquer sur l'occasion « Merci » : « Le petit mot » n'apparaît pas
4. Cliquer tour à tour sur les autres occasions : « Le petit mot » n'apparaît qu'avec « Toutes » et « Pour le plaisir »

**Résultat observé :** « Le petit mot » est absent de l'occasion « Merci ».
**Résultat attendu :** « Le petit mot » apparaît aussi dans l'occasion « Merci » (c'est le bouquet que Madame Roussel vend le plus pour dire merci).

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt, stockage).
3. Aucun correctif à ce stade.

[SYMPTOME]
Quand on choisit l'occasion « Merci », le bouquet « Le petit mot » n'apparaît pas, alors qu'il est affiché avec « Toutes ». Il apparaît aussi avec « Pour le plaisir », mais pas avec « Merci ».

[ETAPES]
1. Ouvrir http://localhost:8080 et recharger la page
2. Avec « Toutes » : tous les bouquets s'affichent, dont « Le petit mot »
3. Cliquer sur « Merci » : « Le petit mot » n'apparaît pas
4. Cliquer sur les autres occasions : « Le petit mot » n'apparaît qu'avec « Toutes » et « Pour le plaisir »

[ATTENDU]
« Le petit mot » apparaît aussi avec l'occasion « Merci ».

[CODE_CONCERNE]
Fichier js/affichage.js, fonction afficherCatalogue (le filtre) :

bouquets
  .filter((bouquet) => occasion === "toutes" || bouquet.occasions.includes(occasion))

Fichier data/catalogue.json, la liste des occasions :

"occasions": [
  { "id": "anniversaire", "libelle": "Anniversaire" },
  { "id": "amour", "libelle": "Amour" },
  { "id": "merci", "libelle": "Merci" },
  { "id": "mariage", "libelle": "Mariage" },
  { "id": "plaisir", "libelle": "Pour le plaisir" }
]

Fichier data/catalogue.json, deux bouquets : « Champêtre » (qui apparaît bien avec « Merci ») et « Le petit mot » :

{ "id": "champetre", "nom": "Champêtre", "occasions": ["plaisir", "merci"], "prix": 29.9 }
{ "id": "petit-mot", "nom": "Le petit mot", "occasions": ["Merci", "plaisir"], "prix": 19.9 }
```

### Prompt 2 : correctif

```text
Cause trouvée : dans data/catalogue.json, le bouquet « Le petit mot » (id petit-mot) a "Merci" avec une majuscule dans sa liste occasions, alors que l'identifiant de l'occasion est "merci" (minuscules) et que les autres bouquets utilisent "merci". Le filtre de afficherCatalogue utilise includes(occasion), qui compare exactement : le bouquet n'apparaît donc pas avec l'occasion « Merci ».
Mon choix : corriger la donnée (le fichier catalogue.json), là où naît la cause, et non le code du filtre.
Je veux : un correctif le plus petit possible, une explication, la liste de ce qui change (fichier et ligne), et un moyen de vérifier qu'aucun autre bouquet n'a une écriture d'occasion différente des identifiants.
```

## 3. Hypothèses de l'IA

| Hypothèse | Retenue ou écartée | Comment je l'ai vérifiée (console, point d'arrêt, stockage) |
|:--|:--|:--|
| 1. La donnée du bouquet est écrite différemment de l'occasion : pour « Le petit mot », `occasions` contient `"Merci"` (majuscule) alors que l'identifiant de l'occasion est `"merci"`. `includes(occasion)` compare exactement, majuscule comprise. | **Retenue** | Console du navigateur : `["Merci", "plaisir"].includes("merci")` donne `false`, et `["plaisir", "merci"].includes("merci")` donne `true`. |
| 2. La valeur envoyée par le bouton radio « Merci » n'est pas celle qu'on croit (libellé au lieu de l'identifiant). | **Écartée** | Sur le site, l'occasion « Merci » affiche bien « Champêtre », « Soleil d'automne » et « Blanc pur » : le bouton envoie la bonne valeur (`merci`). Seul « Le petit mot » manque. |
| 3. Le navigateur utilise une ancienne version des données (cache). | **Écartée** | Le comportement observé correspond exactement au contenu actuel de `data/catalogue.json` : `"Merci"` avec une majuscule dans `petit-mot`, `"merci"` partout ailleurs. Les données chargées sont donc à jour. |

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `data/catalogue.json`, la liste `occasions` du bouquet `petit-mot` contenait `"Merci"` avec une majuscule, alors que l'identifiant de l'occasion est `"merci"` en minuscules et que tous les autres bouquets utilisent `"merci"`. Le filtre de `afficherCatalogue` (`affichage.js`) utilise `bouquet.occasions.includes(occasion)`, qui compare exactement, majuscule comprise : « Le petit mot » n'était donc jamais trouvé pour l'occasion « Merci ». L'erreur vient probablement d'une confusion entre le libellé affiché (« Merci ») et l'identifiant (`merci`).

**Correctif (fichier, ce qui change, pourquoi) :** dans `data/catalogue.json`, ligne du bouquet `petit-mot`, `"occasions": ["Merci", "plaisir"]` devient `"occasions": ["merci", "plaisir"]`. Une seule ligne change, et aucun fichier JavaScript n'est modifié. Je corrige dans la donnée parce que c'est là que naît la faute : le code du filtre est correct, c'est une donnée qui ne respecte pas les identifiants.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** j'ai écarté la correction dans le code (rendre le filtre de `affichage.js` insensible aux majuscules). Elle aurait caché le problème sans corriger la donnée fautive, qui serait restée incohérente dans le fichier. J'ai aussi laissé de côté l'idée d'une vérification permanente au chargement du site : elle demande plus de code que nécessaire pour ce ticket. À la place, j'ai fait un contrôle ponctuel qui vérifie que chaque occasion de chaque bouquet existe dans la liste des identifiants.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : l'occasion « Merci » affiche maintenant 4 bouquets, dont « Le petit mot »
- [x] Les tickets déjà clos fonctionnent toujours : ticket 1 (`noel10` accepté) et ticket 2 (le + ajoute un seul exemplaire)
- [x] Contrôle des occasions : aucune occasion inconnue dans le catalogue ; les autres occasions n'ont pas changé
- [X] Commit : "ticket 3 : « Le petit mot » apparaît avec l'occasion « Merci »"

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci de nous avoir signalé ce problème. Nous l'avons trouvé : dans la fiche du bouquet « Le petit mot », le mot « Merci » était écrit avec une majuscule, alors que partout ailleurs il est écrit sans. Le site ne reconnaissait donc pas ce bouquet dans la catégorie « Merci ».

C'est corrigé : « Le petit mot » apparaît maintenant avec l'occasion « Merci », comme les autres bouquets. Nous avons aussi vérifié que les autres bouquets et les autres occasions étaient bien écrits de la même façon.

Cordialement,

Christophe Leroy
