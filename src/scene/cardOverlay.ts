import { CONTENT_SIZE } from '../ui/contentSize'
import { CARD } from './config'

export interface OverlayFrame {
  /** Sprung card rotation in radians (three.js Euler XY). */
  tiltX: number
  tiltY: number
  /** Card mesh scale. */
  scale: number
  /** Canvas height in CSS px. */
  heightPx: number
  /** World-space viewport height at the card's depth (z = 0). */
  viewportHeight: number
  /** Vertical field of view in degrees. */
  fov: number
  /** 0..1 text darkness, see card.css. */
  ink: number
}

const last = { perspective: '', transform: '', ink: '' }

/**
 * Projects the HTML text layer exactly like the camera projects the card.
 * CSS `perspective` equals the camera's focal length in px, so a point at depth z on the card
 * lands where WebGL draws it. Called from the render loop so text and glass move in the same frame.
 */
export function syncCardOverlay(el: HTMLElement, f: OverlayFrame) {
  const parent = el.parentElement
  const focalPx = f.heightPx / 2 / Math.tan((f.fov * Math.PI) / 360)
  const pxPerUnit = f.heightPx / f.viewportHeight
  const s = (CARD.width * f.scale * pxPerUnit) / CONTENT_SIZE.width

  const perspective = `${focalPx.toFixed(2)}px`
  if (parent && perspective !== last.perspective) {
    parent.style.perspective = perspective
    last.perspective = perspective
  }

  // CSS y points down, so rotation about X flips sign; rotation about Y matches three.js.
  const transform = `scale3d(${s.toFixed(5)},${s.toFixed(5)},${s.toFixed(5)}) rotateX(${(-f.tiltX).toFixed(5)}rad) rotateY(${f.tiltY.toFixed(5)}rad)`
  if (transform !== last.transform) {
    el.style.transform = transform
    last.transform = transform
  }

  const ink = f.ink.toFixed(3)
  if (ink !== last.ink) {
    el.style.setProperty('--ink', ink)
    last.ink = ink
  }
}
