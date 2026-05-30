import os
import sys
import subprocess
import shutil

def get_target_triple():
    # Run rustc -vV to get the host target triple
    result = subprocess.run(['rustc', '-vV'], capture_output=True, text=True, check=True)
    for line in result.stdout.splitlines():
        if line.startswith('host:'):
            return line.split(' ')[1].strip()
    raise Exception("Could not determine Rust host target triple")

def main():
    target = get_target_triple()
    print(f"Detected target triple: {target}")

    # Build the Python sidecar using PyInstaller
    subprocess.run([sys.executable, '-m', 'PyInstaller', '--onefile', 'src-python/patcher.py'], check=True)

    # Determine the source executable name
    if sys.platform == 'win32':
        src_exe = 'dist/patcher.exe'
        dest_exe = f'src-tauri/binaries/patcher-{target}.exe'
    else:
        src_exe = 'dist/patcher'
        dest_exe = f'src-tauri/binaries/patcher-{target}'

    # Ensure binaries directory exists
    os.makedirs('src-tauri/binaries', exist_ok=True)

    # Move to the correct name expected by Tauri
    shutil.copy(src_exe, dest_exe)
    print(f"Successfully built and moved sidecar to {dest_exe}")

if __name__ == '__main__':
    main()
