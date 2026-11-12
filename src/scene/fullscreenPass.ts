import { Mesh, OrthographicCamera, PlaneGeometry, Scene, type ShaderMaterial, type WebGLRenderer, type WebGLRenderTarget } from 'three'

/** A single clip-space quad drawn with the given material (use fullscreen.vert.glsl). */
export function createFullscreenPass(material: ShaderMaterial) {
  const mesh = new Mesh(new PlaneGeometry(2, 2), material)
  mesh.frustumCulled = false
  const scene = new Scene()
  scene.add(mesh)
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  return {
    material,
    render(renderer: WebGLRenderer, target: WebGLRenderTarget | null) {
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
    },
    dispose() {
      mesh.geometry.dispose()
      material.dispose()
    },
  }
}

export type FullscreenPass = ReturnType<typeof createFullscreenPass>
