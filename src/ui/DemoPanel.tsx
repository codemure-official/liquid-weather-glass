import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import { control, PRESETS, type PresetId } from '../weather/control'
import type { WeatherKey } from '../weather/params'
import './demo.css'

const SLIDERS: { key: WeatherKey; label: string; min: number }[] = [
  { key: 'rain', label: 'Rain', min: 0 },
  { key: 'fog', label: 'Fog', min: 0 },
  { key: 'frost', label: 'Frost', min: 0 },
  { key: 'heat', label: 'Heat', min: 0 },
  { key: 'windX', label: 'Wind', min: -1 },
]

const PRESET_IDS = Object.keys(PRESETS) as PresetId[]

/** `?demo` opens the panel on load, handy on phones without a keyboard. */
const START_OPEN = new URLSearchParams(window.location.search).has('demo')

function useControl() {
  return useSyncExternalStore(control.subscribe, control.get)
}

/** Frames per second, sampled over half-second windows; only runs while the panel is open. */
function useFps(active: boolean) {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (!active) return
    let frames = 0
    let start = performance.now()
    let id = requestAnimationFrame(function tick(now) {
      frames++
      if (now - start >= 500) {
        setFps(Math.round((frames * 1000) / (now - start)))
        frames = 0
        start = now
      }
      id = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(id)
  }, [active])
  return fps
}

/** Two quick taps in the top-right corner toggle the panel on touch screens. */
function useCornerDoubleTap(onToggle: () => void) {
  const lastTap = useRef(0)
  return (e: PointerEvent) => {
    e.stopPropagation()
    const now = e.timeStamp
    if (now - lastTap.current < 350) {
      lastTap.current = 0
      onToggle()
    } else {
      lastTap.current = now
    }
  }
}

/**
 * Filming controls, hidden by default; press D to toggle.
 * Presets and sliders set targets only, so every change eases in over ~2 s.
 */
export function DemoPanel() {
  const [open, setOpen] = useState(START_OPEN)
  const ctl = useControl()
  const fps = useFps(open)
  const onCornerTap = useCornerDoubleTap(() => setOpen((o) => !o))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.target instanceof HTMLInputElement && e.target.type === 'text') return
      if (e.key === 'd' || e.key === 'D') setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="demo-hotspot" onPointerDown={onCornerTap} aria-hidden="true" />
      {open && (
        <aside className="demo-panel" aria-label="Demo controls">
          <header className="demo-head">
            <span className="demo-title">Demo</span>
            <span className={`demo-fps ${fps > 0 && fps < 50 ? 'is-low' : ''}`}>{fps || '–'} fps</span>
            <button type="button" className="demo-close" onClick={() => setOpen(false)} aria-label="Hide demo panel">
              ×
            </button>
          </header>

          <div className="demo-presets">
            {PRESET_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={ctl.preset === id ? 'is-active' : ''}
                onClick={() => control.applyPreset(id)}
              >
                {PRESETS[id].label}
              </button>
            ))}
            <button
              type="button"
              className={ctl.mode === 'live' ? 'is-active is-live' : 'is-live'}
              onClick={() => control.goLive()}
            >
              Live
            </button>
          </div>

          <div className="demo-sliders">
            {SLIDERS.map(({ key, label, min }) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="range"
                  min={min}
                  max={1}
                  step={0.01}
                  value={ctl.target[key]}
                  onChange={(e) => control.setValue(key, Number(e.target.value))}
                />
                <output>{ctl.target[key].toFixed(2)}</output>
              </label>
            ))}
          </div>

          <footer className="demo-foot">
            <button type="button" onClick={() => control.reset()}>
              Reset glass
            </button>
            <span className="demo-hint">
              {ctl.mode === 'live' ? 'Live weather' : 'Manual'} · <span className="demo-key">D to hide</span>
              <span className="demo-touch">double-tap top-right</span>
            </span>
          </footer>
        </aside>
      )}
    </>
  )
}
