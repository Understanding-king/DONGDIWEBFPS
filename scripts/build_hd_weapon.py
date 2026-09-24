"""Pack the project's existing detailed AK into a one-metre, -Z-facing GLB.

Run: F:/blender/blender.exe -b --factory-startup --python scripts/build_hd_weapon.py
No decimation is applied. UV seams and hard normals survive the GLTF indexing.
"""
from pathlib import Path
import json
import struct
import tempfile
import bpy
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/models/ak-47'
OUTPUT = ROOT / 'public/models/hd-arena/ak47-v1.glb'
TEMP_ROOT = Path('D:/codex-hd-build-8bbd1c0ce35f4537844dbea162a512ed')
RAW_MUZZLE = Vector((0, 26.09, 179.05))


def build():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Identity axes: OBJLoader previously consumed these source xyz values as-is.
    bpy.ops.wm.obj_import(filepath=str(SOURCE / 'ak-47.obj'), forward_axis='Y', up_axis='Z')
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    points = [obj.matrix_world @ vertex.co for obj in meshes for vertex in obj.data.vertices]
    low = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    high = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    center = (low + high) * 0.5
    length = high.z - low.z
    if length <= 0 or length < max(high.x - low.x, high.y - low.y):
        raise RuntimeError(f'Unexpected source orientation: {low}, {high}')
    # Three desired (-x,y,-z), Blender is (x,-z,y): source -> (-x,z,y).
    conversion = Matrix(((-1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    conversion = Matrix.Scale(1 / length, 4) @ conversion @ Matrix.Translation(-center)
    source_faces = sum(len(obj.data.polygons) for obj in meshes)
    for obj in meshes:
        obj.data.transform(conversion @ obj.matrix_world)
        obj.matrix_world = Matrix.Identity(4)
        obj.name = 'hd-ak47-mesh'
        obj.data.update()

    TEMP_ROOT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='weapon-', dir=TEMP_ROOT) as temporary:
        material = bpy.data.materials.new('HD AK original PBR')
        material.use_nodes = True
        material['source'] = 'Existing project public/models/ak-47; no new third-party asset.'
        nodes = material.node_tree.nodes
        links = material.node_tree.links
        shader = nodes.get('Principled BSDF')
        shader.inputs['Metallic'].default_value = 1
        shader.inputs['Roughness'].default_value = 1
        for suffix, input_name in [('color', 'Base Color'), ('metalness', 'Metallic'), ('rough', 'Roughness'), ('nmap', None)]:
            image = bpy.data.images.load(str(SOURCE / f'123456_wire_115115115_{suffix}.png'), check_existing=False)
            image.colorspace_settings.name = 'sRGB' if suffix == 'color' else 'Non-Color'
            image.scale(1024, 1024)
            # Saving caches at 90 avoids retaining the original 4K PNG payloads.
            image.filepath_raw = str(Path(temporary) / f'ak47-{suffix}.jpg')
            image.file_format = 'JPEG'
            bpy.context.scene.render.image_settings.quality = 90
            image.save()
            texture = nodes.new('ShaderNodeTexImage')
            texture.image = image
            if suffix == 'nmap':
                normal = nodes.new('ShaderNodeNormalMap')
                normal.inputs['Strength'].default_value = 0.7
                links.new(texture.outputs['Color'], normal.inputs['Color'])
                links.new(normal.outputs['Normal'], shader.inputs['Normal'])
            else:
                links.new(texture.outputs['Color'], shader.inputs[input_name])
        for obj in meshes:
            obj.data.materials.clear()
            obj.data.materials.append(material)
            for polygon in obj.data.polygons:
                polygon.material_index = 0
        muzzle = bpy.data.objects.new('hd-ak47-muzzle', None)
        muzzle.location = conversion @ RAW_MUZZLE
        bpy.context.scene.collection.objects.link(muzzle)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB', export_image_format='JPEG',
                                  export_jpeg_quality=90, export_animations=False, export_cameras=False,
                                  export_lights=False, export_extras=True, export_yup=True,
                                  export_texcoords=True, export_normals=True, export_tangents=False,
                                  export_meshopt_compression_enable=True,
                                  export_meshopt_extension='EXT_meshopt_compression')
    buffer = OUTPUT.read_bytes()
    json_length = struct.unpack_from('<I', buffer, 12)[0]
    document = json.loads(buffer[20:20 + json_length])
    muzzle_node = next(node for node in document['nodes'] if node.get('name') == 'hd-ak47-muzzle')
    gltf_muzzle = muzzle_node['translation']
    primitive = document['meshes'][0]['primitives'][0]
    position = document['accessors'][primitive['attributes']['POSITION']]
    dimensions = [high_value - low_value for low_value, high_value in zip(position['min'], position['max'])]
    assert abs(dimensions[2] - 1) < 0.001 and dimensions[2] > max(dimensions[:2]), dimensions
    assert gltf_muzzle[2] < -0.45, gltf_muzzle
    assert len(buffer) < 8 * 1024 * 1024, f'Weapon payload too large: {len(buffer)}'
    print(json.dumps({'bytes': len(buffer), 'source_faces': source_faces, 'source_bounds': [list(low), list(high)],
                      'dimensions_three': dimensions, 'muzzle_three': gltf_muzzle,
                      'triangles': document['accessors'][primitive['indices']]['count'] // 3,
                      'images': document.get('images', [])}, indent=2))


if __name__ == '__main__':
    build()
