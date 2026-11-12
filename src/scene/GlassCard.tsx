import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import {
  Raycaster,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Intersection,
  type Mesh,
  type PerspectiveCamera,
  type Texture,
} from 'three'
import { shaders } from '../shaders'
import { Spring } from '../sim/spring'
import { weather } from '../weather/params'
import { syncCardOverlay } from './cardOverlay'
import { CARD, DROPLETS, FROST, GLASS, HEAT, TILT } from './config'
import { interaction } from './interaction'

const PLANE_W = CARD.width + CARD.padding * 2
const PLANE_H = CARD.height + CARD.padding * 2

interface GlassCardProps {
  background: Texture
  drops: Texture
  noise: Texture
  /** Returns the current fog wipe mask; it ping-pongs between two targets. */
  wipe: () => Texture
  /** The HTML text layer, kept aligned with the tilted card every frame. */
  overlay: RefObject<HTMLDivElement | null>
}

export function GlassCard({ background, drops, noise, wipe, overlay }: GlassCardProps) {
  const mesh = useRef<Mesh>(null)
  const viewport = useThree((s) => s.viewport)
  const springs = useMemo(() => ({ x: new Spring(), y: new Spring() }), [])
  const resolution = useMemo(() => new Vector2(), [])
  const picking = useMemo(() => ({ raycaster: new Raycaster(), ndc: new Vector2(), hits: [] as Intersection[] }), [])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: shaders.cardVert,
        fragmentShader: shaders.cardFrag,
        uniforms: {
          uBackground: { value: null },
          uResolution: { value: resolution },
          uHalfSize: { value: new Vector2(CARD.width / 2, CARD.height / 2) },
          uPlaneHalf: { value: new Vector2(PLANE_W / 2, PLANE_H / 2) },
          uRadius: { value: CARD.radius },
          uBevel: { value: CARD.bevel },
          uRefractPx: { value: GLASS.refractPx },
          uBlurLod: { value: GLASS.blurLod },
          uTilt: { value: new Vector2() },
          uLightPos: { value: new Vector3(...GLASS.lightPos) },
          uPxPerUnit: { value: 1 },
          uTime: { value: 0 },
          uDrops: { value: null },
          uDropThreshold: { value: DROPLETS.threshold },
          uDropHeightScale: { value: DROPLETS.heightScale },
          uDropLens: { value: DROPLETS.lens },
          uNoise: { value: null },
          uWipe: { value: null },
          uFog: { value: 0 },
          uFrost: { value: 0 },
          uFrostReach: { value: FROST.reach },
          uHeat: { value: 0 },
          uShimmer: { value: HEAT.shimmer },
          uWind: { value: new Vector2() },
        },
        transparent: true,
        depthWrite: false,
      }),
    [resolution],
  )

  useEffect(() => {
    material.uniforms.uBackground.value = background
    material.uniforms.uDrops.value = drops
    material.uniforms.uNoise.value = noise
  }, [material, background, drops, noise])

  useEffect(() => () => material.dispose(), [material])

  // Fit the card inside the viewport on narrow (portrait / mobile) screens.
  const scale = Math.min(
    1,
    (viewport.width * CARD.fit.width) / CARD.width,
    (viewport.height * CARD.fit.height) / CARD.height,
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const t = state.clock.elapsedTime

    springs.x.target = interaction.tiltTarget.x
    springs.y.target = interaction.tiltTarget.y
    const idle = interaction.dragging ? 0 : TILT.idleRadians
    const tx = springs.x.step(dt) + Math.sin(t * 0.6) * idle
    const ty = springs.y.step(dt) + Math.cos(t * 0.45) * idle
    interaction.tilt.x = tx
    interaction.tilt.y = ty

    const card = mesh.current
    if (card) {
      card.rotation.set(tx, ty, 0)
      projectPointer(card, state.camera)
    }

    state.gl.getDrawingBufferSize(resolution)
    const u = material.uniforms
    u.uRefractPx.value = GLASS.refractPx * state.viewport.dpr
    u.uPxPerUnit.value = (resolution.y / state.viewport.height) * scale
    u.uTilt.value.set(tx, ty)
    u.uTime.value = t
    u.uWipe.value = wipe()
    u.uFog.value = weather.fog
    u.uFrost.value = weather.frost
    u.uHeat.value = weather.heat
    u.uWind.value.set(weather.windX, weather.windY)

    if (overlay.current) {
      syncCardOverlay(overlay.current, {
        tiltX: tx,
        tiltY: ty,
        scale,
        heightPx: state.size.height,
        viewportHeight: state.viewport.height,
        fov: (state.camera as PerspectiveCamera).fov,
        // Fog and frost turn the glass pale, so the text moves toward dark ink to stay readable.
        ink: Math.min(1, weather.fog * 0.95 + weather.frost * 0.9),
      })
    }
  })

  /** Intersects the pointer ray with the tilted card so wiping lands exactly under the finger. */
  function projectPointer(card: Mesh, camera: Parameters<Raycaster['setFromCamera']>[1]) {
    const cp = interaction.cardPointer
    cp.hit = false
    if (!interaction.dragging) return
    card.updateMatrixWorld()
    picking.ndc.set(interaction.pointer.x, interaction.pointer.y)
    picking.raycaster.setFromCamera(picking.ndc, camera)
    picking.hits.length = 0
    const uv = picking.raycaster.intersectObject(card, false, picking.hits)[0]?.uv
    if (!uv) return
    cp.x = (uv.x - 0.5) * PLANE_W
    cp.y = (uv.y - 0.5) * PLANE_H
    cp.hit = Math.abs(cp.x) < CARD.width / 2 && Math.abs(cp.y) < CARD.height / 2
  }

  return (
    <mesh ref={mesh} scale={scale} material={material}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
    </mesh>
  )
}
