use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct LocalWorld {
    pub name: String,
    pub path: String,
}

#[cfg(target_os = "windows")]
fn worlds_dir() -> Option<PathBuf> {
    let base = std::env::var("USERPROFILE").ok()?;
    Some(
        PathBuf::from(base)
            .join("AppData")
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat")
            .join("Worlds"),
    )
}

#[cfg(target_os = "linux")]
fn worlds_dir() -> Option<PathBuf> {
    // Under Proton, VRChat data lives inside the compatdata prefix:
    // <steam_root>/steamapps/compatdata/438100/pfx/drive_c/users/steamuser/AppData/LocalLow/VRChat/VRChat/Worlds
    let home = std::env::var("HOME").ok()?;
    let home_path = PathBuf::from(&home);
    let steam_roots = [
        home_path.join(".steam/steam"),
        home_path.join(".local/share/Steam"),
        home_path.join("snap/steam/common/.local/share/Steam"),
    ];
    for root in &steam_roots {
        let worlds = root
            .join("steamapps")
            .join("compatdata")
            .join("438100")
            .join("pfx")
            .join("drive_c")
            .join("users")
            .join("steamuser")
            .join("AppData")
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat")
            .join("Worlds");
        if worlds.is_dir() {
            return Some(worlds);
        }
    }
    None
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn worlds_dir() -> Option<PathBuf> {
    None
}

fn display_name(filename: &str) -> String {
    let without_ext = filename.strip_suffix(".vrcw").unwrap_or(filename);
    // Strip "scene-StandaloneWindows64-" prefix if present
    without_ext
        .strip_prefix("scene-StandaloneWindows64-")
        .unwrap_or(without_ext)
        .to_string()
}

#[tauri::command]
pub fn list_local_worlds() -> Result<Vec<LocalWorld>, String> {
    let dir = worlds_dir().ok_or_else(|| "Could not find VRChat worlds directory".to_string())?;
    if !dir.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read worlds directory: {e}"))?;
    let mut worlds: Vec<LocalWorld> = entries
        .filter_map(|e| {
            let entry = e.ok()?;
            let file_name = entry.file_name();
            let name_str = file_name.to_string_lossy();
            if !name_str.ends_with(".vrcw") {
                return None;
            }
            Some(LocalWorld {
                name: display_name(&name_str),
                path: entry.path().to_string_lossy().into_owned(),
            })
        })
        .collect();
    worlds.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(worlds)
}
