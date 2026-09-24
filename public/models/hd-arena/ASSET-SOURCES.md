# HD Arena Asset Sources

`desert-courtyard-v1.glb` uses CC0 textures from Poly Haven, packed into the
GLB by `scripts/build_hd_map.py`:

- `stone.jpg`, `stone_normal.jpg`, `stone_roughness.jpg`: Poly Haven
  `stone_wall`.
- `floor.jpg`, `floor_normal.jpg`, `floor_roughness.jpg`: Poly Haven
  `stone_floor`.
- `plaster.jpg`, `plaster_normal.jpg`, `plaster_roughness.jpg`: Poly Haven
  `clay_plaster`.
- `wood.jpg`, `wood_normal.jpg`, `wood_roughness.jpg`: Poly Haven `wood_planks`.

Poly Haven assets are released under **CC0 1.0**. The generator records the
source filename in each Blender material custom property. Normal and roughness
maps are optional because the upstream CDN can intermittently omit a map; the
builder only keeps a map after verifying a non-empty download and never ships
zero-byte texture files.

The scene itself is original project geometry. Coordinates in the collision
manifest are Three.js y-up coordinates; the Blender source conversion is
`(x, y, z) -> (x, -z, y)`.

## Layout reference and original geometry

The user supplied https://github.com/riba2534/claude-opus-5-5-demo as a layout
reference. Its `cf-transport-ship/src/map.js` was inspected on 2026-09-24 for
route design: two end spawns, a contested centre, staggered cover and separate
flanking routes. No code, model, texture, or sound from that repository is
included. This map remains an original desert courtyard, not a transport-ship
replica and not a reproduction of proprietary CF/GTA assets.

Version 1.1 replaces the initial open-wall blockout with two-storey buildings,
walkable stone arcades, real arched gate openings, shutters, balconies, drains,
a lathed hollow fountain and separately collidable supply crates. Static meshes
are merged by material into nine draw groups. Collision extents are emitted
from the same dimensions as the visual meshes; curved openings use conservative
segmented boxes and the fountain basin uses a conservative rectangular proxy.

`preview-v1.jpg` is a Blender render of the exported GLB re-imported at player
height; it is an asset inspection image, not a screenshot of the live game.
The model still uses modular original architecture and a small shared PBR
material set; it does not claim photogrammetry, bespoke production art, or GTA
fidelity. The image lighting may differ from the runtime renderer.

## Character and first-person arms

`../cf-soldier/Soldier.glb` is the Soldier example model distributed by Three.js:
https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb .
Its source animation clips are Idle, Walk, Run and TPose. Additional crouch,
death and weapon holding poses are procedural project code, not original clips.

`hands-v1.glb` is extracted from that Soldier mesh using
`scripts/build_hd_hands.py`. It retains the original UVs, textures and finger
topology, baked to separate wrist nodes. It has no independently animated
finger skeleton; the reload motion is a procedural wrist animation.

The AK mesh and texture set reuse the project's existing `/models/ak-47/`
assets. This change adds no CF or GTA proprietary character/weapon files.

`ak47-v1.glb` repackages that existing OBJ and its color, normal, metalness and
roughness maps with `scripts/build_hd_weapon.py`. The detailed geometry is
retained without decimation; textures are resized to 1024 pixels and JPEG
encoded at quality 90 for a single compact request. The rifle is centered,
one metre long along Z, faces -Z, and includes the `hd-ak47-muzzle` node.
Meshopt compression preserves the geometry without removing triangles. Its
decoder is bundled from the existing Three.js dependency, with no CDN request.
This repackaging does not establish or change the original asset's license.
