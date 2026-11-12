import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Experience } from './scene/Experience'
import { CardContent } from './ui/CardContent'
import { DemoPanel } from './ui/DemoPanel'
import { ErrorBoundary } from './ui/ErrorBoundary'
import { StaticFallback } from './ui/StaticFallback'
import { useTiltGesture } from './ui/useTiltGesture'
import { control } from './weather/control'
import { MOCK_REPORT, useLiveWeather, type WeatherReport } from './weather/useLiveWeather'

function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

const WEBGL2 = supportsWebGL2()

/** Crisp on retina, but never above 2×; PerformanceMonitor walks it down if frames drop. */
const MAX_DPR = Math.min(window.devicePixelRatio || 1, 2)
const MIN_DPR = Math.min(1, MAX_DPR)

/** Live data, with the forced preset's text laid over it while the demo panel drives the glass. */
function useDisplayedReport(): WeatherReport | null {
  const live = useLiveWeather()
  const display = useSyncExternalStore(control.subscribe, () => control.get().display)
  return useMemo(() => (display ? { ...(live ?? MOCK_REPORT), ...display } : live), [live, display])
}

export default function App() {
  const bindTilt = useTiltGesture()
  const report = useDisplayedReport()
  const overlay = useRef<HTMLDivElement>(null)
  const [dpr, setDpr] = useState(MAX_DPR)

  const fallback = <StaticFallback report={report ?? MOCK_REPORT} />
  if (!WEBGL2) return fallback

  return (
    <ErrorBoundary fallback={fallback}>
      <div className="stage" {...bindTilt()} onContextMenu={(e) => e.preventDefault()}>
        <Canvas
          dpr={dpr}
          camera={{ fov: 35, position: [0, 0, 6] }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <PerformanceMonitor
            flipflops={3}
            onDecline={() => setDpr((d) => Math.max(MIN_DPR, Math.round((d - 0.25) * 4) / 4))}
            onIncline={() => setDpr((d) => Math.min(MAX_DPR, Math.round((d + 0.25) * 4) / 4))}
            onFallback={() => setDpr(MIN_DPR)}
          />
          <Experience overlay={overlay} />
        </Canvas>
        {/* Text layer; the render loop projects it onto the tilted card each frame. */}
        <div className="card-overlay">
          <div ref={overlay} className="card-overlay-card">
            <CardContent report={report} />
          </div>
        </div>
      </div>
      <DemoPanel />
    </ErrorBoundary>
  )
}
