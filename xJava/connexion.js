// 1️⃣ Connexion à Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// 2️⃣ Gestion des onglets
let tabs = document.querySelectorAll(".tab-link:not(.desactive)");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    unSelectAll();
    tab.classList.add("active");
    let ref = tab.getAttribute("data-ref");
    document
      .querySelector(`.tab-body[data-id="${ref}"]`)
      .classList.add("active");
  });
});

function unSelectAll() {
  tabs.forEach((tab) => tab.classList.remove("active"));
  let tabbodies = document.querySelectorAll(".tab-body");
  tabbodies.forEach((tab) => tab.classList.remove("active"));
}

document.querySelector(".tab-link.active").click();

// 3️⃣ Connexion admin
const btnConnexion = document.querySelector(
  '.tab-body[data-id="connexion"] .btn',
);

btnConnexion.addEventListener("click", async () => {
  const email = document.querySelector(
    '.tab-body[data-id="connexion"] input[type="email"]',
  ).value;
  const password = document.querySelector(
    '.tab-body[data-id="connexion"] input[type="password"]',
  ).value;

  if (!email || !password) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Erreur de connexion : " + error.message);
  } else {
    console.log("Admin connecté :", data.user);

    // redirection vers la page admin
    window.location.href = "/HTML/admin.html";
  }
});

// 4️⃣ Inscription admin
const btnInscription = document.querySelector(
  '.tab-body[data-id="inscription"] .btn',
);

btnInscription.addEventListener("click", async () => {
  const email = document.querySelector(
    '.tab-body[data-id="inscription"] input[type="email"]',
  ).value;
  const password = document.querySelectorAll(
    '.tab-body[data-id="inscription"] input[type="password"]',
  )[0].value;
  const confirmPassword = document.querySelectorAll(
    '.tab-body[data-id="inscription"] input[type="password"]',
  )[1].value;

  if (!email || !password || !confirmPassword) {
    alert("Veuillez remplir tous les champs !");
    return;
  }

  if (password !== confirmPassword) {
    alert("Les mots de passe ne correspondent pas !");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    alert("Erreur lors de l'inscription : " + error.message);
  } else {
    alert("Inscription réussie ! Vous pouvez maintenant vous connecter.");
    console.log("Admin inscrit :", data.user);
  }
});
