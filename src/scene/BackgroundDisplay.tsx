import { useEffect, useMemo } from 'react'
import { ShaderMaterial, type Texture } from 'three'
import { shaders } from '../shaders'

/** Fullscreen quad that shows the background render target behind the card. */
export function BackgroundDisplay({ texture }: { texture: Texture }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: shaders.fullscreenVert,
        fragmentShader: shaders.displayFrag,
        uniforms: { uTexture: { value: null } },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => {
    material.uniforms.uTexture.value = texture
  }, [material, texture])

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh frustumCulled={false} renderOrder={-1} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
