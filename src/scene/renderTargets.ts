import { HalfFloatType, UnsignedByteType, type WebGLRenderer } from 'three'

/** Half float where it is renderable (smooth gradients, precise fields), 8-bit otherwise. */
export function pickRenderTargetType(gl: WebGLRenderer) {
  return gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float')
    ? HalfFloatType
    : UnsignedByteType
}
