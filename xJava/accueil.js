import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

async function chargerManifestations() {
  let { data, error } = await supabase.from("manifestation").select("*");

  if (error) {
    console.error("Erreur lors du chargement :", error);
    return;
  }

  afficherManifestations(data);
}

function afficherManifestations(manifestations) {
  const container = document.getElementById("liste-manifs");
  container.innerHTML = "";

  manifestations.forEach((manif) => {
    const article = document.createElement("article");
    article.classList.add("manif");

    article.innerHTML = `
      <div class="manif-inner">

        <!-- Face avant -->
        <div class="manif-front">
          <img src="${manif.image}" alt="${manif.titre}"> <!-- Vérifiez 'image' et 'titre' -->
          <div class="overlay">
            <h3>${manif.titre}</h3>
            <button class="voir-plus">Voir plus</button>
          </div>
        </div>

        <!-- Face arrière -->
        <div class="manif-back">
          <h3>${manif.titre}</h3> <!-- Ajuster selon besoin -->
          <p><strong>Quand :</strong> ${manif.date}</p> <!-- Vérifiez 'date' -->
          <p><strong>Où :</strong> ${manif.lieu}</p> <!-- Vérifiez 'lieu' -->
          <p><strong>Durée :</strong> ${manif.duree}</p> <!-- Vérifiez 'duree' -->
          <p><strong>Raison :</strong> ${manif.description}</p> <!-- Vérifiez 'description' -->

          <button class="retour">Retour</button>
        </div>

      </div>
    `;

    container.appendChild(article);

    // Boutons
    const voirPlus = article.querySelector(".voir-plus");
    const retour = article.querySelector(".retour");

    voirPlus.addEventListener("click", () => {
      article.classList.add("flip");
    });

    retour.addEventListener("click", () => {
      article.classList.remove("flip");
    });
  });
}

chargerManifestations();
