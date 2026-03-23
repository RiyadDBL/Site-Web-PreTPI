// -----------------------------------
// Connexion à Supabase
// -----------------------------------
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// -----------------------------------
// Messages persistants
// -----------------------------------
const messageDiv = document.getElementById("message");

function showMessage(msg, type = "error") {
  if (!messageDiv) return;
  messageDiv.textContent = msg;
  messageDiv.style.color = type === "success" ? "green" : "red";
}

function clearMessage() {
  if (!messageDiv) return;
  messageDiv.textContent = "";
}

// -----------------------------------
// Vérifier si l'utilisateur est connecté et récupérer son rôle
// -----------------------------------
async function checkUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const roleId = parseInt(localStorage.getItem("roleId"));

  if (error || !user || !roleId) {
    window.location.href = "/HTML/connexion.html";
    return false;
  }

  return roleId;
}

// -----------------------------------
// Mapping des statuts
// -----------------------------------
function getStatutLabel(id) {
  switch (id) {
    case 1:
      return "Archivée";
    case 2:
      return "En cours de modification";
    case 3:
      return "Affichée";
    default:
      return "";
  }
}

// -----------------------------------
// Archiver automatiquement les manifestations terminées
// -----------------------------------
async function archiverFinies(manifs) {
  const today = new Date();
  for (const m of manifs) {
    const dateFin = new Date(m.date_fin);
    if (dateFin < today && m.id_statut !== 1) {
      await supabase
        .from("manifestation")
        .update({ id_statut: 1 })
        .eq("id_manifestation", m.id_manifestation);
    }
  }
}

// -----------------------------------
// Initialisation de l'administration
// -----------------------------------
checkUser().then(async (roleId) => {
  if (!roleId) return;

  const listeManifs = document.getElementById("liste-manifs");
  const formManif = document.getElementById("form-manifestation");
  const exporterBtn = document.getElementById("exporter-donnees");
  const topInterets = document.getElementById("top-interets");
  const previewImage = document.getElementById("preview-image");

  // Masquer certaines actions pour rôle restreint
  if (roleId === 2 && exporterBtn) exporterBtn.remove();
  if (roleId === 2) {
    const observer = new MutationObserver(() => {
      document.querySelectorAll(".supprimer").forEach((btn) => btn.remove());
    });
    observer.observe(listeManifs, { childList: true, subtree: true });
  }

  // -----------------------------------
  // Charger les catégories
  // -----------------------------------
  async function afficherCategories() {
    const selectCat = formManif.querySelector('select[name="categorie"]');
    const { data, error } = await supabase.from("categorie").select("*");

    if (error) {
      showMessage("Erreur lors du chargement des catégories.");
      return;
    }

    selectCat.innerHTML = data
      .map((cat) => `<option value="${cat.id_categorie}">${cat.nom}</option>`)
      .join("");
  }

  // -----------------------------------
  // Afficher les manifestations
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
        lieu,
        id_statut,
        nb_interesses,
        image,
        id_categorie,
        categorie:categorie(nom)
      `,
      )
      .order("date_debut", { ascending: true });

    if (error) {
      showMessage("Erreur lors du chargement des manifestations.");
      return;
    }

    // 🔹 Archiver automatiquement les manifestations terminées
    await archiverFinies(data);

    // 🔹 Recharger les données pour afficher le statut correct
    const { data: updatedData } = await supabase
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
        lieu,
        id_statut,
        nb_interesses,
        image,
        id_categorie,
        categorie:categorie(nom)
      `,
      )
      .order("date_debut", { ascending: true });

    listeManifs.innerHTML = updatedData
      .map(
        (m) => `
<tr>
<td>${m.titre}</td>
<td>${new Date(m.date_debut).toLocaleDateString()}</td>
<td>${new Date(m.date_fin).toLocaleDateString()}</td>
<td>${m.horraire_debut ?? ""}</td>
<td>${m.horraire_fin ?? ""}</td>
<td>${m.lieu ?? ""}</td>
<td>${m.categorie?.nom ?? "-"}</td>
<td>${getStatutLabel(m.id_statut)}</td>
<td>${m.nb_interesses ?? 0}</td>
<td>${m.image ? `<img src="${m.image}" style="max-width:80px;border-radius:5px;">` : ""}</td>
<td>
<button class="modifier" data-id="${m.id_manifestation}">Modifier</button>
${
  roleId === 1
    ? `<button class="supprimer" data-id="${m.id_manifestation}">Supprimer</button>`
    : ""
}
</td>
</tr>`,
      )
      .join("");
  }

  // -----------------------------------
  // Top 5 manifestations populaires
  // -----------------------------------
  async function chargerTopInterets() {
    const { data, error } = await supabase
      .from("manifestation")
      .select("titre,nb_interesses")
      .order("nb_interesses", { ascending: false })
      .limit(5);

    if (error) {
      showMessage("Erreur lors du chargement du top 5.");
      return;
    }

    topInterets.innerHTML = "";
    data.forEach((m) => {
      const li = document.createElement("li");
      li.textContent = `${m.titre} (${m.nb_interesses ?? 0} intéressés)`;
      topInterets.appendChild(li);
    });
  }

  // -----------------------------------
  // Modifier / Supprimer manifestation
  // -----------------------------------
  listeManifs.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains("supprimer") && roleId === 1) {
      if (!confirm("Supprimer cette manifestation ?")) return;

      const { error } = await supabase
        .from("manifestation")
        .delete()
        .eq("id_manifestation", id);

      if (error) {
        showMessage("Erreur lors de la suppression de la manifestation.");
        return;
      }

      showMessage("Manifestation supprimée avec succès !", "success");
      afficherManifestations();
      chargerTopInterets();
    }

    if (target.classList.contains("modifier")) {
      const { data, error } = await supabase
        .from("manifestation")
        .select("*")
        .eq("id_manifestation", id)
        .single();

      if (error) {
        showMessage("Erreur lors du chargement de la manifestation.");
        return;
      }

      formManif.titre.value = data.titre;
      formManif.description.value = data.description;
      formManif.date_debut.value = data.date_debut.split("T")[0];
      formManif.date_fin.value = data.date_fin.split("T")[0];
      formManif.horraire_debut.value = data.horraire_debut ?? "";
      formManif.horraire_fin.value = data.horraire_fin ?? "";
      formManif.lieu.value = data.lieu ?? "";
      formManif.categorie.value = data.id_categorie;
      formManif["id_statut"].value = data.id_statut ?? "";
      previewImage.src = data.image ?? "";

      formManif.dataset.editId = id;
      formManif.querySelector("button").textContent = "Mettre à jour";
      clearMessage();
    }
  });

  // -----------------------------------
  // Ajouter / Modifier manifestation
  // -----------------------------------
  formManif.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(formManif);
    const editId = formManif.dataset.editId;
    let imageUrl = null;

    const imageFile = formData.get("image");
    if (imageFile && imageFile.size > 0) {
      const fileName = Date.now() + "-" + imageFile.name;
      const { data, error } = await supabase.storage
        .from("Images")
        .upload(fileName, imageFile);
      if (error) {
        showMessage(
          "Erreur dans le choix de l'image. Changez le nom ou le format.",
        );
        return;
      }
      imageUrl = `https://qaloowmeymzglsirernx.supabase.co/storage/v1/object/public/Images/${data.path}`;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const idAdmin = user.id;

    const formulaireData = {
      titre: formData.get("titre"),
      description: formData.get("description"),
      date_debut: formData.get("date_debut"),
      date_fin: formData.get("date_fin"),
      horraire_debut: formData.get("horraire_debut"),
      horraire_fin: formData.get("horraire_fin"),
      lieu: formData.get("lieu"),
      id_categorie: parseInt(formData.get("categorie")),
      id_statut: parseInt(formData.get("id_statut")),
      id_admin: idAdmin,
    };
    if (imageUrl) formulaireData.image = imageUrl;

    if (editId) {
      const { error } = await supabase
        .from("manifestation")
        .update(formulaireData)
        .eq("id_manifestation", editId);

      if (error) {
        showMessage("Erreur lors de la mise à jour de la manifestation.");
        return;
      }

      showMessage("Manifestation mise à jour avec succès !", "success");
      delete formManif.dataset.editId;
      formManif.querySelector("button").textContent = "Enregistrer";
    } else {
      formulaireData.nb_interesses = 0;
      const { error } = await supabase
        .from("manifestation")
        .insert([formulaireData]);

      if (error) {
        showMessage("Erreur lors de l'ajout de la manifestation.");
        return;
      }

      showMessage("Manifestation ajoutée avec succès !", "success");
    }

    formManif.reset();
    previewImage.src = "";
    afficherManifestations();
    chargerTopInterets();
  });

  // -----------------------------------
  // Export CSV
  // -----------------------------------
  if (exporterBtn && roleId === 1) {
    exporterBtn.addEventListener("click", async () => {
      const { data, error } = await supabase.from("manifestation").select("*");
      if (error) {
        showMessage("Erreur lors de l'export CSV.");
        return;
      }

      const csv = convertToCSV(data);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "manifestations.csv";
      a.click();
      URL.revokeObjectURL(url);

      showMessage("Export CSV terminé !", "success");
    });
  }

  function convertToCSV(data) {
    if (!data.length) return "";
    const keys = Object.keys(data[0]);
    const header = keys.join(";");
    const rows = data.map((obj) => keys.map((k) => obj[k] ?? "").join(";"));
    return [header, ...rows].join("\n");
  }

  // -----------------------------------
  // Initialisation
  // -----------------------------------
  afficherCategories();
  afficherManifestations();
  chargerTopInterets();
});
