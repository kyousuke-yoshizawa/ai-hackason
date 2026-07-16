import type { PlanStop } from '../types/plan'

const GRID_SIZE = 400
const GRID_STEP = 40

interface StorePoint {
  id: string
  name: string
  x: number
  y: number
}

interface Landmark {
  name: string
  x: number
  y: number
  kind: string
}

interface MapViewProps {
  stops: PlanStop[]
  stores: StorePoint[]
  landmarks?: Landmark[]
}

interface ResolvedStop {
  stop: PlanStop
  store: StorePoint
}

// kind は自由入力を想定するため、既知の表記ゆれ（日本語/英語）だけ形を変え、
// それ以外は汎用の円で表示してthrowしない
function renderLandmarkShape(landmark: Landmark, key: string) {
  const { x, y, kind, name } = landmark

  if (kind === 'station' || kind === '駅') {
    return (
      <g key={key} data-testid="map-landmark">
        <rect x={x - 8} y={y - 8} width={16} height={16} fill="#1f80bd" stroke="white" strokeWidth={1.5} />
        <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill="#1c6699" fontWeight="bold">
          {name}
        </text>
      </g>
    )
  }

  if (kind === 'park' || kind === '公園') {
    return (
      <g key={key} data-testid="map-landmark">
        <circle cx={x} cy={y} r={9} fill="#63a52f" stroke="white" strokeWidth={1.5} />
        <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill="#3c691d" fontWeight="bold">
          {name}
        </text>
      </g>
    )
  }

  if (kind === 'plaza' || kind === '広場') {
    return (
      <g key={key} data-testid="map-landmark">
        <circle cx={x} cy={y} r={9} fill="#f89c2e" stroke="white" strokeWidth={1.5} />
        <text x={x} y={y + 22} textAnchor="middle" fontSize={9} fill="#ba6318" fontWeight="bold">
          {name}
        </text>
      </g>
    )
  }

  return (
    <g key={key} data-testid="map-landmark">
      <circle cx={x} cy={y} r={7} fill="#9ca3af" stroke="white" strokeWidth={1.5} />
      <text x={x} y={y + 20} textAnchor="middle" fontSize={9} fill="#6b7280" fontWeight="bold">
        {name}
      </text>
    </g>
  )
}

export default function MapView({ stops, stores, landmarks }: MapViewProps) {
  const storeById = new Map(stores.map((store) => [store.id, store]))

  const sortedStops = [...stops].sort((a, b) => a.start_time.localeCompare(b.start_time))

  // 店舗座標が見つからないstopはマーカーを描画せずスキップする（落とさない）
  const resolvedStops: ResolvedStop[] = sortedStops.flatMap((stop) => {
    const store = storeById.get(stop.store_id)
    return store ? [{ stop, store }] : []
  })

  const otherStores = stores.filter(
    (store) => !resolvedStops.some((resolved) => resolved.store.id === store.id)
  )

  const gridLines = []
  for (let i = 0; i <= GRID_SIZE; i += GRID_STEP) {
    gridLines.push(
      <line key={`v${i}`} x1={i} y1={0} x2={i} y2={GRID_SIZE} stroke="#dfeccf" strokeWidth={0.5} />
    )
    gridLines.push(
      <line key={`h${i}`} x1={0} y1={i} x2={GRID_SIZE} y2={i} stroke="#dfeccf" strokeWidth={0.5} />
    )
  }

  const routePoints = resolvedStops.map(({ store }) => `${store.x},${store.y}`).join(' ')

  return (
    <div className="ac-card" data-testid="map-view">
      <p className="mb-2 text-sm font-bold text-wood-700">移動ルート</p>
      <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} className="w-full rounded-2xl border-2 border-wood-200">
        <rect x={0} y={0} width={GRID_SIZE} height={GRID_SIZE} fill="#f1f9ec" />
        {gridLines}

        {otherStores.map((store) => (
          <circle key={store.id} cx={store.x} cy={store.y} r={2.5} fill="#9ca3af" opacity={0.5} />
        ))}

        {landmarks?.map((landmark, index) => renderLandmarkShape(landmark, `landmark-${index}`))}

        {resolvedStops.length > 1 && (
          <polyline
            data-testid="map-route-line"
            points={routePoints}
            fill="none"
            stroke="#664429"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}

        {resolvedStops.map(({ stop, store }, index) => (
          <g key={`${stop.store_id}-${index}`} data-testid="map-store-marker">
            <circle cx={store.x} cy={store.y} r={10} fill="#664429" stroke="white" strokeWidth={2} />
            <text x={store.x} y={store.y + 4} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
              {index + 1}
            </text>
            <text x={store.x} y={store.y + 22} textAnchor="middle" fontSize={9} fill="#543823" fontWeight="bold">
              {store.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
