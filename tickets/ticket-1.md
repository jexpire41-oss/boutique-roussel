# Ticket 1 : Le code promo refusé

## Message de Madame Roussel

> Bonjour, une cliente m’a appelée hier. Elle a voulu utiliser le code NOEL10 de ma lettre d’information depuis son téléphone, et le site lui a répondu que ce code n’existe pas. Sur mon ordinateur, le code marche très bien. Elle a fini par commander sans la réduction et elle n’était pas contente. Pouvez-vous regarder ?

## 1. Étapes pour reproduire le problème

1. Ouvrir http://localhost:8080
2. Ajouter un bouquet au panier
3. Dans le champ code promo, taper `NOEL10` et valider : la remise est appliquée (cas qui marche)
4. Vider le champ, taper `noel10` (minuscules) et valider
5. Vider le champ, taper `Noel10` (première lettre en majuscule) et valider
6. Vider le champ, taper `NOEL10 ` (avec un espace à la fin) et valider

**Résultat observé :** aux étapes 4, 5 et 6, le site affiche « Ce code promo n'existe pas. » et aucune remise n'est appliquée.
**Résultat attendu :** la remise de NOEL10 est appliquée dans les 3 cas, comme à l'étape 3.

**Remarque :** je n'ai pas testé sur un vrai téléphone. J'ai simulé sur ordinateur ce que le clavier d'un téléphone peut produire (majuscule automatique, espace ajouté après le mot).

## 2. Prompts utilisés

### Prompt 1 : diagnostic (hypothèses, sans correctif)

```text
Tu m'aides à trouver la cause d'un bug sur le site d'une boutique de fleurs (JavaScript).
1. Propose trois hypothèses au plus, classées de la plus probable à la moins probable.
2. Pour chacune : comment la vérifier dans le navigateur (console, point d'arrêt, stockage).
3. Aucun correctif à ce stade.

[SYMPTOME]
Une cliente a voulu utiliser le code NOEL10 depuis son téléphone : le site lui a répondu que ce code n'existe pas. Sur ordinateur, le code marche.

[ETAPES]
1. Ouvrir http://localhost:8080
2. Ajouter un bouquet au panier
3. Dans le champ code promo, taper NOEL10 et valider : la remise est appliquée (cas qui marche)
4. Vider le champ, taper noel10 (minuscules) et valider : « Ce code promo n'existe pas. »
5. Vider le champ, taper Noel10 et valider : même réponse
6. Vider le champ, taper NOEL10 suivi d'un espace et valider : même réponse

[ATTENDU]
La remise de NOEL10 est appliquée dans les 3 cas, comme à l'étape 3.

[CODE_CONCERNE]
Fichier js/app.js, fonction appliquerCode :

function appliquerCode(evenement) {
  evenement.preventDefault();
  const saisie = document.querySelector("#code-promo").value;
  const resultat = appliquerPromo(saisie, sousTotal(lignesPanier()));
  etat.codePromo = resultat.valide ? saisie : "";
  document.querySelector("#message-promo").textContent = resultat.message;
  rafraichir();
}

Fichier js/promo.js :

// Codes promo : vérification et calcul de la remise.

import { formaterPrix } from "./outils.js";

let promos = [];

// Garde la liste des codes promo en mémoire.
export function chargerPromos(liste) {
  promos = liste;
}

// Applique un code promo à un sous-total.
// Renvoie { valide, remise, message }.
export function appliquerPromo(saisie, montant) {
  const regle = promos.find((promo) => promo.code === saisie);
  if (!regle) {
    return { valide: false, remise: 0, message: "Ce code promo n'existe pas." };
  }
  if (montant < regle.minimum) {
    return {
      valide: false,
      remise: 0,
      message: "Ce code est valable à partir de " + formaterPrix(regle.minimum) + " d'achat.",
    };
  }
  const remise = regle.type === "pourcentage" ? (montant * regle.valeur) / 100 : regle.valeur;
  return { valide: true, remise, message: "Code " + regle.code + " appliqué." };
}
```

### Prompt 2 : correctif

```text
Cause trouvée : la comparaison du code est stricte (promo.code === saisie), donc une majuscule ou un espace en trop fait échouer le code.
Mon choix : corriger dans appliquerCode de app.js, avant que la saisie soit gardée, pour nettoyer dès le départ.
Je veux : un correctif le plus petit possible, une explication ligne par ligne, et la liste de ce qui change.
```

## 3. Hypothèses de l'IA

| Hypothèse | Retenue ou écartée | Comment je l'ai vérifiée (console, point d'arrêt, stockage) |
|:--|:--|:--|
| 1. La comparaison du code est exacte, caractère par caractère : `promo.code === saisie` dans `promo.js`, sans mise en forme de la saisie. Une majuscule ou un espace en trop suffit à faire échouer la recherche. | **Retenue** | Console du navigateur : `"noel10" === "NOEL10"` donne `false` et `"NOEL10 " === "NOEL10"` donne `false`. |
| 2. Le code est écrit autrement dans `data/promos.json` que ce que la cliente tape (casse, espace). | **Écartée** | J'ai ouvert `data/promos.json` : le code y est écrit exactement `NOEL10`, en majuscules, sans espace. |
| 3. La saisie contient un caractère invisible ajouté par le clavier du téléphone. | **Non vérifiée, non nécessaire** | L'hypothèse 1 explique déjà les trois échecs reproduits (minuscules, majuscule initiale, espace). |

## 4. Cause et correctif

**Cause (là où elle naît) :** dans `js/promo.js`, la ligne `promos.find((promo) => promo.code === saisie)` compare le texte tapé au code caractère par caractère. Le texte venant de `appliquerCode` (`app.js`) n'était pas nettoyé : une majuscule ou un espace en trop suffisait pour que le code ne soit pas trouvé, d'où « Ce code promo n'existe pas ». Sur un téléphone, le clavier peut ajouter une majuscule ou un espace sans que la cliente s'en aperçoive.

**Correctif (fichier, ce qui change, pourquoi) :** dans `js/app.js`, fonction `appliquerCode`, la ligne `const saisie = document.querySelector("#code-promo").value;` devient `const saisie = document.querySelector("#code-promo").value.trim().toUpperCase();`. `.trim()` enlève les espaces au début et à la fin, `.toUpperCase()` passe en majuscules. Je corrige là parce que la saisie est gardée dans `etat.codePromo` et réutilisée par `rafraichir()` : nettoyée dès le départ, elle l'est aux deux endroits.

**Proposition de l'IA écartée ou modifiée, et pourquoi :** j'ai écarté l'alternative de rendre la comparaison insensible à la casse dans `promo.js`. Elle protégerait tous les appels à `appliquerPromo`, mais j'ai préféré nettoyer le texte dès la saisie. Limite acceptée : `.toUpperCase()` suppose que tous les codes de `promos.json` sont en majuscules (c'est le cas de `NOEL10` et `BIENVENUE5`).

## 5. Vérification

- [x] Le problème du ticket n'existe plus (6 étapes rejouées : essai concluant)
- [x] Les tickets déjà clos fonctionnent toujours : aucun, c'est le premier ticket
- [X] Autres cas testés : faux code (`ABC123`) toujours refusé, `BIENVENUE5` avec un panier de moins de 30 € puis de plus de 30 €
- [X] Commit : "ticket 1 : le code promo est reconnu avec majuscules ou espace"

## 6. Réponse à la cliente

Bonjour Madame Roussel,

Merci de nous avoir signalé ce problème. Nous l'avons trouvé : le site ne reconnaissait le code NOEL10 que s'il était tapé exactement comme dans votre lettre d'information. Sur un téléphone, le clavier met parfois une majuscule ou ajoute un espace sans que la personne s'en aperçoive, et le code était alors refusé.

C'est corrigé : le code est maintenant reconnu même avec des majuscules ou un espace en trop. Nous avons testé avant de vous écrire. Vous pouvez rassurer votre cliente et lui proposer de réessayer.

Cordialement,

Christophe Leroy
