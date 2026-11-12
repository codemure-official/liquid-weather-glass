import { useEffect, useRef, useState } from 'react'
import type { WeatherReport } from '../weather/useLiveWeather'
import './card.css'

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

/** Eases a number toward `value` over `ms`, so the big temperature rolls instead of snapping. */
function useTweened(value: number, ms: number) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    if (origin === value) return
    let id = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / ms)
      const v = origin + (value - origin) * (1 - (1 - t) ** 3)
      from.current = v
      setShown(v)
      if (t < 1) id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [value, ms])
  return shown
}

function formatLocalTime(now: number, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    })
      .format(now)
      .replace(',', ' ·')
  } catch {
    return ''
  }
}

/** Relative, so it reads right whatever timezone the viewer and the location are in. */
function formatAge(ms: number) {
  const minutes = Math.floor(ms / 60_000)
  return minutes < 1 ? 'just now' : `${minutes} min ago`
}

function formatTemp(t: number) {
  const r = Math.round(t)
  // Typographic minus; Math.round(-0.3) is -0, which String() already prints as "0".
  return r < 0 ? `−${Math.abs(r)}` : String(r)
}

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <path
      fill="currentColor"
      d="M12 2.5a7 7 0 0 0-7 7c0 5.1 6.2 11.4 6.5 11.7a.7.7 0 0 0 1 0c.3-.3 6.5-6.6 6.5-11.7a7 7 0 0 0-7-7Zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2Z"
    />
  </svg>
)

interface CardContentProps {
  report: WeatherReport | null
}

/** The text layer of the card. An inherited `--ink` (0..1) shifts the text from white to dark for bright glass. */
export function CardContent({ report }: CardContentProps) {
  const now = useNow(30_000)
  const temperature = useTweened(report?.temperature ?? 0, 1400)

  if (!report) {
    return (
      <div className="card-content is-loading">
        <div className="card-place">Locating…</div>
      </div>
    )
  }

  return (
    <div className="card-content">
      <header>
        <div className="card-place">
          <PinIcon />
          <span>{report.city}</span>
        </div>
        <div className="card-time">{formatLocalTime(now, report.timezone)}</div>
      </header>

      <div className="card-hero">
        <div className="card-temp">
          {formatTemp(temperature)}
          <span className="card-degree">°</span>
        </div>
        {/* Keyed so a new condition fades in rather than swapping. */}
        <div key={report.condition} className="card-condition card-fade">
          {report.condition}
        </div>
      </div>

      <dl className="card-stats">
        <div>
          <dt>Humidity</dt>
          <dd key={report.humidity} className="card-fade">
            {Math.round(report.humidity)}%
          </dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd key={`${report.windSpeed}${report.windCompass}`} className="card-fade">
            {Math.round(report.windSpeed)} <small>km/h</small> {report.windCompass}
          </dd>
        </div>
      </dl>

      <footer className="card-source">
        {report.source === 'live'
          ? `Open-Meteo · updated ${formatAge(now - report.updatedAt)}`
          : 'Demo data · live weather unavailable'}
      </footer>
    </div>
  )
}
