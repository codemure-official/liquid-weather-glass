import { useFBO } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color, LinearFilter, LinearMipmapLinearFilter, ShaderMaterial, Vector2, type WebGLRenderer } from 'three'
import { shaders } from '../shaders'
import { backdrop as weather } from '../weather/params'
import { BACKGROUND_SCALE, PALETTES, type Palette } from './config'
import { createFullscreenPass } from './fullscreenPass'
import { pickRenderTargetType } from './renderTargets'

/** Writes the weather-weighted mix of palettes into `base` and `blobs`. */
function blendPalettes(base: Color, blobs: Color[]) {
  const weights: [Palette, number][] = [
    [PALETTES.rain, weather.rain],
    [PALETTES.fog, weather.fog],
    [PALETTES.frost, weather.frost],
    [PALETTES.heat, weather.heat],
  ]
  const active = weights.reduce((sum, [, w]) => sum + w, 0)
  weights.push([PALETTES.clear, Math.max(0, 1 - active)])
  const total = Math.max(active, 1)

  base.setRGB(0, 0, 0)
  blobs.forEach((c) => c.setRGB(0, 0, 0))
  for (const [p, w] of weights) {
    if (w <= 0) continue
    const k = w / total
    base.r += p.base.r * k
    base.g += p.base.g * k
    base.b += p.base.b * k
    p.blobs.forEach((c, i) => {
      blobs[i].r += c.r * k
      blobs[i].g += c.g * k
      blobs[i].b += c.b * k
    })
  }
}

/**
 * Renders the animated gradient background into a mipmapped render target.
 * The mip chain doubles as a cheap blur source for the frosted glass.
 */
export function useBackgroundPass() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const width = Math.max(1, Math.round(size.width * dpr * BACKGROUND_SCALE))
  const height = Math.max(1, Math.round(size.height * dpr * BACKGROUND_SCALE))

  // Half float avoids banding in the smooth gradients.
  const type = useMemo(() => pickRenderTargetType(gl), [gl])

  const target = useFBO(width, height, {
    type,
    generateMipmaps: true,
    minFilter: LinearMipmapLinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
  })

  const pass = useMemo(
    () =>
      createFullscreenPass(
        new ShaderMaterial({
          vertexShader: shaders.fullscreenVert,
          fragmentShader: shaders.backgroundFrag,
          uniforms: {
            uTime: { value: 0 },
            uResolution: { value: new Vector2(1, 1) },
            uBase: { value: PALETTES.clear.base.clone() },
            uColors: { value: PALETTES.clear.blobs.map((c) => c.clone()) },
          },
          depthTest: false,
          depthWrite: false,
        }),
      ),
    [],
  )

  useEffect(() => () => pass.dispose(), [pass])

  const render = (renderer: WebGLRenderer, time: number) => {
    const u = pass.material.uniforms
    u.uTime.value = time
    u.uResolution.value.set(width, height)
    blendPalettes(u.uBase.value, u.uColors.value)
    pass.render(renderer, target)
  }

  return { texture: target.texture, render }
}
