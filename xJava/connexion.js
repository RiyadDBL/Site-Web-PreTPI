// 1️⃣ Connexion à Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// 2️⃣ Gestion des onglets
document.querySelectorAll(".tab-link:not(.desactive)").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-link")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-body")
      .forEach((b) => b.classList.remove("active"));
    tab.classList.add("active");
    document
      .querySelector(`.tab-body[data-id="${tab.dataset.ref}"]`)
      .classList.add("active");
  });
});
document.querySelector(".tab-link.active").click();

// 3️⃣ Connexion admin avec rôle
document
  .querySelector('.tab-body[data-id="connexion"] .btn')
  .addEventListener("click", async () => {
    const email = document.querySelector(
      '.tab-body[data-id="connexion"] input[type="email"]',
    ).value;
    const password = document.querySelector(
      '.tab-body[data-id="connexion"] input[type="password"]',
    ).value;

    if (!email || !password) return alert("Veuillez remplir tous les champs !");

    // connexion Supabase
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError)
      return alert("Erreur de connexion : " + signInError.message);

    const userUUID = signInData.user.id;

    // récupère le rôle depuis la table administrateur
    let { data: adminData, error: adminError } = await supabase
      .from("administrateur")
      .select("id_admin, id_role")
      .eq("id_admin", userUUID) // utilise bien l'UUID de l'utilisateur
      .single();

    if (adminError)
      return alert("Erreur récupération rôle : " + adminError.message);

    const roleId = adminData.id_role;

    // stocke le rôle et l'UUID pour la page admin
    localStorage.setItem("roleId", roleId);
    localStorage.setItem("userUUID", userUUID);

    // redirection vers l'admin
    window.location.href = "/HTML/admin.html";
  });
