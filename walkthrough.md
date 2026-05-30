# Device Refinement & Language Polish

## What was Changed

### 1. English as Default Language
I updated `src/App.tsx` so that when a new user opens the application for the first time, it checks `localStorage`. If no language is found, it automatically defaults to `"en"` instead of `"id"`. 

### 2. Beautiful Device Names
Instead of just displaying the raw Android Serial Number (e.g., `R58N...`), the application now queries ADB for the detailed device model string.
- **Backend (`adb_wrapper.rs`)**: Refactored `get_devices` to use `adb devices -l` and parse the output to construct a `Device` object: `{ id: "R58N...", name: "Samsung SM-A525F" }`.
- **Frontend (`App.tsx`)**: The UI dropdown now gracefully displays the device name while internally using the `id` to guarantee the commands reach the exact chosen device.

### 3. Verification of Multi-Device Targeting
Double-checked the Rust backend to ensure that absolutely every ADB command (from fetching lists to pushing files) uses the `-s <device_id>` flag. This guarantees pinpoint accuracy when multiple devices (or emulators) are connected to your PC simultaneously.

> [!TIP]
> All changes have been pushed to the `master` branch. As usual, to see the changes you will need to restart your terminal and `npm run tauri dev` session.
