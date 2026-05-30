import sys

with open('src-tauri/src/adb_wrapper.rs', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all Command::new
content = content.replace('Command::new', 'create_command')

# Inject helper function
helper = """
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
"""

content = content.replace('use tauri::{AppHandle, Emitter, Manager};', 'use tauri::{AppHandle, Emitter, Manager};\n' + helper)

with open('src-tauri/src/adb_wrapper.rs', 'w', encoding='utf-8') as f:
    f.write(content)
