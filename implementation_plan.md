# Double Check & Refinement Plan

I have reviewed all your concerns carefully and designed the following refinements to address them comprehensively.

## Proposed Changes

### 1. English as Default Language
We will change the default fallback language in the frontend state initialization from Indonesian (`"id"`) to English (`"en"`).
#### [MODIFY] [App.tsx](file:///c:/Users/Administrator/Documents/ScriptMLBB/mlbb-injector/src/App.tsx)
- Change `const [lang, setLang] = createSignal<Lang>((localStorage.getItem("lang") as Lang) || "id");` to fallback to `"en"`.

### 2. Device Name & Multi-Device Target Accuracy
**Target Accuracy**: I have double-checked the Rust backend (`adb_wrapper.rs`). Every single command sent to ADB (push, pull, shell, install) correctly receives the `-s <device_id>` argument. This guarantees that commands are **never** broadcasted blindly, and always execute on the specific device selected in the UI.
**Better Device Names**: Currently, the UI only shows raw serial numbers (e.g. `R58N...`). I will update the backend to query `adb devices -l` and parse the device model so that the UI can display friendly names like `Samsung SM-A525F (R58N...)`.
#### [MODIFY] [adb_wrapper.rs](file:///c:/Users/Administrator/Documents/ScriptMLBB/mlbb-injector/src-tauri/src/adb_wrapper.rs)
- Refactor `get_devices` to run `adb devices -l` and return a struct `{ id: String, name: String }`.
#### [MODIFY] [App.tsx](file:///c:/Users/Administrator/Documents/ScriptMLBB/mlbb-injector/src/App.tsx)
- Update the frontend state to parse the new device struct and display the friendly model name in the dropdown, while secretly keeping the ID for backend communication.

### 3. Asset Extractor & CMD Window Check
- **Asset Extractor**: The extraction logic works perfectly by utilizing Android's built-in `tar` and Windows' built-in `tar`. It is solid and does not require third-party dependencies.
- **CMD Window**: I have confirmed that *all* invocations, including the asset extraction process and the Python patcher executable, are wrapped in the `create_command` helper which firmly injects the `CREATE_NO_WINDOW` flag. The ninja mode is guaranteed to be fully active across all features.

> [!TIP]
> Does this plan cover everything you wanted me to double-check? Should I proceed with the execution?
