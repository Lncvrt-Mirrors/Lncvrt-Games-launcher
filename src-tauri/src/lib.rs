use base64::Engine;
use dashmap::DashMap;
use ed25519_dalek::pkcs8::DecodePublicKey;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use futures_util::stream::StreamExt;
use pem::parse;
use sha2::{Digest, Sha512};
use std::fs;
use std::path::Path;
use std::sync::{OnceLock, RwLock};
use std::time::Instant;
use std::{
    fs::{File, create_dir_all},
    io::{BufReader, copy},
    path::PathBuf,
    process::Command,
    time::Duration,
};
use tauri::window::{ProgressBarState, ProgressBarStatus};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_os::platform;
use tokio::io::AsyncReadExt;
use tokio::{io::AsyncWriteExt, time::timeout};
use zip::ZipArchive;
use zip::result::ZipError;

#[cfg(any(target_os = "windows", target_os = "linux"))]
use sysinfo::System;

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[cfg(not(debug_assertions))]
use tauri_plugin_updater::UpdaterExt;

struct AppState {
    custom_data_dir: RwLock<Option<PathBuf>>,
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let state = app.state::<AppState>();
    let guard = state.custom_data_dir.read().unwrap();
    match &*guard {
        Some(p) => Ok(p.clone()),
        None => app.path().app_local_data_dir().map_err(|e| e.to_string()),
    }
}

static CANCEL_MAP: OnceLock<DashMap<String, bool>> = OnceLock::new();

fn cancel_map() -> &'static DashMap<String, bool> {
    CANCEL_MAP.get_or_init(DashMap::new)
}

fn is_cancelled(name: &str) -> bool {
    cancel_map().get(name).map(|v| *v).unwrap_or(false)
}

#[cfg(any(target_os = "windows", target_os = "linux"))]
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

async fn unzip_to_dir(app: AppHandle, zip_path: PathBuf, out_dir: PathBuf, name: String) -> String {
    let _ = app.emit("unzip-start", format!("{}", name));
    let res = tauri::async_runtime::spawn_blocking(move || {
        let file = File::open(zip_path)?;
        let mut archive = ZipArchive::new(BufReader::new(file))?;
        let total = archive.len();

        for i in 0..total {
            let mut entry = archive.by_index(i)?;
            let entry_name = entry.name();

            if should_skip(entry_name) {
                continue;
            }

            let outpath = out_dir.join(entry_name);
            if !outpath.starts_with(&out_dir) {
                return Err(ZipError::InvalidArchive("Path traversal detected".into()));
            }

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

            let _ = app.emit("unzip-progress", format!("{}:{}:{}", name, i + 1, total));
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
    let path = match data_dir(&app) {
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

#[tauri::command]
async fn download(
    app: AppHandle,
    url: String,
    name: String,
    hash: String,
    download_type: i8,
    mod_id: String,
) -> String {
    let _ = app.emit("download-start", format!("{}", name));
    let window = app.get_webview_window("main").expect("main window missing");

    let base_dir = match data_dir(&app) {
        Ok(p) => p,
        Err(_) => {
            let _ = &app.emit("download-stop", format!("{}", name));
            return "-1".to_string();
        }
    };
    let downloads_path = base_dir.join("downloads");
    let game_path = base_dir.join("game");

    let download_part_path = downloads_path.join(format!("{}.part", name));
    let download_zip_path = downloads_path.join(format!("{}.zip", name));

    let _ = tokio::fs::create_dir_all(&downloads_path).await;

    let resume_from: u64 = match tokio::fs::metadata(&download_part_path).await {
        Ok(meta) => {
            let size = meta.len();
            size
        }
        Err(_) => 0,
    };

    let client = reqwest::Client::new();
    let mut request = client.get(&url);
    if resume_from > 0 {
        request = request.header("Range", format!("bytes={}-", resume_from));
    }

    let resp = match request.send().await {
        Ok(r) => r,
        Err(_) => {
            let _ = &app.emit("download-stop", format!("{}", name));
            return "-1".to_string();
        }
    };

    let status = resp.status();

    let actual_resume_from = if resume_from > 0 && status == reqwest::StatusCode::OK {
        let _ = tokio::fs::remove_file(&download_part_path).await;
        0
    } else if resume_from > 0 && status == reqwest::StatusCode::PARTIAL_CONTENT {
        resume_from
    } else if resume_from > 0 {
        let _ = tokio::fs::remove_file(&download_part_path).await;
        0
    } else {
        0
    };

    let remaining_size = resp.content_length().unwrap_or(0);
    let total_size = actual_resume_from + remaining_size;
    let _ = app.emit("download-size", format!("{}:{}", &name, &total_size));

    let mut file = if actual_resume_from > 0 {
        match tokio::fs::OpenOptions::new()
            .append(true)
            .open(&download_part_path)
            .await
        {
            Ok(f) => f,
            Err(_) => {
                let _ = &app.emit("download-stop", format!("{}", name));
                return "-1".to_string();
            }
        }
    } else {
        if download_type == 0 {
            if let Ok(true) = tokio::fs::try_exists(&game_path.join(&name)).await {
                let _ = tokio::fs::remove_dir_all(&game_path.join(&name)).await;
            }
            let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;
        }

        match tokio::fs::File::create(&download_part_path).await {
            Ok(f) => f,
            Err(_) => {
                let _ = &app.emit("download-stop", format!("{}", name));
                return "-1".to_string();
            }
        }
    };

    let mut downloaded: u64 = actual_resume_from;
    let mut stream = resp.bytes_stream();

    let start = Instant::now();
    let mut chunk_count: u64 = 0;

    while let Ok(Some(chunk_result)) = timeout(Duration::from_secs(5), stream.next()).await {
        if is_cancelled(&name) {
            cancel_map().remove(&name);
            let _ = window.set_progress_bar(ProgressBarState {
                status: Some(ProgressBarStatus::None),
                progress: Some(0),
            });
            return "0".to_string();
        }

        let chunk = match chunk_result {
            Ok(c) => c,
            Err(_) => {
                let _ = &app.emit("download-stop", format!("{}", name));
                return "-1".to_string();
            }
        };

        chunk_count += 1;

        if let Err(_) = file.write_all(&chunk).await {
            let _ = &app.emit("download-stop", format!("{}", name));
            return "-1".to_string();
        }

        downloaded += chunk.len() as u64;

        let progress = if total_size > 0 {
            ((downloaded as f64) / (total_size as f64)) * 100.0
        } else {
            0.0
        };

        let session_bytes = downloaded - actual_resume_from;
        let elapsed_secs = start.elapsed().as_secs_f64();
        let speed = if elapsed_secs > 0.0 {
            session_bytes as f64 / elapsed_secs
        } else {
            0.0
        };
        let eta_secs = if total_size > downloaded && speed > 0.0 {
            (total_size - downloaded) as f64 / speed
        } else {
            0.0
        };

        if chunk_count % 50 == 0 || downloaded == total_size {
            let _ = window.set_progress_bar(ProgressBarState {
                status: Some(ProgressBarStatus::Normal),
                progress: Some(progress as u64),
            });
        }

        let _ = app.emit(
            "download-progress",
            format!(
                "{}:{:.8}:{}:{}:{:.2}",
                &name, progress, downloaded, speed, eta_secs
            ),
        );
    }

    if total_size > 0 && downloaded < total_size {
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: Some(0),
        });
        return "-1".to_string();
    }

    let _ = app.emit("download-hash-checking", format!("{}", &name));

    let download_hash = {
        let mut file = match tokio::fs::File::open(&download_part_path).await {
            Ok(f) => f,
            Err(_) => {
                return "-1".to_string();
            }
        };
        let mut hasher = Sha512::new();
        let mut buffer = [0u8; 8192];
        loop {
            let bytes_read = match file.read(&mut buffer).await {
                Ok(n) => n,
                Err(_) => {
                    return "-1".to_string();
                }
            };
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        drop(file);
        hex::encode(hasher.finalize())
    };

    if hash != download_hash {
        let _ = tokio::fs::remove_file(&download_part_path).await;
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: Some(0),
        });
        return "-1".to_string();
    }

    if let Err(_) = tokio::fs::rename(&download_part_path, &download_zip_path).await {
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: Some(0),
        });
        return "-1".to_string();
    }

    let _ = tokio::fs::create_dir_all(&game_path.join(&name)).await;

    let unzip_res = unzip_to_dir(
        app.clone(),
        download_zip_path.clone(),
        if download_type == 2 {
            game_path
                .join(&name)
                .join("BepInEx")
                .join("plugins")
                .join(&mod_id)
        } else {
            game_path.join(&name)
        },
        name.clone(),
    )
    .await;

    let _ = tokio::fs::remove_file(&download_zip_path).await;

    if unzip_res == "-1" {
        let _ = window.set_progress_bar(ProgressBarState {
            status: Some(ProgressBarStatus::None),
            progress: Some(0),
        });
        return "-1".to_string();
    }

    let _ = window.set_progress_bar(ProgressBarState {
        status: Some(ProgressBarStatus::None),
        progress: Some(0),
    });
    "1".to_string()
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
    let game_folder = match data_dir(&app) {
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
        use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

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

            if let Err(e) =
                Command::new(&std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string()))
                    .arg("-c")
                    .arg(cmd)
                    .current_dir(&game_folder)
                    .spawn()
            {
                use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

                eprintln!("Failed to launch game with Wine: {}", e);

                app.dialog()
                    .message(format!(
                        "{} failed to launch with Wine\n\n{}",
                        display_name, e
                    ))
                    .kind(MessageDialogKind::Error)
                    .title("Game already running")
                    .show(|_| {});
            }

            return;
        }
    }

    let bepinex_folder = game_folder.join("BepInEx");

    if platform() == "macos" && !bepinex_folder.exists() && executable.ends_with(".app") {
        if let Err(_) = Command::new("open")
            .arg(&executable)
            .current_dir(&game_folder)
            .spawn()
        {
            eprintln!("Failed to launch game on macOS");
        }
    } else {
        if (platform() == "macos" || platform() == "linux") && bepinex_folder.exists() {
            if let Err(_) = Command::new("./run_bepinex.sh")
                .arg(&executable)
                .current_dir(&game_folder)
                .spawn()
            {
                eprintln!("Failed to launch game");
            }
        } else {
            if let Err(_) = Command::new(&exe_path).current_dir(&game_folder).spawn() {
                eprintln!("Failed to launch game");
            }
        }
    }
}

#[tauri::command]
fn verify_signature(body: String, signature: String, public_key: String) -> bool {
    let Ok(pubkey_pem_bytes) = base64::engine::general_purpose::STANDARD.decode(public_key) else {
        return false;
    };

    let Ok(sig_bytes) = base64::engine::general_purpose::STANDARD.decode(signature) else {
        return false;
    };

    let Ok(pubkey_pem) = String::from_utf8(pubkey_pem_bytes) else {
        return false;
    };

    let Ok(parsed) = parse(pubkey_pem) else {
        return false;
    };

    let Ok(pubkey) = VerifyingKey::from_public_key_der(&parsed.contents()) else {
        return false;
    };

    let Ok(sig) = Signature::from_slice(&sig_bytes) else {
        return false;
    };

    pubkey.verify(body.as_bytes(), &sig).is_ok()
}

#[tauri::command]
async fn cancel_download(name: String) {
    cancel_map().insert(name.clone(), true);
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

fn move_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !src.exists() {
        return Ok(());
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent)?;
    }
    if dst.exists() {
        fs::remove_dir_all(dst)?;
    }
    match fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(_) => {
            copy_dir_recursive(src, dst)?;
            fs::remove_dir_all(src)?;
            Ok(())
        }
    }
}

#[tauri::command]
async fn move_game_data(app: AppHandle, destination: String) -> Result<(), String> {
    let default_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    let current_dir = data_dir(&app)?;

    let new_dir = if destination.is_empty() {
        default_dir.clone()
    } else {
        PathBuf::from(&destination)
    };

    if current_dir == new_dir {
        return Ok(());
    }

    let src_game = current_dir.join("game");
    let dst_game = new_dir.join("game");
    let src_downloads = current_dir.join("downloads");
    let dst_downloads = new_dir.join("downloads");

    tauri::async_runtime::spawn_blocking(move || {
        fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;
        move_dir(&src_game, &dst_game).map_err(|e| e.to_string())?;
        move_dir(&src_downloads, &dst_downloads).map_err(|e| e.to_string())?;
        Ok::<(), String>(())
    })
    .await
    .map_err(|e| e.to_string())??;

    let state = app.state::<AppState>();
    let mut guard = state.custom_data_dir.write().unwrap();
    if destination.is_empty() {
        *guard = None;
    } else {
        *guard = Some(PathBuf::from(&destination));
    }

    Ok(())
}

#[tauri::command]
fn restart_app(app: AppHandle) {
    app.restart();
}

#[tauri::command]
fn open_game_folder(app: AppHandle, version: String) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let path = dir.join("game").join(&version);
    if !path.exists() || !path.is_dir() {
        return Err(format!("Game folder \"{}\" not found.", path.display()));
    }
    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn remove_stale_executable(app: AppHandle, version: String, executable: String) -> bool {
    let dir = match data_dir(&app) {
        Ok(d) => d,
        Err(_) => return false,
    };
    let path = dir.join("game").join(&version).join(&executable);
    if path.exists() {
        fs::remove_file(&path).is_ok()
    } else {
        false
    }
}

#[tauri::command]
fn open_new_window(
    app: tauri::AppHandle,
    title: String,
    name: String,
    url: String,
    width: f64,
    height: f64,
) {
    if let Some(window) = app.get_webview_window(&name) {
        let _ = window.show();
        return;
    };

    tauri::WebviewWindowBuilder::new(
        &app,
        name,
        tauri::WebviewUrl::External(url.parse().unwrap()),
    )
    .inner_size(width, height)
    .title(title)
    .build()
    .unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_variables)]
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_prevent_default::init())
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
        .invoke_handler(tauri::generate_handler![
            download,
            launch_game,
            folder_size,
            verify_signature,
            cancel_download,
            open_new_window,
            move_game_data,
            restart_app,
            open_game_folder,
            remove_stale_executable
        ])
        .setup(|app| {
            let custom_dir = app
                .path()
                .app_config_dir()
                .ok()
                .map(|d| d.join("settings.json"))
                .filter(|p| p.exists())
                .and_then(|p| fs::read_to_string(p).ok())
                .and_then(|c| serde_json::from_str::<serde_json::Value>(&c).ok())
                .and_then(|v| {
                    v.get("customDataLocation")
                        .and_then(|s| s.as_str())
                        .filter(|s| !s.is_empty())
                        .map(PathBuf::from)
                });

            app.manage(AppState {
                custom_data_dir: RwLock::new(custom_dir),
            });

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "windows")]
            {
                use tauri_plugin_decorum::WebviewWindowExt;
                if let Err(e) = window.create_overlay_titlebar() {
                    eprintln!("Failed to create overlay titlebar: {:?}", e);
                }
            }
            #[cfg(not(debug_assertions))]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    update(handle, window.clone()).await.unwrap();
                });
            }
            #[cfg(debug_assertions)]
            {
                let mut new_url = app.config().build.dev_url.clone().unwrap();
                new_url.set_path("/main");
                window.navigate(new_url).unwrap();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(not(debug_assertions))]
async fn update(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
) -> tauri_plugin_updater::Result<()> {
    use tauri_plugin_os::arch;

    let plat = {
        #[cfg(target_os = "linux")]
        {
            if std::path::Path::new("/etc/debian_version").exists() {
                "linux-debian"
            } else if std::path::Path::new("/etc/redhat-release").exists() {
                "linux-redhat"
            } else {
                let mut new_url = window.url().unwrap();
                new_url.set_path("/update/outdated");
                window.navigate(new_url).unwrap();
                return Ok(());
            }
        }
        #[cfg(not(target_os = "linux"))]
        {
            platform()
        }
    };

    if let Some(update) = app
        .updater_builder()
        .target(format!("{}-{}", plat, arch()))
        .build()?
        .check()
        .await?
    {
        let mut new_url = window.url().unwrap();
        new_url.set_path("/update/updating");
        window.navigate(new_url).unwrap();

        let mut downloaded = 0;

        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    println!("downloaded {downloaded} from {content_length:?}");
                },
                || {
                    println!("download finished");
                },
            )
            .await?;

        println!("update installed");
        app.restart();
    }

    let mut new_url = window.url().unwrap();
    new_url.set_path("/main");
    window.navigate(new_url).unwrap();

    Ok(())
}
