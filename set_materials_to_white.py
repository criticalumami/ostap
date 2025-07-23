
import json
import os
import sys

def set_materials_to_white(gltf_path):
    print(f"Processing {gltf_path}...")
    try:
        with open(gltf_path, 'r') as f:
            gltf_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: GLTF file not found at {gltf_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {gltf_path}. Is it a valid GLTF file?")
        return

    if 'materials' not in gltf_data or not gltf_data['materials']:
        print("No materials found in GLTF. Skipping material modification.")
        return

    modified_count = 0
    for i, material in enumerate(gltf_data['materials']):
        # Check if the material is transparent (alphaMode is MASK or BLEND)
        alpha_mode = material.get('alphaMode', 'OPAQUE') # Default is OPAQUE

        if alpha_mode == 'OPAQUE':
            print(f"  Modifying opaque material {i}: {material.get('name', 'Unnamed')}")
            # Ensure pbrMetallicRoughness exists
            if 'pbrMetallicRoughness' not in material:
                material['pbrMetallicRoughness'] = {}

            # Set baseColorFactor to white and opaque
            material['pbrMetallicRoughness']['baseColorFactor'] = [1.0, 1.0, 1.0, 1.0]

            # Remove texture references for non-transparent materials
            for prop in ['baseColorTexture', 'normalTexture', 'occlusionTexture', 'emissiveTexture']:
                if prop in material['pbrMetallicRoughness']:
                    del material['pbrMetallicRoughness'][prop]
                    print(f"    Removed {prop}")
                elif prop in material: # Some textures might be directly under material
                    del material[prop]
                    print(f"    Removed {prop}")
            modified_count += 1
        else:
            print(f"  Material {i}: {material.get('name', 'Unnamed')} is transparent ({alpha_mode}). Skipping.")

    if modified_count > 0:
        # Write the modified GLTF data back to the file
        try:
            with open(gltf_path, 'w') as f:
                json.dump(gltf_data, f, indent=2)
            print(f"Successfully updated {gltf_path} ({modified_count} materials modified).")
        except Exception as e:
            print(f"Error writing modified GLTF to {gltf_path}: {e}")
    else:
        print(f"No opaque materials found or modified in {gltf_path}.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python set_materials_to_white.py <path_to_gltf_file_or_directory>")
        sys.exit(1)

    target_path = sys.argv[1]

    if os.path.isdir(target_path):
        print(f"Searching for GLTF files in directory: {target_path}")
        for root, _, files in os.walk(target_path):
            for file in files:
                if file.endswith('.gltf'):
                    gltf_file_path = os.path.join(root, file)
                    set_materials_to_white(gltf_file_path)
    elif os.path.isfile(target_path) and target_path.endswith('.gltf'):
        set_materials_to_white(target_path)
    else:
        print("Invalid input. Please provide a path to a .gltf file or a directory containing .gltf files.")
        sys.exit(1)
