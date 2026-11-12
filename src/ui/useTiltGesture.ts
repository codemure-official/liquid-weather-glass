import { useDrag } from '@use-gesture/react'
import { TILT } from '../scene/config'
import { interaction } from '../scene/interaction'

/**
 * One drag gesture drives both tilt and fog wiping: dragging toward an edge pushes that edge away,
 * and the pointer position is projected onto the card each frame to paint the wipe mask.
 */
export function useTiltGesture() {
  return useDrag(({ down, movement: [mx, my], xy: [px, py] }) => {
    interaction.dragging = down
    interaction.pointer.x = (px / window.innerWidth) * 2 - 1
    interaction.pointer.y = 1 - (py / window.innerHeight) * 2
    if (!down) {
      interaction.tiltTarget.x = 0
      interaction.tiltTarget.y = 0
      return
    }
    const range = Math.min(window.innerWidth, window.innerHeight) * TILT.dragRange
    // tanh gives a soft limit so the card eases into max tilt instead of hitting a wall.
    interaction.tiltTarget.x = Math.tanh(my / range) * TILT.maxRadians
    interaction.tiltTarget.y = Math.tanh(mx / range) * TILT.maxRadians
  })
}
