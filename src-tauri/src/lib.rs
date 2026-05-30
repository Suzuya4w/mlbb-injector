mod adb_wrapper;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            adb_wrapper::get_devices,
            adb_wrapper::push_file,
            adb_wrapper::scan_local_mods,
            adb_wrapper::inject_auto_patch,
            adb_wrapper::inject_zip_script,
            adb_wrapper::download_and_inject_url,
            adb_wrapper::pull_asset,
            adb_wrapper::scan_local_folder,
            adb_wrapper::load_presets,
            adb_wrapper::save_preset,
            adb_wrapper::delete_preset,
            adb_wrapper::export_presets,
            adb_wrapper::import_presets
        ]);

    let app = builder.build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        match event {
            tauri::RunEvent::Exit => {
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    let _ = std::process::Command::new("taskkill")
                        .args(["/f", "/im", "adb.exe"])
                        .creation_flags(0x08000000) // CREATE_NO_WINDOW
                        .output();
                }
            }
            _ => {}
        }
    });
}
