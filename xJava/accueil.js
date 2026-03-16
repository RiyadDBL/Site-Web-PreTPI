// -----------------------------------
// Connexion à Supabase
// -----------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// Variables globales
// -----------------------------------

let toutesLesManifs = [];

const container = document.getElementById("liste-manifs");
const searchInput = document.querySelector(".rechercher input[type='text']");
const searchForm = document.querySelector(".rechercher");

const btnDate = document.querySelector(".trier button:nth-child(1)");
const btnPopularite = document.querySelector(".trier button:nth-child(2)");

// -----------------------------------
// Charger les manifestations
// -----------------------------------

async function chargerManifestations() {
  const { data, error } = await supabase
    .from("manifestation")
    .select(`*, categorie:categorie(nom)`)
    .order("date_debut", { ascending: true });

  if (error) {
    console.error("Erreur Supabase :", error);
    return;
  }

  toutesLesManifs = data;
  afficherManifestations(data);
}

// -----------------------------------
// Affichage des manifestations
// -----------------------------------

function afficherManifestations(manifestations) {
  container.innerHTML = "";

  if (!manifestations.length) {
    container.innerHTML = "<p>Aucune manifestation trouvée.</p>";
    return;
  }

  manifestations.forEach((manif) => {
    const article = document.createElement("article");
    article.classList.add("manif");

    const dateDebut = new Date(manif.date_debut).toLocaleDateString();
    const dateFin = new Date(manif.date_fin).toLocaleDateString();

    article.innerHTML = `
      <div class="manif-inner">

        <!-- Face avant -->
        <div class="manif-front">
          <img src="${manif.image || ""}" alt="${manif.titre}">
          <div class="overlay">
            <h3>${manif.titre}</h3>
            <button class="voir-plus">Voir plus</button>
          </div>
        </div>

        <!-- Face arrière -->
        <div class="manif-back">
          <h3>${manif.titre}</h3>
          <p><strong>Catégorie :</strong> ${manif.categorie?.nom ?? "-"}</p>
          <p><strong>Début :</strong> ${dateDebut}</p>
          <p><strong>Fin :</strong> ${dateFin}</p>
          <p><strong>Horaire :</strong> 
            ${manif.horraire_debut ?? ""} - ${manif.horraire_fin ?? ""}
          </p>
          <p><strong>Description :</strong> ${manif.description ?? ""}</p>
          <p><strong>Intéressés :</strong> <span class="compteur">${manif.nb_interesses ?? 0}</span></p>

          <button class="interesse" data-id="${manif.id_manifestation}">Je suis intéressé</button>
          <button class="retour">Retour</button>
        </div>

      </div>
    `;

    container.appendChild(article);

    // -----------------------------------
    // Animation flip
    // -----------------------------------
    const voirPlus = article.querySelector(".voir-plus");
    const retour = article.querySelector(".retour");

    voirPlus.addEventListener("click", () => {
      article.classList.add("flip");
    });

    retour.addEventListener("click", () => {
      article.classList.remove("flip");
    });

    // -----------------------------------
    // Bouton "Je suis intéressé"
    // -----------------------------------
    const btnInteresse = article.querySelector(".interesse");
    btnInteresse.addEventListener("click", async () => {
      const id = btnInteresse.dataset.id;

      // Incrémenter dans Supabase
      const { data, error } = await supabase
        .from("manifestation")
        .update({ nb_interesses: (manif.nb_interesses ?? 0) + 1 })
        .eq("id_manifestation", id)
        .select();

      if (error) {
        alert("Erreur : " + error.message);
        return;
      }

      // Mise à jour de l'affichage
      const nouveauNb = data[0].nb_interesses;
      article.querySelector(".compteur").textContent = nouveauNb;

      // Mettre à jour le tableau local
      manif.nb_interesses = nouveauNb;
    });
  });
}

// -----------------------------------
// Recherche par mot clé
// -----------------------------------

searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const motCle = searchInput.value.toLowerCase();

  const resultat = toutesLesManifs.filter(
    (m) =>
      m.titre.toLowerCase().includes(motCle) ||
      (m.description && m.description.toLowerCase().includes(motCle)),
  );

  afficherManifestations(resultat);
});

// -----------------------------------
// Tri par date
// -----------------------------------

btnDate.addEventListener("click", () => {
  const trie = [...toutesLesManifs].sort(
    (a, b) => new Date(a.date_debut) - new Date(b.date_debut),
  );

  afficherManifestations(trie);
});

// -----------------------------------
// Tri par popularité
// -----------------------------------

btnPopularite.addEventListener("click", () => {
  const trie = [...toutesLesManifs].sort(
    (a, b) => (b.nb_interesses ?? 0) - (a.nb_interesses ?? 0),
  );

  afficherManifestations(trie);
});

// -----------------------------------
// Lancement
// -----------------------------------

chargerManifestations();
