import { createSignal, onMount, For } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";

interface ProgressPayload {
  message: String;
  progress: number;
}

interface ToastItem {
  id: number;
  msg: string;
  type: 'info' | 'error' | 'success';
}

const DICT = {
  en: {
    system_boot: "> SYSTEM_BOOT_UP_SEQUENCE_",
    welcome: "> WELCOME TO MLBB ASSET TOOL 1.0",
    description: "> YOU CAN INSTALL MODS OR EXTRACT ASSETS",
    target_device: "TARGET DEVICE",
    not_found: "[ NOT FOUND ]",
    refresh: "[ REFRESH CONNECTIONS ]",
    subtitle: "ULTIMATE MOD MANAGER",
    main_interface: "MAIN INTERFACE",
    mod_installer: "MOD INSTALLER",
    mod_installer_desc: "Install mods directly from ZIP files or MediaFire links",
    open_zip: "[ OPEN LOCAL ZIP FILES ]",
    or: "- OR -",
    install: "INSTALL",
    data_management: "DATA MANAGEMENT",
    asset_extractor: "ASSET EXTRACTOR",
    asset_extractor_desc: "Extract multiple assets from device to PC. Separate keywords with comma.",
    open_db: "[ OPEN DB ]",
    scan_folder: "[ SCAN FOLDER ]",
    extract_to: "EXTRACT TO FOLDER",
    system_logs: "SYSTEM LOGS",
    collapse: "[ CLICK TO COLLAPSE ]",
    expand: "[ CLICK TO EXPAND ]",
    processing: "PROCESSING",
    mod_database: "MOD DATABASE",
    save_preset_title: "SAVE CURRENT KEYWORDS AS PRESET",
    save: "SAVE",
    current_keywords: "Current keywords:",
    none: "None",
    saved_presets: "SAVED PRESETS",
    no_presets: "NO PRESETS FOUND",
    patch: "PATCH:",
    use: "USE",
    hero_placeholder: "Hero Name (e.g: Lesley)",
    patch_placeholder: "Patch Version (e.g: 1.8.44)",
    dump_placeholder: "e.g: HeroInfo, Audio.bnk, Lancelot",
    lang: "EN",
    toast_no_device: "Please connect a device first",
    toast_all_installed: "All mods successfully installed",
    toast_installed: "Mod successfully installed",
    toast_install_failed: "Installation failed:",
    toast_invalid_url: "Invalid MediaFire link",
    toast_url_installed: "Mod from link successfully installed",
    toast_download_failed: "Download failed:",
    toast_empty_keyword: "Keyword cannot be empty",
    toast_extract_success: "Assets successfully extracted to PC",
    toast_extract_failed: "Extraction failed:",
    toast_scan_success: "Successfully detected {count} files",
    toast_scan_failed: "Scan failed:",
    toast_preset_saved: "Preset saved",
    toast_preset_save_failed: "Failed to save preset:",
    toast_preset_deleted: "Preset deleted",
    toast_preset_delete_failed: "Failed to delete preset:",
    about_btn: "[ ABOUT ]",
    about_title: "ABOUT MLBB INJECTOR",
    about_desc: "A high-performance cyberpunk-themed desktop application built with Tauri 2 (Rust + SolidJS) to seamlessly manage Mobile Legends assets.",
    about_dev: "Developer:",
    about_license: "License:",
    about_version: "Version:",
    info_btn: "[ INFO ]",
    info_title: "SYSTEM INFORMATION & GUIDE",
    info_mod_installer: "MOD INSTALLER",
    info_mod_installer_desc: "Directly inject modifications into the connected device using a ZIP file or a MediaFire link. Eliminates manual copying.",
    info_database: "MOD DATABASE",
    info_database_desc: "Save your favorite mod extraction presets. You can import or export these collections to share with the community seamlessly.",
    info_extractor: "ASSET EXTRACTOR",
    info_extractor_desc: "Pull original or modified assets directly from the game's directory on your Android device to your PC for backup or modification.",
    info_close: "[ CLOSE ]",
    export_all: "[ EXPORT ALL ]",
    export_selected: "[ EXPORT SELECTED ]",
    import_db: "[ IMPORT PRESETS ]",
    toast_export_success: "Presets exported successfully",
    toast_import_success: "Presets imported successfully",
    confirm_extract_title: "WARNING: HEAVY EXTRACTION",
    confirm_extract_msg: "This process will extract multiple files to your PC and may take some time depending on your disk speed. Do you want to continue?",
    confirm_delete_title: "DELETE PRESET",
    confirm_delete_msg: "Are you sure you want to delete this preset? This action cannot be undone.",
    btn_yes: "YES, PROCEED",
    btn_cancel: "CANCEL",
    toast_device_not_detected: "No device detected",

    log_boot: "SYSTEM BOOT UP SEQUENCE...",
    log_connecting: "CONNECTING TO ADB DAEMON...",
    log_success_device: "SUCCESS: {count} DEVICE(S) DETECTED.",
    log_fail_device: "FAILED: NO DEVICES FOUND. PLEASE CHECK USB CONNECTION.",
    log_fatal: "FATAL ERROR: {error}",
    log_bulk_zip: "INITIATING BULK ZIP INSTALL: {count} FILES...",
    log_status: "STATUS: {res}",
    log_zip: "INITIATING ZIP INSTALL: {file}",
    log_error: "ERROR: {error}",
    log_downloading: "DOWNLOADING URL: {url}",
    log_extracting: "EXTRACTING ASSETS: [{keyword}] TO {dir}...",
    log_scanning: "SCANNING FOLDER: {dir}...",
    log_found: "FOUND {count} FILES. KEYWORDS UPDATED.",
  },
  id: {
    system_boot: "> URUTAN_BOOT_SISTEM_",
    welcome: "> SELAMAT DATANG DI MLBB ASSET TOOL 1.0",
    description: "> ANDA DAPAT MENGINSTAL MOD ATAU MENGEKSTRAK ASET",
    target_device: "TARGET PERANGKAT",
    not_found: "[ TIDAK DITEMUKAN ]",
    refresh: "[ SEGARKAN KONEKSI ]",
    subtitle: "MANAJER MOD ULTIMAT",
    main_interface: "ANTARMUKA UTAMA",
    mod_installer: "PENGINSTAL MOD",
    mod_installer_desc: "Instal mod langsung dari file ZIP atau tautan MediaFire",
    open_zip: "[ BUKA FILE ZIP LOKAL ]",
    or: "- ATAU -",
    install: "INSTAL",
    data_management: "MANAJEMEN DATA",
    asset_extractor: "EKSTRAKTOR ASET",
    asset_extractor_desc: "Ekstrak banyak aset dari HP ke PC. Pisahkan dengan koma.",
    open_db: "[ BUKA DATABASE ]",
    scan_folder: "[ PINDAI FOLDER ]",
    extract_to: "EKSTRAK KE FOLDER",
    system_logs: "LOG SISTEM",
    collapse: "[ KLIK UNTUK TUTUP ]",
    expand: "[ KLIK UNTUK BUKA ]",
    processing: "MEMPROSES",
    mod_database: "DATABASE MOD",
    save_preset_title: "SIMPAN KATA KUNCI SEBAGAI PRESET",
    save: "SIMPAN",
    current_keywords: "Kata kunci saat ini:",
    none: "Kosong",
    saved_presets: "PRESET TERSIMPAN",
    no_presets: "TIDAK ADA PRESET",
    patch: "VERSI:",
    use: "PAKAI",
    hero_placeholder: "Nama Hero (Cth: Lesley)",
    patch_placeholder: "Versi Patch (Cth: 1.8.44)",
    dump_placeholder: "Cth: HeroInfo, Audio.bnk, Lancelot",
    lang: "ID",
    toast_no_device: "Silakan sambungkan perangkat terlebih dahulu",
    toast_all_installed: "Semua mod berhasil diinstal",
    toast_installed: "Mod berhasil diinstal",
    toast_install_failed: "Instalasi gagal:",
    toast_invalid_url: "Tautan MediaFire tidak valid",
    toast_url_installed: "Mod dari tautan berhasil diinstal",
    toast_download_failed: "Unduhan gagal:",
    toast_empty_keyword: "Kata kunci tidak boleh kosong",
    toast_extract_success: "Aset berhasil diekstrak ke PC",
    toast_extract_failed: "Ekstraksi gagal:",
    toast_scan_success: "Berhasil mendeteksi {count} nama file",
    toast_scan_failed: "Gagal memindai:",
    toast_preset_saved: "Preset disimpan",
    toast_preset_save_failed: "Gagal menyimpan preset:",
    toast_preset_deleted: "Preset dihapus",
    toast_preset_delete_failed: "Gagal menghapus preset:",
    about_btn: "[ TENTANG ]",
    about_title: "TENTANG MLBB INJECTOR",
    about_desc: "Aplikasi desktop bertema cyberpunk berperforma tinggi yang dibangun dengan Tauri 2 (Rust + SolidJS) untuk mengelola aset Mobile Legends dengan mulus.",
    about_dev: "Pengembang:",
    about_license: "Lisensi:",
    about_version: "Versi:",
    info_btn: "[ INFO ]",
    info_title: "INFORMASI SISTEM & PANDUAN",
    info_mod_installer: "PEMASANG MOD",
    info_mod_installer_desc: "Menyuntikkan modifikasi langsung ke perangkat yang terhubung menggunakan file ZIP atau tautan MediaFire. Bebas salin manual.",
    info_database: "DATABASE MOD",
    info_database_desc: "Simpan preset ekstraksi mod favorit Anda. Anda dapat mengimpor atau mengekspor koleksi ini untuk dibagikan ke komunitas.",
    info_extractor: "PENGEKSTRAK ASET",
    info_extractor_desc: "Tarik aset asli atau modifikasi langsung dari direktori game di perangkat Android Anda ke PC untuk dicadangkan atau diedit.",
    info_close: "[ TUTUP ]",
    export_all: "[ EKSPOR SEMUA ]",
    export_selected: "[ EKSPOR TERPILIH ]",
    import_db: "[ IMPOR PRESET ]",
    toast_export_success: "Preset berhasil diekspor",
    toast_import_success: "Preset berhasil diimpor",
    confirm_extract_title: "PERINGATAN: EKSTRAKSI BERAT",
    confirm_extract_msg: "Proses ini akan mengekstrak banyak file ke PC dan mungkin memakan waktu. Apakah Anda ingin melanjutkan?",
    confirm_delete_title: "HAPUS PRESET",
    confirm_delete_msg: "Apakah Anda yakin ingin menghapus preset ini? Data tidak bisa dikembalikan.",
    btn_yes: "YA, LANJUTKAN",
    btn_cancel: "BATAL",
    toast_device_not_detected: "Perangkat tidak terdeteksi",

    log_boot: "MEMULAI URUTAN BOOT SISTEM...",
    log_connecting: "MENGHUBUNGKAN KE DAEMON ADB...",
    log_success_device: "SUKSES: {count} PERANGKAT TERDETEKSI.",
    log_fail_device: "GAGAL: TIDAK ADA PERANGKAT. PERIKSA KONEKSI USB.",
    log_fatal: "KESALAHAN FATAL: {error}",
    log_bulk_zip: "MEMULAI INSTALASI ZIP MASSAL: {count} FILE...",
    log_status: "STATUS: {res}",
    log_zip: "MEMULAI INSTALASI ZIP: {file}",
    log_error: "ERROR: {error}",
    log_downloading: "MENGUNDUH TAUTAN: {url}",
    log_extracting: "MENGEKSTRAK ASET: [{keyword}] KE {dir}...",
    log_scanning: "MEMINDAI FOLDER: {dir}...",
    log_found: "MENEMUKAN {count} FILE. KATA KUNCI DIPERBARUI.",
  }
};


type Device = {
  id: string;
  name: string;
};

type Lang = "en" | "id";

let toastIdCounter = 0;

function App() {
  const [lang, setLang] = createSignal<Lang>((localStorage.getItem("lang") as Lang) || "en");

  const [confirmState, setConfirmState] = createSignal({
    isOpen: false,
    title: "",
    msg: "",
    onConfirm: () => {}
  });

  function openConfirm(title: string, msg: string, onConfirm: () => void) {
      setConfirmState({ isOpen: true, title, msg, onConfirm });
  }
  function closeConfirm() {
      setConfirmState(p => ({ ...p, isOpen: false }));
  }


  const t = (key: keyof typeof DICT["en"], args?: any) => {
    let str = DICT[lang()][key] || DICT["en"][key] || key;
    if (args) {
      for (const k in args) {
        str = str.replace(`{${k}}`, args[k]);
      }
    }
    return str;
  };

  const [devices, setDevices] = createSignal<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = createSignal("");
  const [logs, setLogs] = createSignal<string[]>([]);
  const [isInjecting, setIsInjecting] = createSignal(false);
  
  const [mediafireUrl, setMediafireUrl] = createSignal("");
  const [dumpKeyword, setDumpKeyword] = createSignal("");
  
  const [isTerminalOpen, setIsTerminalOpen] = createSignal(false);
  
  // Database States
  const [isDbOpen, setIsDbOpen] = createSignal(false);
  const [isInfoOpen, setIsInfoOpen] = createSignal(false);
  const [isAboutOpen, setIsAboutOpen] = createSignal(false);
  const [presets, setPresets] = createSignal<any[]>([]);
  const [selectedPresets, setSelectedPresets] = createSignal<string[]>([]);
  const [newHeroName, setNewHeroName] = createSignal("");
  const [newPatch, setNewPatch] = createSignal("");
  
  const [progress, setProgress] = createSignal(0);
  const [toasts, setToasts] = createSignal<ToastItem[]>([]);

  function addToast(msg: string, type: "info" | "error" | "success" = "info") {
    const id = ++toastIdCounter;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(toast => toast.id !== id));
    }, 4000);
  }

  function appendLog(msg: string) {
    setLogs(l => {
      const newLogs = [...l, `> ${msg}`];
      return newLogs.slice(-50); 
    });
  }

  async function checkDevices() {
    try {
      appendLog(t("log_boot"));
      appendLog(t("log_connecting"));
      const result: Device[] = await invoke("get_devices");
      setDevices(result);
      if (result.length > 0) {
        setSelectedDevice(result[0].id);
        appendLog(t("log_success_device", { count: result.length }));
      } else {
        appendLog(t("log_fail_device"));
        addToast(t("toast_device_not_detected"), "error");
      }
    } catch (error) {
      appendLog(t("log_fatal", { error }));
      addToast(String(error), "error");
    }
  }

  onMount(() => {
    checkDevices();
    loadPresets();

    listen<ProgressPayload>("inject-progress", (event) => {
      let msg = String(event.payload.message).toUpperCase();
      
      if (lang() === "en") {
          // Terjemahan kasar dari log backend Rust (ID -> EN)
          msg = msg.replace("MENGEKSTRAK SCRIPT ZIP", "EXTRACTING ZIP SCRIPT");
          msg = msg.replace("MENYALIN", "COPYING");
          msg = msg.replace("INJEKSI SELESAI!", "INJECTION COMPLETE!");
          msg = msg.replace("MENGUNDUH MOD DARI TAUTAN MEDIAFIRE...", "DOWNLOADING MOD FROM MEDIAFIRE LINK...");
          msg = msg.replace("MEMULAI PROSES INJEKSI KE HP", "INITIATING INJECTION PROCESS TO DEVICE");
          msg = msg.replace("MENCARI ASET DI", "SEARCHING ASSETS IN");
          msg = msg.replace("MENARIK", "PULLING");
          msg = msg.replace("MENGOMPRES", "COMPRESSING");
          msg = msg.replace("KE PC", "TO PC");
          msg = msg.replace("GAGAL", "FAILED");
      }
      
      appendLog(msg);
      setProgress(event.payload.progress);
    });
  });

  async function handleInstallZip() {
    if (!selectedDevice()) {
        addToast(t("toast_no_device"), "error");
        return;
    }

    try {
        const files = await open({
            multiple: true,
            directory: false,
            filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
        });

        if (files && Array.isArray(files) && files.length > 0) {
            setIsInjecting(true);
            setProgress(0);
            appendLog(t("log_bulk_zip", { count: files.length }));

            const res: string = await invoke("inject_zip_script", {
                deviceId: selectedDevice(),
                zipPaths: files
            });
            
            appendLog(t("log_status", { res }));
            setProgress(100);
            addToast(t("toast_all_installed"), "success");
        } else if (files && typeof files === 'string') {
            setIsInjecting(true);
            setProgress(0);
            appendLog(t("log_zip", { file: files }));

            const res: string = await invoke("inject_zip_script", {
                deviceId: selectedDevice(),
                zipPaths: [files]
            });
            
            appendLog(t("log_status", { res }));
            setProgress(100);
            addToast(t("toast_installed"), "success");
        }
    } catch (e) {
        appendLog(t("log_error", { error: e }));
        setProgress(0);
        addToast(`${t("toast_install_failed")} ${e}`, "error");
    } finally {
        setIsInjecting(false);
    }
  }

  async function handleDownloadMediafire() {
    if (!selectedDevice()) {
        addToast(t("toast_no_device"), "error");
        return;
    }
    if (!mediafireUrl().includes("mediafire.com")) {
        addToast(t("toast_invalid_url"), "error");
        return;
    }

    setIsInjecting(true);
    setProgress(0);
    appendLog(t("log_downloading", { url: mediafireUrl() }));

    try {
        const res: string = await invoke("download_and_inject_url", {
            deviceId: selectedDevice(),
            url: mediafireUrl()
        });
        appendLog(t("log_status", { res }));
        setProgress(100);
        addToast(t("toast_url_installed"), "success");
    } catch (e) {
        appendLog(t("log_error", { error: e }));
        setProgress(0);
        addToast(`${t("toast_download_failed")} ${e}`, "error");
    } finally {
        setIsInjecting(false);
        setMediafireUrl(""); 
    }
  }

  async function handleDumpAsset() {
    if (!selectedDevice()) {
        addToast(t("toast_no_device"), "error");
        return;
    }
    if (!dumpKeyword()) {
        addToast(t("toast_empty_keyword"), "error");
        return;
    }

    try {
        const saveDir = await open({
            title: "Pilih Folder Tujuan Ekstraksi",
            directory: true,
            multiple: false
        });

        if (saveDir && typeof saveDir === 'string') {
            openConfirm(t("confirm_extract_title"), t("confirm_extract_msg"), async () => {
                closeConfirm();
                setIsInjecting(true);
                setProgress(0);
                appendLog(t("log_extracting", { keyword: dumpKeyword(), dir: saveDir }));
                
                try {
                    const res: string = await invoke("pull_asset", {
                        deviceId: selectedDevice(),
                        keyword: dumpKeyword(),
                        destPath: saveDir
                    });
        
                    appendLog(t("log_status", { res }));
                    setProgress(100);
                    addToast(t("toast_extract_success"), "success");
                } catch(err) {
                    appendLog(t("log_error", { error: err }));
                    setProgress(0);
                    addToast(`${t("toast_extract_failed")} ${err}`, "error");
                } finally {
                    setIsInjecting(false);
                    setDumpKeyword("");
                }
            });
        }
    } catch (e) {
        addToast(`Error: ${e}`, "error");
    }
  }

  async function handleScanFolder() {
    try {
        const scanDir = await open({
            title: "Pilih Folder Mod Lokal",
            directory: true,
            multiple: false
        });

        if (scanDir && typeof scanDir === 'string') {
            setIsInjecting(true);
            appendLog(t("log_scanning", { dir: scanDir }));

            const res: string[] = await invoke("scan_local_folder", {
                path: scanDir
            });

            if (res.length > 0) {
                setDumpKeyword(res.join(", "));
                appendLog(t("log_found", { count: res.length }));
                addToast(t("toast_scan_success", { count: res.length }), "success");
            }
        }
    } catch (e) {
        appendLog(t("log_error", { error: e }));
        addToast(`${t("toast_scan_failed")} ${e}`, "error");
    } finally {
        setIsInjecting(false);
    }
  }

  async function loadPresets() {
      try {
          const res: any[] = await invoke("load_presets");
          setPresets(res);
      } catch(e) {
          console.error(e);
      }
  }

  async function handleSavePreset() {
      if (!newHeroName() || !newPatch() || !dumpKeyword()) return;
      try {
          await invoke("save_preset", {
              preset: {
                  id: Date.now().toString(),
                  hero_name: newHeroName(),
                  patch_version: newPatch(),
                  files: dumpKeyword()
              }
          });
          addToast(t("toast_preset_saved"), "success");
          setNewHeroName("");
          setNewPatch("");
          loadPresets();
      } catch(e) {
          addToast(`${t("toast_preset_save_failed")} ${e}`, "error");
      }
  }

  async function handleDeletePreset(id: string) {
      openConfirm(t("confirm_delete_title"), t("confirm_delete_msg"), async () => {
          try {
              await invoke("delete_preset", { id });
              addToast(t("toast_preset_deleted"), "success");
              loadPresets();
          } catch(e) {
              addToast(`${t("toast_preset_delete_failed")} ${e}`, "error");
          }
          closeConfirm();
      });
  }
  
  async function handleExportPresets() {
      if (presets().length === 0) return;
      
      const toExport = selectedPresets().length > 0 
          ? presets().filter(p => selectedPresets().includes(p.id)) 
          : presets();
          
      try {
          const savePath = await save({ filters: [{ name: "JSON", extensions: ["json"] }] });
          if (savePath) {
              await invoke("export_presets", { destPath: savePath, presetsToExport: toExport });
              addToast(t("toast_export_success"), "success");
              setSelectedPresets([]);
          }
      } catch (e) {
          addToast(`Error: ${e}`, "error");
      }
  }
  
  function toggleSelectPreset(id: string) {
      if (selectedPresets().includes(id)) {
          setSelectedPresets(p => p.filter(i => i !== id));
      } else {
          setSelectedPresets(p => [...p, id]);
      }
  }
  
  function toggleSelectAll() {
      if (selectedPresets().length === presets().length) {
          setSelectedPresets([]);
      } else {
          setSelectedPresets(presets().map(p => p.id));
      }
  }

  async function handleImportPresets() {
      try {
          const importPath = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
          if (importPath && typeof importPath === 'string') {
              await invoke("import_presets", { srcPath: importPath });
              addToast(t("toast_import_success"), "success");
              loadPresets();
          }
      } catch (e) {
          addToast(`Error: ${e}`, "error");
      }
  }


  return (
    <div class="h-screen w-screen bg-[#050505] text-[#D8D8D8] font-pixel overflow-hidden flex flex-col relative selection:bg-[#FF8A00] selection:text-black transition-all animate-fade-bg">
      
      {/* RETRO GRID BACKGROUND */}
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTYwIDBMMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] pointer-events-none opacity-80"></div>
      
      {/* HEADER TOP LEFT */}
      <div class="absolute top-4 left-6 z-10 flex flex-col gap-1 pointer-events-none">
        <span class="text-xs text-white/40 tracking-widest uppercase">{t("system_boot")}</span>
        <span class="text-xs text-white/40 tracking-widest uppercase">{t("welcome")}</span>
        <span class="text-xs text-white/40 tracking-widest uppercase">{t("description")}</span>
        <div class="mt-2 text-[#00F0FF]/50 text-[10px] font-bold tracking-[0.2em] pointer-events-auto hover:text-[#00F0FF] transition-colors cursor-pointer w-max" onClick={() => openUrl('https://github.com/Suzuya4w')}>
            // DEV: SUZUYA4W
        </div>
      </div>

      {/* DEVICE SELECTOR TOP RIGHT */}
      <div class="absolute top-4 right-6 z-20 flex flex-col items-end gap-2">
        <div class="flex gap-2 mb-1">
            <button 
                onClick={() => setIsAboutOpen(true)}
                class="bg-black border border-[#00F0FF] text-[#00F0FF] px-3 py-1 text-sm font-bold uppercase tracking-widest cursor-pointer hover:bg-[#00F0FF] hover:text-black transition-colors shadow-[0_0_5px_rgba(0,240,255,0.3)]"
            >
                {t("about_btn")}
            </button>
            <button 
                onClick={() => setIsInfoOpen(true)}
                class="bg-black border border-[#00F0FF] text-[#00F0FF] px-3 py-1 text-sm font-bold uppercase tracking-widest cursor-pointer hover:bg-[#00F0FF] hover:text-black transition-colors shadow-[0_0_5px_rgba(0,240,255,0.3)]"
            >
                {t("info_btn")}
            </button>
            <button 
                onClick={() => {
                  const newLang = lang() === "en" ? "id" : "en";
                  setLang(newLang);
                  localStorage.setItem("lang", newLang);
                }}
                class="bg-black border border-[#FF8A00] text-[#FF8A00] px-3 py-1 text-sm font-bold uppercase tracking-widest cursor-pointer hover:bg-[#FF8A00] hover:text-black transition-colors"
            >
                [ {t("lang")} ]
            </button>
        </div>
        <div class="border border-white/30 bg-black flex items-center px-2 shadow-lg">
            <span class="text-sm px-3 text-[#FF8A00] font-bold border-r border-white/30 py-2 uppercase tracking-wider">{t("target_device")}</span>
            <select 
                class="bg-transparent text-white px-4 py-2 text-base focus:outline-none appearance-none min-w-[180px] cursor-pointer"
                value={selectedDevice()}
                onChange={(e) => setSelectedDevice(e.target.value)}
            >
                {devices().length === 0 && <option value="">{t("not_found")}</option>}
                <For each={devices()}>
                    {(d) => <option value={d.id}>{d.name}</option>}
                </For>
            </select>
        </div>
        <button 
            onClick={checkDevices}
            class="text-xs text-white/50 hover:text-white uppercase tracking-widest cursor-pointer underline underline-offset-4 p-2 -m-2 transition-colors relative z-30"
        >
            {t("refresh")}
        </button>
      </div>

      {/* MAIN CENTERED CONTENT */}
      <div class="flex-1 flex flex-col items-center justify-center z-10 relative mt-[-20px] -translate-y-10 animate-fade-up">
        
        {/* TITLES */}
        <div class="text-center mb-6 mt-6">
            <h1 class="text-6xl font-bold text-white tracking-widest mb-3 drop-shadow-[4px_4px_0px_#FF8A00]">
                MLBB ASSET TOOL
            </h1>
            <div class="inline-block bg-white text-black px-6 py-2 text-sm font-bold tracking-[0.3em] uppercase shadow-[2px_2px_0px_#FF8A00]">
                {t("subtitle")}
            </div>
        </div>

        {/* CENTERED BOX */}
        <div class="border-4 border-white bg-black w-[900px] max-w-[95%] p-8 relative shadow-[10px_10px_0px_#FF8A00]">
            <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-black px-6 flex items-center gap-3 border-x-4 border-white border-t-4 pt-1">
                <span class="text-[#FF8A00]">✦</span>
                <span class="text-sm text-white font-bold uppercase tracking-[0.2em]">{t("main_interface")}</span>
                <span class="text-[#FF8A00]">✦</span>
            </div>

            <div class="flex flex-col gap-8 mt-2">
                
                {/* SECTION: INSTALL MOD */}
                <div class="flex flex-col gap-4">
                    <div class="text-center">
                        <span class="text-[#FF8A00] text-2xl font-bold uppercase tracking-[0.2em] drop-shadow-[1px_1px_0px_rgba(255,255,255,0.3)]">{t("mod_installer")}</span>
                        <div class="text-sm text-white/60 mt-2 uppercase tracking-wider">{t("mod_installer_desc")}</div>
                    </div>
                    
                    <div class="flex flex-col md:flex-row gap-5 items-center mt-2">
                        <button 
                            onClick={handleInstallZip}
                            disabled={isInjecting() || !selectedDevice()}
                            class="flex-1 w-full bg-transparent text-white border-2 border-white/40 hover:border-white hover:bg-white hover:text-black disabled:border-white/10 disabled:text-white/20 disabled:hover:bg-transparent font-bold py-5 text-base uppercase tracking-widest transition-colors cursor-pointer"
                        >
                            {t("open_zip")}
                        </button>
                        
                        <span class="text-white/40 text-sm font-bold tracking-widest">{t("or")}</span>
                        
                        <div class="flex-1 w-full flex">
                            <input 
                                type="text" 
                                placeholder="MediaFire Link..." 
                                class="flex-1 bg-transparent border-2 border-r-0 border-white/40 text-white px-5 py-4 text-base focus:outline-none focus:border-[#FF8A00] placeholder:text-white/30"
                                value={mediafireUrl()}
                                onInput={(e) => setMediafireUrl(e.target.value)}
                                disabled={isInjecting()}
                            />
                            <button 
                                onClick={handleDownloadMediafire}
                                disabled={isInjecting() || !selectedDevice() || !mediafireUrl()}
                                class="bg-[#FF8A00] text-black border-2 border-[#FF8A00] hover:bg-white hover:border-white disabled:bg-transparent disabled:border-white/10 disabled:text-white/20 font-bold px-8 py-4 text-base uppercase tracking-widest cursor-pointer transition-colors"
                            >
                                {t("install")}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="w-full h-px bg-white/30 relative my-1">
                    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-6 text-xs text-white/50 font-bold uppercase tracking-[0.3em]">
                        {t("data_management")}
                    </span>
                </div>

                {/* SECTION: EXTRACT ASSET */}
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 text-center pl-24">
                            <span class="text-[#FF8A00] text-2xl font-bold uppercase tracking-[0.2em] drop-shadow-[1px_1px_0px_rgba(255,255,255,0.3)]">{t("asset_extractor")}</span>
                            <div class="text-sm text-white/60 mt-2 uppercase tracking-wider">{t("asset_extractor_desc")}</div>
                        </div>
                        <button 
                            onClick={() => setIsDbOpen(true)}
                            class="bg-transparent text-white border border-[#FF8A00] px-4 py-2 hover:bg-[#FF8A00] hover:text-black uppercase text-xs font-bold tracking-widest cursor-pointer whitespace-nowrap"
                        >
                            {t("open_db")}
                        </button>
                    </div>

                    <div class="flex mt-2">
                        <button 
                            onClick={handleScanFolder}
                            disabled={isInjecting()}
                            class="bg-transparent text-white border-2 border-r-0 border-white/40 hover:bg-white hover:text-black hover:border-white disabled:border-white/10 disabled:text-white/20 disabled:hover:bg-transparent font-bold px-6 py-5 text-sm uppercase tracking-widest cursor-pointer transition-colors"
                        >
                            {t("scan_folder")}
                        </button>
                        <input 
                            type="text" 
                            placeholder={t("dump_placeholder")}
                            class="flex-1 bg-transparent border-2 border-r-0 border-white/40 text-white px-6 py-5 text-base focus:outline-none focus:border-[#FF8A00] placeholder:text-white/30 text-center tracking-widest font-bold"
                            value={dumpKeyword()}
                            onInput={(e) => setDumpKeyword(e.target.value)}
                            disabled={isInjecting()}
                        />
                        <button 
                            onClick={handleDumpAsset}
                            disabled={isInjecting() || !selectedDevice() || !dumpKeyword()}
                            class="bg-white text-black border-2 border-white hover:bg-[#FF8A00] hover:border-[#FF8A00] disabled:bg-transparent disabled:border-white/10 disabled:text-white/20 font-bold px-12 py-5 text-base uppercase tracking-widest cursor-pointer transition-colors"
                        >
                            {t("extract_to")}
                        </button>
                    </div>
                </div>

            </div>

            {/* PROGRESS BAR */}
            <div class={`absolute -bottom-1 left-0 w-full h-2 bg-black overflow-hidden transition-opacity ${progress() > 0 && progress() < 100 ? 'opacity-100' : 'opacity-0'}`}>
                <div class="h-full bg-[#00F0FF] shadow-[0_0_10px_#00F0FF] transition-all duration-300" style={{ width: `${progress()}%` }}></div>
            </div>
        </div>
      </div>

      {/* TERMINAL DRAWER */}
      <div class={`fixed bottom-0 left-0 w-full bg-black border-t-4 border-[#FF8A00] transition-transform duration-300 z-50 flex flex-col ${isTerminalOpen() ? 'translate-y-0 h-[40vh]' : 'translate-y-[calc(100%-48px)] h-[40vh]'}`}>
          <div 
            class="h-[48px] flex items-center justify-between px-8 cursor-pointer hover:bg-white/5 transition-colors relative"
            onClick={() => setIsTerminalOpen(!isTerminalOpen())}
          >
              <div class="flex items-center gap-4">
                  <span class="text-[#FF8A00] font-bold text-base tracking-[0.2em] uppercase">&gt; {t("system_logs")}</span>
                  <span class="text-white/40 text-xs font-bold uppercase tracking-widest">{isTerminalOpen() ? t("collapse") : t("expand")}</span>
              </div>
              <div class="flex items-center gap-6">
                  {progress() > 0 && <span class="text-[#00F0FF] text-sm font-bold uppercase tracking-widest drop-shadow-[0_0_3px_rgba(0,240,255,0.8)]">{t("processing")}: {progress()}%</span>}
                  <span class={`text-sm text-white/80 ${isTerminalOpen() ? 'rotate-180' : ''} transition-transform`}>▲</span>
              </div>
          </div>
          
          <div class="flex-1 bg-[#050505] overflow-y-auto p-6 border-t border-white/10 custom-scrollbar flex flex-col justify-end">
                <div class="flex flex-col gap-2 font-fira text-sm leading-relaxed text-white/80">
                    <For each={logs()}>
                        {(log) => <div class="break-words font-mono tracking-wide">{log}</div>}
                    </For>
                    <div class="animate-pulse inline-block w-3 h-5 bg-[#FF8A00] mt-1"></div>
                </div>
          </div>
      </div>

      {/* TOAST SYSTEM */}
      <div class="fixed top-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
          <For each={toasts()}>
              {(toast) => (
                  <div class={`pointer-events-auto border-2 bg-black px-5 py-3 flex items-center gap-4 min-w-[300px] shadow-[4px_4px_0px_rgba(0,0,0,0.5)]
                      ${toast.type === 'error' ? 'border-red-500 text-red-500' : 
                        toast.type === 'success' ? 'border-[#FF8A00] text-[#FF8A00]' : 'border-white text-white'}`}
                  >
                      <span class="font-bold text-lg">
                          {toast.type === 'error' ? '[!]' : toast.type === 'success' ? '[+]' : '[i]'}
                      </span>
                      <span class="text-xs uppercase tracking-widest font-bold leading-snug">{toast.msg}</span>
                  </div>
              )}
          </For>
      </div>

      {/* DATABASE MODAL */}
      {isDbOpen() && (
        <div class="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-bg">
            <div class="bg-[#050505] border-4 border-[#FF8A00] w-[800px] max-w-full max-h-[90vh] flex flex-col shadow-[10px_10px_0px_rgba(255,138,0,0.4)] animate-fade-zoom">
                <div class="flex items-center justify-between border-b-4 border-[#FF8A00] p-4 bg-[#FF8A00] text-black">
                    <div class="flex items-center gap-4">
                        <span class="font-bold text-xl uppercase tracking-widest">{t("mod_database")}</span>
                        <div class="flex gap-2 ml-4">
                            <button onClick={handleImportPresets} class="bg-black text-[#FF8A00] hover:bg-white hover:text-black border-2 border-black text-xs font-bold px-3 py-1 cursor-pointer transition-colors uppercase tracking-widest">{t("import_db")}</button>
                            <button 
                                onClick={handleExportPresets} 
                                disabled={presets().length === 0}
                                class="bg-black text-[#FF8A00] hover:bg-white hover:text-black disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-[#FF8A00] disabled:cursor-not-allowed border-2 border-black text-xs font-bold px-3 py-1 cursor-pointer transition-colors uppercase tracking-widest"
                            >
                                {selectedPresets().length > 0 ? t("export_selected") : t("export_all")}
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setIsDbOpen(false)} class="text-black font-bold text-xl hover:text-white cursor-pointer">[ X ]</button>
                </div>
                
                <div class="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-8 text-white">
                    
                    {/* ADD PRESET FORM */}
                    <div class="border-2 border-white/20 p-4">
                        <span class="text-[#FF8A00] font-bold text-sm tracking-widest uppercase mb-4 block">{t("save_preset_title")}</span>
                        <div class="flex gap-4">
                            <input 
                                type="text" 
                                placeholder={t("hero_placeholder")}
                                class="flex-1 bg-transparent border-2 border-white/40 px-4 py-2 text-sm focus:outline-none focus:border-[#FF8A00] font-fira tracking-wide"
                                value={newHeroName()}
                                onInput={(e) => setNewHeroName(e.target.value)}
                            />
                            <input 
                                type="text" 
                                placeholder={t("patch_placeholder")}
                                class="flex-1 bg-transparent border-2 border-white/40 px-4 py-2 text-sm focus:outline-none focus:border-[#FF8A00] font-fira tracking-wide"
                                value={newPatch()}
                                onInput={(e) => setNewPatch(e.target.value)}
                            />
                            <button 
                                onClick={handleSavePreset}
                                disabled={!newHeroName() || !newPatch() || !dumpKeyword()}
                                class="bg-white text-black font-bold px-6 py-2 uppercase text-sm hover:bg-[#FF8A00] disabled:opacity-50 cursor-pointer"
                            >
                                {t("save")}
                            </button>
                        </div>
                        <div class="mt-2 text-xs text-white/40">{t("current_keywords")} <span class="font-fira tracking-wider">{dumpKeyword() || t("none")}</span></div>
                    </div>

                    {/* PRESET LIST */}
                    <div>
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-[#FF8A00] font-bold text-sm tracking-widest uppercase">{t("saved_presets")}</span>
                            {presets().length > 0 && (
                                <label class="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white">
                                    <input 
                                        type="checkbox" 
                                        class="w-4 h-4 accent-[#FF8A00] cursor-pointer"
                                        checked={selectedPresets().length === presets().length && presets().length > 0}
                                        onChange={toggleSelectAll}
                                    />
                                    Select All
                                </label>
                            )}
                        </div>
                        {presets().length === 0 ? (
                            <div class="text-center text-white/30 text-sm py-4 border-2 border-dashed border-white/20">{t("no_presets")}</div>
                        ) : (
                            <div class="flex flex-col gap-2">
                                <For each={presets()}>
                                    {(p) => (
                                        <div class="border border-white/20 p-4 flex items-center justify-between hover:border-[#FF8A00]/50 bg-white/5 transition-colors">
                                            <div class="flex items-center gap-4 overflow-hidden">
                                                <input 
                                                    type="checkbox" 
                                                    class="w-5 h-5 accent-[#FF8A00] cursor-pointer"
                                                    checked={selectedPresets().includes(p.id)}
                                                    onChange={() => toggleSelectPreset(p.id)}
                                                />
                                                <div class="flex flex-col gap-1 overflow-hidden">
                                                    <div class="flex items-center gap-3">
                                                    <span class="font-bold text-lg text-[#FF8A00] uppercase tracking-wider">{p.hero_name}</span>
                                                    <span class="text-xs bg-white text-black px-2 py-0.5 font-bold">{t("patch")} {p.patch_version}</span>
                                                </div>
                                                <span class="text-sm text-white/70 font-fira tracking-wide truncate max-w-[400px]" title={p.files}>{p.files}</span>
                                                </div>
                                            </div>
                                            <div class="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setDumpKeyword(p.files);
                                                        setIsDbOpen(false);
                                                        addToast(`Loaded preset ${p.hero_name}`, "success");
                                                    }}
                                                    class="bg-white text-black text-xs font-bold px-4 py-2 uppercase hover:bg-[#FF8A00] cursor-pointer"
                                                >
                                                    {t("use")}
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePreset(p.id)}
                                                    class="bg-transparent text-white/50 border border-white/20 hover:text-red-500 hover:border-red-500 text-xs font-bold px-3 py-2 cursor-pointer"
                                                    title="Delete Preset"
                                                >
                                                    X
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
      )}


      {/* DOUBLE CONFIRM MODAL */}
      {confirmState().isOpen && (
        <div class="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-bg">
            <div class="bg-black border-4 border-red-600 w-[500px] max-w-full p-8 shadow-[10px_10px_0px_rgba(220,38,38,0.5)] text-center flex flex-col items-center animate-fade-zoom">
                <span class="text-red-600 font-bold text-4xl mb-4">!</span>
                <span class="text-white font-bold text-xl uppercase tracking-widest mb-4">{confirmState().title}</span>
                <p class="text-white/70 text-sm font-sans tracking-wide leading-relaxed mb-8">{confirmState().msg}</p>
                <div class="flex gap-4 w-full">
                    <button 
                        onClick={closeConfirm}
                        class="flex-1 bg-transparent text-white/50 border-2 border-white/20 hover:text-white hover:border-white font-bold py-3 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        {t("btn_cancel")}
                    </button>
                    <button 
                        onClick={confirmState().onConfirm}
                        class="flex-1 bg-red-600 text-black border-2 border-red-600 hover:bg-white hover:border-white font-bold py-3 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        {t("btn_yes")}
                    </button>
                </div>
            </div>
        </div>
      )}


      {/* INFO MODAL */}
      {isInfoOpen() && (
        <div class="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-bg">
            <div class="bg-[#050505] border-4 border-[#00F0FF] w-[600px] max-w-full p-8 shadow-[10px_10px_0px_rgba(0,240,255,0.4)] flex flex-col animate-fade-zoom text-white">
                <div class="flex items-center justify-between border-b-2 border-[#00F0FF] pb-4 mb-6">
                    <span class="font-bold text-xl uppercase tracking-widest text-[#00F0FF]">{t("info_title")}</span>
                    <button onClick={() => setIsInfoOpen(false)} class="text-white font-bold text-xl hover:text-[#00F0FF] cursor-pointer">X</button>
                </div>
                
                <div class="flex flex-col gap-6 font-sans tracking-wide leading-relaxed overflow-y-auto custom-scrollbar max-h-[60vh] pr-2">
                    <div>
                        <h3 class="text-[#FF8A00] font-bold text-lg mb-2 tracking-widest uppercase">{t("info_mod_installer")}</h3>
                        <p class="text-white/70 text-sm">{t("info_mod_installer_desc")}</p>
                    </div>
                    <div>
                        <h3 class="text-[#FF8A00] font-bold text-lg mb-2 tracking-widest uppercase">{t("info_database")}</h3>
                        <p class="text-white/70 text-sm">{t("info_database_desc")}</p>
                    </div>
                    <div>
                        <h3 class="text-[#FF8A00] font-bold text-lg mb-2 tracking-widest uppercase">{t("info_extractor")}</h3>
                        <p class="text-white/70 text-sm">{t("info_extractor_desc")}</p>
                    </div>
                </div>
                
                <div class="mt-8 flex justify-center">
                    <button 
                        onClick={() => setIsInfoOpen(false)}
                        class="bg-transparent text-[#00F0FF] border-2 border-[#00F0FF] hover:bg-[#00F0FF] hover:text-black font-bold px-8 py-2 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        {t("info_close")}
                    </button>
                </div>
            </div>
        </div>
      )}


      {/* ABOUT MODAL */}
      {isAboutOpen() && (
        <div class="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center backdrop-blur-sm p-4 animate-fade-bg">
            <div class="bg-[#050505] border-4 border-[#00F0FF] w-[500px] max-w-full p-8 shadow-[10px_10px_0px_rgba(0,240,255,0.4)] flex flex-col animate-fade-zoom text-white">
                <div class="flex items-center justify-between border-b-2 border-[#00F0FF] pb-4 mb-6">
                    <span class="font-bold text-xl uppercase tracking-widest text-[#00F0FF]">{t("about_title")}</span>
                    <button onClick={() => setIsAboutOpen(false)} class="text-white font-bold text-xl hover:text-[#00F0FF] cursor-pointer">X</button>
                </div>
                
                <div class="flex flex-col gap-6 font-sans tracking-wide leading-relaxed text-center">
                    <div class="flex justify-center mb-2">
                        <div class="w-24 h-24 border-2 border-[#FF8A00] bg-black shadow-[0_0_15px_rgba(255,138,0,0.5)] flex items-center justify-center overflow-hidden">
                            <img src="/app_logo.png" alt="Logo" class="w-full h-full object-cover" />
                        </div>
                    </div>
                    
                    <p class="text-white/80 text-sm leading-relaxed border-l-2 border-[#FF8A00] pl-4 text-left italic">
                        "{t("about_desc")}"
                    </p>
                    
                    <div class="flex flex-col gap-3 mt-4 text-sm text-left">
                        <div class="flex justify-between border-b border-white/10 pb-2">
                            <span class="text-white/50 font-bold uppercase">{t("about_version")}</span>
                            <span class="text-[#00F0FF] font-mono tracking-widest">v1.1.0</span>
                        </div>
                        <div class="flex justify-between border-b border-white/10 pb-2">
                            <span class="text-white/50 font-bold uppercase">{t("about_dev")}</span>
                            <span 
                                onClick={() => openUrl('https://github.com/Suzuya4w')}
                                class="text-[#FF8A00] font-bold uppercase tracking-widest cursor-pointer hover:underline hover:text-white transition-colors"
                            >
                                Suzuya4w
                            </span>
                        </div>
                        <div class="flex justify-between border-b border-white/10 pb-2">
                            <span class="text-white/50 font-bold uppercase">{t("about_license")}</span>
                            <span class="text-white/80 font-bold uppercase tracking-widest">Apache 2.0 License</span>
                        </div>
                    </div>
                </div>
                
                <div class="mt-8 flex justify-center">
                    <button 
                        onClick={() => setIsAboutOpen(false)}
                        class="bg-transparent text-[#00F0FF] border-2 border-[#00F0FF] hover:bg-[#00F0FF] hover:text-black font-bold px-8 py-2 uppercase tracking-widest transition-colors cursor-pointer"
                    >
                        {t("info_close")}
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default App;
