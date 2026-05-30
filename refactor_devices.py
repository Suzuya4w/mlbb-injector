import re

with open('src-tauri/src/adb_wrapper.rs', 'r', encoding='utf-8') as f:
    content = f.read()

device_struct = """
#[derive(Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
}
"""

new_get_devices = """
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
"""

# Insert struct before HeroMods
content = content.replace('pub struct HeroMods {', device_struct.strip() + '\n\n#[derive(Serialize, Deserialize)]\npub struct HeroMods {')

# Replace get_devices function
old_get_devices_pattern = re.compile(r'#\[tauri::command\]\s*pub fn get_devices.*?Ok\(devices\)\s*\}', re.DOTALL)
content = old_get_devices_pattern.sub(new_get_devices.strip(), content)

with open('src-tauri/src/adb_wrapper.rs', 'w', encoding='utf-8') as f:
    f.write(content)
