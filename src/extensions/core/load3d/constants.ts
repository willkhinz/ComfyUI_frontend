export const SUPPORTED_EXTENSIONS = new Set([
  '.gltf',
  '.glb',
  '.obj',
  '.fbx',
  '.stl',
  '.spz',
  '.splat',
  '.ply',
  '.ksplat'
])

export const SUPPORTED_EXTENSIONS_ACCEPT = [...SUPPORTED_EXTENSIONS].join(',')

export const HDRI_COMPATIBLE_MODEL_EXTENSIONS = new Set([
  '.gltf',
  '.glb',
  '.fbx',
  '.obj'
])

const HDRI_FILE_EXTENSIONS = new Set(['.hdr', '.exr'])

export const SUPPORTED_HDRI_EXTENSIONS_ACCEPT = [...HDRI_FILE_EXTENSIONS].join(
  ','
)
