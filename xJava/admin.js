// -----------------------------------
// admin.js
// -----------------------------------

// 1️⃣ Connexion à Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// 2️⃣ Vérification que l'utilisateur est connecté
async function checkUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    window.location.href = "/HTML/connexion.html";
    return false;
  }

  return true;
}

// -----------------------------------
// Lancer le reste du code seulement si connecté
checkUser().then((isConnected) => {
  if (!isConnected) return;

  // -----------------------------------
  // Sélecteurs du HTML
  const listeManifs = document.getElementById("liste-manifs");
  const formManif = document.getElementById("form-manifestation");
  const exporterBtn = document.getElementById("exporter-donnees");

  // -----------------------------------
  // Charger les catégories
  async function afficherCategories() {
    const selectCat = document.querySelector('select[name="categorie"]');

    const { data, error } = await supabase.from("categorie").select("*");

    if (error) return console.error("Erreur catégories :", error);

    selectCat.innerHTML = data
      .map((cat) => `<option value="${cat.id_categorie}">${cat.titre}</option>`)
      .join("");
  }

  // -----------------------------------
  // Afficher les manifestations
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
        image,
        nb_interesses,
        id_admin,
        id_categorie,
        horraire_debut,
        horraire_fin,
        statut,
        categorie: categorie(titre)
      `,
      )
      .order("date_debut", { ascending: true });

    if (error) return console.error("Erreur manifestations :", error);

    listeManifs.innerHTML = data
      .map(
        (m) => `
        <tr>
          <td>${m.titre}</td>
          <td>${new Date(m.date_debut).toLocaleDateString()}</td>
          <td>${new Date(m.date_fin).toLocaleDateString()}</td>
          <td>${m.horraire_debut ?? ""}</td>
          <td>${m.horraire_fin ?? ""}</td>
          <td>${m.categorie?.titre ?? "—"}</td>
          <td>${m.statut ?? "—"}</td>
          <td>${m.nb_interesses ?? 0}</td>
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
  // Gestion clics modifier / supprimer
  listeManifs.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.getAttribute("data-id");

    // SUPPRIMER
    if (target.classList.contains("supprimer")) {
      const confirmDel = confirm(
        "Voulez-vous vraiment supprimer cette manifestation ?",
      );

      if (!confirmDel) return;

      const { error } = await supabase
        .from("manifestation")
        .delete()
        .eq("id_manifestation", id);

      if (error) return console.error("Erreur suppression :", error);

      alert("Manifestation supprimée !");
      afficherManifestations();
    }

    // MODIFIER
    if (target.classList.contains("modifier")) {
      const { data, error } = await supabase
        .from("manifestation")
        .select("*")
        .eq("id_manifestation", id)
        .single();

      if (error) return console.error("Erreur récupération :", error);

      formManif.titre.value = data.titre;
      formManif.description.value = data.description;
      formManif.date_debut.value = data.date_debut.split("T")[0];
      formManif.date_fin.value = data.date_fin.split("T")[0];
      formManif.horaire_debut.value = data.horraire_debut ?? "";
      formManif.horaire_fin.value = data.horraire_fin ?? "";
      formManif.categorie.value = data.id_categorie;
      formManif.statut.value = data.statut ?? "";

      formManif.dataset.editId = id;
      formManif.querySelector("button[type=submit]").textContent =
        "Mettre à jour";
    }
  });

  // -----------------------------------
  // Formulaire ajout / modification
  formManif.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(formManif);
    const editId = formManif.dataset.editId;

    let imageUrl = null;

    const imageFile = formData.get("image");

    if (imageFile && imageFile.size > 0) {
      const { data, error } = await supabase.storage
        .from("manifestation-images")
        .upload(`images/${Date.now()}-${imageFile.name}`, imageFile);

      if (error) {
        alert("Erreur upload image : " + error.message);
        return;
      }

      imageUrl = `https://qaloowmeymzglsirernx.supabase.co/storage/v1/object/public/manifestation-images/${data.path}`;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const idAdmin = user.id;

    if (editId) {
      const { error } = await supabase
        .from("manifestation")
        .update({
          titre: formData.get("titre"),
          description: formData.get("description"),
          date_debut: formData.get("date_debut"),
          date_fin: formData.get("date_fin"),
          horraire_debut: formData.get("horaire_debut"),
          horraire_fin: formData.get("horaire_fin"),
          id_categorie: parseInt(formData.get("categorie")),
          statut: formData.get("statut"),
          id_admin: idAdmin,
          ...(imageUrl && { image: imageUrl }),
        })
        .eq("id_manifestation", editId);

      if (error)
        return alert("Erreur lors de la modification : " + error.message);

      alert("Manifestation mise à jour !");
      delete formManif.dataset.editId;

      formManif.querySelector("button[type=submit]").textContent =
        "Enregistrer";
    } else {
      const { error } = await supabase.from("manifestation").insert([
        {
          titre: formData.get("titre"),
          description: formData.get("description"),
          date_debut: formData.get("date_debut"),
          date_fin: formData.get("date_fin"),
          horraire_debut: formData.get("horaire_debut"),
          horraire_fin: formData.get("horaire_fin"),
          id_categorie: parseInt(formData.get("categorie")),
          statut: formData.get("statut"),
          id_admin: idAdmin,
          image: imageUrl,
          nb_interesses: 0,
        },
      ]);

      if (error) return alert("Erreur lors de l'ajout : " + error.message);

      alert("Manifestation ajoutée !");
    }

    formManif.reset();
    afficherManifestations();
  });

  // -----------------------------------
  // Export CSV
  function convertToCSV(data) {
    if (!data.length) return "";

    const keys = Object.keys(data[0]);

    const header = keys.join(";");

    const rows = data.map((obj) =>
      keys
        .map((k) => {
          let val = obj[k] ?? "";
          val = val.toString().replace(/"/g, '""');

          if (val.search(/("|;|\n)/g) >= 0) val = `"${val}"`;

          return val;
        })
        .join(";"),
    );

    return [header, ...rows].join("\n");
  }

  exporterBtn.addEventListener("click", async () => {
    const { data, error } = await supabase.from("manifestation").select("*");

    if (error) return console.error(error);

    const csvContent = convertToCSV(data);

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "manifestations.csv";

    a.click();

    URL.revokeObjectURL(url);
  });

  // -----------------------------------
  // Initialisation
  afficherCategories();
  afficherManifestations();
});
