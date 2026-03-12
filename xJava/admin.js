// -----------------------------------
// Connexion Supabase
// -----------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// Vérifier utilisateur connecté
// -----------------------------------

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
// Lancer admin si connecté
// -----------------------------------

checkUser().then(async (isConnected) => {
  if (!isConnected) return;

  // -----------------------------------
  // Sélecteurs
  // -----------------------------------

  const listeManifs = document.getElementById("liste-manifs");
  const formManif = document.getElementById("form-manifestation");
  const exporterBtn = document.getElementById("exporter-donnees");
  const topInterets = document.getElementById("top-interets");
  const previewImage = document.getElementById("preview-image");

  // -----------------------------------
  // Charger catégories
  // -----------------------------------

  async function afficherCategories() {
    const selectCat = formManif.querySelector('select[name="categorie"]');

    const { data, error } = await supabase.from("categorie").select("*");

    if (error) {
      console.error(error);
      return;
    }

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
  // Charger manifestations
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
      .order("date_debut", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

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

<button class="modifier" data-id="${m.id_manifestation}">
Modifier
</button>

<button class="supprimer" data-id="${m.id_manifestation}">
Supprimer
</button>

</td>

</tr>

`,
      )
      .join("");
  }

  // -----------------------------------
  // Top manifestations
  // -----------------------------------

  async function chargerTopInterets() {
    const { data } = await supabase
      .from("manifestation")
      .select("titre,nb_interesses")
      .order("nb_interesses", { ascending: false })
      .limit(5);

    topInterets.innerHTML = "";

    data.forEach((m) => {
      const li = document.createElement("li");

      li.textContent = `${m.titre} (${m.nb_interesses ?? 0} intéressés)`;

      topInterets.appendChild(li);
    });
  }

  // -----------------------------------
  // Modifier / Supprimer
  // -----------------------------------

  listeManifs.addEventListener("click", async (e) => {
    const target = e.target;

    const id = target.dataset.id;

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

      afficherManifestations();
      chargerTopInterets();
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

      formManif.titre.value = data.titre;
      formManif.description.value = data.description;

      formManif.date_debut.value = data.date_debut.split("T")[0];
      formManif.date_fin.value = data.date_fin.split("T")[0];

      formManif.horraire_debut.value = data.horraire_debut ?? "";
      formManif.horraire_fin.value = data.horraire_fin ?? "";

      formManif.categorie.value = data.id_categorie;
      formManif.statut.value = data.statut ?? "";

      previewImage.src = data.image ?? "";

      formManif.dataset.editId = id;

      formManif.querySelector("button").textContent = "Mettre à jour";
    }
  });

  // -----------------------------------
  // Ajouter / Modifier
  // -----------------------------------

  formManif.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(formManif);

    const editId = formManif.dataset.editId;

    let imageUrl = null;

    // Upload image

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

    // Admin connecté

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

      if (imageUrl) {
        updateData.image = imageUrl;
      }

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

          nb_interesses: 0,
        },
      ]);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Manifestation ajoutée");
    }

    // RESET

    formManif.reset();

    previewImage.src = "";

    afficherManifestations();

    chargerTopInterets();
  });

  // -----------------------------------
  // Export CSV
  // -----------------------------------

  exporterBtn.addEventListener("click", async () => {
    const { data } = await supabase.from("manifestation").select("*");

    const csv = convertToCSV(data);

    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = "manifestations.csv";

    a.click();

    URL.revokeObjectURL(url);
  });

  // -----------------------------------
  // Convert CSV
  // -----------------------------------

  function convertToCSV(data) {
    if (!data.length) return "";

    const keys = Object.keys(data[0]);

    const header = keys.join(";");

    const rows = data.map((obj) => keys.map((k) => obj[k] ?? "").join(";"));

    return [header, ...rows].join("\n");
  }

  // -----------------------------------
  // INIT
  // -----------------------------------

  afficherCategories();

  afficherManifestations();

  chargerTopInterets();
});
