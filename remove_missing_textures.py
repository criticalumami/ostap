
import json
import os
import sys

def remove_missing_textures(gltf_path):
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

    gltf_dir = os.path.dirname(gltf_path)

    if 'images' not in gltf_data or not gltf_data['images']:
        print("No images found in GLTF. Skipping texture removal.")
        return

    images_to_remove_indices = set()
    for i, image in enumerate(gltf_data['images']):
        if 'uri' in image:
            image_uri = image['uri']
            image_full_path = os.path.join(gltf_dir, image_uri)
            if not os.path.exists(image_full_path):
                print(f"  Missing image file: {image_full_path}. Marking image {i} for removal.")
                images_to_remove_indices.add(i)
            else:
                print(f"  Image found: {image_full_path}")
        else:
            print(f"  Image {i} has no URI. Skipping check.")

    if not images_to_remove_indices:
        print("No missing images found. No textures to remove.")
        return

    # Identify textures that use images marked for removal
    textures_to_remove_indices = set()
    if 'textures' in gltf_data:
        for i, texture in enumerate(gltf_data['textures']):
            if 'source' in texture and texture['source'] in images_to_remove_indices:
                print(f"  Texture {i} uses a missing image. Marking for removal.")
                textures_to_remove_indices.add(i)

    # Remove images and textures
    new_images = []
    image_index_map = {} # Old index to new index mapping
    for old_idx, image in enumerate(gltf_data['images']):
        if old_idx not in images_to_remove_indices:
            image_index_map[old_idx] = len(new_images)
            new_images.append(image)
    gltf_data['images'] = new_images

    new_textures = []
    texture_index_map = {} # Old index to new index mapping
    if 'textures' in gltf_data:
        for old_idx, texture in enumerate(gltf_data['textures']):
            if old_idx not in textures_to_remove_indices:
                # Update source index for remaining textures
                if 'source' in texture and texture['source'] in image_index_map:
                    texture['source'] = image_index_map[texture['source']]
                texture_index_map[old_idx] = len(new_textures)
                new_textures.append(texture)
        gltf_data['textures'] = new_textures
    else:
        gltf_data['textures'] = [] # Ensure textures array exists even if empty

    # Update materials to remove references to removed textures
    if 'materials' in gltf_data:
        for material in gltf_data['materials']:
            for prop in ['baseColorTexture', 'metallicRoughnessTexture', 'normalTexture', 'occlusionTexture', 'emissiveTexture']:
                if prop in material and 'index' in material[prop]:
                    old_texture_index = material[prop]['index']
                    if old_texture_index in textures_to_remove_indices:
                        print(f"  Removing {prop} from material due to missing texture.")
                        del material[prop]
                    elif old_texture_index in texture_index_map:
                        # Update texture index for remaining textures
                        material[prop]['index'] = texture_index_map[old_texture_index]
                    else:
                        # This case should ideally not happen if logic is correct, but as a safeguard
                        print(f"  Warning: Texture index {old_texture_index} in {prop} not found in map. Keeping as is.")

    # Write the modified GLTF data back to the file
    try:
        with open(gltf_path, 'w') as f:
            json.dump(gltf_data, f, indent=2)
        print(f"Successfully updated {gltf_path}")
    except Exception as e:
        print(f"Error writing modified GLTF to {gltf_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_missing_textures.py <path_to_gltf_file_or_directory>")
        sys.exit(1)

    target_path = sys.argv[1]

    if os.path.isdir(target_path):
        print(f"Searching for GLTF files in directory: {target_path}")
        for root, _, files in os.walk(target_path):
            for file in files:
                if file.endswith('.gltf'):
                    gltf_file_path = os.path.join(root, file)
                    remove_missing_textures(gltf_file_path)
    elif os.path.isfile(target_path) and target_path.endswith('.gltf'):
        remove_missing_textures(target_path)
    else:
        print("Invalid input. Please provide a path to a .gltf file or a directory containing .gltf files.")
        sys.exit(1)
