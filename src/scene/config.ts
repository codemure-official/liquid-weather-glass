import { Color } from 'three'

export const CARD = {
  width: 2.0,
  height: 2.7,
  radius: 0.22,
  bevel: 0.07,
  /** Extra plane area around the card for the drop shadow. */
  padding: 0.35,
  /** Fraction of the viewport the card may occupy. */
  fit: { width: 0.82, height: 0.78 },
}

export const TILT = {
  maxRadians: (15 * Math.PI) / 180,
  /** Drag distance (as a fraction of the shorter screen side) that reaches ~76% of max tilt. */
  dragRange: 0.35,
  idleRadians: (0.8 * Math.PI) / 180,
}

export const GLASS = {
  refractPx: 22,
  blurLod: 3.2,
  lightPos: [-2.2, 2.8, -1.0] as const,
}

export const DROPLETS = {
  capacity: 300,
  /** Card-space droplet map. Width follows the card aspect. Lower this first if fill rate is a bottleneck. */
  mapHeight: 768,
  /** Coverage threshold for the drop edge. Kernel (1-q²)² hits 0.25 at q = 1/√2. */
  threshold: 0.25,
  kernelScale: Math.SQRT2,
  /** Normalises stored height (∝ radius) into ~0..1 so the 8-bit fallback still works. */
  heightScale: 12,
  /** How far, in card units, a drop's lens displaces the background behind it. */
  lens: 0.09,
  /** Gravity added per radian of tilt (card-space units, where flat = 1). */
  tiltGravity: 2.5 / ((15 * Math.PI) / 180),
}

export const NOISE = {
  /** Static card-space noise bake. Width follows the card aspect. */
  mapHeight: 1024,
}

export const FOG = {
  /** Wipe mask resolution; it's soft, so low-res is fine. */
  mapHeight: 384,
  /** Card units. */
  brushRadius: 0.2,
  /** A fully wiped patch fogs back over this many seconds. */
  regrowSeconds: 7,
}

export const FROST = {
  /** How far inward (as a fraction of the half-width) frost reaches at frost = 1. */
  reach: 0.6,
}

export const HEAT = {
  /** Shimmer amplitude in card units at heat = 1. */
  shimmer: 0.02,
}

/** Background render target scale relative to the drawing buffer. Blurry content, so half-res is plenty. */
export const BACKGROUND_SCALE = 0.5

export interface Palette {
  base: Color
  blobs: [Color, Color, Color, Color]
}

const palette = (base: string, blobs: [string, string, string, string]): Palette => ({
  base: new Color(base),
  blobs: blobs.map((c) => new Color(c)) as Palette['blobs'],
})

/** Background moods, blended by the current weather. Kept muted so the glass stays the hero. */
export const PALETTES = {
  clear: palette('#0a1028', ['#3557d6', '#7b4fd1', '#1fa7c4', '#d06d9a']),
  rain: palette('#06111f', ['#1d4e89', '#2a6f97', '#34509a', '#173a63']),
  fog: palette('#1a1e24', ['#5b636d', '#79818a', '#48505a', '#8a9199']),
  frost: palette('#0e1829', ['#9fc0e8', '#d3e3f6', '#7199cc', '#b8cfee']),
  heat: palette('#240c06', ['#ee8a3a', '#d9503a', '#f3ad4c', '#b9400f']),
}
