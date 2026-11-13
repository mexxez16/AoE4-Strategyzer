// AoE4 Strategyzer - Tauri Backend Library
// This file initializes the Tauri application with the filesystem plugin

use std::path::PathBuf;

fn civ_data_dir() -> PathBuf {
    if cfg!(debug_assertions) {
        // Dev: write into the source tree so authored content is part of the project
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("frontend")
            .join("civ-data")
    } else {
        // Release: persist to the user's data dir (XDG on Linux, APPDATA on Windows)
        let base = std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("APPDATA").map(PathBuf::from))
            .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".local/share")))
            .unwrap_or_else(|| PathBuf::from("."));
        base.join("aoe4-strategyzer").join("civ-data")
    }
}

#[tauri::command]
fn read_civ_data(file_name: String) -> Result<Option<String>, String> {
    let path = civ_data_dir().join(&file_name);
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read_to_string(&path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_civ_data(file_name: String, content: String) -> Result<(), String> {
    let dir = civ_data_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&file_name);
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_civ_data, write_civ_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
