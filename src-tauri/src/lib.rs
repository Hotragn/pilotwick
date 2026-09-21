mod appwatch;
mod gitwatch;
mod perch;
mod tracker;
mod workwatch;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    LogicalPosition, LogicalSize, Manager,
};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// The overlay window's design size at 100 % pet scale.
const BASE_W: f64 = 240.0;
const BASE_H: f64 = 320.0;

/// Shows (or re-focuses) the "Companion Studio" settings window.
///
/// The window is declared in `tauri.conf.json` and created hidden at startup
/// rather than built on demand. Building a WebView2 window lazily from a
/// command was flaky on Windows: roughly half the time the shell came back
/// minimized at -32000,-32000 with its page stuck on `about:blank` and
/// unresponsive even to a debugger, which is what made the Studio "not
/// load". Windows declared in the config are created by Tauri on the main
/// thread during startup, which is reliable — and the Studio now opens
/// instantly instead of cold-starting a webview.
#[tauri::command]
fn open_settings(app: tauri::AppHandle) {
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        let Some(win) = handle.get_webview_window("settings") else {
            eprintln!("[pilotwick] settings window missing from the app config");
            return;
        };
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    });
}

/// Points the git watcher at a repository (or clears it with None).
#[tauri::command]
fn set_git_repo(path: Option<String>) {
    gitwatch::set_repo(path);
}

/// Turns window-perching on or off.
#[tauri::command]
fn set_perch(enabled: bool) {
    perch::set_perch(enabled);
}

/// Drops the pet to the floor of its monitor with a small bounce.
#[tauri::command]
fn settle_overlay(app: tauri::AppHandle) {
    perch::settle(app);
}

/// Turns the CI / review / uncommitted-work watcher on or off.
#[tauri::command]
fn set_work_watch(enabled: bool) {
    workwatch::set_enabled(enabled);
}

/// Lets the frontend force interactivity on regardless of hover — used while
/// the quick-action dock is open, so a fast mouse can't "escape" the hit box
/// mid-gesture. The cursor loop owns the actual OS flag and converges within
/// one frame; setting it here too would leave the loop's cached state stale
/// and strand the pet as click-through.
#[tauri::command]
fn set_interactive(interactive: bool) {
    tracker::set_forced_interactive(interactive);
}

/// Narrows the clickable area to the pet itself instead of the whole
/// transparent window. Values are fractions (0..1) of the window box, so the
/// frontend can report them straight from a `getBoundingClientRect`.
#[tauri::command]
fn set_hit_box(left: f64, top: f64, right: f64, bottom: f64) {
    tracker::set_hit_box(left, top, right, bottom);
}

/// Shows or hides the pet without quitting it.
#[tauri::command]
fn set_overlay_visible(app: tauri::AppHandle, visible: bool) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = if visible { win.show() } else { win.hide() };
    }
}

/// Flips the pet's visibility and reports the new state.
#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) -> bool {
    match app.get_webview_window("main") {
        Some(win) => {
            let showing = win.is_visible().unwrap_or(true);
            let _ = if showing { win.hide() } else { win.show() };
            !showing
        }
        None => false,
    }
}

/// Teleports the pet next to the cursor (and un-hides it if needed) — the
/// fastest way to find your companion on a multi-monitor desk.
#[tauri::command]
fn summon_to_cursor(app: tauri::AppHandle) {
    let (Some(win), Ok(cursor)) = (app.get_webview_window("main"), app.cursor_position()) else {
        return;
    };
    let scale = win.scale_factor().unwrap_or(1.0);
    let size = win
        .outer_size()
        .map(|s| s.to_logical::<f64>(scale))
        .unwrap_or(LogicalSize::new(BASE_W, BASE_H));

    // Drop it just below-right of the cursor, clamped to the cursor's monitor.
    let mut x = cursor.x / scale + 24.0;
    let mut y = cursor.y / scale + 24.0;
    if let Ok(Some(monitor)) = app.monitor_from_point(cursor.x, cursor.y) {
        let m_pos = monitor.position().to_logical::<f64>(scale);
        let m_size = monitor.size().to_logical::<f64>(scale);
        x = x.clamp(m_pos.x, m_pos.x + m_size.width - size.width);
        y = y.clamp(m_pos.y, m_pos.y + m_size.height - size.height);
    }

    let _ = win.set_position(LogicalPosition::new(x, y));
    let _ = win.show();
}

/// Resizes the overlay so the pet can be made bigger or smaller (0.6–2.0).
#[tauri::command]
fn set_overlay_scale(app: tauri::AppHandle, scale: f64) {
    if let Some(win) = app.get_webview_window("main") {
        let s = scale.clamp(0.6, 2.0);
        let _ = win.set_size(LogicalSize::new(BASE_W * s, BASE_H * s));
    }
}

/// (Re)binds the global hotkeys. Empty strings unbind. Accepts the standard
/// accelerator syntax, e.g. "CommandOrControl+Shift+E".
#[tauri::command]
fn apply_hotkeys(app: tauri::AppHandle, toggle: String, summon: String) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();

    let bind = |accel: &str, action: fn(tauri::AppHandle)| -> Result<(), String> {
        if accel.trim().is_empty() {
            return Ok(());
        }
        shortcuts
            .on_shortcut(accel, move |app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    action(app.clone());
                }
            })
            .map_err(|e| format!("{accel}: {e}"))
    };

    bind(&toggle, |app| {
        toggle_overlay(app);
    })?;
    bind(&summon, summon_to_cursor)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            open_settings,
            set_interactive,
            set_hit_box,
            set_git_repo,
            set_overlay_visible,
            toggle_overlay,
            summon_to_cursor,
            set_overlay_scale,
            set_perch,
            settle_overlay,
            set_work_watch,
            apply_hotkeys
        ])
        .setup(|app| {
            // The Studio is created hidden at startup and reused, so closing
            // it must hide the window rather than destroy it — otherwise the
            // next "open" would find nothing to show.
            if let Some(settings) = app.get_webview_window("settings") {
                let win = settings.clone();
                settings.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win.hide();
                    }
                });
            }

            // Background watchers: cursor + click-through, keyboard pulse,
            // active app (+ fullscreen sensing), git repo.
            tracker::spawn(app.handle().clone());
            appwatch::spawn(app.handle().clone());
            gitwatch::spawn(app.handle().clone());
            perch::spawn(app.handle().clone());
            workwatch::spawn(app.handle().clone());

            // System tray: the only reliable escape hatch for a click-through overlay.
            let show_item =
                MenuItem::with_id(app, "toggle", "Show / hide companion", true, None::<&str>)?;
            let summon_item =
                MenuItem::with_id(app, "summon", "Summon to cursor", true, None::<&str>)?;
            let settings_item =
                MenuItem::with_id(app, "settings", "Companion Studio…", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Pilotwick", true, None::<&str>)?;
            let menu =
                Menu::with_items(app, &[&show_item, &summon_item, &settings_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Pilotwick — your desktop companion")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => {
                        toggle_overlay(app.clone());
                    }
                    "summon" => summon_to_cursor(app.clone()),
                    "settings" => open_settings(app.clone()),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Pilotwick");
}
