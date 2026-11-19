# Ticket 4 : Deux tailles, deux grands bouquets

## Message de Madame Roussel

> Bonjour, une cliente voulait offrir deux Pivoine poudrée : une petite pour sa sœur et une grande pour sa mère. Elle a composé la petite et l’a ajoutée au panier, puis elle a choisi « Grand » et a cliqué à nouveau sur « Ajouter au panier ». Dans son panier : deux grandes ! Elle n’a pas compris, et moi non plus.

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080 avec un panier vide (recharger la page)
2. Cliquer sur « Composer » pour la « Pivoine poudrée »
3. Choisir la taille « Petit » et cliquer sur « Ajouter au panier » : le panier contient une ligne « Pivoine poudrée, Petit, quantité 1 » (34,90 €)
4. Sans fermer le formulaire, choisir la taille « Grand » et cliquer à nouveau sur « Ajouter au panier »
5. Regarder le panier : une seule ligne « Pivoine poudrée, Grand, quantité 2 » (101,00 €)

**Variante :** en rouvrant le formulaire avec « Composer » entre l'étape 3 et l'étape 4 (avant de choisir « Grand »), le résultat est exactement le même.

**Résultat observé :** la petite a disparu du panier et la grande est comptée deux fois (une ligne, Grand, quantité 2).
**Résultat attendu :** deux lignes : « Petit, quantité 1 » (34,90 €) et « Grand, quantité 1 ».

**Remarque :** ces étapes ont aussi été rejouées par l'assistant IA dans le navigateur intégré à l'application, avec le même résultat dans les deux cas.

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt, stockage).
3. Aucun correctif à ce stade.

[SYMPTOME]
Une cliente voulait une petite et une grande Pivoine poudrée. Elle a ajouté la petite au panier, puis a choisi « Grand » et a de nouveau cliqué sur « Ajouter au panier ». Son panier contient deux grandes, et plus de petite.

[ETAPES]
1. Ouvrir http://localhost:8080 avec un panier vide
2. Cliquer sur « Composer » pour la « Pivoine poudrée »
3. Choisir « Petit » et cliquer sur « Ajouter au panier » : une ligne « Petit, quantité 1 »
4. Sans fermer le formulaire, choisir « Grand » et cliquer sur « Ajouter au panier »
5. Le panier montre une seule ligne « Grand, quantité 2 » (le résultat est le même si on rouvre le formulaire entre les deux ajouts)

[ATTENDU]
Deux lignes dans le panier : Petit ×1 et Grand ×1.

[CODE_CONCERNE]
Fichier js/composition.js :

const options = { taille: "petit", vase: false, carte: false, message: "" };

function lireFormulaire() {
  const taille = document.querySelector("input[name=taille]:checked");
  options.taille = taille ? taille.value : "petit";
  options.vase = document.querySelector("#option-vase").checked;
  options.carte = document.querySelector("#option-carte").checked;
  // ...
}

function ajouter(evenement) {
  evenement.preventDefault();
  if (!bouquetCourant) return;
  quandAjoute(bouquetCourant.id, options);
  // ...
}

Fichier js/panier.js :

let lignes = [];

function memesOptions(a, b) {
  return a.taille === b.taille && a.vase === b.vase && a.carte === b.carte && a.message === b.message;
}

export function ajouterAuPanier(bouquetId, options) {
  const existante = lignes.find((ligne) => ligne.bouquetId === bouquetId && memesOptions(ligne.options, options));
  if (existante) {
    existante.quantite += 1;
  } else {
    lignes.push({ bouquetId, options, quantite: 1 });
  }
}
```

### Prompt 2 : correctif

```text
Cause trouvée : l'objet options de composition.js est partagé. ajouterAuPanier (panier.js) range cet objet lui-même dans la ligne du panier (lignes.push({ bouquetId, options, quantite: 1 })) au lieu d'une copie. Quand je change la taille dans le formulaire, la ligne déjà dans le panier change aussi, et au second ajout memesOptions compare l'objet avec lui-même, d'où « Grand ×2 ».
Deux emplacements possibles : A. dans panier.js, ranger une copie de options ; B. dans composition.js, envoyer une copie de options à quandAjoute.
Je veux : un correctif le plus petit possible, l'emplacement le mieux placé pour corriger là où naît la cause, une explication, et la liste de ce qui change.
```

## 3. Hypothèses de l'IA

| Hypothèse | Retenue ou écartée | Comment je l'ai vérifiée (console, point d'arrêt, stockage) |
|:--|:--|:--|
| 1. L'objet `options` est partagé : `composition.js` en possède un seul exemplaire qu'il modifie à chaque changement du formulaire, et `ajouterAuPanier` range ce même objet dans la ligne du panier au lieu d'en faire une copie. Au second ajout, `memesOptions` compare l'objet avec lui-même et augmente la quantité. | **Retenue** | Vérifié dans le navigateur (par l'assistant IA, à ma demande). Après l'ajout de la petite, la ligne du panier en mémoire vaut `taille: "petit"`. J'ai ensuite choisi « Grand » **sans cliquer sur « Ajouter »** : la ligne déjà dans le panier est passée à `taille: "grand"` en mémoire. Elle a donc changé toute seule, preuve que la ligne et le formulaire partagent le même objet. |
| 2. `memesOptions` compare mal (champ oublié ou à l'envers) et juge « identiques » deux compositions différentes. | **Écartée** | Test avec deux objets distincts : un ajout « petit » puis un ajout « grand » donnent bien **deux lignes** ; un troisième ajout identique au « grand » donne **une seule ligne de quantité 2**. `memesOptions` fonctionne donc correctement quand les objets ne sont pas partagés. |
| 3. La sauvegarde du panier (`stockage.js`) réécrit les lignes et écrase la taille de la première. | **Écartée** | Juste après le premier ajout, la version sauvegardée dans le stockage local est `petit ×1`. Elle est restée à `petit` quand j'ai changé la taille dans le formulaire : la sauvegarde n'est pas en cause, c'est la liste en mémoire qui change. |

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/panier.js`, `ajouterAuPanier` rangeait dans la ligne du panier l'objet `options` reçu tel quel (`lignes.push({ bouquetId, options, quantite: 1 })`). Cet objet est l'unique objet `options` de `composition.js`, que le formulaire modifie à chaque changement. La ligne du panier et le formulaire partageaient donc le même objet : choisir « Grand » changeait aussi la taille de la ligne déjà ajoutée (la petite devenait grande), et au second ajout, `memesOptions` comparait l'objet avec lui-même, le trouvait identique et augmentait la quantité : « Grand ×2 ».

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/panier.js`, `ajouterAuPanier` : `lignes.push({ bouquetId, options, quantite: 1 })` devient `lignes.push({ bouquetId, options: { ...options }, quantite: 1 })`. Le panier range maintenant une **copie** des options, qui ne change plus quand le formulaire change. Une seule ligne modifiée, un seul fichier. Je corrige dans le panier parce que c'est lui qui garde l'objet : c'est là que naît le partage, et le panier est protégé quel que soit le fichier qui l'appelle.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** l'IA proposait deux emplacements pour la copie. J'ai retenu A (copie dans `panier.js`) et écarté B (copie dans `composition.js`) : avec B, seul ce formulaire serait protégé, et un autre fichier qui appellerait `ajouterAuPanier` avec un objet partagé reproduirait le bug. Ce choix a été fait avec l'aide de l'assistant IA.

## 5. Vérification

- [x] Le problème du ticket n'existe plus : petite puis grande Pivoine poudrée donnent deux lignes, « Petit ×1 » (34,90 €) et « Grand ×1 » (50,50 €)
- [x] Les tickets déjà clos fonctionnent toujours : ticket 1 (`noel10 ` avec un espace est accepté), ticket 2 (un clic sur + ajoute un seul exemplaire), ticket 3 (« Merci » affiche 4 bouquets dont « Le petit mot »)
- [X] Commit : "ticket 4 : les tailles différentes d'un même bouquet restent sur deux lignes"

**Remarque :** ces vérifications ont été faites dans le navigateur intégré à l'application par l'assistant IA, à ma demande.

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci de nous avoir signalé ce problème. Nous l'avons trouvé : quand la cliente choisissait « Grand » après avoir ajouté la petite, le site modifiait aussi la petite déjà dans le panier, puis considérait les deux comme identiques et les regroupait en « deux grandes ».

C'est corrigé : une petite et une grande Pivoine poudrée restent maintenant sur deux lignes séparées, chacune avec son prix. Nous avons aussi vérifié que le code promo, le bouton + et les occasions fonctionnent toujours comme avant.

Cordialement,

Christophe Leroy
