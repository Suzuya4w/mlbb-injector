# MLBB Asset Tool & Mod Injector

<div align="center">
  <img src="public/app_logo.png" width="250" alt="MLBB Injector Logo">
</div>

A high-performance, cyberpunk-themed desktop application built with **Tauri 2 (Rust + SolidJS)** to manage Mobile Legends: Bang Bang assets on Android devices. This tool bypasses the need for manual file managers by interacting directly with the Android filesystem via ADB.

<br>
<div align="center">
  <img src="public/Screenshot.png" width="800" alt="MLBB Injector Screenshot">
</div>


## ✨ Features

- **Direct Mod Installer:** Inject `.zip` mods or direct MediaFire links straight to your connected Android device without manual extraction or copying.
- **Asset Extractor:** Pull original or modified assets from the game directory directly to your PC for backup or modification purposes.
- **Mod Database:** Save, manage, export, and import your favorite extraction keywords/presets into a secure local database.
- **Bilingual Support:** Instantly switch between English (`[ EN ]`) and Indonesian (`[ ID ]`) languages.
- **Cyberpunk Aesthetic:** Smooth hardware-accelerated CSS animations, Fira Code typography, and a glowing neon hacker interface.

## 📥 Download & Installation

You don't need to build the app yourself to use it! Pre-compiled installers for your operating system are generated automatically.

1. Go to the [Releases](../../releases/latest) page.
2. Download the installer for your OS:
   - **Windows:** Download the `.exe` or `.msi` file.
   - **macOS:** Download the `.dmg` or `.app` file *(Note: macOS/Linux builds currently require manual placement of ADB binaries).*
   - **Linux:** Download the `.deb` or `.AppImage` or if you use Arch-based Linux, download the `.tar.gz` file.
3. Install and run the application!

*Note: For Windows users, **Windows Defender might flag the application because it is unsigned**. This is a false positive common in open-source tools. You can safely click "More info" -> "Run anyway".*

### 💡 Creating Custom ZIP Mods
To ensure your custom mods work perfectly in-game, you **MUST** accurately replicate the original sub-folder structure inside your ZIP file. 
For example, if your modified skin file originally resides in `Art/android/111/`, your ZIP must contain the exact `Art/android/111/` folders. Do not place the files at the root of the ZIP!

## 🚀 Prerequisites

- Developer Mode and **USB Debugging** must be enabled on your Android device.
- **Node.js** (v18+) and **Rust** installed on your PC (for development only).

## 🛠️ Development

Install dependencies:
```bash
npm install
```

Run in development mode:
```bash
npm run tauri dev
```

Build the final executable (Installer):
```bash
npm run tauri build
```

### ⚠️ Troubleshooting (Windows Developer Only)

If you encounter a compilation error similar to `os error 32: The process cannot access the file` while running `npm run tauri dev` on Windows, it means the ADB server is currently running in the background and locking the `AdbWinApi.dll` file. 

To fix this, simply kill the ADB process by running the following command in your terminal, then try building again:
```bash
taskkill /f /im adb.exe
```

## 📜 License

This project is open-source and available under the [Apache License 2.0](LICENSE).

---
*Created by [Suzuya4w](https://github.com/Suzuya4w)*
