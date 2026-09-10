"""Export the packed M200 Huanshen Blender scene as a browser-ready GLB."""

from pathlib import Path

import bpy


OUTPUT = Path(r"C:\Users\ASUS\Documents\Quick‑Note-复刻\public\models\m200-huanshen\M200.glb")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

# The blend contains a presentation floor and lights in addition to four weapon
# bodyparts. Export only the weapon meshes; the packed images travel inside GLB.
bpy.ops.object.select_all(action="DESELECT")
weapon_objects = [
    obj for obj in bpy.data.objects
    if obj.type == "MESH" and obj.name != "Display Floor"
]
if not weapon_objects:
    raise RuntimeError("No M200 weapon meshes found in the Blender file")

for obj in weapon_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = weapon_objects[0]

# Keep the four bodyparts separate in the exported scene. This preserves the
# source UV/material assignments and gives the web loader a useful hierarchy.
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_animations=False,
)
print(f"Exported {len(weapon_objects)} M200 meshes to {OUTPUT}")
