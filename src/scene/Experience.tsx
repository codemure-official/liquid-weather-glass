import { useFrame } from '@react-three/fiber'
import { useRef, type RefObject } from 'react'
import { control } from '../weather/control'
import { stepWeather } from '../weather/params'
import { BackgroundDisplay } from './BackgroundDisplay'
import { GlassCard } from './GlassCard'
import { useBackgroundPass } from './useBackgroundPass'
import { useCardNoise } from './useCardNoise'
import { useDropletPass } from './useDropletPass'
import { useFogPass } from './useFogPass'

export function Experience({ overlay }: { overlay: RefObject<HTMLDivElement | null> }) {
  const background = useBackgroundPass()
  const droplets = useDropletPass()
  const noise = useCardNoise()
  const fog = useFogPass(droplets.texture, noise.texture)
  const resetSeen = useRef(control.get().resetToken)

  // Advance the weather before anything reads it this frame.
  useFrame((_, delta) => stepWeather(Math.min(delta, 1 / 20)), -1)

  // Priority 1 takes over rendering and runs after GlassCard has updated tilt and the card pointer.
  useFrame(({ gl, scene, camera, clock }, delta) => {
    const dt = Math.min(delta, 1 / 20)
    // Reset: a clean, dry pane; the eased weather values were zeroed by control.reset().
    const { resetToken } = control.get()
    if (resetToken !== resetSeen.current) {
      resetSeen.current = resetToken
      droplets.sim.clear()
      fog.clear()
    }
    noise.bake(gl)
    droplets.update(dt)
    droplets.render(gl)
    fog.render(gl, dt)
    background.render(gl, clock.elapsedTime)
    gl.setRenderTarget(null)
    gl.render(scene, camera)
  }, 1)

  return (
    <>
      <BackgroundDisplay texture={background.texture} />
      <GlassCard
        background={background.texture}
        drops={droplets.texture}
        noise={noise.texture}
        wipe={fog.texture}
        overlay={overlay}
      />
    </>
  )
}
