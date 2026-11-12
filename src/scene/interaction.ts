/**
 * Mutable interaction state shared between DOM gestures and the render loop.
 * Kept outside React so per-frame reads never trigger re-renders.
 */
export const interaction = {
  dragging: false,
  /** Desired tilt in radians: x = rotation about X (pitch), y = rotation about Y (yaw). */
  tiltTarget: { x: 0, y: 0 },
  /** Current sprung tilt in radians, including idle motion. */
  tilt: { x: 0, y: 0 },
  /** Pointer in normalized device coordinates. */
  pointer: { x: 0, y: 0 },
  /** Pointer projected onto the tilted card, in card-local units. `hit` is false off the card. */
  cardPointer: { x: 0, y: 0, hit: false },
}
