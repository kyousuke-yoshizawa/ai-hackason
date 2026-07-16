import { MouseEvent, useEffect, useRef, useState } from 'react'
import { getArea, Landmark } from '../lib/area'

const GRID_SIZE = 400
const GRID_STEP = 30

export function MapPicker({
  x,
  y,
  onPick,
  existingStores,
}: {
  x: number | null
  y: number | null
  onPick: (x: number, y: number) => void
  existingStores?: { name: string; x: number; y: number }[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [landmarks, setLandmarks] = useState<Landmark[]>([])
  const renderedSize = GRID_SIZE * zoom

  useEffect(() => {
    getArea()
      .then((res) => setLandmarks(res.landmarks))
      .catch(() => setLandmarks([]))
  }, [])

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

  const shoppingStreetPoints = landmarks.filter((l) => l.kind === 'shopping_street')

  const landmarkShapes = landmarks.map((l) => {
    if (l.kind === 'plaza') {
      return (
        <g key={`landmark-${l.name}`}>
          <circle cx={l.x} cy={l.y} r={24} fill="none" stroke="#d97706" strokeWidth={1} opacity={0.3} />
          <circle cx={l.x} cy={l.y} r={16} fill="none" stroke="#d97706" strokeWidth={1} opacity={0.4} />
          <circle cx={l.x} cy={l.y} r={8} fill="#d97706" opacity={0.3} />
        </g>
      )
    }
    if (l.kind === 'station') {
      return (
        <rect
          key={`landmark-${l.name}`}
          x={l.x - 14}
          y={l.y - 9}
          width={28}
          height={18}
          rx={4}
          fill="#3b82f6"
          opacity={0.35}
          stroke="#2563eb"
          strokeWidth={1}
        />
      )
    }
    if (l.kind === 'park') {
      return (
        <ellipse
          key={`landmark-${l.name}`}
          cx={l.x}
          cy={l.y}
          rx={18}
          ry={12}
          fill="#22c55e"
          opacity={0.35}
        />
      )
    }
    // shopping_street の各点はここでは描画せず、後段でペアをまとめて1本の帯として描く
    return null
  })

  const shoppingStreetBand =
    shoppingStreetPoints.length === 2 ? (
      <line
        key="landmark-shopping-street"
        x1={shoppingStreetPoints[0].x}
        y1={shoppingStreetPoints[0].y}
        x2={shoppingStreetPoints[1].x}
        y2={shoppingStreetPoints[1].y}
        stroke="#f59e0b"
        strokeWidth={10}
        opacity={0.3}
        strokeLinecap="round"
      />
    ) : null

  const landmarkLabels = landmarks.map((l) => (
    <text
      key={`label-${l.name}`}
      x={l.x}
      y={l.y - 20}
      textAnchor="middle"
      fontSize={10}
      fill="#57534e"
    >
      {l.name}
    </text>
  ))

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
          <g style={{ pointerEvents: 'none' }}>
            {shoppingStreetBand}
            {landmarkShapes}
            {landmarkLabels}
            {existingStores?.map((s) => (
              <circle key={`existing-${s.name}`} cx={s.x} cy={s.y} r={3} fill="#78716c" opacity={0.5}>
                <title>{s.name}</title>
              </circle>
            ))}
          </g>
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
