//! Ambient work status — the companion as a peripheral monitor.
//!
//! Reacting to "your AI is thinking" is table stakes now; several tools ship
//! it. What nobody does is tell you, without alt-tabbing, that CI just went
//! red, that a teammate is waiting on your review, or that you have a pile of
//! uncommitted work. That is the thing worth glancing at a pet for.
//!
//! Everything here is opt-in and read-only: it shells out to the `git` and
//! `gh` binaries the user already has, and emits `companion://work`. As with
//! every other watcher, Rust reports facts and the frontend decides how the
//! pet should feel about them.

use serde::Serialize;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::{thread, time::Duration};
use tauri::{AppHandle, Emitter};

use crate::gitwatch;

static ENABLED: AtomicBool = AtomicBool::new(false);

/// Local checks are cheap; the network ones are not.
const LOCAL_EVERY: Duration = Duration::from_secs(20);
const REMOTE_EVERY_TICKS: u32 = 5; // → every ~100 s

pub fn set_enabled(on: bool) {
    ENABLED.store(on, Ordering::Relaxed);
}

#[derive(Clone, Serialize)]
pub struct WorkEvent {
    /// "ci" | "review" | "dirty"
    pub kind: String,
    /// "running" | "passed" | "failed" | "none"
    pub status: String,
    /// Human-readable detail for the speech bubble.
    pub detail: String,
    /// Count, where one applies (open reviews, changed files).
    pub count: u32,
}

/// Runs a command without flashing a console window on Windows.
fn run(program: &str, args: &[&str], cwd: &std::path::Path) -> Option<String> {
    let mut cmd = Command::new(program);
    cmd.args(args).current_dir(cwd);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let out = cmd.output().ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).into_owned())
}

/// Pulls a string field out of flat JSON without a parser dependency.
fn field<'a>(json: &'a str, key: &str) -> Option<&'a str> {
    let needle = format!("\"{key}\":\"");
    let start = json.find(&needle)? + needle.len();
    let rest = &json[start..];
    let end = rest.find('"')?;
    Some(&rest[..end])
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut tick: u32 = 0;
        let mut last_ci = String::new();
        let mut last_reviews = u32::MAX;
        let mut last_dirty = u32::MAX;

        loop {
            thread::sleep(LOCAL_EVERY);
            if !ENABLED.load(Ordering::Relaxed) {
                last_ci.clear();
                last_reviews = u32::MAX;
                last_dirty = u32::MAX;
                continue;
            }
            let Some(repo) = gitwatch::repo() else {
                continue;
            };
            tick = tick.wrapping_add(1);

            // ── Uncommitted work ───────────────────────────────────────
            if let Some(out) = run("git", &["status", "--porcelain"], &repo) {
                let dirty = out.lines().filter(|l| !l.trim().is_empty()).count() as u32;
                if dirty != last_dirty {
                    last_dirty = dirty;
                    let _ = app.emit(
                        "companion://work",
                        WorkEvent {
                            kind: "dirty".into(),
                            status: if dirty == 0 { "none" } else { "changed" }.into(),
                            detail: String::new(),
                            count: dirty,
                        },
                    );
                }
            }

            if tick % REMOTE_EVERY_TICKS != 0 {
                continue;
            }

            // ── CI on the current branch ───────────────────────────────
            if let Some(out) = run(
                "gh",
                &[
                    "run",
                    "list",
                    "--limit",
                    "1",
                    "--json",
                    "status,conclusion,headBranch,displayTitle",
                ],
                &repo,
            ) {
                let status = field(&out, "status").unwrap_or("");
                let conclusion = field(&out, "conclusion").unwrap_or("");
                let branch = field(&out, "headBranch").unwrap_or("").to_string();

                // `status` is queued/in_progress/completed; the verdict only
                // exists once it has completed.
                let state = match (status, conclusion) {
                    ("completed", "success") => "passed",
                    ("completed", "failure" | "timed_out" | "startup_failure") => "failed",
                    ("completed", _) => "none",
                    ("", _) => "none",
                    _ => "running",
                };

                let key = format!("{state}:{branch}");
                if state != "none" && key != last_ci {
                    last_ci = key;
                    let _ = app.emit(
                        "companion://work",
                        WorkEvent {
                            kind: "ci".into(),
                            status: state.into(),
                            detail: branch,
                            count: 0,
                        },
                    );
                }
            }

            // ── Reviews waiting on you ─────────────────────────────────
            if let Some(out) = run(
                "gh",
                &[
                    "search",
                    "prs",
                    "--review-requested=@me",
                    "--state=open",
                    "--limit",
                    "20",
                    "--json",
                    "number",
                ],
                &repo,
            ) {
                let reviews = out.matches("\"number\"").count() as u32;
                if reviews != last_reviews {
                    last_reviews = reviews;
                    let _ = app.emit(
                        "companion://work",
                        WorkEvent {
                            kind: "review".into(),
                            status: if reviews == 0 { "none" } else { "waiting" }.into(),
                            detail: String::new(),
                            count: reviews,
                        },
                    );
                }
            }
        }
    });
}
