import type { CurrentConditions } from './openMeteo'
import type { WeatherState } from './params'

const LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm, hail',
  99: 'Thunderstorm, hail',
}

const RAIN: Record<number, number> = {
  51: 0.25, 53: 0.35, 55: 0.45,
  56: 0.3, 57: 0.4,
  61: 0.45, 63: 0.7, 65: 0.95,
  66: 0.5, 67: 0.7,
  80: 0.5, 81: 0.75, 82: 1,
  95: 1, 96: 1, 99: 1,
}

const SNOW = new Set([71, 73, 75, 77, 85, 86])
const FREEZING = new Set([48, 56, 57, 66, 67])
const FOG = new Set([45, 48])

export function describeCode(code: number): string {
  return LABELS[code] ?? 'Unknown'
}

/** Smoothstep that also accepts a > b (falling edge). */
function ramp(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Translates real conditions into effect targets for the glass. */
export function conditionsToWeather(c: CurrentConditions): WeatherState {
  const code = c.weatherCode
  const temp = c.temperature

  // Frost: snow and freezing precipitation, or simply a glass that's below freezing.
  let frost = SNOW.has(code) ? 1 : FREEZING.has(code) ? 0.85 : 0
  frost = Math.max(frost, ramp(3, -5, temp))

  // Snow lands as frost, not water; freezing rain still beads a little before it sets.
  let rain = SNOW.has(code) ? 0 : (RAIN[code] ?? 0)
  if (frost > 0.8) rain *= 0.4

  // Fog: fog codes, otherwise condensation that builds with humidity.
  let fog = FOG.has(code) ? 1 : 0.65 * ramp(82, 98, c.humidity)
  // Overcast skies get a faint film so the card doesn't read as a sunny day.
  if (code === 3) fog = Math.max(fog, 0.15)
  if (rain > 0.6) fog *= 0.5

  // Heat: clear-ish skies on a hot day.
  const clearness = code <= 1 ? 1 : code === 2 ? 0.6 : 0
  const heat = clearness * ramp(24, 34, temp)

  // Wind blows *toward* direction + 180°. Screen right is east.
  const strength = ramp(4, 45, c.windSpeed)
  const windX = -Math.sin((c.windDirection * Math.PI) / 180) * strength

  return { rain, fog, frost, heat, windX, windY: 0 }
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function compass(degrees: number): string {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8]
}
