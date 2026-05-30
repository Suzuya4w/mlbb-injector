import sys
import UnityPy

def patch_bundle(input_path, old_string, new_string, output_path):
    old_bytes = old_string.encode('utf-8')
    new_bytes = new_string.encode('utf-8')
    
    if len(old_bytes) != len(new_bytes):
        print(f"ERROR: String lengths must match! {len(old_bytes)} vs {len(new_bytes)}")
        sys.exit(1)
        
    try:
        env = UnityPy.load(input_path)
    except Exception as e:
        print(f"ERROR loading bundle: {e}")
        sys.exit(1)
        
    patched_count = 0
    
    # Iterate through all objects in the loaded bundle
    for obj in env.objects:
        try:
            # Read the raw byte data of the object
            raw_data = obj.get_raw_data()
            
            if old_bytes in raw_data:
                # Replace the raw bytes
                patched_data = raw_data.replace(old_bytes, new_bytes)
                # Set the modified data back
                obj.set_raw_data(patched_data)
                patched_count += 1
        except Exception as e:
            # Some objects might not support raw data extraction easily, skip them
            pass

    try:
        # Save the repackaged bundle
        with open(output_path, "wb") as f:
            f.write(env.file.save())
        print(f"SUCCESS: Patched {patched_count} objects in bundle.")
    except Exception as e:
        print(f"ERROR saving bundle: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: patcher.py <input> <old_str> <new_str> <output>")
        sys.exit(1)
        
    patch_bundle(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
