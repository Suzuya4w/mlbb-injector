# ADB Background Auto-Kill (Installer Fix)

## What was Changed

### 1. Tauri Application Lifecycle Hook
I hooked into Tauri's core application event loop (`RunEvent::Exit`). This specific event is fired right before the entire application shuts down (when the user clicks the X button or closes the window).

### 2. ADB Server Graceful Termination
Inside the exit hook, the Rust backend now fires a silent system command (`taskkill /f /im adb.exe`) to forcefully cleanly shut down the ADB server. 
- **The Result**: The `AdbWinApi.dll` file is immediately unlocked by Windows the second you close the MLBB Injector application. 
- **The Impact**: Next time you (or your users) download a newer `.exe` installer from GitHub, the NSIS installer will be able to effortlessly overwrite the files without ever throwing the infamous `os error 32` or "Error opening file for writing" popup.

### 3. Version Bump
Everything has been cleanly synchronized to **`v1.2.2`** to trigger a fresh GitHub Action build that incorporates this QoL update.
