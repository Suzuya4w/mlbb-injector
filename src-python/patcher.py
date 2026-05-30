import argparse
import sys
import UnityPy

def replace_in_dict(d, old_id, new_id):
    """
    Recursively search and replace old_id with new_id in dictionaries (TypeTrees),
    but strictly only for string values.
    """
    modified = False
    if isinstance(d, dict):
        for k, v in d.items():
            if isinstance(v, str):
                if old_id in v:
                    d[k] = v.replace(old_id, new_id)
                    modified = True
            elif isinstance(v, (dict, list)):
                if replace_in_dict(v, old_id, new_id):
                    modified = True
    elif isinstance(d, list):
        for i, item in enumerate(d):
            if isinstance(item, str):
                if old_id in item:
                    d[i] = item.replace(old_id, new_id)
                    modified = True
            elif isinstance(item, (dict, list)):
                if replace_in_dict(item, old_id, new_id):
                    modified = True
    return modified

def patch_bundle(input_path, output_path, old_id, new_id):
    print(f"[UnityPy] Loading {input_path}...")
    env = UnityPy.load(input_path)
    
    modified_count = 0
    
    for obj in env.objects:
        # We only modify TextAsset, MonoBehaviour, GameObject, Texture2D names/paths
        if obj.type.name in ["MonoBehaviour", "GameObject", "TextAsset", "Texture2D", "AssetBundle"]:
            try:
                data = obj.read()
                
                # Modifying m_Name which is a common property across many types
                if hasattr(data, "m_Name") and isinstance(data.m_Name, str):
                    if old_id in data.m_Name:
                        print(f"[UnityPy] Renaming {data.m_Name} to {data.m_Name.replace(old_id, new_id)}")
                        data.m_Name = data.m_Name.replace(old_id, new_id)
                        data.save()
                        modified_count += 1
                
                # For TextAsset, we might want to check the actual text content if it contains path references
                if obj.type.name == "TextAsset":
                    if hasattr(data, "text") and isinstance(data.text, str):
                        if old_id in data.text:
                            data.text = data.text.replace(old_id, new_id)
                            data.save()
                            modified_count += 1
                            
                # For MonoBehaviour, safely replace in TypeTree dict
                if obj.type.name == "MonoBehaviour":
                    tree = data.read_typetree()
                    if replace_in_dict(tree, old_id, new_id):
                        data.save_typetree(tree)
                        modified_count += 1

                # For AssetBundle metadata
                if obj.type.name == "AssetBundle":
                    if hasattr(data, "m_AssetBundleName") and isinstance(data.m_AssetBundleName, str):
                        if old_id in data.m_AssetBundleName:
                            data.m_AssetBundleName = data.m_AssetBundleName.replace(old_id, new_id)
                            data.save()
                            modified_count += 1
            except Exception as e:
                # If an object can't be read or modified, skip it safely
                print(f"[UnityPy] Skipping obj {obj.path_id}: {e}")

    print(f"[UnityPy] Modified {modified_count} objects.")
    
    with open(output_path, "wb") as f:
        f.write(env.file.save())
    
    print(f"[UnityPy] Successfully repacked bundle to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Unity Asset Bundle Modder")
    parser.add_argument("--input", required=True, help="Path to raw .unity3d file")
    parser.add_argument("--output", required=True, help="Path to save repacked .unity3d file")
    parser.add_argument("--old", required=True, help="Old ID to replace (e.g., 538)")
    parser.add_argument("--new", required=True, help="New ID (e.g., 531)")
    
    args = parser.parse_args()
    
    patch_bundle(args.input, args.output, args.old, args.new)
