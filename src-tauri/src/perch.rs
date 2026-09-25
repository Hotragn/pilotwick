//! Where the companion lives on screen.
//!
//! Three placements, because "a small creature on your desktop" means
//! different things to different people:
//!
//! * **Free** — you put it somewhere and it stays there.
//! * **Perch** — it sits on the title bar of whatever window you are working
//!   in and rides along as you switch apps. Desktop pets that walk on window
//!   edges have never been context-aware, and context-aware ones have never
//!   touched your windows; this is both.
//! * **Follow** — it trots after your cursor and settles next to it, the way
//!   an assistant used to hover. It only moves once you have actually walked
//!   away from it, so it is company rather than a chase.
//!
//! Plus **settle**: after you drop the pet it falls to the floor with a small
//! bounce instead of hanging wherever it was let go.
//!
//! All of it runs in Rust so it stays smooth — driving window moves from the
//! webview would cost an IPC round-trip per frame.

use active_win_pos_rs::get_active_window;
use std::sync::atomic::{AtomicBool, AtomicU8, Ordering};
use std::{thread, time::Duration};
use tauri::{AppHandle, Manager, PhysicalPosition};

use crate::tracker;

pub const FREE: u8 = 0;
pub const PERCH: u8 = 1;
pub const FOLLOW: u8 = 2;

static MODE: AtomicU8 = AtomicU8::new(FREE);
/// Set while the user is dragging, so we never fight their hand.
static SUSPENDED: AtomicBool = AtomicBool::new(false);

/// Perch only needs to react to app switches; follow is animated.
const PERCH_POLL_MS: u64 = 150;
const FOLLOW_TICK_MS: u64 = 16;
/// Ignore sub-pixel jitter so we don't fight the window manager.
const MIN_DELTA: i32 = 2;
/// How far the pet's feet overlap the title bar, in physical pixels.
const SIT_DEPTH: i32 = 22;
/// Gap from the host window's right edge, clearing the close button.
const RIGHT_INSET: i32 = 180;

/// Follow behaviour: stay put until the cursor is this far away, then ease
/// over until this close. The gap between the two stops it oscillating.
const FOLLOW_WAKE_PX: f64 = 240.0;
const FOLLOW_REST_PX: f64 = 90.0;
/// Fraction of the remaining distance covered per frame.
const FOLLOW_EASE: f64 = 0.12;

pub fn set_mode(mode: u8) {
    MODE.store(mode, Ordering::Relaxed);
}

/// Called while the user drags the pet, so automatic placement backs off.
pub fn suspend(on: bool) {
    SUSPENDED.store(on, Ordering::Relaxed);
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut chasing = false;
        loop {
            let mode = MODE.load(Ordering::Relaxed);
            let busy = SUSPENDED.load(Ordering::Relaxed);
            match mode {
                PERCH if !busy => {
                    perch_once(&app);
                    thread::sleep(Duration::from_millis(PERCH_POLL_MS));
                }
                FOLLOW if !busy => {
                    chasing = follow_once(&app, chasing);
                    thread::sleep(Duration::from_millis(FOLLOW_TICK_MS));
                }
                _ => {
                    chasing = false;
                    thread::sleep(Duration::from_millis(PERCH_POLL_MS));
                }
            }
        }
    });
}

/// Where the pet's feet are, relative to its window top.
fn foot_offset(height: u32) -> i32 {
    (tracker::hit_box()[3] * height as f64).round() as i32
}

fn perch_once(app: &AppHandle) {
    let Ok(active) = get_active_window() else {
        return;
    };
    // Never perch on our own windows, or we would chase ourselves.
    if active.app_name == "Pilotwick" {
        return;
    }
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    let (Ok(size), Ok(current)) = (win.outer_size(), win.outer_position()) else {
        return;
    };

    let host = &active.position;
    if host.width <= 1.0 || host.height <= 1.0 {
        return;
    }

    // Line the pet's *feet* up with the title bar: it is drawn near the
    // bottom of a mostly-empty window, so the window top is meaningless.
    let feet = foot_offset(size.height);
    let mut x = (host.x + host.width) as i32 - RIGHT_INSET;
    let mut y = host.y as i32 + SIT_DEPTH - feet;

    if let Ok(Some(monitor)) = app.monitor_from_point(host.x + host.width / 2.0, host.y + 10.0) {
        let m_pos = monitor.position();
        let m_size = monitor.size();
        x = x.clamp(m_pos.x, m_pos.x + m_size.width as i32 - size.width as i32);
        // Let the window overhang the top — that part is transparent anyway.
        y = y.min(m_pos.y + m_size.height as i32 - feet);
    }

    if (x - current.x).abs() >= MIN_DELTA || (y - current.y).abs() >= MIN_DELTA {
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
}

/// Eases the pet toward the cursor. Returns whether it is still chasing, so
/// the caller can keep the hysteresis between wake and rest distances.
fn follow_once(app: &AppHandle, chasing: bool) -> bool {
    let (Some(win), Ok(cursor)) = (app.get_webview_window("main"), app.cursor_position()) else {
        return false;
    };
    let (Ok(size), Ok(current)) = (win.outer_size(), win.outer_position()) else {
        return false;
    };

    let feet = foot_offset(size.height);
    // Rest below-right of the cursor, where a pointer's own shape does not
    // already cover the screen.
    let mut target_x = cursor.x as i32 - size.width as i32 / 2 + 70;
    let mut target_y = cursor.y as i32 - feet + 64;

    if let Ok(Some(monitor)) = app.monitor_from_point(cursor.x, cursor.y) {
        let m_pos = monitor.position();
        let m_size = monitor.size();
        target_x = target_x.clamp(m_pos.x, m_pos.x + m_size.width as i32 - size.width as i32);
        target_y = target_y.clamp(m_pos.y - feet / 2, m_pos.y + m_size.height as i32 - feet);
    }

    let dx = (target_x - current.x) as f64;
    let dy = (target_y - current.y) as f64;
    let dist = dx.hypot(dy);

    // Sit still until you have genuinely moved away; once moving, keep going
    // until close. Without the two thresholds it twitches constantly.
    let active = if chasing {
        dist > FOLLOW_REST_PX
    } else {
        dist > FOLLOW_WAKE_PX
    };
    if !active {
        return false;
    }

    let nx = current.x + (dx * FOLLOW_EASE).round() as i32;
    let ny = current.y + (dy * FOLLOW_EASE).round() as i32;
    if (nx - current.x).abs() >= 1 || (ny - current.y).abs() >= 1 {
        let _ = win.set_position(PhysicalPosition::new(nx, ny));
    }
    true
}

/// Drops the pet to the floor of its monitor with a short ease-out and a
/// single small bounce. Runs on its own thread so the UI never blocks.
pub fn settle(app: AppHandle) {
    thread::spawn(move || {
        let Some(win) = app.get_webview_window("main") else {
            return;
        };
        let (Ok(size), Ok(start)) = (win.outer_size(), win.outer_position()) else {
            return;
        };
        let Ok(Some(monitor)) = app.monitor_from_point(
            start.x as f64 + size.width as f64 / 2.0,
            start.y as f64 + size.height as f64 / 2.0,
        ) else {
            return;
        };

        let work = monitor.size();
        let floor = monitor.position().y + work.height as i32 - size.height as i32;
        let drop = floor - start.y;
        if drop <= MIN_DELTA {
            return; // Already resting on (or below) the floor.
        }

        const FRAMES: i32 = 24;
        for f in 1..=FRAMES {
            let t = f as f64 / FRAMES as f64;
            let eased = 1.0 - (1.0 - t) * (1.0 - t);
            let y = start.y + (drop as f64 * eased).round() as i32;
            let _ = win.set_position(PhysicalPosition::new(start.x, y));
            thread::sleep(Duration::from_millis(12));
        }
        let bounce = (drop / 12).clamp(4, 26);
        for (offset, wait) in [(-bounce, 70), (0, 0)] {
            let _ = win.set_position(PhysicalPosition::new(start.x, floor + offset));
            thread::sleep(Duration::from_millis(wait));
        }
    });
}
