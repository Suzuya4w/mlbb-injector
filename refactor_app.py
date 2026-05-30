import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add type Device
type_device = """
type Device = {
  id: string;
  name: string;
};
"""
content = content.replace('type Lang = "en" | "id";', type_device + '\ntype Lang = "en" | "id";')

# Change setDevices
content = content.replace('const [devices, setDevices] = createSignal<string[]>([]);', 'const [devices, setDevices] = createSignal<Device[]>([]);')

# Change checkDevices
check_device_old = """
      const result: string[] = await invoke("get_devices");
      setDevices(result);
      if (result.length > 0) {
        setSelectedDevice(result[0]);
        appendLog(t("log_success_device", { count: result.length }));
"""
check_device_new = """
      const result: Device[] = await invoke("get_devices");
      setDevices(result);
      if (result.length > 0) {
        setSelectedDevice(result[0].id);
        appendLog(t("log_success_device", { count: result.length }));
"""
content = content.replace(check_device_old.strip(), check_device_new.strip())

# Change JSX map
jsx_old = """
                <For each={devices()}>
                  {(d) => <option value={d}>{d}</option>}
                </For>
"""
jsx_new = """
                <For each={devices()}>
                  {(d) => <option value={d.id}>{d.name}</option>}
                </For>
"""
content = content.replace(jsx_old.strip(), jsx_new.strip())

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
