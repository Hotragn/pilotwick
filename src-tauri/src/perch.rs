//! Physical behaviour: perching on windows, and settling under gravity.
//!
//! This is what makes the companion feel like it lives *on* your desktop
//! rather than floating in a box above it. Two behaviours:
//!
//! * **Perch** — the pet sits on the title bar of whatever window you are
//!   working in and rides along as you switch apps. Desktop pets that walk on
//!   window edges (Shimeji and friends) have never been context-aware, and
//!   context-aware ones have never touched your windows; this is both.
//! * **Settle** — after you drop the pet it falls to the bottom of the
//!   monitor with a small bounce, instead of hanging wherever it was let go.
//!
//! Both run in Rust so they stay smooth: driving window moves from the
//! webview would mean an IPC round-trip per frame.

use active_win_pos_rs::get_active_window;
use std::sync::atomic::{AtomicBool, Ordering};
use std::{thread, time::Duration};
use tauri::{AppHandle, Manager, PhysicalPosition};

use crate::tracker;

static PERCH: AtomicBool = AtomicBool::new(false);

/// How often to re-read the focused window while perching. Fast enough to
/// follow an app switch without being felt, slow enough to stay cheap.
const POLL_MS: u64 = 150;
/// Ignore sub-pixel jitter so we don't fight the window manager.
const MIN_DELTA: i32 = 2;
/// How far the pet's feet overlap the title bar, in physical pixels.
const SIT_DEPTH: i32 = 22;
/// Gap from the window's right edge, so the pet clears the close button.
const RIGHT_INSET: i32 = 180;

pub fn set_perch(on: bool) {
    PERCH.store(on, Ordering::Relaxed);
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || loop {
        if PERCH.load(Ordering::Relaxed) {
            perch_once(&app);
        }
        thread::sleep(Duration::from_millis(POLL_MS));
    });
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

    // The pet is drawn near the bottom of a mostly-empty window, so line its
    // *feet* up with the title bar rather than the window's own bottom edge.
    let feet = (tracker::hit_box()[3] * size.height as f64).round() as i32;

    let mut x = (host.x + host.width) as i32 - RIGHT_INSET;
    let mut y = host.y as i32 + SIT_DEPTH - feet;

    // Clamp horizontally, and stop the pet dropping off the bottom — but let
    // the window overhang the top of the screen, since the part of it above
    // the pet is transparent anyway.
    if let Ok(Some(monitor)) = app.monitor_from_point(host.x + host.width / 2.0, host.y + 10.0) {
        let m_pos = monitor.position();
        let m_size = monitor.size();
        x = x.clamp(m_pos.x, m_pos.x + m_size.width as i32 - size.width as i32);
        y = y.min(m_pos.y + m_size.height as i32 - feet);
    }

    if (x - current.x).abs() >= MIN_DELTA || (y - current.y).abs() >= MIN_DELTA {
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
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

        // 24 frames of ease-out, then one bounce of a twelfth of the height.
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
