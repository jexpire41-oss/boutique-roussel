# Ticket 2 : Le bouton +

## Message de Madame Roussel

> Bonjour, quand une cliente veut plusieurs bouquets identiques et clique sur le +, le panier en ajoute plusieurs d’un coup, et c’est de pire en pire à chaque clic. Une cliente s’est retrouvée avec une quinzaine de bouquets. Heureusement qu’elle a vu le total avant de commander !

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 et recharger la page (Cmd+R)
2. Ajouter un bouquet au panier (quantité affichée : 1)
3. Cliquer une fois sur le bouton + de la ligne : la quantité passe de 1 à 54
4. Cliquer une deuxième fois sur + : la quantité passe à 160
5. Cliquer une troisième fois sur + : la quantité passe à 372
6. Cliquer sur le bouton − : la ligne disparaît et le panier se vide

**Résultat observé :** chaque clic sur + ajoute beaucoup plus d'un exemplaire, et l'écart grandit à chaque clic. Le bouton − vide tout le panier.
**Résultat attendu :** chaque clic sur + ajoute 1 exemplaire (1, 2, 3…), et chaque clic sur − en retire 1.

**Remarque :** les chiffres exacts peuvent varier d'une session à l'autre ; ce qui compte est que chaque clic ajoute bien plus d'un exemplaire et que l'écart grandit.

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt, stockage).
3. Aucun correctif à ce stade.

[SYMPTOME]
Une cliente clique sur le + du panier pour avoir plusieurs bouquets identiques : le panier en ajoute plusieurs d'un coup, et c'est de pire en pire à chaque clic. Le bouton − vide tout le panier.

[ETAPES]
1. Ouvrir http://localhost:8080 et recharger la page
2. Ajouter un bouquet au panier (quantité 1)
3. Cliquer une fois sur + : la quantité passe de 1 à 54
4. Cliquer à nouveau sur + : 160
5. Cliquer à nouveau sur + : 372
6. Cliquer sur − : le panier se vide

[ATTENDU]
Chaque clic sur + ajoute 1 exemplaire (1, 2, 3…) et chaque clic sur − en retire 1.

[CODE_CONCERNE]
Fichier js/app.js :

function quandActionPanier(action, index) {
  if (action === "plus") changerQuantite(index, 1);
  if (action === "moins") changerQuantite(index, -1);
  if (action === "supprimer") supprimerLigne(index);
  rafraichir();
}

Fichier js/panier.js :

export function changerQuantite(index, ecart) {
  const ligne = lignes[index];
  if (!ligne) return;
  ligne.quantite += ecart;
  if (ligne.quantite <= 0) {
    supprimerLigne(index);
  }
}

Fichier js/affichage.js :

export function afficherPanier(lignes, surAction) {
  const liste = document.querySelector("#panier-liste");
  liste.replaceChildren();
  document.querySelector("#panier-vide").hidden = lignes.length > 0;

  lignes.forEach((ligne, index) => {
    // (création des éléments de la ligne et des boutons moins, plus, supprimer)
    liste.append(element);
  });

  // Les boutons + , − et Supprimer de toutes les lignes.
  liste.addEventListener("click", (evenement) => {
    const cible = evenement.target.closest("button[data-action]");
    if (!cible) return;
    surAction(cible.dataset.action, Number(cible.dataset.index));
  });
}
```

### Prompt 2 : correctif

```text
Cause trouvée : dans afficherPanier (affichage.js), la ligne liste.addEventListener("click", ...) est exécutée à chaque réaffichage du panier. La liste #panier-liste n'est pas recréée (seul son contenu est vidé), donc les écouteurs s'empilent : un clic déclenche l'action plusieurs fois, et le nombre double à chaque clic.
Mon choix : installer l'écouteur une seule fois, et non à chaque affichage du panier.
Je veux : un correctif le plus petit possible, une explication ligne par ligne, et la liste de ce qui change (fichiers et lignes).
```

## 3. Hypothèses de l'IA

| Hypothèse | Retenue ou écartée | Comment je l'ai vérifiée (console, point d'arrêt, stockage) |
|:--|:--|:--|
| 1. Le code qui écoute les clics sur les boutons du panier (`addEventListener` dans `afficherPanier`, `affichage.js`) est ajouté à chaque réaffichage du panier, au lieu d'une seule fois. Les écouteurs s'empilent, et un seul clic déclenche plusieurs fois l'action. | **Retenue** | Débogueur de Firefox : un point d'arrêt sur la ligne `surAction(...)` s'est déclenché plusieurs fois pour un seul clic sur +. Avec un clic seul, la quantité est passée de 435 889 à 437 937, soit +2 048 : la ligne s'exécute des milliers de fois pour un clic, et le nombre double à chaque clic. |
| 2. `changerQuantite` est appelée plusieurs fois par un autre chemin que l'écouteur. | **Écartée** | La répétition se produit déjà sur la ligne `surAction(...)`, donc avant `changerQuantite` : elle naît dans l'écouteur de clic, pas dans un autre appel. |
| 3. La quantité enregistrée est déjà fausse au départ (restaurée depuis la sauvegarde du navigateur). | **Écartée** | Après l'ajout d'un bouquet sur une page rechargée, la quantité affichée est bien 1 : la valeur de départ est correcte, le problème apparaît au clic. |

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/affichage.js`, la fonction `afficherPanier` contenait la ligne `liste.addEventListener("click", ...)`. Cette fonction est appelée à chaque `rafraichir()`, mais la liste `#panier-liste` n'est pas recréée (seul son contenu est vidé avec `replaceChildren()`). À chaque affichage du panier, un écouteur de clic de plus s'ajoutait donc sur la même liste. Un seul clic sur + déclenchait alors l'action autant de fois qu'il y avait d'écouteurs, et comme chaque action réaffiche le panier, un écouteur de plus s'ajoutait à chaque fois : le nombre doublait à chaque clic (+2 048 exemplaires pour un seul clic lors de mon test).

**Correctif (fichier, ce qui change, pourquoi) :** j'ai retiré le bloc `liste.addEventListener("click", ...)` de `afficherPanier` (`js/affichage.js`) et je l'ai placé dans la fonction `demarrer()` de `js/app.js`, où il appelle directement `quandActionPanier`. `demarrer()` ne s'exécute qu'une seule fois au chargement de la page : l'écouteur n'est donc installé qu'une fois. Je corrige là parce que la cause naît à l'endroit où l'écouteur est installé, pas à l'endroit où l'on voit le résultat (`changerQuantite` ou l'affichage de la quantité).

**Proposition de l'IA écartée ou modifiée, et pourquoi :** j'ai **modifié** la proposition : l'IA laissait dans `afficherPanier` un paramètre `surAction` devenu inutile (PhpStorm l'a signalé : « Unused parameter surAction »). Je l'ai retiré de la déclaration dans `affichage.js` et de l'appel dans `rafraichir()` (`app.js`), pour ne pas laisser de code mort. J'ai aussi écarté l'alternative `liste.onclick = ...` : elle aurait évité l'empilement, mais elle réinstalle le gestionnaire à chaque affichage du panier, alors que j'ai choisi de l'installer une seule fois.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : après rechargement et ajout d'un bouquet, trois clics sur + donnent 2, 3, 4
- [x] Les tickets déjà clos fonctionnent toujours : ticket 1, le code `noel10` est toujours accepté
- [x] Autres boutons testés : − et Supprimer fonctionnent
- [ ] Commit : "ticket 2 : le bouton + ajoute un seul exemplaire (écouteur installé une seule fois)"

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci de nous avoir signalé ce problème. Nous l'avons trouvé : à chaque fois que le panier se mettait à jour, le site enregistrait le clic sur le + une fois de plus, si bien qu'un seul clic comptait pour de nombreux clics, de plus en plus à chaque fois.

C'est corrigé : chaque clic sur le + ajoute maintenant un seul bouquet, et le − et le bouton Supprimer fonctionnent normalement. Nous avons aussi vérifié que le code promo NOEL10 fonctionne toujours. Vous pouvez rassurer vos clientes.

Cordialement,

Christophe Leroy
