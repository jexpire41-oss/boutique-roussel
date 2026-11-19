// Sauvegarde du panier dans le navigateur, pour le retrouver à la visite suivante.

const CLE = "panier-roussel";
const VERSION = 2;

// Enregistre le panier et le code promo.
export function sauverPanier(lignes, codePromo) {
  const donnees = { version: VERSION, lignes, codePromo };
  localStorage.setItem(CLE, JSON.stringify(donnees));
}

// Relit le panier enregistré, ou un panier vide.
export function chargerPanier() {
  const brut = localStorage.getItem(CLE);
  if (!brut) {
    return { lignes: [], codePromo: "" };
  }
  const donnees = JSON.parse(brut);
  const lignes = donnees.lignes || donnees;
  // On ne garde que les lignes au format actuel : un ancien panier ne doit pas casser la page.
  return { lignes: Array.isArray(lignes) ? lignes.filter(ligneValide) : [], codePromo: donnees.codePromo || "" };
}

// Une ligne du format actuel : un bouquet, des options et une quantité positive.
function ligneValide(ligne) {
  return (
    Boolean(ligne) &&
    typeof ligne.bouquetId === "string" &&
    typeof ligne.options === "object" &&
    ligne.options !== null &&
    typeof ligne.quantite === "number" &&
    ligne.quantite > 0
  );
}
