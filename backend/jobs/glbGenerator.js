const fs = require('fs');
const path = require('path');

/**
 * Create a minimal valid GLB (placeholder humanoid mesh) without external deps.
 * GLB: 12-byte header + JSON chunk + BIN chunk.
 */
function createPlaceholderGlb(outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Simple box vertices (8 corners) + 12 triangles (36 indices)
  const positions = new Float32Array([
    -0.2, 0, -0.1, 0.2, 0, -0.1, 0.2, 0, 0.1, -0.2, 0, 0.1,
    -0.2, 1.6, -0.1, 0.2, 1.6, -0.1, 0.2, 1.6, 0.1, -0.2, 1.6, 0.1,
  ]);
  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1, 2, 6, 7, 2, 7, 3,
    0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
  ]);

  const posBytes = Buffer.from(positions.buffer);
  const idxBytes = Buffer.from(indices.buffer);
  const posLen = posBytes.length;
  const idxLen = idxBytes.length;
  const binLen = posLen + idxLen;
  const binPadded = Buffer.alloc(((binLen + 3) >> 2) << 2);
  posBytes.copy(binPadded, 0);
  idxBytes.copy(binPadded, posLen);

  const json = {
    asset: { version: '2.0', generator: 'TryOn-Avatar-MVP' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            mode: 4,
          },
        ],
      },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min: [-0.2, 0, -0.1], max: [0.2, 1.6, 0.1] },
      { bufferView: 1, componentType: 5123, count: 36, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: posLen },
      { buffer: 0, byteOffset: posLen, byteLength: idxLen },
    ],
    buffers: [{ byteLength: binPadded.length }],
  };

  const jsonStr = JSON.stringify(json);
  const jsonBuf = Buffer.from(jsonStr, 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const binChunk = binPadded;

  const totalLen = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

  const out = Buffer.alloc(totalLen);
  let o = 0;

  out.writeUInt32LE(0x46546c67, o); o += 4;
  out.writeUInt32LE(2, o); o += 4;
  out.writeUInt32LE(totalLen, o); o += 4;

  out.writeUInt32LE(jsonChunk.length, o); o += 4;
  out.writeUInt32LE(0x4e4f534a, o); o += 4;
  jsonChunk.copy(out, o); o += jsonChunk.length;

  out.writeUInt32LE(binChunk.length, o); o += 4;
  out.writeUInt32LE(0x004e4942, o); o += 4;
  binChunk.copy(out, o);

  fs.writeFileSync(outputPath, out);
}

module.exports = { createPlaceholderGlb };
