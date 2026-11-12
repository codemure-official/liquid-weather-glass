import { useEffect, useState } from 'react'
import { cityFromTimezone, resolvePlace, type Place } from './location'
import { compass, conditionsToWeather, describeCode } from './mapping'
import { fetchCurrent, type CurrentConditions } from './openMeteo'
import { control } from './control'

/** What the card displays. */
export interface WeatherReport {
  city: string
  temperature: number
  condition: string
  humidity: number
  windSpeed: number
  windCompass: string
  timezone: string
  updatedAt: number
  source: 'live' | 'mock'
}

const REFRESH_MS = 10 * 60 * 1000
const CACHE_KEY = 'liquid-weather:v1'
/** `?mock` skips the network and shows the fallback rain state (also handy for filming). */
const FORCE_MOCK = new URLSearchParams(window.location.search).has('mock')

interface CacheEntry {
  place: Place
  current: CurrentConditions
  fetchedAt: number
}

/** Shown when the network or the API fails: a moody rain state rather than an error. */
const MOCK_CONDITIONS: CurrentConditions = {
  temperature: 12,
  humidity: 86,
  weatherCode: 63,
  windSpeed: 16,
  windDirection: 225,
  isDay: true,
  timezone: 'Europe/London',
}

const MOCK_PLACE: Place = { latitude: 51.5072, longitude: -0.1276, city: 'London', source: 'default' }

export const MOCK_REPORT: WeatherReport = toReport(MOCK_PLACE, MOCK_CONDITIONS, Date.now(), 'mock')

function toReport(place: Place, c: CurrentConditions, fetchedAt: number, source: WeatherReport['source']): WeatherReport {
  return {
    city: place.city ?? cityFromTimezone(c.timezone),
    temperature: c.temperature,
    condition: describeCode(c.weatherCode),
    humidity: c.humidity,
    windSpeed: c.windSpeed,
    windCompass: compass(c.windDirection),
    timezone: c.timezone,
    updatedAt: fetchedAt,
    source,
  }
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch {
    return null
  }
}

function writeCache(entry: CacheEntry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Private mode or quota: caching is an optimisation only.
  }
}

/**
 * Loads current conditions (cached for 10 minutes, refreshed every 10 minutes) and,
 * hands the derived weather targets to the control store (applied while in live mode).
 */
export function useLiveWeather(): WeatherReport | null {
  const [report, setReport] = useState<WeatherReport | null>(null)

  useEffect(() => {
    let cancelled = false
    let place: Place | null = null

    const apply = (p: Place, c: CurrentConditions, fetchedAt: number, source: WeatherReport['source']) => {
      if (cancelled) return
      setReport(toReport(p, c, fetchedAt, source))
      control.setLive(conditionsToWeather(c))
    }

    const load = async () => {
      if (FORCE_MOCK) {
        apply(MOCK_PLACE, MOCK_CONDITIONS, Date.now(), 'mock')
        return
      }
      const cached = readCache()
      if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) {
        place = cached.place
        apply(cached.place, cached.current, cached.fetchedAt, 'live')
        return
      }
      try {
        // Locate once per session; refreshes reuse the place so we never re-prompt.
        place ??= cached?.place.source === 'device' ? cached.place : await resolvePlace()
        const current = await fetchCurrent(place.latitude, place.longitude)
        const fetchedAt = Date.now()
        writeCache({ place, current, fetchedAt })
        apply(place, current, fetchedAt, 'live')
      } catch (err) {
        console.warn('Live weather unavailable, showing mock rain.', err)
        if (cached) apply(cached.place, cached.current, cached.fetchedAt, 'live')
        else apply(MOCK_PLACE, MOCK_CONDITIONS, Date.now(), 'mock')
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return report
}
