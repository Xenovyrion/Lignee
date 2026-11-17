mod cloud;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![cloud::dossiers_cloud, cloud::ecrire_copie_cloud, cloud::lister_copies_cloud, cloud::lire_copie_cloud])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de Lignée");
}
