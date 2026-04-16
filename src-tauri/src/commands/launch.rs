#[cfg(target_os = "windows")]
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
use std::thread::sleep;
use std::time::{Duration, Instant};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(target_os = "linux")]
use super::proton;

#[tauri::command]
pub fn launch_instance(
    exe_path: String,
    args: Vec<String>,
    wait_for_vrchat: Option<bool>,
) -> Result<u32, String> {
    let should_wait = wait_for_vrchat.unwrap_or(false);
    let process_count_before = if should_wait {
        Some(count_vrchat_processes()?)
    } else {
        None
    };
    let child = spawn_vrchat(&exe_path, &args)?;
    if let Some(existing_count) = process_count_before {
        wait_for_vrchat_process(existing_count, Duration::from_secs(90))?;
    }
    Ok(child)
}

// ── Platform-specific spawn ─────────────────────────────────────────

#[cfg(target_os = "windows")]
fn spawn_vrchat(exe_path: &str, args: &[String]) -> Result<u32, String> {
    let launch_path = resolve_launch_path(exe_path);
    let child = Command::new(&launch_path)
        .args(args)
        .current_dir(
            launch_path
                .parent()
                .unwrap_or_else(|| Path::new(".")),
        )
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("Failed to launch '{}': {}", launch_path.display(), e))?;
    Ok(child.id())
}

#[cfg(target_os = "linux")]
fn spawn_vrchat(exe_path: &str, args: &[String]) -> Result<u32, String> {
    let exe = PathBuf::from(exe_path);
    let steam_root = proton::find_steam_root(&exe).ok_or_else(|| {
        "Could not find Steam installation. Make sure VRChat.exe is inside a Steam library folder.".to_string()
    })?;
    let mut cmd = proton::build_proton_command(&exe, args, &steam_root)?;
    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to launch VRChat through Proton: {}", e))?;
    Ok(child.id())
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
fn spawn_vrchat(exe_path: &str, args: &[String]) -> Result<u32, String> {
    let launch_path = PathBuf::from(exe_path);
    let child = Command::new(&launch_path)
        .args(args)
        .current_dir(
            launch_path
                .parent()
                .unwrap_or_else(|| Path::new(".")),
        )
        .spawn()
        .map_err(|e| format!("Failed to launch '{}': {}", launch_path.display(), e))?;
    Ok(child.id())
}

#[cfg(target_os = "windows")]
fn resolve_launch_path(exe_path: &str) -> PathBuf {
    let selected_path = PathBuf::from(exe_path);
    if is_launch_exe(&selected_path) {
        return selected_path;
    }

    if let Some(parent) = selected_path.parent() {
        let sibling_launch = parent.join("launch.exe");
        if sibling_launch.is_file() {
            return sibling_launch;
        }
    }

    selected_path
}

#[cfg(not(target_os = "windows"))]
#[cfg(not(target_os = "linux"))]
fn resolve_launch_path(exe_path: &str) -> PathBuf {
    PathBuf::from(exe_path)
}

#[cfg(target_os = "windows")]
fn count_vrchat_processes() -> Result<usize, String> {
    let output = Command::new("tasklist")
        .args(["/FI", "IMAGENAME eq VRChat.exe", "/FO", "CSV", "/NH"])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Failed to query running VRChat processes: {}", e))?;

    if !output.status.success() {
        return Err("Failed to query running VRChat processes via tasklist".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout
        .lines()
        .filter(|line| line.trim_start().starts_with("\"VRChat.exe\""))
        .count())
}

#[cfg(not(target_os = "windows"))]
fn count_vrchat_processes() -> Result<usize, String> {
    // Under Proton/Wine, the process name is "VRChat.exe"
    let output = Command::new("pgrep")
        .args(["-f", "VRChat.exe"])
        .output()
        .map_err(|e| format!("Failed to query running VRChat processes: {}", e))?;
    // pgrep exits 1 when no processes match — that's not an error
    if !output.status.success() {
        return Ok(0);
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.lines().filter(|l| !l.trim().is_empty()).count())
}

#[cfg(target_os = "windows")]
fn wait_for_vrchat_process(existing_count: usize, timeout: Duration) -> Result<(), String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if count_vrchat_processes()? > existing_count {
            return Ok(());
        }
        sleep(Duration::from_millis(500));
    }
    Err("Timed out waiting for VRChat to start after launcher handoff".to_string())
}

#[cfg(not(target_os = "windows"))]
fn wait_for_vrchat_process(existing_count: usize, timeout: Duration) -> Result<(), String> {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if count_vrchat_processes()? > existing_count {
            return Ok(());
        }
        sleep(Duration::from_millis(500));
    }
    Err("Timed out waiting for VRChat to start through Proton".to_string())
}

#[cfg(target_os = "windows")]
fn is_launch_exe(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.eq_ignore_ascii_case("launch.exe"))
        .unwrap_or(false)
}
