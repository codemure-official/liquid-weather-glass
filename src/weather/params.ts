/**
 * Weather values read by the render loop every frame.
 * `weatherTarget` is what we want; `weather` eases toward it so nothing ever snaps.
 * Targets come from live Open-Meteo data, the demo panel, or the URL,
 * e.g. `?rain=0.3&fog=1&frost=1&heat=1&wind=0.6` (see control.ts).
 */
export interface WeatherState {
  rain: number
  fog: number
  frost: number
  heat: number
  /** Card-space wind, roughly -1..1. Positive x blows to the right. */
  windX: number
  windY: number
}

export type WeatherKey = keyof WeatherState

/**
 * Roughly how long a change takes to settle, in seconds. Transitions take ~2 s;
 * frost grows in over ~3 s and fog condenses a little slower than rain arrives.
 */
const SETTLE_SECONDS: Record<WeatherKey, number> = {
  rain: 2,
  fog: 2.5,
  frost: 3,
  heat: 2,
  windX: 2,
  windY: 2,
}

export const WEATHER_KEYS = Object.keys(SETTLE_SECONDS) as WeatherKey[]

export const ZERO_WEATHER: Readonly<WeatherState> = { rain: 0, fog: 0, frost: 0, heat: 0, windX: 0, windY: 0 }

export const weatherTarget: WeatherState = { ...ZERO_WEATHER }

/** Drives the glass. Starts empty so the first load animates in. */
export const weather: WeatherState = { ...ZERO_WEATHER }
const velocity: WeatherState = { ...ZERO_WEATHER }

/** Drives the background colours. Same easing, but Reset leaves it alone so the backdrop never jumps. */
export const backdrop: WeatherState = { ...ZERO_WEATHER }
const backdropVelocity: WeatherState = { ...ZERO_WEATHER }

/**
 * A critically damped spring reaches ~97% of a step in 2.6 × smoothTime.
 * Unlike a fixed-length ramp it keeps its velocity when retargeted, so dragging a slider
 * or switching presets mid-transition stays smooth instead of restarting from rest.
 */
const SMOOTH_TIME = Object.fromEntries(WEATHER_KEYS.map((k) => [k, SETTLE_SECONDS[k] / 2.6])) as Record<
  WeatherKey,
  number
>

function smoothDamp(value: WeatherState, vel: WeatherState, dt: number) {
  for (const key of WEATHER_KEYS) {
    const target = weatherTarget[key]
    const omega = 2 / SMOOTH_TIME[key]
    const x = omega * dt
    // Stable closed-form approximation of exp(-x) (Game Programming Gems 4, SmoothDamp).
    const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    const change = value[key] - target
    const temp = (vel[key] + omega * change) * dt
    vel[key] = (vel[key] - omega * temp) * decay
    let next = target + (change + temp) * decay
    if (Math.abs(next - target) < 1e-4 && Math.abs(vel[key]) < 1e-3) {
      next = target
      vel[key] = 0
    }
    value[key] = next
  }
}

export function stepWeather(dt: number) {
  smoothDamp(weather, velocity, dt)
  smoothDamp(backdrop, backdropVelocity, dt)
}

/** Drops the eased values back to zero so the current target grows in again from a clean pane. */
export function resetWeatherValues() {
  Object.assign(weather, ZERO_WEATHER)
  Object.assign(velocity, ZERO_WEATHER)
}
