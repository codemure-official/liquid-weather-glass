export interface Place {
  latitude: number
  longitude: number
  /** Null when reverse geocoding failed; callers fall back to the timezone name. */
  city: string | null
  source: 'device' | 'default'
}

/** Used when geolocation is denied, unavailable or slow. */
export const DEFAULT_PLACE: Place = { latitude: 51.5072, longitude: -0.1276, city: 'London', source: 'default' }

const GEOLOCATION_TIMEOUT_MS = 6000

function currentPosition(): Promise<GeolocationPosition | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise((resolve) => {
    // Some browsers never call back while the permission prompt is open; don't wait forever.
    const timer = window.setTimeout(() => resolve(null), GEOLOCATION_TIMEOUT_MS + 500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer)
        resolve(pos)
      },
      () => {
        window.clearTimeout(timer)
        resolve(null)
      },
      { timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 30 * 60 * 1000, enableHighAccuracy: false },
    )
  })
}

/** Keyless client-side reverse geocoding (BigDataCloud). Open-Meteo itself has no reverse lookup. */
async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client')
    url.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: 'en',
    }).toString()
    const res = await fetch(url)
    if (!res.ok) return null
    const json = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string }
    return json.city || json.locality || json.principalSubdivision || null
  } catch {
    return null
  }
}

export async function resolvePlace(): Promise<Place> {
  const pos = await currentPosition()
  if (!pos) return DEFAULT_PLACE
  const { latitude, longitude } = pos.coords
  return { latitude, longitude, city: await reverseGeocode(latitude, longitude), source: 'device' }
}

/** "America/New_York" → "New York". Good enough when reverse geocoding fails. */
export function cityFromTimezone(timezone: string): string {
  const last = timezone.split('/').pop() ?? timezone
  return last.replace(/_/g, ' ')
}
