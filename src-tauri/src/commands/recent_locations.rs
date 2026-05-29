use std::path::PathBuf;

#[derive(serde::Serialize, Clone)]
pub struct RecentLocation {
    pub world_id: String,
    pub world_name: String,
    pub instance_id: String,
    pub instance_type: String,
    pub region: Option<String>,
    pub group_name: Option<String>,
    pub joined_at: String,
    pub raw_location: String,
}

// ── Path helpers ───────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn log_dir() -> Option<PathBuf> {
    let base = std::env::var("USERPROFILE").ok()?;
    Some(
        PathBuf::from(base)
            .join("AppData")
            .join("LocalLow")
            .join("VRChat")
            .join("VRChat"),
    )
}

#[cfg(target_os = "linux")]
fn log_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let home_path = PathBuf::from(&home);
    let steam_roots = [
        home_path.join(".steam/steam"),
        home_path.join(".local/share/Steam"),
        home_path.join("snap/steam/common/.local/share/Steam"),
    ];
    for root in &steam_roots {
        let dir = root
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
            .join("VRChat");
        if dir.is_dir() {
            return Some(dir);
        }
    }
    None
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn log_dir() -> Option<PathBuf> {
    None
}

#[cfg(target_os = "windows")]
fn vrcx_db_path() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    let path = PathBuf::from(appdata).join("VRCX").join("VRCX.sqlite3");
    if path.exists() { Some(path) } else { None }
}

#[cfg(not(target_os = "windows"))]
fn vrcx_db_path() -> Option<PathBuf> {
    None
}

// ── Instance string parser ─────────────────────────────────────────────────────

struct ParsedInstance {
    world_id: String,
    instance_id: String,
    instance_type: String,
    region: Option<String>,
    group_id: Option<String>,
}

fn parse_instance_str(raw: &str) -> Option<ParsedInstance> {
    let colon = raw.find(':')?;
    let world_id = raw[..colon].to_string();
    let rest = &raw[colon + 1..];
    let mut parts = rest.split('~');
    let instance_id = parts.next()?.to_string();
    let mut region: Option<String> = None;
    let mut group_id: Option<String> = None;
    let mut instance_type = "public".to_string();
    let mut has_request_invite = false;
    for part in parts {
        if let Some((key, val)) = parse_kv(part) {
            match key {
                "hidden" => instance_type = "friends+".to_string(),
                "friends" => instance_type = "friends".to_string(),
                "private" => instance_type = "invite".to_string(),
                "canRequestInvite" => has_request_invite = true,
                "group" => {
                    group_id = Some(val.to_string());
                    instance_type = "group".to_string();
                }
                "groupAccessType" => match val {
                    "public" => instance_type = "groupPublic".to_string(),
                    "plus" => instance_type = "group+".to_string(),
                    _ => {}
                },
                "region" => region = Some(val.to_string()),
                _ => {}
            }
        }
    }
    if has_request_invite && instance_type == "invite" {
        instance_type = "invite+".to_string();
    }
    Some(ParsedInstance { world_id, instance_id, instance_type, region, group_id })
}

fn parse_kv(part: &str) -> Option<(&str, &str)> {
    if let Some(open) = part.find('(') {
        let key = &part[..open];
        let val = part
            .get(open + 1..)
            .and_then(|s| s.strip_suffix(')'))
            .unwrap_or("");
        Some((key, val))
    } else {
        Some((part, ""))
    }
}

// ── Deduplication helper ───────────────────────────────────────────────────────

fn dedup_locations(mut locs: Vec<RecentLocation>, limit: usize) -> Vec<RecentLocation> {
    let mut seen = std::collections::HashSet::new();
    locs.retain(|loc| seen.insert(format!("{}:{}", loc.world_id, loc.instance_id)));
    locs.truncate(limit);
    locs
}

// ── VRCX SQLite source ─────────────────────────────────────────────────────────

fn query_vrcx(limit: usize) -> Option<Vec<RecentLocation>> {
    use rusqlite::{Connection, OpenFlags};
    let db_path = vrcx_db_path()?;
    let conn = Connection::open_with_flags(db_path, OpenFlags::SQLITE_OPEN_READ_ONLY).ok()?;
    let mut stmt = conn
        .prepare(
            "SELECT location, world_name, group_name, created_at \
             FROM gamelog_location \
             WHERE location LIKE 'wrld_%' \
             ORDER BY created_at DESC \
             LIMIT ?1",
        )
        .ok()?;
    let rows: Vec<RecentLocation> = stmt
        .query_map([limit * 4], |row| {
            let location: String = row.get(0)?;
            let world_name: String = row.get(1).unwrap_or_default();
            let group_name: Option<String> = row.get(2).unwrap_or(None);
            let joined_at: String = row.get(3).unwrap_or_default();
            Ok((location, world_name, group_name, joined_at))
        })
        .ok()?
        .filter_map(|r| r.ok())
        .filter_map(|(raw_location, world_name, group_name, joined_at)| {
            let parsed = parse_instance_str(&raw_location)?;
            // For group instances, prefer VRCX group_name over raw group_id
            let resolved_group_name = if parsed.instance_type.starts_with("group") {
                group_name
                    .filter(|n| !n.is_empty())
                    .or_else(|| parsed.group_id.clone())
            } else {
                None
            };
            Some(RecentLocation {
                world_id: parsed.world_id,
                world_name,
                instance_id: parsed.instance_id,
                instance_type: parsed.instance_type,
                region: parsed.region,
                group_name: resolved_group_name,
                joined_at,
                raw_location,
            })
        })
        .collect();
    if rows.is_empty() {
        return None;
    }
    Some(dedup_locations(rows, limit))
}

// ── VRChat log file source (fallback) ─────────────────────────────────────────

fn parse_logs(limit: usize) -> Vec<RecentLocation> {
    let Some(dir) = log_dir() else { return vec![] };
    if !dir.exists() { return vec![]; }
    // Collect log files, sort descending (newest first by filename timestamp)
    let mut log_files: Vec<PathBuf> = match std::fs::read_dir(&dir) {
        Ok(entries) => entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.file_name()
                    .and_then(|n| n.to_str())
                    .map(|n| n.starts_with("output_log_") && n.ends_with(".txt"))
                    .unwrap_or(false)
            })
            .collect(),
        Err(_) => return vec![],
    };
    log_files.sort_by(|a, b| a.cmp(b)); // oldest file first — reverse() at end gives newest-first globally
    let mut results: Vec<RecentLocation> = Vec::new();
    for file in log_files {
        if results.len() >= limit * 4 {
            break;
        }
        let Ok(contents) = std::fs::read_to_string(&file) else { continue };
        // Collect all join-related lines in order
        let mut pending_instance: Option<(String, ParsedInstance)> = None;
        for line in contents.lines() {
            let Some(data) = extract_log_data(line) else { continue };
            if data.starts_with("[Behaviour] Joining wrld_") {
                let raw = data.trim_start_matches("[Behaviour] Joining ").to_string();
                if let Some(parsed) = parse_instance_str(&raw) {
                    pending_instance = Some((raw, parsed));
                }
            } else if data.starts_with("[Behaviour] Joining or Creating Room: ") {
                let world_name = data
                    .trim_start_matches("[Behaviour] Joining or Creating Room: ")
                    .to_string();
                if let Some((raw_location, parsed)) = pending_instance.take() {
                    results.push(RecentLocation {
                        world_id: parsed.world_id,
                        world_name,
                        instance_id: parsed.instance_id,
                        instance_type: parsed.instance_type,
                        region: parsed.region,
                        group_name: parsed.group_id, // no name available from logs
                        joined_at: extract_timestamp(line).unwrap_or_default(),
                        raw_location,
                    });
                }
            }
        }
    }
    // Reverse so newest entries appear first (we read forward through files, newest file first)
    results.reverse();
    dedup_locations(results, limit)
}

/// Extract the data portion from a VRChat log line.
/// Format: `YYYY.MM.DD HH:MM:SS Type     -  <data>`
fn extract_log_data(line: &str) -> Option<&str> {
    // Find the " -  " separator that precedes the data payload
    line.find(" -  ").map(|pos| &line[pos + 4..])
}

fn extract_timestamp(line: &str) -> Option<String> {
    // First 19 chars are `YYYY.MM.DD HH:MM:SS`
    if line.len() >= 19 {
        Some(line[..19].replace('.', "-").replacen('-', ".", 1))
    } else {
        None
    }
}

// ── Tauri command ──────────────────────────────────────────────────────────────

#[tauri::command]
pub fn get_recent_locations() -> Result<Vec<RecentLocation>, String> {
    if let Some(locs) = query_vrcx(6) {
        if !locs.is_empty() {
            return Ok(locs);
        }
    }
    Ok(parse_logs(6))
}
