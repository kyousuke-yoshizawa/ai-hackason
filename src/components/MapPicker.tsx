import { MouseEvent, useRef, useState } from 'react'

const GRID_SIZE = 400
const GRID_STEP = 30

export function MapPicker({
  x,
  y,
  onPick,
}: {
  x: number | null
  y: number | null
  onPick: (x: number, y: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const renderedSize = GRID_SIZE * zoom

  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const screenCTM = svg?.getScreenCTM()
    if (!svg || !screenCTM) return

    const point = svg.createSVGPoint()
    point.x = e.clientX
    point.y = e.clientY
    const svgPoint = point.matrixTransform(screenCTM.inverse())

    onPick(
      Math.min(GRID_SIZE, Math.max(0, Math.round(svgPoint.x))),
      Math.min(GRID_SIZE, Math.max(0, Math.round(svgPoint.y)))
    )
  }

  const gridLines = []
  for (let i = 0; i <= GRID_SIZE; i += GRID_STEP) {
    gridLines.push(
      <line key={`v${i}`} x1={i} y1={0} x2={i} y2={GRID_SIZE} stroke="#e5e7eb" strokeWidth={0.5} />
    )
    gridLines.push(
      <line key={`h${i}`} x1={0} y1={i} x2={GRID_SIZE} y2={i} stroke="#e5e7eb" strokeWidth={0.5} />
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, Number((z - 0.5).toFixed(1))))}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          ズームアウト
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(3, Number((z + 0.5).toFixed(1))))}
          className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          ズームイン
        </button>
        <span className="text-xs text-gray-400">{zoom}x</span>
      </div>
      <div
        className="overflow-auto rounded-lg border border-gray-300"
        style={{ maxWidth: GRID_SIZE, maxHeight: GRID_SIZE }}
      >
        <svg
          ref={svgRef}
          width={renderedSize}
          height={renderedSize}
          viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
          onClick={handleClick}
          className="cursor-crosshair bg-white"
        >
          {gridLines}
          {x !== null && y !== null && !Number.isNaN(x) && !Number.isNaN(y) && (
            <circle cx={x} cy={y} r={5} fill="#4f46e5" stroke="white" strokeWidth={1.5} />
          )}
        </svg>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        マップをクリックして座標を指定{' '}
        {x !== null && y !== null && !Number.isNaN(x) && !Number.isNaN(y) ? `(${x}, ${y})` : ''}
      </p>
    </div>
  )
}
