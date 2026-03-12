// Importer createClient si nécessaire (selon l'environnement)
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Connexion Supabase
const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// Fonction pour charger et afficher les manifestations
async function chargerManifestations() {
  let { data, error } = await supabase
    .from("manifestation") // Vérifie bien le nom exact de ta table
    .select("*");

  if (error) {
    console.error("Erreur lors du chargement :", error);
    return;
  }

  afficherManifestations(data);
}

// Fonction pour afficher les manifestations dans le HTML
function afficherManifestations(manifestations) {
  const container = document.getElementById("liste-manifs");
  container.innerHTML = "";
  manifestations.forEach((manif) => {
    const article = document.createElement("article");
    article.classList.add("manif");
    article.innerHTML = `
    <div class="manif-media">
      <img src="${manif.image}" alt="${manif.titre}">
      <div class="overlay">
        <h3>${manif.titre}</h3>
        <p>Voir plus</p>
      </div>
    </div>
  `;
    container.appendChild(article);
  });
}

// Appeler la fonction au chargement du script
chargerManifestations();
