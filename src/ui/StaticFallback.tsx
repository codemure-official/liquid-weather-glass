import { useEffect, useState } from 'react'
import { CARD } from '../scene/config'
import type { WeatherReport } from '../weather/useLiveWeather'
import { CardContent } from './CardContent'
import { CONTENT_SIZE } from './contentSize'

function useFitScale() {
  const compute = () =>
    Math.min(
      1,
      (window.innerWidth * CARD.fit.width) / CONTENT_SIZE.width,
      (window.innerHeight * CARD.fit.height) / CONTENT_SIZE.height,
    )
  const [scale, setScale] = useState(compute)
  useEffect(() => {
    const onResize = () => setScale(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })
  return scale
}

/** CSS-only card for browsers without WebGL2: a rainy gradient behind a backdrop-blurred pane. */
export function StaticFallback({ report }: { report: WeatherReport }) {
  const scale = useFitScale()
  return (
    <div className="static-stage">
      <div className="static-card" style={{ transform: `scale(${scale})` }}>
        <CardContent report={report} />
      </div>
    </div>
  )
}
