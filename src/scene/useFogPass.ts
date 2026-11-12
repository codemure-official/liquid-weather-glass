import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { LinearFilter, ShaderMaterial, Vector2, type Texture, type WebGLRenderer } from 'three'
import { shaders } from '../shaders'
import { CARD, DROPLETS, FOG } from './config'
import { createFullscreenPass } from './fullscreenPass'
import { interaction } from './interaction'
import { pickRenderTargetType } from './renderTargets'

const MAP_W = Math.round((FOG.mapHeight * CARD.width) / CARD.height)

/**
 * Card-space wipe mask, ping-ponged between two targets. Dragging across the card paints it,
 * droplets keep their patches clear, and it decays back to fogged over FOG.regrowSeconds.
 */
export function useFogPass(drops: Texture, noise: Texture) {
  const gl = useThree((s) => s.gl)
  const type = useMemo(() => pickRenderTargetType(gl), [gl])
  const settings = { type, minFilter: LinearFilter, magFilter: LinearFilter, generateMipmaps: false, depthBuffer: false }
  const a = useFBO(MAP_W, FOG.mapHeight, settings)
  const b = useFBO(MAP_W, FOG.mapHeight, settings)

  const state = useMemo(
    () => ({
      pass: createFullscreenPass(
        new ShaderMaterial({
          vertexShader: shaders.fullscreenVert,
          fragmentShader: shaders.fogMaskFrag,
          uniforms: {
            uPrev: { value: null },
            uDrops: { value: null },
            uNoise: { value: null },
            uHalfSize: { value: new Vector2(CARD.width / 2, CARD.height / 2) },
            uDecay: { value: 0 },
            uBrushA: { value: new Vector2() },
            uBrushB: { value: new Vector2() },
            uBrushRadius: { value: FOG.brushRadius },
            uBrushStrength: { value: 0 },
            uDropThreshold: { value: DROPLETS.threshold },
          },
          depthTest: false,
          depthWrite: false,
        }),
      ),
      flip: false,
      last: { x: 0, y: 0, valid: false },
      /** Set by clear(): next render drops the whole mask back to fogged. */
      clearNext: false,
    }),
    [],
  )

  useEffect(() => () => state.pass.dispose(), [state])

  const render = (renderer: WebGLRenderer, dt: number) => {
    const read = state.flip ? b : a
    const write = state.flip ? a : b
    const u = state.pass.material.uniforms
    u.uPrev.value = read.texture
    u.uDrops.value = drops
    u.uNoise.value = noise
    u.uDecay.value = state.clearNext ? 1 : dt / FOG.regrowSeconds
    state.clearNext = false

    const cp = interaction.cardPointer
    const wiping = interaction.dragging && cp.hit
    u.uBrushStrength.value = wiping ? 1 : 0
    if (wiping) {
      // Connect to last frame's point so fast drags leave a continuous stroke.
      const from = state.last.valid ? state.last : cp
      u.uBrushA.value.set(from.x, from.y)
      u.uBrushB.value.set(cp.x, cp.y)
    }
    state.last.x = cp.x
    state.last.y = cp.y
    state.last.valid = wiping

    state.pass.render(renderer, write)
    state.flip = !state.flip
  }

  /** The mask written by the most recent render. */
  const texture = () => (state.flip ? b : a).texture

  /** Re-fogs every wiped patch on the next render. */
  const clear = () => {
    state.clearNext = true
    state.last.valid = false
  }

  return { render, texture, clear }
}
