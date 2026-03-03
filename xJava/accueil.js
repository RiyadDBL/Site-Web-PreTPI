//Importer les données depuis la bibliothèque Supabase
const supabase = createClient(
  "https://qaloowmeymzglsirernx.supabase.co",
  "sb_publishable_jRmIaJ4IGugwxdZZhUUhpw_N1pwu2Nv",
);

// Fonction pour charger les manifestations depuis la base de données
async function chargerManifestations() {
  const { data, error } = await supabase.from("manifestations").select("*");

  if (error) {
    console.error(error);
  } else {
    // utiliser data pour afficher les manifestations
  }
}
