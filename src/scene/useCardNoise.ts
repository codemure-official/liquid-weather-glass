import { useFBO } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import { LinearFilter, ShaderMaterial, UnsignedByteType, Vector2, type WebGLRenderer } from 'three'
import { shaders } from '../shaders'
import { CARD, NOISE } from './config'
import { createFullscreenPass } from './fullscreenPass'

const MAP_W = Math.round((NOISE.mapHeight * CARD.width) / CARD.height)

/** Static card-space noise, baked on the first frame. See cardNoise.frag.glsl for the channels. */
export function useCardNoise() {
  const target = useFBO(MAP_W, NOISE.mapHeight, {
    type: UnsignedByteType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    generateMipmaps: false,
    depthBuffer: false,
  })
  const baked = useRef(false)

  const pass = useMemo(
    () =>
      createFullscreenPass(
        new ShaderMaterial({
          vertexShader: shaders.fullscreenVert,
          fragmentShader: shaders.cardNoiseFrag,
          uniforms: { uHalfSize: { value: new Vector2(CARD.width / 2, CARD.height / 2) } },
          depthTest: false,
          depthWrite: false,
        }),
      ),
    [],
  )

  useEffect(() => () => pass.dispose(), [pass])

  const bake = (renderer: WebGLRenderer) => {
    if (baked.current) return
    pass.render(renderer, target)
    baked.current = true
  }

  return { texture: target.texture, bake }
}
