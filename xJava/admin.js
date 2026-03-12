// -----------------------------------
// Connexion à Supabase
// -----------------------------------

// Importer la librairie Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// Créer le client Supabase avec l'URL et la clé publique
const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// Vérifier si l'utilisateur est connecté
// -----------------------------------

async function checkUser() {
  // Récupérer les infos de l'utilisateur connecté
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Si erreur ou pas d'utilisateur, rediriger vers la page de connexion
  if (error || !user) {
    window.location.href = "/HTML/connexion.html";
    return false;
  }

  // Si connecté, retourner true
  return true;
}

// -----------------------------------
// Lancer l'admin si l'utilisateur est connecté
// -----------------------------------

checkUser().then(async (isConnected) => {
  if (!isConnected) return; // Stop si pas connecté

  // -----------------------------------
  // Sélecteurs DOM
  // -----------------------------------

  const listeManifs = document.getElementById("liste-manifs"); // Liste des manifestations
  const formManif = document.getElementById("form-manifestation"); // Formulaire pour ajouter/modifier
  const exporterBtn = document.getElementById("exporter-donnees"); // Bouton export CSV
  const topInterets = document.getElementById("top-interets"); // Top 5 manifestations populaires
  const previewImage = document.getElementById("preview-image"); // Aperçu image avant upload

  // -----------------------------------
  // Fonction pour afficher les catégories
  // -----------------------------------

  async function afficherCategories() {
    const selectCat = formManif.querySelector('select[name="categorie"]'); // Sélecteur du formulaire

    // Récupérer les catégories depuis Supabase
    const { data, error } = await supabase.from("categorie").select("*");

    if (error) {
      console.error(error); // Afficher l'erreur dans la console
      return;
    }

    // Remplir le select avec les catégories
    selectCat.innerHTML = data
      .map(
        (cat) =>
          `<option value="${cat.id_categorie}">
      ${cat.nom}
    </option>`,
      )
      .join("");
  }

  // -----------------------------------
  // Fonction pour afficher toutes les manifestations
  // -----------------------------------

  async function afficherManifestations() {
    const { data, error } = await supabase
      .from("manifestation")
      .select(
        `
    id_manifestation,
    titre,
    description,
    date_debut,
    date_fin,
    horraire_debut,
    horraire_fin,
    statut,
    nb_interesses,
    image,
    id_categorie,
    categorie:categorie(nom)
  `,
      )
      .order("date_debut", { ascending: true }); // Trier par date

    if (error) {
      console.error(error);
      return;
    }

    // Générer le HTML pour chaque manifestation
    listeManifs.innerHTML = data
      .map(
        (m) => `
<tr>
<td>${m.titre}</td>
<td>${new Date(m.date_debut).toLocaleDateString()}</td>
<td>${new Date(m.date_fin).toLocaleDateString()}</td>
<td>${m.horraire_debut ?? ""}</td>
<td>${m.horraire_fin ?? ""}</td>
<td>${m.categorie?.nom ?? "-"}</td>
<td>${m.statut ?? ""}</td>
<td>${m.nb_interesses ?? 0}</td>
<td>
${m.image ? `<img src="${m.image}" style="max-width:80px;border-radius:5px;">` : ""}
</td>
<td>
<button class="modifier" data-id="${m.id_manifestation}">Modifier</button>
<button class="supprimer" data-id="${m.id_manifestation}">Supprimer</button>
</td>
</tr>
`,
      )
      .join("");
  }

  // -----------------------------------
  // Fonction pour afficher le top 5 des manifestations les plus populaires
  // -----------------------------------

  async function chargerTopInterets() {
    const { data } = await supabase
      .from("manifestation")
      .select("titre,nb_interesses")
      .order("nb_interesses", { ascending: false }) // Trier du plus populaire
      .limit(5); // Limité à 5

    topInterets.innerHTML = "";

    data.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = `${m.titre} (${m.nb_interesses ?? 0} intéressés)`; // Afficher titre et nombre d'intéressés
      topInterets.appendChild(li);
    });
  }

  // -----------------------------------
  // Événements pour modifier / supprimer une manifestation
  // -----------------------------------

  listeManifs.addEventListener("click", async (e) => {
    const target = e.target; // Bouton cliqué
    const id = target.dataset.id; // ID de la manifestation

    // SUPPRIMER
    if (target.classList.contains("supprimer")) {
      if (!confirm("Supprimer cette manifestation ?")) return;

      const { error } = await supabase
        .from("manifestation")
        .delete()
        .eq("id_manifestation", id);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Manifestation supprimée");
      afficherManifestations(); // Recharger la liste
      chargerTopInterets(); // Recharger le top 5
    }

    // MODIFIER
    if (target.classList.contains("modifier")) {
      const { data, error } = await supabase
        .from("manifestation")
        .select("*")
        .eq("id_manifestation", id)
        .single();

      if (error) {
        console.error(error);
        return;
      }

      // Remplir le formulaire avec les infos existantes
      formManif.titre.value = data.titre;
      formManif.description.value = data.description;
      formManif.date_debut.value = data.date_debut.split("T")[0];
      formManif.date_fin.value = data.date_fin.split("T")[0];
      formManif.horraire_debut.value = data.horraire_debut ?? "";
      formManif.horraire_fin.value = data.horraire_fin ?? "";
      formManif.categorie.value = data.id_categorie;
      formManif.statut.value = data.statut ?? "";
      previewImage.src = data.image ?? "";

      // Ajouter l'ID pour la modification
      formManif.dataset.editId = id;
      formManif.querySelector("button").textContent = "Mettre à jour";
    }
  });

  // -----------------------------------
  // Événement pour ajouter ou modifier une manifestation
  // -----------------------------------

  formManif.addEventListener("submit", async (e) => {
    e.preventDefault(); // Empêcher le rechargement de la page

    const formData = new FormData(formManif); // Récupérer les données du formulaire
    const editId = formManif.dataset.editId; // Vérifier si c'est une modification
    let imageUrl = null;

    // Upload image si présente
    const imageFile = formData.get("image");
    if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + "-" + imageFile.name;
      const { data, error } = await supabase.storage
        .from("Images")
        .upload(fileName, imageFile);
      if (error) {
        alert(error.message);
        return;
      }
      imageUrl = `https://qaloowmeymzglsirernx.supabase.co/storage/v1/object/public/Images/${data.path}`;
    }

    // Récupérer l'ID de l'admin connecté
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const idAdmin = user.id;

    // MODIFICATION
    if (editId) {
      let updateData = {
        titre: formData.get("titre"),
        description: formData.get("description"),
        date_debut: formData.get("date_debut"),
        date_fin: formData.get("date_fin"),
        horraire_debut: formData.get("horraire_debut"),
        horraire_fin: formData.get("horraire_fin"),
        id_categorie: parseInt(formData.get("categorie")),
        statut: formData.get("statut"),
        id_admin: idAdmin,
      };

      if (imageUrl) updateData.image = imageUrl; // Ajouter image si uploadée

      const { error } = await supabase
        .from("manifestation")
        .update(updateData)
        .eq("id_manifestation", editId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Manifestation mise à jour");
      delete formManif.dataset.editId;
      formManif.querySelector("button").textContent = "Enregistrer";
    }

    // CREATION
    else {
      const { error } = await supabase.from("manifestation").insert([
        {
          titre: formData.get("titre"),
          description: formData.get("description"),
          date_debut: formData.get("date_debut"),
          date_fin: formData.get("date_fin"),
          horraire_debut: formData.get("horraire_debut"),
          horraire_fin: formData.get("horraire_fin"),
          id_categorie: parseInt(formData.get("categorie")),
          statut: formData.get("statut"),
          id_admin: idAdmin,
          image: imageUrl,
          nb_interesses: 0, // Initialiser à 0 intéressés
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Manifestation ajoutée");
    }

    // RESET formulaire après enregistrement
    formManif.reset();
    previewImage.src = "";
    afficherManifestations(); // Recharger la liste
    chargerTopInterets(); // Recharger le top 5
  });

  // -----------------------------------
  // Exporter les données en CSV
  // -----------------------------------

  exporterBtn.addEventListener("click", async () => {
    const { data } = await supabase.from("manifestation").select("*");
    const csv = convertToCSV(data); // Convertir en CSV

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "manifestations.csv"; // Nom du fichier
    a.click();

    URL.revokeObjectURL(url); // Libérer la mémoire
  });

  // -----------------------------------
  // Fonction pour convertir JSON en CSV
  // -----------------------------------

  function convertToCSV(data) {
    if (!data.length) return "";
    const keys = Object.keys(data[0]); // Récupérer les colonnes
    const header = keys.join(";");
    const rows = data.map((obj) => keys.map((k) => obj[k] ?? "").join(";"));
    return [header, ...rows].join("\n");
  }

  // -----------------------------------
  // Initialisation au chargement de la page
  // -----------------------------------

  afficherCategories(); // Charger les catégories
  afficherManifestations(); // Afficher les manifestations
  chargerTopInterets(); // Afficher le top 5
});
