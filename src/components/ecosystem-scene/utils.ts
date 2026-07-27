import * as THREE from "three";

/**
 * Runtime-generated radial gradient texture (no shipped image asset) — used for the halo and
 * fake-shadow billboard sprites. Cheap: a handful of 2D canvas draw calls, cached per call site
 * via useMemo so it only runs once per sphere instance.
 */
export function createRadialGradientTexture(stops: Array<[number, string]>, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** The site's real violet accent (globals.css --accent-r/g/b default), so the 3D "after" colour
 * matches the rest of the site pixel-for-pixel rather than a re-derived approximation. */
export const ACCENT_RGB = { r: 118, g: 89, b: 247 };
export const ACCENT_HEX = new THREE.Color(ACCENT_RGB.r / 255, ACCENT_RGB.g / 255, ACCENT_RGB.b / 255).getHex();

export const BEFORE_CORE_COLOR = 0xf3f2f5;
export const BEFORE_NODE_COLOR = 0x9a9aa0;
export const AFTER_CORE_COLOR = ACCENT_HEX;
export const AFTER_NODE_COLOR = 0xa78bfa;
