// -----------------------------------
// connexion à Supabase
// -----------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js";

let supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// variables globales
// -----------------------------------
let toutesLesManifs = [];
let container = document.getElementById("liste-manifs");

let searchInput = document.querySelector(".rechercher input[type='text']");
let searchForm = document.querySelector(".rechercher");

let btnDate = document.querySelector(".trier button:nth-child(1)");
let btnPopularite = document.querySelector(".trier button:nth-child(2)");
let selectCategorie = document.getElementById("filtre-categorie");

// -----------------------------------
// charger manifestations
// -----------------------------------
async function chargerManifestations() {
  let { data, error } = await supabase
    .from("manifestation")
    .select(`*, categorie:categorie(nom)`)
    .order("date_debut", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  // filtrer directement les manifestations archivées (id_statut === 1)
  toutesLesManifs = data.filter((m) => m.id_statut !== 1);

  afficherManifestations(toutesLesManifs);
  remplirCategories();
}

// -----------------------------------
// remplir catégories
// -----------------------------------
function remplirCategories() {
  selectCategorie.innerHTML = '<option value="">Toutes les catégories</option>';

  let categories = [
    ...new Set(toutesLesManifs.map((m) => m.categorie?.nom).filter(Boolean)),
  ];

  categories.forEach((cat) => {
    let option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    selectCategorie.appendChild(option);
  });
}

// -----------------------------------
// afficher manifestations
// -----------------------------------
function afficherManifestations(manifestations) {
  container.innerHTML = "";

  if (!manifestations.length) {
    container.innerHTML = "<p>Aucune manifestation trouvée.</p>";
    return;
  }

  manifestations.forEach((manif) => {
    let article = document.createElement("article");
    article.classList.add("manif");

    let dateDebut = new Date(manif.date_debut).toLocaleDateString();
    let dateFin = new Date(manif.date_fin).toLocaleDateString();

    article.innerHTML = `
      <div class="manif-inner">

        <div class="manif-front">
          <img src="${manif.image || ""}" alt="${manif.titre}">
          <div class="overlay">
            <h3>${manif.titre}</h3>
            <button class="voir-plus">Voir plus</button>
          </div>
        </div>

        <div class="manif-back">
          <h3>${manif.titre}</h3>
          <p><strong>Catégorie :</strong> ${manif.categorie?.nom ?? "-"}</p>
          <p><strong>Début :</strong> ${dateDebut}</p>
          <p><strong>Fin :</strong> ${dateFin}</p>
          <p><strong>Horaire :</strong> ${manif.horraire_debut ?? ""} - ${manif.horraire_fin ?? ""}</p>
          <p><strong>Description :</strong> ${manif.description ?? ""}</p>

          <p>
            <strong>Intéressés :</strong>
            <span class="compteur">${manif.nb_interesses ?? 0}</span>
          </p>

          <button class="interesse">Je suis intéressé</button>

          <div class="newsletter">
            <input type="email" placeholder="Votre email" class="email-input">
            <button class="inscrire-newsletter">S'inscrire</button>
            <div class="message-newsletter"></div>
          </div>

          <button class="retour">Retour</button>
        </div>

      </div>
    `;

    container.appendChild(article);

    // flip
    article.querySelector(".voir-plus").onclick = () =>
      article.classList.add("flip");
    article.querySelector(".retour").onclick = () =>
      article.classList.remove("flip");

    // bouton intéressé
    article.querySelector(".interesse").onclick = async () => {
      let { data, error } = await supabase
        .from("manifestation")
        .update({ nb_interesses: (manif.nb_interesses ?? 0) + 1 })
        .eq("id_manifestation", manif.id_manifestation)
        .select();

      if (error) return;

      let nouveauNb = data[0].nb_interesses;
      article.querySelector(".compteur").textContent = nouveauNb;
      manif.nb_interesses = nouveauNb;
    };

    // newsletter (message local)
    let btnNewsletter = article.querySelector(".inscrire-newsletter");
    let inputEmail = article.querySelector(".email-input");
    let messageLocal = article.querySelector(".message-newsletter");

    function showLocalMessage(msg, type = "error") {
      messageLocal.textContent = msg;
      messageLocal.style.color = type === "success" ? "green" : "red";
      setTimeout(() => {
        messageLocal.textContent = "";
      }, 3000);
    }

    btnNewsletter.onclick = async () => {
      let email = inputEmail.value.trim();

      if (!email || !email.includes("@") || !email.includes(".")) {
        showLocalMessage("Email invalide");
        return;
      }

      let { data, error: fetchError } = await supabase
        .from("manifestation")
        .select("newsletter_mail")
        .eq("id_manifestation", manif.id_manifestation)
        .single();

      if (fetchError) {
        showLocalMessage("Erreur récupération");
        return;
      }

      let liste = data.newsletter_mail ? data.newsletter_mail.split(",") : [];

      if (liste.includes(email)) {
        showLocalMessage("Déjà inscrit !");
        return;
      }

      liste.push(email);

      let { error: updateError } = await supabase
        .from("manifestation")
        .update({ newsletter_mail: liste.join(",") })
        .eq("id_manifestation", manif.id_manifestation);

      if (updateError) {
        showLocalMessage("Erreur inscription");
        return;
      }

      showLocalMessage("Inscription réussie !", "success");
      inputEmail.value = "";
    };
  });
}

// -----------------------------------
// recherche
// -----------------------------------
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();

  let motCle = searchInput.value.toLowerCase();

  let resultat = toutesLesManifs.filter(
    (m) =>
      m.titre.toLowerCase().includes(motCle) ||
      (m.description && m.description.toLowerCase().includes(motCle)),
  );

  afficherManifestations(resultat);
});

// -----------------------------------
// tri date
// -----------------------------------
btnDate.onclick = () => {
  let trie = [...toutesLesManifs].sort(
    (a, b) => new Date(a.date_debut) - new Date(b.date_debut),
  );
  afficherManifestations(trie);
};

// -----------------------------------
// tri popularité
// -----------------------------------
btnPopularite.onclick = () => {
  let trie = [...toutesLesManifs].sort(
    (a, b) => (b.nb_interesses ?? 0) - (a.nb_interesses ?? 0),
  );
  afficherManifestations(trie);
};

// -----------------------------------
// filtre catégorie
// -----------------------------------
selectCategorie.addEventListener("change", () => {
  let cat = selectCategorie.value;

  let filtered = cat
    ? toutesLesManifs.filter((m) => m.categorie?.nom === cat)
    : toutesLesManifs;

  afficherManifestations(filtered);
});

// -----------------------------------
// lancement
// -----------------------------------
chargerManifestations();
