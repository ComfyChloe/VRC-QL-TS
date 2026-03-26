/// Finds all visible VRChat windows and tiles them in a grid layout
/// across the primary monitor using the specified column count.
/// On non-Windows platforms this is a no-op.
#[tauri::command]
pub fn tile_vrchat_windows(columns: u32) -> Result<(), String> {
    #[cfg(windows)]
    {
        use windows::Win32::Foundation::{BOOL, HWND, LPARAM};
        use windows::Win32::UI::WindowsAndMessaging::{
            EnumWindows, GetSystemMetrics, GetWindowTextLengthW, GetWindowTextW,
            IsWindowVisible, SetWindowPos, SM_CXSCREEN, SM_CYSCREEN, SWP_NOZORDER,
        };

        struct State {
            handles: Vec<HWND>,
        }

        unsafe extern "system" fn callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            if IsWindowVisible(hwnd).as_bool() {
                let len = GetWindowTextLengthW(hwnd);
                if len > 0 {
                    let mut buf = vec![0u16; (len + 1) as usize];
                    GetWindowTextW(hwnd, &mut buf);
                    let title = String::from_utf16_lossy(&buf[..len as usize]);
                    if title.contains("VRChat") {
                        let state = &mut *(lparam.0 as *mut State);
                        state.handles.push(hwnd);
                    }
                }
            }
            BOOL::from(true)
        }

        let mut state = State { handles: Vec::new() };
        unsafe {
            let _ = EnumWindows(
                Some(callback),
                LPARAM(&mut state as *mut _ as isize),
            );
        }

        if state.handles.is_empty() {
            return Ok(());
        }

        let cols = (columns as usize).max(1);
        let rows = (state.handles.len() + cols - 1) / cols;

        let screen_w = unsafe { GetSystemMetrics(SM_CXSCREEN) };
        let screen_h = unsafe { GetSystemMetrics(SM_CYSCREEN) };
        let win_w = screen_w / cols as i32;
        let win_h = screen_h / rows as i32;

        for (i, hwnd) in state.handles.iter().enumerate() {
            let col = (i % cols) as i32;
            let row = (i / cols) as i32;
            unsafe {
                let _ = SetWindowPos(
                    *hwnd,
                    HWND::default(),
                    col * win_w,
                    row * win_h,
                    win_w,
                    win_h,
                    SWP_NOZORDER,
                );
            }
        }

        Ok(())
    }

    #[cfg(not(windows))]
    {
        let _ = columns;
        Ok(())
    }
}
