//! Global input awareness.
//!
//! Two background threads:
//! 1. Cursor loop (~30 Hz): reads the global cursor position, toggles
//!    click-through so the pet is only interactive while hovered, and emits
//!    `companion://cursor` for eye tracking.
//! 2. Keyboard loop: listens for global key-down events via `rdev` and emits
//!    a bare `companion://keyboard` pulse. Privacy note: we intentionally
//!    never read or forward WHICH key was pressed — only that typing happened.

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter, Manager};

/// Extra grab area around the hit box so the pet stays interactive while the
/// cursor sits right on its edge.
const HOVER_PADDING: f64 = 4.0;

static FORCE_INTERACTIVE: AtomicBool = AtomicBool::new(false);

/// The clickable sub-rectangle of the overlay window, as fractions of the
/// window box (left, top, right, bottom). The window is mostly empty
/// transparent space, so clicking should only be captured over the pet
/// itself — the frontend reports where that is.
static HIT_BOX: Mutex<[f64; 4]> = Mutex::new([0.0, 0.0, 1.0, 1.0]);

pub fn set_forced_interactive(on: bool) {
    FORCE_INTERACTIVE.store(on, Ordering::Relaxed);
}

/// The current clickable rect, as fractions of the window box. Perching
/// needs it too: the pet is drawn near the bottom of a mostly-transparent
/// window, so "where are its feet" is not the window's bottom edge.
pub fn hit_box() -> [f64; 4] {
    HIT_BOX.lock().map(|b| *b).unwrap_or([0.0, 0.0, 1.0, 1.0])
}

pub fn set_hit_box(left: f64, top: f64, right: f64, bottom: f64) {
    if let Ok(mut b) = HIT_BOX.lock() {
        // Guard against a degenerate rect making the pet unclickable.
        if right > left && bottom > top {
            *b = [
                left.clamp(0.0, 1.0),
                top.clamp(0.0, 1.0),
                right.clamp(0.0, 1.0),
                bottom.clamp(0.0, 1.0),
            ];
        }
    }
}

#[derive(Clone, Serialize)]
struct CursorPayload {
    /// Global cursor position (physical pixels).
    x: f64,
    y: f64,
    /// Companion window origin + size, so the frontend can compute gaze.
    wx: f64,
    wy: f64,
    ww: f64,
    wh: f64,
    hovering: bool,
}

pub fn spawn(app: AppHandle) {
    spawn_cursor_loop(app.clone());
    spawn_keyboard_loop(app);
}

fn spawn_cursor_loop(app: AppHandle) {
    thread::spawn(move || {
        // Start interactive so the very first hover state change is applied.
        let mut interactive = true;
        loop {
            if let (Ok(cursor), Some(win)) =
                (app.cursor_position(), app.get_webview_window("main"))
            {
                if let (Ok(pos), Ok(size)) = (win.outer_position(), win.outer_size()) {
                    let (wx, wy) = (pos.x as f64, pos.y as f64);
                    let (ww, wh) = (size.width as f64, size.height as f64);

                    let [bl, bt, br, bb] = HIT_BOX.lock().map(|b| *b).unwrap_or([0.0, 0.0, 1.0, 1.0]);
                    let (hx, hy) = (wx + ww * bl, wy + wh * bt);
                    let (hw, hh) = (ww * (br - bl), wh * (bb - bt));

                    let hovering = cursor.x >= hx - HOVER_PADDING
                        && cursor.x <= hx + hw + HOVER_PADDING
                        && cursor.y >= hy - HOVER_PADDING
                        && cursor.y <= hy + hh + HOVER_PADDING;

                    let want_interactive =
                        hovering || FORCE_INTERACTIVE.load(Ordering::Relaxed);

                    // Only touch the OS window flag on transitions.
                    if want_interactive != interactive {
                        interactive = want_interactive;
                        let _ = win.set_ignore_cursor_events(!interactive);
                    }

                    let _ = app.emit(
                        "companion://cursor",
                        CursorPayload {
                            x: cursor.x,
                            y: cursor.y,
                            wx,
                            wy,
                            ww,
                            wh,
                            hovering,
                        },
                    );
                }
            }
            thread::sleep(Duration::from_millis(33));
        }
    });
}

fn spawn_keyboard_loop(app: AppHandle) {
    thread::spawn(move || {
        // Throttle wheel events so fast scrolling doesn't flood the frontend.
        let mut last_scroll = std::time::Instant::now() - Duration::from_secs(1);
        let result = rdev::listen(move |event| match event.event_type {
            rdev::EventType::KeyPress(_) => {
                let _ = app.emit("companion://keyboard", ());
            }
            rdev::EventType::Wheel { .. } => {
                if last_scroll.elapsed() >= Duration::from_millis(300) {
                    last_scroll = std::time::Instant::now();
                    let _ = app.emit("companion://scroll", ());
                }
            }
            _ => {}
        });
        if let Err(err) = result {
            // macOS: requires Accessibility permission; Linux/Wayland: may be
            // unavailable. The companion degrades gracefully (no typing state).
            eprintln!("[pilotwick] global keyboard listener unavailable: {err:?}");
        }
    });
}
