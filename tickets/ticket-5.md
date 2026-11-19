# Ticket 5 : Un bouquet supprimé, tout le panier vidé

## Message de Madame Roussel

> Bonjour, une cliente avait mis trois bouquets différents dans son panier. Elle a voulu retirer le premier avec le bouton « Supprimer » : les trois ont disparu. Elle a cru à une panne et elle est partie sans commander.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 avec un panier vide (recharger la page)
2. Ajouter trois bouquets différents au panier (par exemple Pivoine poudrée, Champêtre, Roses rouges), chacun avec « Composer » puis « Ajouter au panier » : le panier contient trois lignes
3. Cliquer sur « Supprimer » de la **première** ligne : les trois lignes disparaissent et le message « panier vide » s'affiche

**Variantes testées (même départ, trois lignes) :**
- « Supprimer » sur la 2ᵉ ligne : la 2ᵉ et la 3ᵉ disparaissent, il ne reste que la 1ʳᵉ
- « Supprimer » sur la 3ᵉ (dernière) ligne : seule la 3ᵉ disparaît, ce qui est correct

**Résultat observé :** « Supprimer » retire la ligne cliquée **et toutes celles qui la suivent**.
**Résultat attendu :** « Supprimer » ne retire que la ligne cliquée.

**Remarque :** ces étapes ont été rejouées par l'assistant IA dans le navigateur intégré à l'application, à ma demande.

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt, stockage).
3. Aucun correctif à ce stade.

[SYMPTOME]
Une cliente avait mis trois bouquets différents dans son panier. Elle a cliqué sur « Supprimer » pour retirer le premier : les trois ont disparu.

[ETAPES]
1. Ouvrir http://localhost:8080 avec un panier vide
2. Ajouter trois bouquets différents au panier : trois lignes
3. Cliquer sur « Supprimer » de la première ligne : les trois lignes disparaissent
4. Avec « Supprimer » sur la 2e ligne : la 2e et la 3e disparaissent ; sur la 3e (dernière) ligne : seule la 3e disparaît

[ATTENDU]
« Supprimer » ne retire que la ligne cliquée.

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

// Supprime une ligne du panier.
export function supprimerLigne(index) {
  lignes.splice(index);
}
```

## 3. Hypothèses de l'IA

Réponse de l'assistant IA au prompt 1 (aucun correctif demandé) :

1. **(La plus probable) `supprimerLigne` retire trop d'éléments.** Dans `panier.js`, `lignes.splice(index)` est appelé avec un seul argument. Avec `splice`, sans second argument, tout ce qui suit la position `index` est aussi retiré. Cela colle au motif observé : 1ʳᵉ ligne → tout part, 2ᵉ → la 2ᵉ et la 3ᵉ, dernière → seulement elle.
   - Vérification : en console, créer un petit tableau de test, appeler `splice` avec un seul argument puis avec deux, et comparer. Puis mettre un point d'arrêt (ou un log point) sur `supprimerLigne` pour lire `index` et la longueur de `lignes` avant et après.
2. **L'index transmis par le bouton est faux.** `data-index` pourrait valoir 0 pour toutes les lignes, ou être décalé.
   - Vérification : log point dans `quandActionPanier` pour afficher `index`. Si l'index correspond bien à la ligne cliquée, l'hypothèse tombe. Argument contre : supprimer la dernière ligne ne retire qu'elle.
3. **`rafraichir` ou la sauvegarde remet un état incorrect.** L'écriture dans `localStorage` ou le réaffichage pourrait écraser le panier.
   - Vérification : regarder `panier-roussel` dans l'onglet Stockage juste après la suppression, et comparer avec ce qui est affiché. Argument contre : la suppression de la dernière ligne fonctionne.

*Hypothèses proposées par l'IA, à vérifier dans le navigateur avant tout correctif.*

**Vérification des hypothèses (faite par l'assistant IA dans le navigateur) :**
- Hypothèse 1 : confirmée. Sur un tableau `["A","B","C"]`, `splice(1)` donne `["A"]` et `splice(1, 1)` donne `["A","C"]`. Sur le vrai panier (3 lignes), un clic sur « Supprimer » de la 2ᵉ ligne laisse seulement la 1ʳᵉ, en mémoire comme dans `localStorage`.
- Hypothèse 2 : écartée. Les boutons portent bien `data-index` 0, 1 et 2, et le clic sur la 2ᵉ ligne a bien visé l'index 1.
- Hypothèse 3 : écartée. Le contenu de `panier-roussel` après suppression est identique à l'état en mémoire et à l'affichage : le réaffichage et la sauvegarde ne font que refléter ce que `supprimerLigne` a laissé.

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/panier.js`, `supprimerLigne` appelait `lignes.splice(index)` sans préciser combien de lignes retirer. Quand `splice` n'a qu'un seul argument, il retire tout depuis la position `index` jusqu'à la fin du tableau : cliquer sur « Supprimer » enlevait la ligne choisie et toutes celles qui la suivent. Le bouton envoyait le bon index, et l'affichage et la sauvegarde ne faisaient que refléter le tableau déjà tronqué : l'erreur naît dans `supprimerLigne`.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/panier.js`, `lignes.splice(index);` devient `lignes.splice(index, 1);`. Le second argument dit à `splice` de ne retirer qu'**un** élément, celui qui se trouve à `index`. Une seule ligne modifiée, au seul endroit où la suppression est faite : `changerQuantite` passe aussi par `supprimerLigne` quand la quantité tombe à 0, donc ce cas est corrigé en même temps, sans toucher à `app.js`.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** variante envisagée avec l'assistant IA : remplacer la suppression par `lignes = lignes.filter((_, i) => i !== index)`. Je l'ai écartée : le résultat serait le même, mais elle remplace tout le tableau au lieu de modifier la ligne concernée, et elle change plus de choses que nécessaire. La cause est un argument manquant ; je corrige cet argument. Ce choix a été fait avec l'aide de l'assistant IA.

## 5. Vérification

- [x] Le problème du ticket n'existe plus (étapes rejouées) : avec trois lignes, « Supprimer » sur la 1ʳᵉ ne retire que la 1ʳᵉ, sur la 2ᵉ ne retire que la 2ᵉ, sur la dernière ne retire que la dernière ; le panier en mémoire, `localStorage` et l'affichage sont identiques
- [x] Les tickets déjà clos fonctionnent toujours : ticket 1 (en tapant `noel10 ` avec un espace final dans le champ puis « Appliquer » : « Code NOEL10 appliqué. », code gardé dans le panier), ticket 2 (un clic sur + ajoute un seul exemplaire), ticket 3 (« Merci » donne 4 bouquets dont « Le petit mot »), ticket 4 (petite et grande Pivoine poudrée restent sur deux lignes) ; et le bouton − jusqu'à 0 ne supprime que la ligne concernée
- [ ] Commit : 

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande. Pour le ticket 5 et le ticket 1, les clics et la saisie ont été faits comme un utilisateur (vrai clic sur « Supprimer », saisie dans le champ du code promo).

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci de nous avoir signalé ce problème. Nous l'avons trouvé : quand on supprimait un bouquet, le site retirait aussi tous ceux qui se trouvaient en dessous dans le panier, au lieu de ne retirer que celui choisi.

C'est corrigé : « Supprimer » ne retire désormais que le bouquet sur lequel on clique, les autres restent dans le panier. Nous avons aussi vérifié que les corrections précédentes (code promo, bouton +, occasions, tailles) fonctionnent toujours.

Cordialement,

Christophe Leroy
