/** Current conditions from Open-Meteo (no API key). */
export interface CurrentConditions {
  temperature: number
  humidity: number
  /** WMO weather interpretation code. */
  weatherCode: number
  /** km/h */
  windSpeed: number
  /** Meteorological degrees: the direction the wind blows *from* (0 = north, 90 = east). */
  windDirection: number
  isDay: boolean
  /** IANA timezone of the location, e.g. "Europe/London". */
  timezone: string
}

interface OpenMeteoResponse {
  timezone?: string
  current?: {
    temperature_2m?: number
    relative_humidity_2m?: number
    weather_code?: number
    wind_speed_10m?: number
    wind_direction_10m?: number
    is_day?: number
  }
}

const FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'is_day',
].join(',')

function requireNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Open-Meteo: missing ${name}`)
  return value
}

export async function fetchCurrent(latitude: number, longitude: number, signal?: AbortSignal): Promise<CurrentConditions> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: latitude.toFixed(3),
    longitude: longitude.toFixed(3),
    current: FIELDS,
    wind_speed_unit: 'kmh',
    timezone: 'auto',
  }).toString()

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo: HTTP ${res.status}`)
  const json = (await res.json()) as OpenMeteoResponse
  const c = json.current ?? {}

  return {
    temperature: requireNumber(c.temperature_2m, 'temperature'),
    humidity: requireNumber(c.relative_humidity_2m, 'humidity'),
    weatherCode: requireNumber(c.weather_code, 'weather code'),
    windSpeed: requireNumber(c.wind_speed_10m, 'wind speed'),
    windDirection: requireNumber(c.wind_direction_10m, 'wind direction'),
    isDay: c.is_day !== 0,
    timezone: json.timezone ?? 'UTC',
  }
}
