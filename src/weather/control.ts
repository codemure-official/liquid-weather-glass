import { resetWeatherValues, weatherTarget, ZERO_WEATHER, type WeatherState } from './params'

/**
 * Who drives the weather targets: live Open-Meteo data, or the demo panel / URL.
 * A tiny external store so React (the panel, the card text) can subscribe while the
 * render loop keeps reading the plain `weatherTarget` object.
 */

/** Card text shown while a preset is forced, so the copy matches the glass on camera. */
export interface DisplayOverride {
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  windCompass: string
}

export type PresetId = 'rainLight' | 'rainHeavy' | 'fog' | 'frost' | 'heat' | 'clear' | 'wind'

export interface Preset {
  label: string
  weather: WeatherState
  display: DisplayOverride
}

const w = (s: Partial<WeatherState>): WeatherState => ({ ...ZERO_WEATHER, ...s })

export const PRESETS: Record<PresetId, Preset> = {
  rainLight: {
    label: 'Rain light',
    weather: w({ rain: 0.3, fog: 0.12 }),
    display: { temperature: 14, condition: 'Light rain', humidity: 84, windSpeed: 9, windCompass: 'SW' },
  },
  rainHeavy: {
    label: 'Rain heavy',
    weather: w({ rain: 1, fog: 0.2, windX: 0.12 }),
    display: { temperature: 11, condition: 'Heavy rain', humidity: 94, windSpeed: 22, windCompass: 'W' },
  },
  fog: {
    label: 'Fog',
    weather: w({ fog: 1 }),
    display: { temperature: 7, condition: 'Fog', humidity: 99, windSpeed: 3, windCompass: 'N' },
  },
  frost: {
    label: 'Frost',
    weather: w({ frost: 1 }),
    display: { temperature: -6, condition: 'Snow', humidity: 78, windSpeed: 12, windCompass: 'NE' },
  },
  heat: {
    label: 'Heat',
    weather: w({ heat: 1, windX: 0.15 }),
    display: { temperature: 36, condition: 'Clear sky', humidity: 22, windSpeed: 8, windCompass: 'E' },
  },
  clear: {
    label: 'Clear',
    weather: w({}),
    display: { temperature: 21, condition: 'Mainly clear', humidity: 48, windSpeed: 6, windCompass: 'S' },
  },
  wind: {
    label: 'Wind',
    weather: w({ rain: 0.45, fog: 0.1, windX: 0.85 }),
    display: { temperature: 12, condition: 'Rain, gale', humidity: 82, windSpeed: 58, windCompass: 'W' },
  },
}

export interface ControlState {
  mode: 'live' | 'manual'
  /** Highlighted preset; null when live or after a slider tweak. */
  preset: PresetId | null
  /** Current targets, mirrored for the sliders. */
  target: WeatherState
  display: DisplayOverride | null
  /** Bumped by Reset; the render loop clears the glass when it changes. */
  resetToken: number
}

const query = new URLSearchParams(window.location.search)

function num(key: string): number | undefined {
  const value = Number(query.get(key))
  return query.has(key) && Number.isFinite(value) ? value : undefined
}

const urlWeather: Partial<WeatherState> = Object.fromEntries(
  (
    [
      ['rain', num('rain')],
      ['fog', num('fog')],
      ['frost', num('frost')],
      ['heat', num('heat')],
      ['windX', num('wind')],
    ] as const
  ).filter(([, v]) => v !== undefined),
)

/** Any weather param in the URL pins the effects, as if set from the panel. */
const hasUrlOverrides = Object.keys(urlWeather).length > 0

let liveTarget: WeatherState | null = null
let state: ControlState = {
  mode: hasUrlOverrides ? 'manual' : 'live',
  preset: null,
  target: { ...ZERO_WEATHER, ...urlWeather },
  display: null,
  resetToken: 0,
}
Object.assign(weatherTarget, state.target)

const listeners = new Set<() => void>()

function update(next: Partial<ControlState>) {
  state = { ...state, ...next }
  Object.assign(weatherTarget, state.target)
  listeners.forEach((l) => l())
}

export const control = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
  get: () => state,

  /** Called by the live weather hook; only applied while in live mode. */
  setLive(target: WeatherState) {
    liveTarget = { ...target }
    if (state.mode === 'live') update({ target: liveTarget })
  },

  goLive() {
    update({ mode: 'live', preset: null, display: null, target: liveTarget ?? { ...ZERO_WEATHER } })
  },

  applyPreset(id: PresetId) {
    const p = PRESETS[id]
    update({ mode: 'manual', preset: id, display: p.display, target: { ...p.weather } })
  },

  /** A slider move: switches to manual but keeps whatever text the card is showing. */
  setValue(key: keyof WeatherState, value: number) {
    update({ mode: 'manual', preset: null, target: { ...state.target, [key]: value } })
  },

  /** Wipes the glass clean and lets the current state grow back in. */
  reset() {
    resetWeatherValues()
    update({ resetToken: state.resetToken + 1 })
  },
}
