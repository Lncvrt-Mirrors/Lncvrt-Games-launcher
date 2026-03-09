use futures_util::stream::StreamExt;
use std::{
    fs::{File, create_dir_all},
    io::{BufReader, copy},
    path::PathBuf,
    process::Command,
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};
use tokio::{io::AsyncWriteExt, time::timeout};
use zip::ZipArchive;

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
            } else {
                if let Some(parent) = outpath.parent() {
                    create_dir_all(parent)?;
                }

                let mut outfile = File::create(&outpath)?;
                copy(&mut entry, &mut outfile)?;
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
async fn download(app: AppHandle, url: String, name: String) -> String {
    let client = reqwest::Client::new();
    let resp = match client.get(&url).send().await {
        Ok(r) => r,
        Err(_) => return "-1".to_string(),
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

    while let Ok(Some(chunk_result)) = timeout(Duration::from_secs(5), stream.next()).await {
        let chunk = match chunk_result {
            Ok(c) => c,
            Err(_) => return "-1".to_string(),
        };

        if let Err(_) = file.write_all(&chunk).await {
            return "-1".to_string();
        }

        downloaded += chunk.len() as u64;
    }

    if total_size > 0 && downloaded < total_size {
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

    if let Err(_) = Command::new(game_folder.join(&executable))
        .current_dir(&game_folder)
        .spawn()
    {
        eprintln!("Failed to launch game");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[allow(unused_variables)]
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![download, launch_game])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
