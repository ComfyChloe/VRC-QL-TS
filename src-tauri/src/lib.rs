mod commands;

use commands::launch::launch_instance;
use commands::local_worlds::list_local_worlds;
use commands::recent_locations::get_recent_locations;
use commands::window_tile::tile_vrchat_windows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![launch_instance, list_local_worlds, get_recent_locations, tile_vrchat_windows])
        .run(tauri::generate_context!())
        .expect("error while running VRC Launcher");
}
