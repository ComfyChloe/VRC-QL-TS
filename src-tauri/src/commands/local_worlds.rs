use std::path::PathBuf;

#[derive(serde::Serialize)]
pub struct LocalWorld {
    pub name: String,
    pub path: String,
}

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
    let dir = worlds_dir().ok_or_else(|| "Could not resolve USERPROFILE".to_string())?;
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
