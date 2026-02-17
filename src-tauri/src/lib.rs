use futures_util::stream::StreamExt;
use sha2::{Digest, Sha512};
use std::fs;
use std::path::Path;
use std::time::Instant;
use std::{
    fs::{File, create_dir_all},
    io::{BufReader, copy},
    path::PathBuf,
    process::Command,
    time::Duration,
};
use sysinfo::System;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_os::platform;
use tauri_plugin_prevent_default::Flags;
use tokio::io::AsyncReadExt;
use tokio::{io::AsyncWriteExt, time::timeout};
use zip::ZipArchive;

#[cfg(target_os = "windows")]
use tauri_plugin_decorum::WebviewWindowExt;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[allow(unused)]
fn is_running_by_path(path: &Path) -> bool {
    let sys = System::new_all();
    let target = match path.canonicalize() {
        Ok(t) => t,
        Err(_) => return false,
    };
    sys.processes().values().any(|proc| {
        proc.exe()
            .and_then(|exe| exe.canonicalize().ok())
            .map_or(false, |exe| exe == target)
    })
}

fn should_skip(name: &str) -> bool {
    name.starts_with("__MACOSX/")
        || name == "__MACOSX"
        || name.ends_with("/.DS_Store")
        || name.ends_with(".DS_Store")
}

async fn unzip_to_dir(zip_path: PathBuf, out_dir: PathBuf) -> String {
    let res = tauri::async_runtime::spawn_blocking(move || {
        let file = File::open(zip_path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i)?;
            let name = entry.name();

            if should_skip(name) {
                continue;
            }

            let outpath = out_dir.join(name);

            if entry.is_dir() {
                create_dir_all(&outpath)?;

                #[cfg(unix)]
                if let Some(mode) = entry.unix_mode() {
                    std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode))?;
                }
            } else {
                if let Some(parent) = outpath.parent() {
                    create_dir_all(parent)?;
                }

                let mut outfile = File::create(&outpath)?;
                copy(&mut entry, &mut outfile)?;

                #[cfg(unix)]
                if let Some(mode) = entry.unix_mode() {
                    std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode))?;
                }
            }
        }

        Ok::<(), zip::result::ZipError>(())
    })
    .await;

    match res {
        Ok(Ok(())) => "1".into(),
        _ => "-1".into(),
    }
}

#[tauri::command]
fn folder_size(app: AppHandle, version: String) -> String {
    let path = match app.path().app_local_data_dir() {
        Ok(p) => p.join("game").join(&version),
        Err(_) => return "-1".to_string(),
    };
    fn inner(path: &Path) -> u64 {
        let mut size = 0;
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(metadata) = entry.metadata() {
                    if metadata.is_file() {
                        size += metadata.len();
                    } else if metadata.is_dir() {
                        size += inner(&entry.path());
                    }
                }
            }
        }
        size
    }

    let p = Path::new(&path);
    if p.exists() && p.is_dir() {
        inner(p).to_string()
    } else {
        "-1".to_string()
    }
}

#[allow(unused_variables)]
#[tauri::command]
async fn download(
    app: AppHandle,
    url: String,
    name: String,
    executable: String,
    hash: String,
) -> String {
    let client = reqwest::Client::new();
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(_) => {
            return "-1".to_string();
        }
    };
    let total_size = resp.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();

    let downloads_path = match app.path().app_local_data_dir() {
        Ok(p) => p.join("downloads"),
        Err(_) => return "-1".to_string(),
    };
    let game_path = match app.path().app_local_data_dir() {
        Ok(p) => p.join("game"),
        Err(_) => return "-1".to_string(),
    };

    let download_part_path = downloads_path.join(format!("{}.part", name));
    let download_zip_path = downloads_path.join(format!("{}.zip", name));

    if download_part_path.exists() {
        let _ = tokio::fs::remove_file(&download_part_path).await;
    }

    let _ = tokio::fs::create_dir_all(&downloads_path).await;
    if let Ok(true) = tokio::fs::try_exists(&game_path.join(name.clone())).await {
        let _ = tokio::fs::remove_dir_all(&game_path.join(name.clone())).await;
    }
    let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;
    let mut file = match tokio::fs::File::create(download_part_path.clone()).await {
        Ok(f) => f,
        Err(_) => return "-1".to_string(),
    };

    let start = Instant::now();

    while let Ok(Some(chunk_result)) = timeout(Duration::from_secs(5), stream.next()).await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(_) => {
                return "-1".to_string();
            }
        };

        if let Err(_) = file.write_all(&chunk).await {
            return "-1".to_string();
        }

        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            ((downloaded as f64) / (total_size as f64)) * 100.0
        } else {
            0.0
        };

        let elapsed_secs = start.elapsed().as_secs_f64();
        let speed = (downloaded as f64) / elapsed_secs;
        let eta_secs = if total_size > downloaded {
            ((total_size - downloaded) as f64) / speed
        } else {
            0.0
        };

        let _ = app.emit(
            "download-progress",
            format!(
                "{}:{:.8}:{}:{}:{:.2}",
                &name, progress, downloaded, speed, eta_secs
            ),
        );
    }

    if total_size > 0 && downloaded < total_size {
        return "-1".to_string();
    }

    let _ = app.emit("download-hash-checking", format!("{}", &name));

    let download_hash = {
        let mut file = match tokio::fs::File::open(download_part_path.clone()).await {
            Ok(f) => f,
            Err(_) => return "-1".to_string(),
        };
        let mut hasher = Sha512::new();
        {
            let mut buffer = [0; 8192];
            loop {
                let bytes_read = match file.read(&mut buffer).await {
                    Ok(n) => n,
                    Err(_) => return "-1".to_string(),
                };
                if bytes_read == 0 {
                    break;
                }
                hasher.update(&buffer[..bytes_read]);
            }
        }
        drop(file);
        format!("{:x}", hasher.finalize())
    };

    if hash != download_hash {
        let _ = tokio::fs::remove_file(download_part_path.clone()).await;
        return "-1".to_string();
    }
    let _ = app.emit("download-finishing", format!("{}", &name));

    if let Err(_) = tokio::fs::rename(download_part_path.clone(), download_zip_path.clone()).await {
        return "-1".to_string();
    }
    let unzip_res = unzip_to_dir(download_zip_path.clone(), game_path.join(&name)).await;
    let _ = tokio::fs::remove_file(download_zip_path.clone()).await;
    if unzip_res == "-1" {
        return "-1".to_string();
    }

    return "1".to_string();
}

#[allow(unused_variables)]
#[tauri::command]
fn launch_game(
    app: AppHandle,
    name: String,
    executable: String,
    display_name: String,
    use_wine: bool,
    wine_command: String,
) {
    let game_folder = match app.path().app_local_data_dir() {
        Ok(p) => p.join("game").join(&name),
        Err(_) => return,
    };
    if !game_folder.exists() {
        return;
    }

    let exe_path = game_folder.join(&executable);

    //if already running on macos, it'll auto take the user to that proccess
    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        use tauri_plugin_dialog::DialogExt;
        use tauri_plugin_dialog::MessageDialogKind;

        if !use_wine && is_running_by_path(&exe_path) {
            app.dialog()
                .message(format!(
                    "{} is already running, if this doesn't seem true, try to kill the proccess.",
                    display_name
                ))
                .kind(MessageDialogKind::Error)
                .title("Game already running")
                .show(|_| {});
            return;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if use_wine {
            let quoted_path = format!("\"{}\"", exe_path.to_string_lossy());
            let cmd = wine_command.replace("%path%", &quoted_path);

            if let Err(_) = Command::new("bash")
                .arg("-c")
                .arg(cmd)
                .current_dir(&game_folder)
                .spawn() {
                eprintln!("Failed to launch game with Wine");
            }

            return;
        }
    }

    if platform() == "macos" {
        if let Err(_) = Command::new("open")
            .arg(&executable)
            .current_dir(&game_folder)
            .spawn() {
            eprintln!("Failed to launch game on macOS");
        }
    } else {
        if let Err(_) = Command::new(&exe_path)
            .current_dir(&game_folder)
            .spawn() {
            eprintln!("Failed to launch game");
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_variables)]
    tauri::Builder::default()
        .plugin(
            tauri_plugin_prevent_default::Builder::new()
                .with_flags(
                    Flags::FIND
                        | Flags::CARET_BROWSING
                        | Flags::DEV_TOOLS
                        | Flags::DOWNLOADS
                        | Flags::FOCUS_MOVE
                        | Flags::RELOAD
                        | Flags::SOURCE
                        | Flags::OPEN
                        | Flags::PRINT
                        | Flags::CONTEXT_MENU,
                )
                .build(),
        )
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_decorum::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download, launch_game, folder_size])
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Some(main_window) = app.get_webview_window("main") {
                    if let Err(e) = main_window.create_overlay_titlebar() {
                        eprintln!("Failed to create overlay titlebar: {:?}", e);
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
