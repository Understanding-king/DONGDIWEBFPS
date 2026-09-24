"""Build the standalone HD竞技大区 Desert Courtyard asset.

The source layout is specified in Three.js coordinates (x, y, z). Blender is
z-up, so every point is converted as (x, -z, y). The resulting GLB is a
static, UV-mapped courtyard scene; collision data is emitted separately for
the game-side resolver.

Run from the repository root:
    blender -b --python scripts/build_hd_map.py
"""

from __future__ import annotations

import json
import math
import os
import shutil
import urllib.request
from urllib.error import HTTPError, URLError
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "models" / "hd-arena"
TEXTURE_DIR = OUT_DIR / "textures"
GLB_PATH = OUT_DIR / "desert-courtyard-v1.glb"
COLLISION_PATH = OUT_DIR / "collision-v1.json"

# Stable Poly Haven CC0 direct links. The generator caches them beside the GLB
# and packs the image pixels into the exported file.
TEXTURE_URLS = {
    "stone": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_wall/stone_wall_diff_1k.jpg",
    "floor": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_floor/stone_floor_diff_1k.jpg",
    "plaster": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/clay_plaster/clay_plaster_diff_1k.jpg",
    "wood": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_diff_1k.jpg",
}

# These maps are optional because Poly Haven occasionally changes a map's
# filename between texture families. The base-color texture remains required;
# available normal/roughness maps are connected when the URL exists.
OPTIONAL_TEXTURE_URLS = {
    "stone_normal": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_wall/stone_wall_nor_gl_1k.jpg",
    "stone_roughness": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_wall/stone_wall_rough_1k.jpg",
    "floor_normal": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_floor/stone_floor_nor_gl_1k.jpg",
    "floor_roughness": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/stone_floor/stone_floor_rough_1k.jpg",
    "plaster_normal": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/clay_plaster/clay_plaster_nor_gl_1k.jpg",
    "plaster_roughness": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/clay_plaster/clay_plaster_rough_1k.jpg",
    "wood_normal": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_nor_gl_1k.jpg",
    "wood_roughness": "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/wood_planks/wood_planks_rough_1k.jpg",
}


def three_to_blender(point):
    """Map a Three.js point (x, y, z) into Blender's (x, y, z-up)."""
    x, y, z = point
    return (x, -z, y)


def blender_yaw(yaw):
    """Convert Three.js Y rotation into Blender Z rotation."""
    return yaw


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def fetch_textures():
    TEXTURE_DIR.mkdir(parents=True, exist_ok=True)
    paths = {}
    for key, url in TEXTURE_URLS.items():
        path = TEXTURE_DIR / f"{key}.jpg"
        if not path.exists() or path.stat().st_size < 10_000:
            print(f"[hd-map] downloading {key} from Poly Haven")
            request = urllib.request.Request(url, headers={"User-Agent": "CF-HD-Arena-AssetBuilder/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response, path.open("wb") as target:
                shutil.copyfileobj(response, target)
        if path.stat().st_size < 10_000:
            raise RuntimeError(f"Texture download is empty: {path}")
        paths[key] = path
        print(f"[hd-map] texture {key}: {path.stat().st_size} bytes")
    for key, url in OPTIONAL_TEXTURE_URLS.items():
        path = TEXTURE_DIR / f"{key}.jpg"
        if not path.exists() or path.stat().st_size < 10_000:
            try:
                print(f"[hd-map] trying optional {key} from Poly Haven")
                request = urllib.request.Request(url, headers={"User-Agent": "CF-HD-Arena-AssetBuilder/1.0"})
                with urllib.request.urlopen(request, timeout=25) as response, path.open("wb") as target:
                    shutil.copyfileobj(response, target)
            except (HTTPError, URLError, TimeoutError, OSError) as error:
                print(f"[hd-map] optional {key} unavailable: {error}")
                if path.exists():
                    path.unlink()
        if path.exists() and path.stat().st_size >= 10_000:
            paths[key] = path
            print(f"[hd-map] optional texture {key}: {path.stat().st_size} bytes")
        elif path.exists():
            path.unlink()
    return paths


def make_material(name, color, texture_path=None, normal_path=None, roughness_path=None, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF") or next((node for node in nodes if node.bl_idname == "ShaderNodeBsdfPrincipled"), None)
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = tuple(color) if len(color) == 4 else (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if texture_path:
        image = bpy.data.images.load(str(texture_path), check_existing=True)
        image.pack()
        image.colorspace_settings.name = "sRGB"
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = f"PBR_{name}_albedo"
        tex.image = image
        tex.interpolation = "Linear"
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        mat["texture_source"] = f"Poly Haven CC0: {texture_path.name}"
    if normal_path:
        image = bpy.data.images.load(str(normal_path), check_existing=True)
        image.pack()
        image.colorspace_settings.name = "Non-Color"
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = f"PBR_{name}_normal"
        tex.image = image
        tex.interpolation = "Linear"
        normal = nodes.new("ShaderNodeNormalMap")
        normal.inputs["Strength"].default_value = 0.72
        links.new(tex.outputs["Color"], normal.inputs["Color"])
        links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])
        mat["normal_source"] = f"Poly Haven CC0: {normal_path.name}"
    if roughness_path:
        image = bpy.data.images.load(str(roughness_path), check_existing=True)
        image.pack()
        image.colorspace_settings.name = "Non-Color"
        tex = nodes.new("ShaderNodeTexImage")
        tex.name = f"PBR_{name}_roughness"
        tex.image = image
        tex.interpolation = "Linear"
        links.new(tex.outputs["Color"], bsdf.inputs["Roughness"])
        mat["roughness_source"] = f"Poly Haven CC0: {roughness_path.name}"
    mat["pbr_ready"] = True
    return mat


def apply_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj


def project_box_uv(obj, meters_per_repeat=2.25):
    """Project UVs from local meter coordinates so packed textures repeat."""
    mesh = obj.data
    uv_layer = mesh.uv_layers.active or mesh.uv_layers.new(name="WorldMeterUV")
    scale = 1.0 / max(0.1, meters_per_repeat)
    for polygon in mesh.polygons:
        normal = polygon.normal
        for loop_index in polygon.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if abs(normal.z) >= abs(normal.x) and abs(normal.z) >= abs(normal.y):
                uv = (co.x * scale, co.y * scale)
            elif abs(normal.x) >= abs(normal.y):
                uv = (co.y * scale, co.z * scale)
            else:
                uv = (co.x * scale, co.z * scale)
            uv_layer.data[loop_index].uv = uv


def cube(name, dims, location, mat, rotation=0.0, bevel=0.0, visual=True):
    bpy.ops.mesh.primitive_cube_add(size=1, location=three_to_blender(location), rotation=(0, 0, blender_yaw(rotation)))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (dims[0], dims[2], dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_mat(obj, mat)
    project_box_uv(obj)
    if bevel:
        modifier = obj.modifiers.new("architectural_edge_softening", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
    obj["visual"] = visual
    return obj


def cube_euler(name, dims, location, mat, rotation=(0.0, 0.0, 0.0), bevel=0.0):
    """Cube helper for non-yaw architectural parts in Three coordinates."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=three_to_blender(location), rotation=(rotation[2], -rotation[0], rotation[1]))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (dims[0], dims[2], dims[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_mat(obj, mat)
    project_box_uv(obj)
    if bevel:
        modifier = obj.modifiers.new("architectural_edge_softening", "BEVEL")
        modifier.width = bevel
        modifier.segments = 3
        modifier.limit_method = "ANGLE"
    obj["visual"] = True
    return obj


def cylinder(name, radius, height, location, mat, rotation=0.0, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=height,
        location=three_to_blender(location),
        rotation=(0, 0, blender_yaw(rotation)),
    )
    obj = bpy.context.object
    obj.name = name
    apply_mat(obj, mat)
    obj["visual"] = True
    return obj


def add_pipe(name, x, y, z, mat, vertical=True):
    """Add a service pipe in Three.js coordinates."""
    if vertical:
        return cylinder(name, 0.12, 2.4, (x, y + 1.2, z), mat, vertices=16)
    return cylinder(name, 0.12, 3.6, (x, y, z), mat, rotation=math.pi / 2, vertices=16)


def plane(name, dims, location, mat):
    return cube(name, dims, location, mat, bevel=0.0)


def create_collision(name, bounds, rotation=0.0, kind="aabb"):
    """Create an empty node with GLTF extras and return manifest record."""
    min_x, max_x, min_y, max_y, min_z, max_z = bounds
    center = ((min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2)
    dims = (max_x - min_x, max_y - min_y, max_z - min_z)
    bpy.ops.object.empty_add(type="CUBE", location=three_to_blender(center), rotation=(0, 0, blender_yaw(rotation)))
    obj = bpy.context.object
    obj.name = name
    obj.empty_display_size = 1.0
    obj.scale = (dims[0], dims[2], dims[1])
    obj["solid"] = True
    obj["collision_shape"] = kind
    obj["bounds_three"] = json.dumps({"min": [min_x, min_y, min_z], "max": [max_x, max_y, max_z]})
    return {
        "name": name,
        "shape": kind,
        "min": [round(min_x, 3), round(min_y, 3), round(min_z, 3)],
        "max": [round(max_x, 3), round(max_y, 3), round(max_z, 3)],
        "rotationY": round(rotation, 5),
    }




def mesh_object(name, vertices, faces, mat, repeat=2.25):
    mesh = bpy.data.meshes.new(name + "_mesh")
    mesh.from_pydata([three_to_blender(v) for v in vertices], [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    apply_mat(obj, mat)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    project_box_uv(obj, repeat)
    return obj


def rod(name, start, end, radius, mat, vertices=12):
    start_b, end_b = Vector(three_to_blender(start)), Vector(three_to_blender(end))
    vector = end_b - start_b
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=vector.length, location=(start_b + end_b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = vector.to_track_quat("Z", "Y").to_euler()
    apply_mat(obj, mat)
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return obj


def bounded_cube(name, dims, location, mat, collision, rotation=0, bevel=0.035):
    obj = cube(name, dims, location, mat, rotation, bevel)
    x, y, z = location
    w, h, d = dims
    collision.append(create_collision(name + "_solid", (x-w/2, x+w/2, y-h/2, y+h/2, z-d/2, z+d/2), rotation, "obb" if rotation else "aabb"))
    return obj


def arched_opening(name, center, width, spring, height, thickness, mat, trim, collision, yaw=0):
    """True wall opening, continuous spandrels and individual dressed stones.

    Each rectangular jamb and each arch chord shares its collision source.
    Chord AABBs sit above the playable opening, avoiding invisible door walls.
    """
    cx, cy, cz = center
    r = width / 2
    outer = r + 0.29
    count = 16
    c, s = math.cos(yaw), math.sin(yaw)
    def tr(x, y, z):
        return (cx + c*x+s*z, cy+y, cz-s*x+c*z)
    for index in range(count):
        a0, a1 = index * math.pi/count, (index+1)*math.pi/count
        vertices = []
        for zz in (-thickness/2, thickness/2):
            vertices.extend([tr(math.cos(a0)*r, spring+math.sin(a0)*r, zz), tr(math.cos(a1)*r, spring+math.sin(a1)*r, zz), tr(math.cos(a1)*r, height, zz), tr(math.cos(a0)*r, height, zz)])
        mesh_object(name+f"_spandrel_{index:02}", vertices, [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], mat)
        trim_vertices = []
        for zz in (-thickness/2-.06, thickness/2+.06):
            for a, rr in ((a0+.009,r),(a1-.009,r),(a1-.009,outer),(a0+.009,outer)):
                trim_vertices.append(tr(math.cos(a)*rr, spring+math.sin(a)*rr, zz))
        mesh_object(name+f"_voussoir_{index:02}", trim_vertices, [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], trim, 1.5)
        # Build a conservative chord block; yaw is 0 or 90 degrees here.
        x0, x1 = sorted((math.cos(a0)*r, math.cos(a1)*r))
        floor = spring + min(math.sin(a0), math.sin(a1))*r
        mid = tr((x0+x1)/2, (floor+height)/2, 0)
        collision.append(create_collision(name+f"_arch_solid_{index}", (mid[0]-(x1-x0)/2, mid[0]+(x1-x0)/2, mid[1]-(height-floor)/2, mid[1]+(height-floor)/2, mid[2]-thickness/2, mid[2]+thickness/2), yaw, "obb" if yaw else "aabb"))
    for sign in (-1,1):
        pos = tr(sign*(r+.16), spring/2, 0)
        bounded_cube(name+f"_jamb_{sign}", (.32, spring, thickness+.13), pos, trim, collision, yaw, .025)


def shutter(name, center, yaw, wood, trim, dark, metal):
    cx, cy, cz = center
    c, s = math.cos(yaw), math.sin(yaw)
    def at(x, y, z): return (cx+c*x+s*z, cy+y, cz-s*x+c*z)
    cube(name+"_reveal", (1.3,1.78,.12), at(0,0,0), dark, yaw, .02)
    for sign in (-1,1):
        cube(name+f"_frame_{sign}", (.12,1.94,.26), at(sign*.72,0,.06), trim, yaw, .025)
    cube(name+"_header", (1.58,.16,.28), at(0,.97,.04), trim, yaw, .025)
    cube(name+"_sill", (1.7,.18,.42), at(0,-.95,.11), trim, yaw, .025)
    for panel in (-1,1):
        for slat in range(9):
            cube(name+f"_louver_{panel}_{slat}", (.55,.118,.14), at(panel*.3,-.7+slat*.174,.075), wood, yaw, .015)
        cube(name+f"_hinge_{panel}", (.1,.25,.16), at(panel*.57,.4,.09), metal, yaw, .008)


def facade_building(prefix, x, z, inward, plaster, stone, wood, dark, metal, collision):
    """A two-storey occupied block over a walkable three-bay arcade."""
    back = x - inward*3.8
    front = x + inward*3.8
    yaw = inward*math.pi/2
    bounded_cube(prefix+"_back", (.46,8.1,24), (back,4.05,z), plaster, collision)
    for sign in (-1,1):
        bounded_cube(prefix+f"_end_{sign}", (8,8.1,.46), (x,4.05,z+sign*11.8), plaster, collision)
    # A complete second floor, roof slab and continuous parapet establish a
    # coherent building silhouette. The shaded ground-floor arcade stays open.
    bounded_cube(prefix+"_upper_floor", (8,.28,24), (x,4.36,z), stone, collision)
    bounded_cube(prefix+"_upper_front", (.48,3.55,24), (front,6.2,z), plaster, collision)
    cube(prefix+"_roof", (8.5,.25,24.5), (x,8.08,z), stone, bevel=.07)
    for yy, hh, ww in ((.28,.5,.7),(4.45,.22,.75),(7.91,.23,.75),(8.45,.62,.38)):
        cube(prefix+f"_course_{yy}", (ww,hh,24.35), (front+inward*.08,yy,z), stone if yy<5 else plaster, bevel=.035)
    cube(prefix+"_rear_parapet", (.38,.64,24.35), (back,8.45,z), plaster, bevel=.035)
    for sign in (-1,1): cube(prefix+f"_roof_parapet_{sign}", (8.3,.64,.38), (x,8.45,z+sign*11.96), plaster, bevel=.035)
    # Three arched bays; their 5.2 m openings read as architecture from player
    # height and form covered flanking routes with crossfire back to the plaza.
    for index, zz in enumerate((z-7.8,z,z+7.8)):
        arched_opening(prefix+f"_arcade_{index}", (front,0,zz), 5.2,1.65,4.3,.52,plaster,stone,collision,yaw)
    for index, zz in enumerate((z-11.8,z-3.9,z+3.9,z+11.8)):
        bounded_cube(prefix+f"_pier_{index}", (.67,4.3,2.45 if index in (1,2) else 2.1), (front,2.15,zz), plaster,collision,bevel=.04)
        cube(prefix+f"_pier_base_{index}", (.83,.37,2.6 if index in (1,2) else 2.2), (front,.2,zz),stone,bevel=.045)
    for index in range(8):
        zz=z-10.2+index*2.9
        shutter(prefix+f"_window_{index}",(front+inward*.29,6.23,zz),yaw,wood,stone,dark,metal)
    # Modest overhanging balcony with real metal balusters, only on one bay.
    cube(prefix+"_balcony", (1.18,.18,3.9), (front+inward*.62,4.81,z), stone, bevel=.055)
    bx=front+inward*1.12
    for k in range(14): rod(prefix+f"_baluster_{k}",(bx,4.92,z-1.8+k*.277),(bx,5.92,z-1.8+k*.277),.019,metal,8)
    for hh in (5.0,5.9): rod(prefix+f"_rail_{hh}",(bx,hh,z-1.88),(bx,hh,z+1.88),.034,metal)
    for zz in (z-10.9,z+10.9):
        rod(prefix+f"_drain_{zz}",(front+inward*.36,.1,zz),(front+inward*.36,7.96,zz),.045,metal)


def crate_prop(name, x, z, height, yaw, wood, metal, collision):
    w,d=1.35,1.22
    bounded_cube(name,(w,height,d),(x,height/2,z),wood,collision,yaw,.025)
    c,s=math.cos(yaw),math.sin(yaw)
    def tr(lx,yy,lz): return(x+c*lx+s*lz,yy,z-s*lx+c*lz)
    for side in (-1,1):
        for yy in (.12,height-.12): cube(name+f"_rim_{side}_{yy}",(w+.07,.12,.09),tr(0,yy,side*(d/2+.015)),wood,yaw,.015)
        for xx in (-.52,.52): cube(name+f"_strap_{side}_{xx}",(.045,height+.04,.035),tr(xx,height/2,side*(d/2+.065)),metal,yaw,.006)


def fountain_mesh(stone, water, metal, collision):
    """Lathed basin and fluted column, with a genuinely hollow water bowl."""
    profile=[(2.6,0),(2.7,.12),(2.7,.28),(2.55,.36),(2.55,.59),(2.72,.66),(2.72,.78),(2.34,.78),(2.34,.32),(.25,.32)]
    verts=[]
    count=64
    for rr,yy in profile:
        for i in range(count):
            angle=i*math.tau/count
            verts.append((math.cos(angle)*rr,yy,-4+math.sin(angle)*rr))
    faces=[]
    for row in range(len(profile)-1):
        for i in range(count):faces.append((row*count+i,row*count+(i+1)%count,(row+1)*count+(i+1)%count,(row+1)*count+i))
    mesh_object("plaza_carved_fountain",verts,faces,stone,1.4)
    cylinder("fountain_water",2.31,.022,(0,.58,-4),water,vertices=64)
    cylinder("fountain_column",.26,1.48,(0,1.11,-4),stone,vertices=24)
    for yy,rr in ((.42,.54),(1.75,.5),(1.88,.74)):
        cylinder(f"fountain_moulding_{yy}",rr,.13,(0,yy,-4),stone,vertices=40)
    # Convex parts use conservative boxes for the current capsule controller.
    collision.append(create_collision("fountain_basin_solid",(-2.7,2.7,0,.78,-6.7,-1.3)))
    collision.append(create_collision("fountain_column_solid",(-.5,.5,.78,1.95,-4.5,-3.5)))


def build_scene(texture_paths):
    clear_scene()
    stone = make_material("PBR_Sandstone",(.48,.4,.29,1),texture_paths["stone"],texture_paths.get("stone_normal"),texture_paths.get("stone_roughness"))
    floor = make_material("PBR_Courtyard_Floor",(.38,.34,.27,1),texture_paths["floor"],texture_paths.get("floor_normal"),texture_paths.get("floor_roughness"))
    plaster=make_material("PBR_Aged_Plaster",(.57,.49,.38,1),texture_paths["plaster"],texture_paths.get("plaster_normal"),texture_paths.get("plaster_roughness"))
    wood=make_material("PBR_Old_Wood",(.3,.16,.08,1),texture_paths["wood"],texture_paths.get("wood_normal"),texture_paths.get("wood_roughness"))
    dark=make_material("Recess_Shadow",(.045,.061,.057,1),roughness=.91)
    metal=make_material("Weathered_Iron",(.085,.11,.105,1),roughness=.65,metallic=.72)
    water=make_material("Fountain_Water",(.032,.15,.18,1),roughness=.14,metallic=.28)
    terracotta=make_material("Terracotta",(.33,.125,.063,1),roughness=.92)
    blue=make_material("Faded_Blue",(.07,.19,.22,1),roughness=.78)
    collision=[]
    cube("continuous_paving",(48,.24,56),(0,-.12,-4),floor)
    # Paving stays flush to the collision ground; use texture normals for the
    # stone joints instead of creating thousands of ankle-high floating slabs.
    for xx in (-11.0,11.0):
        cube(f"paving_border_{xx}",(.24,.018,53.5),(xx,.009,-4),stone)
    for name,dims,loc in (("north_wall",(48,.0+5.0,.5),(0,2.5,-31.75)),("south_wall",(48,5,.5),(0,2.5,23.75)),("west_wall",(.5,5,56),(-23.75,2.5,-4)),("east_wall",(.5,5,56),(23.75,2.5,-4))):
        bounded_cube(name,dims,loc,plaster,collision)
        cube(name+"_cap",(dims[0]+.12,.17,dims[2]+.12),(loc[0],5.04,loc[2]),stone,bevel=.03)
    facade_building("west_residence",-18.9,-4,1,plaster,stone,wood,dark,metal,collision)
    facade_building("east_residence",18.9,-4,-1,plaster,stone,wood,dark,metal,collision)
    # End gates face into the map. Covered vestibules break spawn sightlines;
    # their two lateral exits and centre arch join the three plaza approaches.
    for prefix,zz,facing in (("south_gate",13.7,1),("north_gate",-21.7,-1)):
        arched_opening(prefix,(0,0,zz),4.0,2.15,5.65,.7,plaster,stone,collision)
        for sign in (-1,1):
            bounded_cube(prefix+f"_wing_{sign}",(5.6,5.65,.7),(sign*4.9,2.825,zz),plaster,collision)
            cube(prefix+f"_moulding_{sign}",(5.7,.22,.88),(sign*4.9,4.96,zz),stone,bevel=.03)
            shutter(prefix+f"_window_{sign}",(sign*4.9,3.25,zz-facing*.42),math.pi if facing>0 else 0,blue,stone,dark,metal)
        bounded_cube(prefix+"_roof",(15.3,.25,4.3),(0,5.78,zz+facing*1.76),stone,collision)
        cube(prefix+"_parapet",(15.6,.72,.38),(0,6.25,zz-.1*facing),plaster,bevel=.045)
        cube(prefix+"_coping",(15.75,.14,.55),(0,6.68,zz-.1*facing),stone,bevel=.025)
        for sign in (-1,1):
            bounded_cube(prefix+f"_rear_pier_{sign}",(.65,5.7,.65),(sign*7.1,2.85,zz+facing*3.3),stone,collision)
    fountain_mesh(stone,water,metal,collision)
    # Staggered waist/high cover creates the same choice of crossing / short
    # peek / side route seen in the transport-ship reference, in an original
    # courtyard composition. Collision is emitted per crate, from its mesh.
    for index,(x,z,yaw) in enumerate(((-6.1,6,.28),(6.1,-14,-.28),(-7.8,-4,.05),(7.8,-4,-.05))):
        crate_prop(f"supply_crate_{index}",x,z,1.45,yaw,wood,metal,collision)
        crate_prop(f"supply_low_{index}",x+1.3*math.cos(yaw),z-1.3*math.sin(yaw),.8,yaw,wood,metal,collision)
    # Built-in garden beds are part of the street frontage, leaving the three
    # major routes clear. Soil and a hollow rim replace featureless blocks.
    for index,(x,z) in enumerate(((-10.2,8),(10.2,-16),(-10.2,-16),(10.2,8))):
        bounded_cube(f"planter_{index}_body",(2.1,.6,1.0),(x,.3,z),terracotta,collision,bevel=.08)
        cube(f"planter_{index}_soil",(1.79,.03,.68),(x,.62,z),dark)
        for sign in (-1,1): cube(f"planter_{index}_rim_{sign}",(2.2,.13,.16),(x,.64,z+sign*.47),terracotta,bevel=.035)
    # Lamps, real drain pipes and tensioned overhead cables give the street a
    # human scale without filling the gameplay area with decorative colliders.
    for index,(x,z,sgn) in enumerate(((-14.8,-11,1),(-14.8,3,1),(14.8,-11,-1),(14.8,3,-1))):
        rod(f"lamp_arm_{index}",(x,3.3,z),(x+sgn*.48,3.3,z),.025,metal)
        cylinder(f"lamp_shade_{index}",.2,.1,(x+sgn*.48,3.22,z),metal)
        cylinder(f"lamp_glass_{index}",.12,.27,(x+sgn*.48,3.04,z),terracotta)
    for cable,z in enumerate((-10,4)):
        prev=(-14.8,7.7,z)
        for index in range(1,25):
            xx=-14.8+29.6*index/24
            point=(xx,7.7-1.1*(1-(xx/14.8)**2),z)
            rod(f"utility_cable_{cable}_{index}",prev,point,.014,metal,6)
            prev=point
    bpy.context.scene["asset_type"]="hd_desert_courtyard"
    bpy.context.scene["asset_version"]="1.1.0"
    return collision


def join_static_meshes():
    """Merge visual meshes by material while retaining separate collision empties."""
    bpy.ops.object.select_all(action="DESELECT")
    groups = {}
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.name.startswith("COLLIDER"):
            continue
        key = obj.data.materials[0].name if obj.data.materials else "__unmaterialed"
        groups.setdefault(key, []).append(obj)
    for key, objects in groups.items():
        if len(objects) < 2:
            continue
        for obj in objects:
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)
            for modifier in list(obj.modifiers):
                if modifier.type == "BEVEL":
                    bpy.ops.object.modifier_apply(modifier=modifier.name)
            obj.select_set(False)
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = f"HD_Static_{key}"


def export(collision):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    COLLISION_PATH.write_text(json.dumps({
        "version": 1,
        "asset": "desert-courtyard-v1",
        "coordinateSystem": "three-y-up",
        "bounds": {"min": [-24, 0, -32], "max": [24, 9, 24]},
        "spawn": {"x": 0, "y": 0, "z": 19},
        "target": {"x": 0, "y": 0, "z": -19},
        "solids": collision,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_apply=True,
        use_selection=False,
    )
    print(f"[hd-map] GLB {GLB_PATH} ({GLB_PATH.stat().st_size} bytes)")
    print(f"[hd-map] collision manifest {COLLISION_PATH} ({len(collision)} solids)")


def render_preview():
    scene = bpy.context.scene
    scene.render.engine = os.environ.get("HD_RENDER_ENGINE", "CYCLES")
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    preview_dir = Path(os.environ.get("HD_BUILD_TEMP", str(OUT_DIR)))
    preview_dir.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(preview_dir / "preview-v1.jpg")
    scene.world.color = (0.4, 0.45, 0.55)
    world = scene.world or bpy.data.worlds.new("Morning_World")
    scene.world = world
    world.use_nodes = True
    background = next((node for node in world.node_tree.nodes if node.type == "BACKGROUND"), None)
    if background:
        background.inputs[0].default_value = (0.4, 0.5, 0.65, 1)
        background.inputs[1].default_value = 0.6
    bpy.ops.object.light_add(type="SUN", location=three_to_blender((-20, 25, 18)))
    sun = bpy.context.object
    sun.name = "Morning_Sun"
    sun.rotation_euler = (math.radians(24), math.radians(-28), math.radians(-34))
    sun.data.energy = 2.6
    sun.data.angle = math.radians(2)
    bpy.ops.object.camera_add(location=three_to_blender((8.5, 2.15, 12.0)))
    camera = bpy.context.object
    camera.name = "HD_Preview_Camera"
    target = Vector(three_to_blender((-2, 3.4, -10)))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 25
    scene.camera = camera
    bpy.ops.render.render(write_still=True)
    if preview_dir.resolve() != OUT_DIR.resolve():
        shutil.copy2(scene.render.filepath, OUT_DIR / "preview-v1.jpg")
    print(f"[hd-map] preview {scene.render.filepath}")


def main():
    print(f"[hd-map] Blender {bpy.app.version_string}")
    if os.environ.get("HD_PREVIEW_ONLY") == "1":
        clear_scene()
        bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
        render_preview()
        return
    texture_paths = fetch_textures()
    collision = build_scene(texture_paths)
    for solid in collision:
        assert all(math.isfinite(value) for value in solid["min"] + solid["max"]), solid["name"]
        assert all(solid["min"][axis] < solid["max"][axis] for axis in range(3)), solid["name"]
    join_static_meshes()
    export(collision)
    # Render the exported artifact, and release the many temporary edit meshes
    # left by joining. This keeps peak memory low on the local workstation.
    clear_scene()
    bpy.data.orphans_purge(do_recursive=True)
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    render_preview()


if __name__ == "__main__":
    main()
