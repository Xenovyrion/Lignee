// Sauvegarde cloud : Lignée dépose ses copies dans le dossier synchronisé par l'application OneDrive ou
// Google Drive pour ordinateur, qui se charge de l'envoi. Aucun compte ni jeton n'est géré ici.
// Écriture limitée au sous-dossier « Lignée » du dossier choisi, et à des fichiers « lignee-AAAA-MM-JJ.json ».
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const SOUS_DOSSIER: &str = "Lignée";
const GARDER: usize = 30;

#[derive(Serialize)]
pub struct DossierCloud {
    fournisseur: &'static str,
    chemin: String,
}

/** Dossiers synchronisés trouvés sur ce PC. */
#[tauri::command]
pub fn dossiers_cloud() -> Vec<DossierCloud> {
    let mut l: Vec<DossierCloud> = Vec::new();
    let mut ajouter = |fournisseur: &'static str, p: PathBuf| {
        let chemin = p.to_string_lossy().to_string();
        if p.is_dir() && !l.iter().any(|d| d.chemin.eq_ignore_ascii_case(&chemin)) {
            l.push(DossierCloud { fournisseur, chemin });
        }
    };
    // OneDrive déclare ses dossiers dans l'environnement (personnel et professionnel).
    for v in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
        if let Ok(p) = std::env::var(v) {
            ajouter("onedrive", PathBuf::from(p));
        }
    }
    // Google Drive pour ordinateur monte un lecteur (G: par défaut) contenant « Mon Drive ».
    for lettre in b'D'..=b'Z' {
        for nom in ["Mon Drive", "My Drive"] {
            ajouter("googledrive", PathBuf::from(format!("{}:\\{}", lettre as char, nom)));
        }
    }
    if let Ok(profil) = std::env::var("USERPROFILE") {
        ajouter("googledrive", Path::new(&profil).join("Google Drive"));
    }
    l
}

fn nom_valide(nom: &str) -> bool {
    let b = nom.as_bytes();
    nom.len() == 22
        && nom.starts_with("lignee-")
        && nom.ends_with(".json")
        && b[7..17].iter().enumerate().all(|(i, c)| if i == 4 || i == 7 { *c == b'-' } else { c.is_ascii_digit() })
}

fn sous_dossier(dossier: &str) -> Result<PathBuf, String> {
    let d = Path::new(dossier);
    if !d.is_absolute() || !d.is_dir() {
        return Err("Dossier cloud introuvable : vérifie que OneDrive ou Google Drive est installé et connecté.".into());
    }
    Ok(d.join(SOUS_DOSSIER))
}

fn lister(d: &Path) -> Vec<String> {
    let mut l: Vec<String> = fs::read_dir(d)
        .map(|it| it.filter_map(|e| e.ok()).map(|e| e.file_name().to_string_lossy().to_string()).filter(|n| nom_valide(n)).collect())
        .unwrap_or_default();
    l.sort();
    l.reverse();
    l
}

/** Écrit (ou remplace) la copie du jour, puis ne garde que les plus récentes. */
#[tauri::command]
pub fn ecrire_copie_cloud(dossier: String, nom: String, contenu: String) -> Result<(), String> {
    if !nom_valide(&nom) {
        return Err("nom de copie invalide".into());
    }
    let d = sous_dossier(&dossier)?;
    fs::create_dir_all(&d).map_err(|e| format!("Création du dossier impossible : {e}"))?;
    fs::write(d.join(&nom), contenu).map_err(|e| format!("Écriture impossible : {e}"))?;
    for vieux in lister(&d).into_iter().skip(GARDER) {
        let _ = fs::remove_file(d.join(vieux));
    }
    Ok(())
}

/** Copies présentes dans le cloud, de la plus récente à la plus ancienne. */
#[tauri::command]
pub fn lister_copies_cloud(dossier: String) -> Result<Vec<String>, String> {
    Ok(lister(&sous_dossier(&dossier)?))
}

#[tauri::command]
pub fn lire_copie_cloud(dossier: String, nom: String) -> Result<String, String> {
    if !nom_valide(&nom) {
        return Err("nom de copie invalide".into());
    }
    fs::read_to_string(sous_dossier(&dossier)?.join(nom)).map_err(|e| format!("Lecture impossible : {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn noms_acceptes() {
        assert!(nom_valide("lignee-2026-11-17.json"));
        assert!(!nom_valide("lignee-2026-11-17.json.exe"));
        assert!(!nom_valide("../lignee-2026-11-1.json"));
        assert!(!nom_valide("lignee-2026/11/17.json"));
    }

    #[test]
    fn ecrit_liste_et_purge() {
        let d = std::env::temp_dir().join(format!("lignee-test-cloud-{}", std::process::id()));
        fs::create_dir_all(&d).unwrap();
        let dossier = d.to_string_lossy().to_string();
        for j in 1..=31 {
            ecrire_copie_cloud(dossier.clone(), format!("lignee-2026-01-{j:02}.json"), "{}".into()).unwrap();
        }
        ecrire_copie_cloud(dossier.clone(), "lignee-2026-02-01.json".into(), "{\"a\":1}".into()).unwrap();
        let l = lister_copies_cloud(dossier.clone()).unwrap();
        assert_eq!(l.len(), GARDER);
        assert_eq!(l[0], "lignee-2026-02-01.json");
        assert_eq!(lire_copie_cloud(dossier.clone(), l[0].clone()).unwrap(), "{\"a\":1}");
        assert!(ecrire_copie_cloud(dossier.clone(), "autre.json".into(), "x".into()).is_err());
        assert!(ecrire_copie_cloud("relatif".into(), "lignee-2026-02-01.json".into(), "x".into()).is_err());
        fs::remove_dir_all(&d).unwrap();
    }
}
