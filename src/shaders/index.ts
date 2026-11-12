import backgroundFrag from './background.frag.glsl?raw'
import cardFrag from './card.frag.glsl?raw'
import cardNoiseFrag from './cardNoise.frag.glsl?raw'
import cardVert from './card.vert.glsl?raw'
import displayFrag from './display.frag.glsl?raw'
import dropletFrag from './droplet.frag.glsl?raw'
import dropletVert from './droplet.vert.glsl?raw'
import fogMaskFrag from './fogMask.frag.glsl?raw'
import fullscreenVert from './fullscreen.vert.glsl?raw'
import noise from './noise.glsl?raw'
import sdf from './sdf.glsl?raw'

export const shaders = {
  fullscreenVert,
  backgroundFrag,
  displayFrag,
  dropletVert,
  dropletFrag,
  cardNoiseFrag: `${noise}\n${cardNoiseFrag}`,
  fogMaskFrag: `${noise}\n${fogMaskFrag}`,
  cardVert,
  cardFrag: `${sdf}\n${noise}\n${cardFrag}`,
}
