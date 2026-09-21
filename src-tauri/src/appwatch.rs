//! Active-application awareness.
//!
//! Polls the OS for the focused window (app name + title) and emits
//! `companion://active-app` whenever it changes. It also senses whether that
//! window is running *fullscreen* — the signal behind "get out of the way
//! during presentations, screen shares and games" — and emits
//! `companion://fullscreen`.
//!
//! The frontend's integration registry decides what the companion should feel
//! about any of it; Rust stays completely policy-free so new integrations
//! never require a recompile.

use active_win_pos_rs::get_active_window;
use serde::Serialize;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
struct ActiveApp {
    app: String,
    title: String,
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last_key = String::new();
        let mut last_fullscreen = false;
        loop {
            if let Ok(win) = get_active_window() {
                // Ignore focus landing on our own windows (e.g. the settings
                // studio) so the pet doesn't react to itself.
                if win.app_name != "Pilotwick" {
                    let key = format!("{}\u{1}{}", win.app_name, win.title);
                    if key != last_key {
                        last_key = key;
                        let _ = app.emit(
                            "companion://active-app",
                            ActiveApp {
                                app: win.app_name,
                                title: win.title,
                            },
                        );
                    }

                    let fullscreen = foreground_is_fullscreen(&app, &win.position);
                    if fullscreen != last_fullscreen {
                        last_fullscreen = fullscreen;
                        let _ = app.emit("companion://fullscreen", fullscreen);
                    }
                }
            }
            thread::sleep(Duration::from_millis(800));
        }
    });
}

/// True only for a genuinely immersive fullscreen window.
///
/// Size alone is not enough to decide this. A *maximized* window on Windows
/// deliberately overhangs the monitor by its border width — a maximized
/// browser here measures 2326x1558 against a 2304x1536 monitor, i.e. 101% —
/// so any "does it cover the screen?" test also fires every time the user
/// maximizes anything, and the companion vanishes during normal work. The
/// window style bits are what actually separate the two cases.
#[cfg(windows)]
fn foreground_is_fullscreen(_app: &AppHandle, _pos: &active_win_pos_rs::WindowPosition) -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::Graphics::Gdi::{
        GetMonitorInfoW, MonitorFromWindow, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowLongW, GetWindowRect, GWL_STYLE, WS_CAPTION,
        WS_MAXIMIZE,
    };

    /// The desktop and the taskbar are borderless and monitor-sized, so they
    /// pass every geometric fullscreen test. Without this, clicking your
    /// wallpaper makes the companion disappear.
    const SHELL_CLASSES: [&str; 4] = [
        "Progman",
        "WorkerW",
        "Shell_TrayWnd",
        "Shell_SecondaryTrayWnd",
    ];

    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd.is_invalid() {
            return false;
        }

        let mut class = [0u16; 128];
        let n = GetClassNameW(hwnd, &mut class);
        if n > 0 {
            let name = String::from_utf16_lossy(&class[..n as usize]);
            if SHELL_CLASSES.contains(&name.as_str()) {
                return false;
            }
        }

        // A maximized window, or one that still wears a title bar, is just a
        // big window — the user can still see the desktop edges and expects
        // the pet to stay put.
        let style = GetWindowLongW(hwnd, GWL_STYLE) as u32;
        if style & WS_MAXIMIZE.0 != 0 || style & WS_CAPTION.0 != 0 {
            return false;
        }

        let mut rect = RECT::default();
        if GetWindowRect(hwnd, &mut rect).is_err() {
            return false;
        }

        let monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        let mut info = MONITORINFO {
            cbSize: std::mem::size_of::<MONITORINFO>() as u32,
            ..Default::default()
        };
        if !GetMonitorInfoW(monitor, &mut info).as_bool() {
            return false;
        }

        let m = info.rcMonitor;
        rect.left <= m.left && rect.top <= m.top && rect.right >= m.right && rect.bottom >= m.bottom
    }
}

/// Elsewhere, fall back to comparing the window against its monitor. Without
/// the style bits this cannot tell a maximized window from a fullscreen one,
/// so it is deliberately strict: the window must cover the monitor exactly.
#[cfg(not(windows))]
fn foreground_is_fullscreen(app: &AppHandle, pos: &active_win_pos_rs::WindowPosition) -> bool {
    if pos.width <= 1.0 || pos.height <= 1.0 {
        return false;
    }
    let Ok(Some(monitor)) =
        app.monitor_from_point(pos.x + pos.width / 2.0, pos.y + pos.height / 2.0)
    else {
        return false;
    };
    let size = monitor.size();
    let origin = monitor.position();

    pos.x <= origin.x as f64
        && pos.y <= origin.y as f64
        && pos.width >= size.width as f64
        && pos.height >= size.height as f64
}
