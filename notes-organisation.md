# Notes : organisation du projet

## Ce que j'ai demandé à l'IA
J'ai fourni le tableau « Organisation » du README et le fichier `js/app.js`.
J'ai demandé à quoi sert chaque fichier et le parcours « Ajouter au panier »,
avec les noms de fichiers, sans modifier le code.

## Ce que l'IA a répondu
- `app.js` est le chef d'orchestre : il charge les données, branche les boutons et appelle les autres fichiers.
- Le parcours : clic sur un bouquet, `composition.js`, `quandAjoute` (app.js), `ajouterAuPanier` (panier.js), puis `rafraichir()` (app.js), qui met à jour l'affichage, le prix, la promo, la livraison et la sauvegarde.
- `app.js` importe `promo.js` (ligne 6), pas `promotions.js`.

## Ce que j'ai vérifié dans le code
- Dans `composition.js`, la fonction appelle bien `quandAjoute(bouquetCourant.id, options)` puis affiche « ajouté au panier ».
- J'ai cherché `promotions` dans tout le projet (Cmd+Shift+F) : le mot n'apparaît que dans le README. Aucun fichier n'importe `promotions.js`, donc il n'est pas utilisé. Le site utilise `promo.js`.

## Ce que je n'ai pas encore vérifié
- Quel événement déclenche la fonction de `composition.js` (clic ? envoi du formulaire ?).
- Le contenu des autres fichiers (prix.js, livraison.js, stockage.js…) : l'IA n'a vu que app.js.

## À retenir pour les tickets
- Tout passe par `rafraichir()` dans `app.js`.
- Les codes promo sont dans `promo.js`, pas dans `promotions.js`.