"""Extract textured Soldier forearms/hands, with one movable wrist node per arm.

Run: F:/blender/blender.exe -b --factory-startup --python scripts/build_hd_hands.py
No replacement geometry is generated: the mesh, fingers, normals and UVs come
from Soldier.glb. Its Idle pose is baked before discarding the full-body rig.
"""
from pathlib import Path
import re
import bpy
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/models/cf-soldier/Soldier.glb'
OUTPUT = ROOT / 'public/models/hd-arena/hands-v1.glb'


def grip_fingers(armature, side):
    """Bake a relaxed rifle grip instead of the source Idle's open fingers."""
    pose = armature.pose.bones
    for finger in ('Index', 'Middle', 'Ring', 'Pinky'):
        trigger = side == 'Right' and finger == 'Index'
        angles = (0.24, 0.35, 0.4) if trigger else (0.62, 0.85, 0.4)
        for number, angle in enumerate(angles, 1):
            bone = pose.get(f'mixamorig:{side}Hand{finger}{number}')
            if bone:
                bone.rotation_mode = 'QUATERNION'
                bone.rotation_quaternion @= Quaternion((0, 0, 1), angle)
    bpy.context.view_layer.update()


def split_side(source, side):
    pattern = re.compile(rf'mixamorig:({side}ForeArm|{side}Hand.*)$', re.I)
    groups = {group.index for group in source.vertex_groups if pattern.match(group.name)}
    selected = {
        vertex.index for vertex in source.data.vertices
        if any(weight.group in groups and weight.weight >= 0.055 for weight in vertex.groups)
    }
    if not selected:
        raise RuntimeError(f'No weighted forearm/hand vertices found: {side}')
    bpy.ops.object.select_all(action='DESELECT')
    source.select_set(True)
    bpy.context.view_layer.objects.active = source
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    for vertex in source.data.vertices:
        vertex.select = vertex.index in selected
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')
    pieces = [obj for obj in bpy.context.selected_objects if obj.type == 'MESH' and obj is not source]
    if not pieces:
        raise RuntimeError(f'No separate mesh generated: {side}')
    bpy.ops.object.select_all(action='DESELECT')
    for piece in pieces:
        piece.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    if len(pieces) > 1:
        bpy.ops.object.join()
    result = bpy.context.view_layer.objects.active
    result.name = f'arm{side}'
    result.data.name = f'arm{side}_SourceMesh'
    return result


def bake_to_wrist(mesh, armature, side):
    bpy.context.view_layer.update()
    pose = armature.pose.bones
    def point(name):
        return armature.matrix_world @ pose[f'mixamorig:{side}{name}'].head
    wrist = point('Hand')
    forward = (wrist - point('ForeArm')).normalized()
    across = point('HandPinky1') - point('HandIndex1')
    across -= forward * across.dot(forward)
    across.normalize()
    if side == 'Left':
        across.negate()
    up = across.cross(forward).normalized()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    baked = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    # Blender +Y exports as glTF -Z, Blender +Z exports as glTF +Y.
    for vertex in baked.vertices:
        local = mesh.matrix_world @ vertex.co - wrist
        vertex.co = Vector((local.dot(across), local.dot(forward), local.dot(up)))
    name = mesh.name
    bpy.data.objects.remove(mesh, do_unlink=True)
    result = bpy.data.objects.new(name, baked)
    bpy.context.collection.objects.link(result)
    for group in list(result.vertex_groups):
        result.vertex_groups.remove(group)
    result['asset_role'] = name
    result['source'] = 'Soldier.glb: original weighted forearm and finger topology'
    result['wrist_pivot'] = True
    result['forward_axis'] = '-Z in glTF; elbow extends +Z'
    return result


def main():
    if not SOURCE.exists():
        raise FileNotFoundError(SOURCE)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    source = next(obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.name == 'vanguard_Mesh')
    armature = next(obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE')
    idle = bpy.data.actions.get('Idle')
    if not idle:
        raise RuntimeError('Soldier.glb Idle pose is required')
    armature.animation_data_clear()
    armature.animation_data_create()
    armature.animation_data.action = idle
    armature.animation_data.action_slot = idle.slots[0]
    bpy.context.scene.frame_set(1)
    grip_fingers(armature, 'Left')
    grip_fingers(armature, 'Right')
    left = split_side(source, 'Left')
    right = split_side(source, 'Right')
    left = bake_to_wrist(left, armature, 'Left')
    right = bake_to_wrist(right, armature, 'Right')
    bpy.ops.object.select_all(action='DESELECT')
    left.select_set(True)
    right.select_set(True)
    bpy.context.view_layer.objects.active = right
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT), export_format='GLB', use_selection=True,
        export_apply=False, export_yup=True, export_animations=False,
        export_skins=False, export_materials='EXPORT', export_image_format='AUTO',
        export_extras=True,
    )
    for obj in (left, right):
        print(f'{obj.name}: vertices={len(obj.data.vertices)} dimensions={tuple(round(v, 5) for v in obj.dimensions)}')
    print(f'WROTE {OUTPUT} ({OUTPUT.stat().st_size} bytes)')


if __name__ == '__main__':
    main()
