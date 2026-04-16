/// Linux-only helpers for launching VRChat through Proton.
///
/// VRChat on Linux runs via Steam's Proton compatibility layer.
/// To support multi-instance launching (which `steam -applaunch` cannot do),
/// we invoke the Proton binary directly with the correct environment variables.
///
/// The required invocation looks like:
/// ```text
/// STEAM_COMPAT_CLIENT_INSTALL_PATH=<steam_root>
/// STEAM_COMPAT_DATA_PATH=<steam_root>/steamapps/compatdata/438100
/// <proton_binary> run <VRChat.exe> [args...]
/// ```
use std::path::{Path, PathBuf};
use std::process::Command;

const VRCHAT_APP_ID: &str = "438100";

/// Well-known Steam installation paths on Linux.
const KNOWN_STEAM_ROOTS: &[&str] = &[
    ".steam/steam",
    ".local/share/Steam",
    "snap/steam/common/.local/share/Steam",
];

// ── Steam root detection ────────────────────────────────────────────

/// Derive the Steam root by walking up from the VRChat.exe path.
///
/// A typical VRChat installation lives at:
///   `<steam_root>/steamapps/common/VRChat/VRChat.exe`
///
/// We look for the `steamapps` ancestor and take its parent as the root.
/// Falls back to well-known home-relative paths if the walk fails.
pub fn find_steam_root(exe_path: &Path) -> Option<PathBuf> {
    // Walk up looking for a directory named "steamapps"
    let mut current = exe_path.parent();
    while let Some(dir) = current {
        if dir.file_name().and_then(|n| n.to_str()) == Some("steamapps") {
            if let Some(steam_root) = dir.parent() {
                return Some(steam_root.to_path_buf());
            }
        }
        current = dir.parent();
    }
    // Fallback: check well-known locations under $HOME
    let home = std::env::var("HOME").ok()?;
    let home_path = PathBuf::from(&home);
    for relative in KNOWN_STEAM_ROOTS {
        let candidate = home_path.join(relative);
        if candidate.join("steamapps").is_dir() {
            return Some(candidate);
        }
    }
    None
}

// ── Proton binary detection ─────────────────────────────────────────

/// Find the Proton binary that should be used to launch VRChat.
///
/// Strategy:
/// 1. Parse `config/config.vdf` for the CompatToolMapping entry for app 438100
/// 2. Resolve the Proton name to a directory in `steamapps/common/` or
///    `compatibilitytools.d/`
/// 3. Fallback: look for `Proton - Experimental` or the highest-versioned
///    `Proton *` directory in `steamapps/common/`
pub fn find_proton_binary(steam_root: &Path) -> Result<PathBuf, String> {
    // Try reading the configured Proton from config.vdf
    if let Some(name) = read_compat_tool_name(steam_root) {
        if let Some(binary) = resolve_proton_by_name(steam_root, &name) {
            return Ok(binary);
        }
    }
    // Fallback: scan for any installed Proton
    find_any_proton(steam_root)
}

/// Returns the compatdata directory for VRChat (app 438100).
pub fn find_compat_data(steam_root: &Path) -> PathBuf {
    steam_root
        .join("steamapps")
        .join("compatdata")
        .join(VRCHAT_APP_ID)
}

/// Build a `Command` that runs VRChat.exe through Proton with all
/// required environment variables set.
pub fn build_proton_command(
    exe_path: &Path,
    args: &[String],
    steam_root: &Path,
) -> Result<Command, String> {
    let proton = find_proton_binary(steam_root)?;
    let compat_data = find_compat_data(steam_root);
    if !compat_data.exists() {
        return Err(format!(
            "VRChat compatdata not found at '{}'. Launch VRChat through Steam at least once first.",
            compat_data.display()
        ));
    }
    let mut cmd = Command::new(&proton);
    cmd.env("STEAM_COMPAT_CLIENT_INSTALL_PATH", steam_root)
        .env("STEAM_COMPAT_DATA_PATH", &compat_data)
        .arg("run")
        .arg(exe_path)
        .args(args);
    if let Some(parent) = exe_path.parent() {
        cmd.current_dir(parent);
    }
    Ok(cmd)
}

// ── Internal helpers ────────────────────────────────────────────────

/// Parse Steam's config.vdf to find which Proton is mapped to app 438100.
///
/// The relevant fragment looks like:
/// ```text
/// "CompatToolMapping"
/// {
///     "438100"
///     {
///         "name"		"proton_experimental"
///         "config"		""
///         "priority"		"250"
///     }
/// }
/// ```
///
/// This is a lightweight line-based parser — VDF is close to JSON but
/// different enough that we don't pull in a full parser.
fn read_compat_tool_name(steam_root: &Path) -> Option<String> {
    let config_path = steam_root.join("config").join("config.vdf");
    let content = std::fs::read_to_string(&config_path).ok()?;
    let mut in_compat_mapping = false;
    let mut in_app_block = false;
    let mut brace_depth: i32 = 0;
    for line in content.lines() {
        let trimmed = line.trim();
        if !in_compat_mapping {
            if trimmed.contains("\"CompatToolMapping\"") {
                in_compat_mapping = true;
                brace_depth = 0;
            }
            continue;
        }
        // Track braces inside CompatToolMapping
        if trimmed == "{" {
            brace_depth += 1;
            continue;
        }
        if trimmed == "}" {
            brace_depth -= 1;
            if brace_depth <= 0 {
                break; // Left CompatToolMapping
            }
            if in_app_block {
                break; // Left the app's block without finding name
            }
            continue;
        }
        if !in_app_block {
            // Look for "438100" key
            if trimmed.starts_with(&format!("\"{}\"", VRCHAT_APP_ID)) {
                in_app_block = true;
            }
            continue;
        }
        // Inside the 438100 block — look for "name" key
        if let Some(value) = extract_vdf_value(trimmed, "name") {
            return Some(value);
        }
    }
    None
}

/// Extract a simple VDF key-value: `"key"  "value"` → Some(value)
fn extract_vdf_value(line: &str, key: &str) -> Option<String> {
    let trimmed = line.trim();
    let expected_prefix = format!("\"{}\"", key);
    if !trimmed.starts_with(&expected_prefix) {
        return None;
    }
    // Find the value between the second pair of quotes
    let after_key = &trimmed[expected_prefix.len()..];
    let value_start = after_key.find('"')? + 1;
    let rest = &after_key[value_start..];
    let value_end = rest.find('"')?;
    Some(rest[..value_end].to_string())
}

/// Given a Proton internal name (e.g. "proton_experimental", "proton_9"),
/// find the actual `proton` binary.
fn resolve_proton_by_name(steam_root: &Path, name: &str) -> Option<PathBuf> {
    // Map common config names to directory names
    let dir_name = match name {
        "proton_experimental" => "Proton - Experimental".to_string(),
        n if n.starts_with("proton_") => {
            // "proton_9" → "Proton 9.0" (common pattern)
            let ver = n.strip_prefix("proton_")?;
            format!("Proton {}.0", ver)
        }
        other => other.to_string(),
    };
    // Check steamapps/common/ first (official Proton builds)
    let common_path = steam_root
        .join("steamapps")
        .join("common")
        .join(&dir_name)
        .join("proton");
    if common_path.is_file() {
        return Some(common_path);
    }
    // Check compatibilitytools.d/ (custom Proton builds like GE-Proton)
    let custom_path = steam_root
        .join("compatibilitytools.d")
        .join(&dir_name)
        .join("proton");
    if custom_path.is_file() {
        return Some(custom_path);
    }
    // Also check home-level compatibilitytools.d
    if let Ok(home) = std::env::var("HOME") {
        let home_custom = PathBuf::from(home)
            .join(".steam")
            .join("root")
            .join("compatibilitytools.d")
            .join(&dir_name)
            .join("proton");
        if home_custom.is_file() {
            return Some(home_custom);
        }
    }
    // Try using the raw name directly as directory name
    if dir_name != name {
        let raw_common = steam_root
            .join("steamapps")
            .join("common")
            .join(name)
            .join("proton");
        if raw_common.is_file() {
            return Some(raw_common);
        }
    }
    None
}

/// Fallback: scan `steamapps/common/` for any Proton installation.
/// Prefers "Proton - Experimental", then the highest version number.
fn find_any_proton(steam_root: &Path) -> Result<PathBuf, String> {
    let common_dir = steam_root.join("steamapps").join("common");
    let entries = std::fs::read_dir(&common_dir).map_err(|e| {
        format!(
            "Cannot scan for Proton in '{}': {}",
            common_dir.display(),
            e
        )
    })?;
    // Prefer Proton - Experimental
    let experimental = common_dir.join("Proton - Experimental").join("proton");
    if experimental.is_file() {
        return Ok(experimental);
    }
    // Collect all Proton directories and pick the highest version
    let mut candidates: Vec<PathBuf> = entries
        .filter_map(|e| {
            let entry = e.ok()?;
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if name_str.starts_with("Proton ") {
                let proton_bin = entry.path().join("proton");
                if proton_bin.is_file() {
                    return Some(proton_bin);
                }
            }
            None
        })
        .collect();
    candidates.sort_by(|a, b| b.cmp(a)); // Reverse sort — highest version first
    candidates.into_iter().next().ok_or_else(|| {
        "No Proton installation found. Install Proton through Steam (Settings → Compatibility) and try again.".to_string()
    })
}
