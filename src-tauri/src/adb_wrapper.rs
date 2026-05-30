use reqwest;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}


#[derive(Serialize, Deserialize, Clone)]
pub struct ProgressPayload {
    pub message: String,
    pub progress: u8,
}

#[derive(Debug, thiserror::Error)]
pub enum AdbError {
    #[error("ADB path not found")]
    PathNotFound,
    #[error("Execution failed: {0}")]
    Execution(String),
}

impl serde::Serialize for AdbError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
}

#[derive(Serialize, Deserialize)]
pub struct HeroMods {
    pub hero_name: String,
    pub skins: Vec<String>,
}

fn get_adb_path(app_handle: &AppHandle) -> Result<String, AdbError> {
    let resource_path = app_handle
        .path()
        .resource_dir()
        .map_err(|_| AdbError::PathNotFound)?;
    let adb_path = resource_path
        .join("resources")
        .join("platform-tools")
        .join(format!("adb{}", std::env::consts::EXE_SUFFIX));

    if adb_path.exists() {
        Ok(adb_path.to_string_lossy().to_string())
    } else {
        Err(AdbError::PathNotFound)
    }
}

#[tauri::command]
pub fn get_devices(app_handle: AppHandle) -> Result<Vec<Device>, AdbError> {
    let adb_path = get_adb_path(&app_handle)?;
    let output = create_command(&adb_path)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut devices = Vec::new();

    for line in stdout.lines().skip(1) {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if parts.len() >= 2 && parts[1] == "device" {
                let id = parts[0].to_string();
                let mut name = id.clone();
                for part in parts.iter().skip(2) {
                    if part.starts_with("model:") {
                        name = part.replace("model:", "").replace("_", " ");
                    }
                }
                devices.push(Device { id, name });
            }
        }
    }
    Ok(devices)
}

#[tauri::command]
pub fn scan_local_mods(_app_handle: AppHandle) -> Result<Vec<HeroMods>, String> {
    Ok(Vec::new()) // Stub, not needed anymore
}

#[tauri::command]
pub fn push_file(
    _app_handle: AppHandle,
    _device_id: String,
    _local_path: String,
    _target_folder: String,
    _file_name: String,
) -> Result<String, AdbError> {
    Ok("Not used".to_string())
}

fn replace_bytes(data: &[u8], old: &[u8], new: &[u8]) -> Vec<u8> {
    let mut result = Vec::new();
    let mut i = 0;
    while i < data.len() {
        if data[i..].starts_with(old) {
            result.extend_from_slice(new);
            i += old.len();
        } else {
            result.push(data[i]);
            i += 1;
        }
    }
    result
}

#[tauri::command]
pub async fn inject_auto_patch(
    app_handle: AppHandle,
    device_id: String,
    old_id: String,
    new_id: String,
) -> Result<String, AdbError> {
    if old_id.len() != new_id.len() {
        return Err(AdbError::Execution(
            "Panjang ID Lama dan ID Baru harus sama! (e.g. 3 digit)".to_string(),
        ));
    }

    let adb_path = get_adb_path(&app_handle)?;
    let base_assets_path = "/sdcard/Android/data/com.mobile.legends/files/dragon2017/assets";

    let local_temp_dir = std::env::temp_dir().join("mlbb_injector_batch");
    if local_temp_dir.exists() {
        let _ = fs::remove_dir_all(&local_temp_dir);
    }
    let _ = fs::create_dir_all(&local_temp_dir);
    let extracted_dir = local_temp_dir.join("extracted");
    let _ = fs::create_dir_all(&extracted_dir);

    // 1. Dinamis Pemindaian
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mencari file terkait skin di HP...".to_string(),
            progress: 10,
        },
    );

    // Gunakan find di direktori spesifik
    let find_cmd = format!("cd {} && find Art/android AstcInPack/android Audio/android UI/android -type f -name '*{}*'", base_assets_path, old_id);
    let find_output = create_command(&adb_path)
        .args(["-s", &device_id, "shell", &find_cmd])
        .output()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&find_output.stdout);
    let mut file_list = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Filter out avatar / img
        if trimmed.contains("img/") || trimmed.ends_with(".avatar") {
            continue;
        }
        // Only unity3d, bnk, prefab etc
        if trimmed.ends_with(".unity3d") || trimmed.ends_with(".bnk") {
            file_list.push(trimmed.to_string());
        }
    }

    if file_list.is_empty() {
        return Err(AdbError::Execution(format!(
            "Tidak ditemukan file skin dengan ID {}",
            old_id
        )));
    }

    // 2. Simpan list dan Batch Tar
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: format!("Ditemukan {} file. Memulai Batch Pull...", file_list.len()),
            progress: 30,
        },
    );

    let list_txt_path = local_temp_dir.join("list.txt");
    fs::write(&list_txt_path, file_list.join("\n"))
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "push",
            list_txt_path.to_str().unwrap(),
            "/data/local/tmp/list.txt",
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Tar on Android
    let tar_cmd = format!(
        "tar -cf /data/local/tmp/assets.tar -T /data/local/tmp/list.txt -C {}",
        base_assets_path
    );
    create_command(&adb_path)
        .args(["-s", &device_id, "shell", &tar_cmd])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Pull Tar
    let local_tar = local_temp_dir.join("assets.tar");
    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "pull",
            "/data/local/tmp/assets.tar",
            local_tar.to_str().unwrap(),
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // 3. Extract & Patch
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mengekstrak dan mem-patch file massal...".to_string(),
            progress: 50,
        },
    );

    create_command("tar")
        .args(["-xf", "assets.tar", "-C", "extracted"])
        .current_dir(&local_temp_dir)
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Cari path patcher Python
    let mut patcher_path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("binaries")
        .join("patcher-x86_64-pc-windows-msvc.exe");
    if !patcher_path.exists() {
        patcher_path = std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("src-tauri")
            .join("binaries")
            .join("patcher-x86_64-pc-windows-msvc.exe");
    }

    fn visit_dirs(
        dir: &Path,
        cb: &mut dyn FnMut(&fs::DirEntry) -> Result<(), AdbError>,
    ) -> Result<(), AdbError> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir).unwrap() {
                let entry = entry.unwrap();
                let path = entry.path();
                if path.is_dir() {
                    visit_dirs(&path, cb)?;
                } else {
                    cb(&entry)?;
                }
            }
        }
        Ok(())
    }

    let old_id_bytes = old_id.as_bytes();
    let new_id_bytes = new_id.as_bytes();

    let mut callback = |entry: &fs::DirEntry| -> Result<(), AdbError> {
        let path = entry.path();
        let path_str = path.to_string_lossy().to_string();

        let mut do_rename = false;

        if path_str.ends_with(".unity3d") {
            // Use python patcher, but we need to specify old_str and new_str
            // Wait, old_str might be "Hero538" or "40538" or just "538"?
            // Python patcher replaces exact string. If we replace "538" globally inside unity3d via Python patcher?
            // Actually, patch_bundle replaces raw bytes. So we can just pass "538" and "531".
            let status = create_command(&patcher_path)
                .args([
                    path.to_str().unwrap(),
                    &old_id,
                    &new_id,
                    path.to_str().unwrap(),
                ])
                .status()
                .map_err(|e| AdbError::Execution(format!("Gagal eksekusi patcher: {}", e)))?;
            if !status.success() {
                return Err(AdbError::Execution("Proses patching gagal".to_string()));
            }
            do_rename = true;
        } else if path_str.ends_with(".bnk") {
            // Raw Replace
            let mut file = fs::File::open(&path).unwrap();
            let mut data = Vec::new();
            file.read_to_end(&mut data).unwrap();

            let replaced = replace_bytes(&data, old_id_bytes, new_id_bytes);

            let mut file = fs::File::create(&path).unwrap();
            file.write_all(&replaced).unwrap();
            do_rename = true;
        }

        if do_rename {
            let file_name = path.file_name().unwrap().to_string_lossy().to_string();
            if file_name.contains(&old_id) {
                let new_name = file_name.replace(&old_id, &new_id);
                let new_path = path.parent().unwrap().join(new_name);
                fs::rename(&path, &new_path).unwrap();
            }
        }

        Ok(())
    };

    visit_dirs(&extracted_dir.clone(), &mut callback)?;

    // 4. Tar and Push
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Menyatukan kembali (Packing) dan Push ke HP...".to_string(),
            progress: 80,
        },
    );

    // We cd into extracted_dir to tar so paths are relative to base_assets_path
    // using * might fail if there are many files, but we can just use 	ar -cf ../patched.tar .
    create_command("tar")
        .args(["-cf", "../patched.tar", "."])
        .current_dir(&extracted_dir)
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    let patched_tar = local_temp_dir.join("patched.tar");
    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "push",
            patched_tar.to_str().unwrap(),
            "/data/local/tmp/patched.tar",
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Extract on device
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mengekstrak file ke direktori game...".to_string(),
            progress: 95,
        },
    );

    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "shell",
            &format!(
                "tar -xf /data/local/tmp/patched.tar -C {}",
                base_assets_path
            ),
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Cleanup
    let _ = create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "shell",
            "rm /data/local/tmp/assets.tar /data/local/tmp/list.txt /data/local/tmp/patched.tar",
        ])
        .status();
    let _ = fs::remove_dir_all(&local_temp_dir);

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Injeksi Auto-Patch Selesai!".to_string(),
            progress: 100,
        },
    );
    Ok(format!(
        "Berhasil Batch Auto-Patch {} files",
        file_list.len()
    ))
}

#[tauri::command]
pub async fn inject_zip_script(
    app_handle: AppHandle,
    device_id: String,
    zip_paths: Vec<String>,
) -> Result<String, AdbError> {
    let adb_path = get_adb_path(&app_handle)?;
    let local_temp_dir = std::env::temp_dir().join("mlbb_injector_zip");

    if local_temp_dir.exists() {
        let _ = fs::remove_dir_all(&local_temp_dir);
    }
    let _ = fs::create_dir_all(&local_temp_dir);

    let master_assets_dir = local_temp_dir.join("master_assets");
    let _ = fs::create_dir_all(&master_assets_dir);

    for (idx, zip_path) in zip_paths.iter().enumerate() {
        let extract_dir = local_temp_dir.join(format!("extract_{}", idx));
        let _ = fs::create_dir_all(&extract_dir);

        let _ = app_handle.emit(
            "inject-progress",
            ProgressPayload {
                message: format!("Mengekstrak Script ZIP {}/{}...", idx + 1, zip_paths.len()),
                progress: 20 + (10 * idx as u8 / zip_paths.len() as u8),
            },
        );

        let status = create_command("tar")
            .args(["-xf", zip_path, "-C", extract_dir.to_str().unwrap()])
            .status()
            .map_err(|e| AdbError::Execution(e.to_string()))?;

        if !status.success() {
            return Err(AdbError::Execution(format!(
                "Gagal mengekstrak file ZIP: {}",
                zip_path
            )));
        }

        let mut target_dir = None;
        let mut _dest_path_on_device = "";

        for entry in walkdir::WalkDir::new(&extract_dir)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_dir() {
                let name = entry.file_name().to_string_lossy();
                if name == "com.mobile.legends" {
                    target_dir = Some(entry.path().to_path_buf());
                    _dest_path_on_device = "/sdcard/Android/data/com.mobile.legends";
                    break;
                } else if name == "assets" {
                    target_dir = Some(entry.path().to_path_buf());
                    _dest_path_on_device =
                        "/sdcard/Android/data/com.mobile.legends/files/dragon2017/assets";
                    break;
                } else if name == "Art" || name == "Audio" || name == "UI" {
                    target_dir = Some(entry.path().parent().unwrap().to_path_buf());
                    _dest_path_on_device =
                        "/sdcard/Android/data/com.mobile.legends/files/dragon2017/assets";
                    break;
                }
            }
        }

        if let Some(target_dir) = target_dir {
            // Traverse target_dir and copy files one by one to master_assets_dir to safely merge
            for entry in walkdir::WalkDir::new(&target_dir)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.file_type().is_file() {
                    let relative_path = entry.path().strip_prefix(&target_dir).unwrap();
                    let dest_path = master_assets_dir.join(relative_path);
                    if let Some(parent) = dest_path.parent() {
                        let _ = fs::create_dir_all(parent);
                    }
                    if let Err(e) = fs::copy(entry.path(), &dest_path) {
                        println!("Warning during file copy: {}", e);
                    }
                }
            }
        } else {
            return Err(AdbError::Execution(
                format!("Format ZIP {} tidak dikenali. Tidak ditemukan folder com.mobile.legends atau assets.", zip_path)
            ));
        }
    }

    // Default destination
    let dest_path_on_device = "/sdcard/Android/data/com.mobile.legends/files/dragon2017/assets";

    // 3. Tar folder tersebut
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Membuat paket push (tar)...".to_string(),
            progress: 60,
        },
    );
    let push_tar_path = local_temp_dir.join("push.tar");
    create_command("tar")
        .args(["-cf", push_tar_path.to_str().unwrap(), "."])
        .current_dir(&master_assets_dir)
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // 4. Push ke device
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Menembakkan script ke HP (Pushing)...".to_string(),
            progress: 80,
        },
    );
    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "push",
            push_tar_path.to_str().unwrap(),
            "/data/local/tmp/push.tar",
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // 5. Extract di device
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Memasang script di folder game...".to_string(),
            progress: 95,
        },
    );
    let extract_cmd = format!(
        "tar -xf /data/local/tmp/push.tar -C {}",
        dest_path_on_device
    );
    create_command(&adb_path)
        .args(["-s", &device_id, "shell", &extract_cmd])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    // Cleanup
    let _ = create_command(&adb_path)
        .args(["-s", &device_id, "shell", "rm /data/local/tmp/push.tar"])
        .status();
    let _ = fs::remove_dir_all(&local_temp_dir);

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Pemasangan Script ZIP Selesai!".to_string(),
            progress: 100,
        },
    );
    Ok("Berhasil memasang script dari ZIP".to_string())
}

#[tauri::command]
pub async fn download_and_inject_url(
    app_handle: AppHandle,
    device_id: String,
    url: String,
) -> Result<String, AdbError> {
    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mengambil data dari MediaFire...".to_string(),
            progress: 5,
        },
    );

    // Fetch HTML
    let response = reqwest::blocking::get(&url)
        .map_err(|e| AdbError::Execution(format!("Gagal akses URL: {}", e)))?;
    let html = response
        .text()
        .map_err(|e| AdbError::Execution(format!("Gagal baca HTML: {}", e)))?;

    // Parse HTML to find #downloadButton
    let mut direct_link = None;
    {
        let document = Html::parse_document(&html);
        let selector = Selector::parse("#downloadButton").unwrap();

        for element in document.select(&selector) {
            if let Some(href) = element.value().attr("href") {
                direct_link = Some(href.to_string());
                break;
            }
        }
    }

    let direct_link = direct_link.ok_or_else(|| {
        AdbError::Execution("Tombol download MediaFire tidak ditemukan! Tautan mungkin kedaluwarsa atau diproteksi.".to_string())
    })?;

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mengunduh file ZIP dari MediaFire...".to_string(),
            progress: 10,
        },
    );

    // Download file
    let mut resp = reqwest::blocking::get(&direct_link)
        .map_err(|e| AdbError::Execution(format!("Gagal unduh file: {}", e)))?;

    let temp_dir = std::env::temp_dir().join("mlbb_dl_temp");
    let _ = fs::create_dir_all(&temp_dir);
    let zip_path = temp_dir.join("downloaded_mod.zip");

    let mut out = fs::File::create(&zip_path)
        .map_err(|e| AdbError::Execution(format!("Gagal buat file zip sementara: {}", e)))?;

    resp.copy_to(&mut out)
        .map_err(|e| AdbError::Execution(format!("Gagal menulis file zip: {}", e)))?;

    // Call inject_zip_script with the downloaded file
    let result = inject_zip_script(
        app_handle.clone(),
        device_id,
        vec![zip_path.to_string_lossy().to_string()],
    )
    .await;

    // Cleanup downloaded zip
    let _ = fs::remove_dir_all(&temp_dir);

    result
}

#[tauri::command]
pub async fn pull_asset(
    app_handle: AppHandle,
    device_id: String,
    keyword: String,
    dest_path: String,
) -> Result<String, AdbError> {
    if keyword.trim().is_empty() {
        return Err(AdbError::Execution(
            "Kata kunci tidak boleh kosong!".to_string(),
        ));
    }

    let adb_path = get_adb_path(&app_handle)?;
    let base_assets_path = "/sdcard/Android/data/com.mobile.legends/files/dragon2017/assets";

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Memproses kata kunci dan mencari file di HP...".to_string(),
            progress: 10,
        },
    );

    let keywords: Vec<String> = keyword
        .split(',')
        .map(|k| k.trim().to_string())
        .filter(|k| !k.is_empty())
        .collect();

    if keywords.is_empty() {
        return Err(AdbError::Execution("Kata kunci tidak valid.".to_string()));
    }

    let mut name_args = Vec::new();
    for (i, kw) in keywords.iter().enumerate() {
        if i > 0 {
            name_args.push("-o".to_string());
        }
        name_args.push("-name".to_string());
        name_args.push(format!("'*{}*'", kw));
    }
    let find_condition = name_args.join(" ");

    let find_cmd = format!(
        "cd {} && find Art/android AstcInPack/android Audio/android UI/android -type f \\( {} \\)",
        base_assets_path, find_condition
    );

    let find_output = create_command(&adb_path)
        .args(["-s", &device_id, "shell", &find_cmd])
        .output()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    let stdout = String::from_utf8_lossy(&find_output.stdout);
    let mut file_list = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.contains("Permission denied")
            || trimmed.contains("No such file")
        {
            continue;
        }
        file_list.push(trimmed.to_string());
    }

    if file_list.is_empty() {
        return Err(AdbError::Execution(format!(
            "Tidak ditemukan satupun file yang cocok dengan kata kunci: {}",
            keyword
        )));
    }

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: format!(
                "Ditemukan {} file. Mempersiapkan ekstraksi batch...",
                file_list.len()
            ),
            progress: 40,
        },
    );

    let local_temp_dir = std::env::temp_dir().join("mlbb_pull_batch");
    let _ = fs::create_dir_all(&local_temp_dir);

    let list_txt_path = local_temp_dir.join("pull_list.txt");
    fs::write(&list_txt_path, file_list.join("\n"))
        .map_err(|e| AdbError::Execution(format!("Gagal menulis list.txt: {}", e)))?;

    create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "push",
            list_txt_path.to_str().unwrap(),
            "/data/local/tmp/pull_list.txt",
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Membungkus file di HP (Bypassing Android 14)...".to_string(),
            progress: 60,
        },
    );

    let tar_cmd = format!(
        "tar -cf /data/local/tmp/pull_assets.tar -T /data/local/tmp/pull_list.txt -C {}",
        base_assets_path
    );
    let status = create_command(&adb_path)
        .args(["-s", &device_id, "shell", &tar_cmd])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    if !status.success() {
        let _ = create_command(&adb_path)
            .args([
                "-s",
                &device_id,
                "shell",
                "rm /data/local/tmp/pull_list.txt /data/local/tmp/pull_assets.tar",
            ])
            .status();
        return Err(AdbError::Execution(
            "Gagal membuat arsip tar di HP.".to_string(),
        ));
    }

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Menarik file (Pulling) ke PC...".to_string(),
            progress: 80,
        },
    );

    let local_tar_path = Path::new(&dest_path).join("pull_assets.tar");
    let status = create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "pull",
            "/data/local/tmp/pull_assets.tar",
            local_tar_path.to_str().unwrap(),
        ])
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    if !status.success() {
        let _ = create_command(&adb_path)
            .args([
                "-s",
                &device_id,
                "shell",
                "rm /data/local/tmp/pull_list.txt /data/local/tmp/pull_assets.tar",
            ])
            .status();
        return Err(AdbError::Execution(
            "Gagal menarik file tar dari HP ke PC.".to_string(),
        ));
    }

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Mengekstrak file di PC...".to_string(),
            progress: 90,
        },
    );

    let status = create_command("tar")
        .args(["-xf", "pull_assets.tar"])
        .current_dir(&dest_path)
        .status()
        .map_err(|e| AdbError::Execution(e.to_string()))?;

    if !status.success() {
        return Err(AdbError::Execution(
            "Berhasil ditarik, namun gagal mengekstrak file tar di PC.".to_string(),
        ));
    }

    // Cleanup
    let _ = fs::remove_file(&local_tar_path);
    let _ = fs::remove_dir_all(&local_temp_dir);
    let _ = create_command(&adb_path)
        .args([
            "-s",
            &device_id,
            "shell",
            "rm /data/local/tmp/pull_list.txt /data/local/tmp/pull_assets.tar",
        ])
        .status();

    let _ = app_handle.emit(
        "inject-progress",
        ProgressPayload {
            message: "Ekstraksi Aset Berhasil!".to_string(),
            progress: 100,
        },
    );

    Ok(format!(
        "Berhasil menarik {} file ke: {}",
        file_list.len(),
        dest_path
    ))
}

#[tauri::command]
pub fn scan_local_folder(path: String) -> Result<Vec<String>, String> {
    let mut file_names = Vec::new();

    let path = Path::new(&path);
    if !path.is_dir() {
        return Err("Direktori tidak ditemukan atau tidak valid.".to_string());
    }

    // Read only top-level files or we can use walkdir to read recursively
    for entry in walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            if let Some(name) = entry.file_name().to_str() {
                // Ignore DS_Store or other common junk
                if name != ".DS_Store" {
                    file_names.push(name.to_string());
                }
            }
        }
    }

    if file_names.is_empty() {
        return Err("Tidak ditemukan file apapun di dalam folder ini.".to_string());
    }

    Ok(file_names)
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Preset {
    pub id: String,
    pub hero_name: String,
    pub patch_version: String,
    pub files: String,
}

fn get_preset_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app_data_dir: {}", e))?;
    if !path.exists() {
        std::fs::create_dir_all(&path)
            .map_err(|e| format!("Failed to create app_data_dir: {}", e))?;
    }
    Ok(path.join("presets.json"))
}

#[tauri::command]
pub fn load_presets(app_handle: tauri::AppHandle) -> Result<Vec<Preset>, String> {
    let path = get_preset_path(&app_handle)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let presets: Vec<Preset> = serde_json::from_str(&data).unwrap_or_default();
    Ok(presets)
}

#[tauri::command]
pub fn save_preset(app_handle: tauri::AppHandle, preset: Preset) -> Result<(), String> {
    let mut presets = load_presets(app_handle.clone())?;
    presets.push(preset);
    let data = serde_json::to_string_pretty(&presets).map_err(|e| e.to_string())?;
    fs::write(get_preset_path(&app_handle)?, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_preset(app_handle: tauri::AppHandle, id: String) -> Result<(), String> {
    let mut presets = load_presets(app_handle.clone())?;
    presets.retain(|p| p.id != id);
    let data = serde_json::to_string_pretty(&presets).map_err(|e| e.to_string())?;
    fs::write(get_preset_path(&app_handle)?, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn export_presets(dest_path: String, presets_to_export: Vec<Preset>) -> Result<(), String> {
    if presets_to_export.is_empty() {
        return Err("No presets selected to export".to_string());
    }
    let data = serde_json::to_string_pretty(&presets_to_export).map_err(|e| e.to_string())?;
    fs::write(dest_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn import_presets(app_handle: tauri::AppHandle, src_path: String) -> Result<(), String> {
    let new_data = fs::read_to_string(&src_path).map_err(|e| e.to_string())?;
    let imported_presets: Vec<Preset> =
        serde_json::from_str(&new_data).map_err(|e| format!("Invalid JSON format: {}", e))?;

    let mut current_presets = load_presets(app_handle.clone())?;

    for mut p in imported_presets {
        // Prevent duplicate IDs by regenerating ID if it exists
        if current_presets.iter().any(|existing| existing.id == p.id) {
            p.id = format!("{}_imported", p.id);
        }
        current_presets.push(p);
    }

    let merged_data = serde_json::to_string_pretty(&current_presets).map_err(|e| e.to_string())?;
    fs::write(get_preset_path(&app_handle)?, merged_data).map_err(|e| e.to_string())?;
    Ok(())
}
