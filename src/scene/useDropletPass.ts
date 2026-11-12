import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import {
  AddEquation,
  Color,
  CustomBlending,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  Mesh,
  OneFactor,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
} from 'three'
import { shaders } from '../shaders'
import { DropletSim } from '../sim/droplets'
import { weather } from '../weather/params'
import { CARD, DROPLETS } from './config'
import { interaction } from './interaction'
import { pickRenderTargetType } from './renderTargets'

const MAP_W = Math.round((DROPLETS.mapHeight * CARD.width) / CARD.height)
const MAP_H = DROPLETS.mapHeight

/**
 * Runs the CPU droplet sim and splats the drops into a card-space map on the GPU.
 * Only the instance buffer (6 floats per drop) is uploaded each frame.
 */
export function useDropletPass() {
  const gl = useThree((s) => s.gl)
  const type = useMemo(() => pickRenderTargetType(gl), [gl])

  const target = useFBO(MAP_W, MAP_H, {
    type,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
  })

  const pass = useMemo(() => {
    const sim = new DropletSim(CARD.width / 2, CARD.height / 2, DROPLETS.capacity)

    const quad = new PlaneGeometry(2, 2)
    const geometry = new InstancedBufferGeometry()
    geometry.index = quad.index
    geometry.setAttribute('position', quad.getAttribute('position'))
    const drops = new InstancedBufferAttribute(new Float32Array(sim.capacity * 4), 4)
    const dirs = new InstancedBufferAttribute(new Float32Array(sim.capacity * 2), 2)
    drops.setUsage(DynamicDrawUsage)
    dirs.setUsage(DynamicDrawUsage)
    geometry.setAttribute('aDrop', drops)
    geometry.setAttribute('aDir', dirs)
    geometry.instanceCount = 0

    const material = new ShaderMaterial({
      vertexShader: shaders.dropletVert,
      fragmentShader: shaders.dropletFrag,
      uniforms: {
        uHalfSize: { value: new Vector2(CARD.width / 2, CARD.height / 2) },
        uKernelScale: { value: DROPLETS.kernelScale },
        uHeightScale: { value: DROPLETS.heightScale },
      },
      blending: CustomBlending,
      blendEquation: AddEquation,
      blendSrc: OneFactor,
      blendDst: OneFactor,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    const mesh = new Mesh(geometry, material)
    mesh.frustumCulled = false
    const scene = new Scene()
    scene.add(mesh)

    return { sim, geometry, drops, dirs, material, scene, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1) }
  }, [])

  useEffect(
    () => () => {
      pass.geometry.dispose()
      pass.material.dispose()
    },
    [pass],
  )

  const savedClear = useMemo(() => new Color(), [])
  // The map only needs redrawing while drops exist, plus one frame to clear the last of them.
  const drawn = useMemo(() => ({ count: -1 }), [])

  const update = (dt: number) => {
    const { sim, drops, dirs, geometry } = pass
    // Flat card: gravity points down the glass. Tilt adds a pull toward the edge pushed away.
    sim.gravity.x = interaction.tilt.y * DROPLETS.tiltGravity
    sim.gravity.y = -1 - interaction.tilt.x * DROPLETS.tiltGravity
    sim.wind.x = weather.windX
    sim.wind.y = weather.windY
    sim.rain = weather.rain
    sim.frost = weather.frost
    sim.heat = weather.heat
    sim.step(dt)

    const count = sim.writeInstances(drops.array as Float32Array, dirs.array as Float32Array)
    geometry.instanceCount = count
    drops.clearUpdateRanges()
    drops.addUpdateRange(0, count * 4)
    drops.needsUpdate = true
    dirs.clearUpdateRanges()
    dirs.addUpdateRange(0, count * 2)
    dirs.needsUpdate = true
  }

  const render = (renderer: WebGLRenderer) => {
    const count = pass.geometry.instanceCount
    if (count === 0 && drawn.count === 0) return
    drawn.count = count
    renderer.getClearColor(savedClear)
    const savedAlpha = renderer.getClearAlpha()
    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(target)
    renderer.render(pass.scene, pass.camera)
    renderer.setClearColor(savedClear, savedAlpha)
  }

  return { texture: target.texture, sim: pass.sim, update, render }
}
