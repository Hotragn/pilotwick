//! Git awareness — the companion reacts to your repo.
//!
//! Watches a user-chosen repository by reading `.git` files directly (no git
//! binary, no shelling out): commits and branch switches come from HEAD,
//! merge conflicts from the presence of MERGE_HEAD. Emits `companion://git`
//! events; the frontend decides how the pet feels about them (spoiler: it
//! hisses at merge conflicts).

use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

static REPO: Mutex<Option<PathBuf>> = Mutex::new(None);

pub fn set_repo(path: Option<String>) {
    *REPO.lock().unwrap() = path.map(PathBuf::from);
}

/// The repository the user picked, shared with the work-status watcher so
/// there is only ever one answer to "which repo are we talking about".
pub fn repo() -> Option<PathBuf> {
    REPO.lock().ok()?.clone()
}

#[derive(Clone, Serialize)]
struct GitEvent {
    kind: String,   // "commit" | "branch" | "conflict" | "resolved"
    detail: String, // branch name
}

/// Current (branch, commit-hash) of the repo, if readable.
fn head_info(repo: &Path) -> Option<(String, String)> {
    let head = fs::read_to_string(repo.join(".git/HEAD")).ok()?;
    let head = head.trim();
    if let Some(r) = head.strip_prefix("ref: ") {
        let branch = r.rsplit('/').next().unwrap_or(r).to_string();
        let hash = fs::read_to_string(repo.join(".git").join(r))
            .ok()
            .map(|s| s.trim().to_string())
            .or_else(|| {
                // Refs may live in packed-refs instead of loose files.
                let packed = fs::read_to_string(repo.join(".git/packed-refs")).ok()?;
                packed
                    .lines()
                    .find(|l| l.trim_end().ends_with(r))
                    .and_then(|l| l.split(' ').next())
                    .map(str::to_string)
            })?;
        Some((branch, hash))
    } else {
        Some(("detached".to_string(), head.to_string()))
    }
}

pub fn spawn(app: AppHandle) {
    thread::spawn(move || {
        let mut last: Option<(String, String)> = None;
        let mut in_conflict = false;
        loop {
            let repo = REPO.lock().unwrap().clone();
            if let Some(repo) = repo {
                if let Some((branch, hash)) = head_info(&repo) {
                    if let Some((last_branch, last_hash)) = &last {
                        if *last_branch != branch {
                            let _ = app.emit(
                                "companion://git",
                                GitEvent {
                                    kind: "branch".into(),
                                    detail: branch.clone(),
                                },
                            );
                        } else if *last_hash != hash {
                            let _ = app.emit(
                                "companion://git",
                                GitEvent {
                                    kind: "commit".into(),
                                    detail: branch.clone(),
                                },
                            );
                        }
                    }
                    last = Some((branch, hash));
                }

                let conflict = repo.join(".git/MERGE_HEAD").exists();
                if conflict != in_conflict {
                    in_conflict = conflict;
                    let kind = if conflict { "conflict" } else { "resolved" };
                    let _ = app.emit(
                        "companion://git",
                        GitEvent {
                            kind: kind.into(),
                            detail: String::new(),
                        },
                    );
                }
            } else {
                last = None;
                in_conflict = false;
            }
            thread::sleep(Duration::from_secs(3));
        }
    });
}
