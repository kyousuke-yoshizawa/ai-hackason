import { useState } from 'react'
import type { PlanStop } from '../types/plan'
import MapDecorations from './MapDecorations'

const GRID_SIZE = 400
const GRID_STEP = 40

interface StorePoint {
  id: string
  name: string
  x: number
  y: number
  category?: string
}

export interface Landmark {
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

// reasonをポップアップ内で1〜2行に収めるための簡易truncate（line-clampの
// フォールバック。長さの目安は表示幅から適当に決めた定数）
function truncateReason(reason: string): string {
  const MAX_LENGTH = 60
  return reason.length > MAX_LENGTH ? `${reason.slice(0, MAX_LENGTH)}…` : reason
}

export default function MapView({ stops, stores, landmarks }: MapViewProps) {
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [pinnedKey, setPinnedKey] = useState<string | null>(null)

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

  const activeKey = pinnedKey ?? hoverKey
  const activeResolvedStop = resolvedStops.find(
    (resolved, index) => `${resolved.stop.store_id}-${index}` === activeKey
  )

  const handleToggle = (key: string) => {
    setPinnedKey((prev) => (prev === key ? null : key))
  }

  return (
    <div className="ac-card" data-testid="map-view">
      <p className="mb-2 text-sm font-bold text-wood-700">移動ルート</p>
      <div className="relative">
        <svg viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`} className="w-full rounded-2xl border-2 border-wood-200">
          <rect x={0} y={0} width={GRID_SIZE} height={GRID_SIZE} fill="#f1f9ec" />

          <MapDecorations landmarks={landmarks ?? []} />

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

          {resolvedStops.map(({ stop, store }, index) => {
            const key = `${stop.store_id}-${index}`
            const isActive = activeKey === key

            return (
              <g key={key} data-testid="map-store-marker">
                {isActive && (
                  <circle
                    cx={store.x}
                    cy={store.y}
                    r={15}
                    fill="none"
                    stroke="#f89c2e"
                    strokeWidth={2}
                    data-testid="map-store-marker-ring"
                  />
                )}
                <circle
                  cx={store.x}
                  cy={store.y}
                  r={isActive ? 12 : 10}
                  fill="#664429"
                  stroke="white"
                  strokeWidth={2}
                  tabIndex={0}
                  role="button"
                  aria-label={`${stop.store_name}の詳細`}
                  className="cursor-pointer outline-none"
                  data-testid="map-store-marker-circle"
                  onMouseEnter={() => setHoverKey(key)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => setHoverKey(key)}
                  onBlur={() => setHoverKey(null)}
                  onClick={() => handleToggle(key)}
                />
                <text x={store.x} y={store.y + 4} textAnchor="middle" fontSize={10} fill="white" fontWeight="bold">
                  {index + 1}
                </text>
                <text x={store.x} y={store.y + 22} textAnchor="middle" fontSize={9} fill="#543823" fontWeight="bold">
                  {store.name}
                </text>
              </g>
            )
          })}
        </svg>

        {activeResolvedStop && (
          <MapStorePopup
            stop={activeResolvedStop.stop}
            store={activeResolvedStop.store}
          />
        )}
      </div>
    </div>
  )
}

function MapStorePopup({ stop, store }: { stop: PlanStop; store: StorePoint }) {
  const openLeft = store.x > GRID_SIZE / 2

  return (
    <div
      data-testid="map-store-popup"
      className={`absolute z-10 w-48 -translate-y-full rounded-xl border-2 border-wood-300 bg-white/95 p-2 text-left shadow-ac-sm ${
        openLeft ? '-translate-x-full -ml-3' : 'ml-3'
      }`}
      style={{
        left: `${(store.x / GRID_SIZE) * 100}%`,
        top: `${(store.y / GRID_SIZE) * 100}%`,
      }}
    >
      <p className="text-xs font-bold text-wood-800">{stop.store_name}</p>
      {store.category && <p className="text-[10px] font-semibold text-leaf-600">{store.category}</p>}
      <p className="text-[10px] text-wood-500">
        {stop.start_time}〜{stop.end_time}
      </p>
      {stop.reason && (
        <p className="line-clamp-2 text-[10px] text-wood-600">{truncateReason(stop.reason)}</p>
      )}
      {stop.crowd_note && <p className="text-[10px] text-sand-700">{stop.crowd_note}</p>}
      {stop.offer_note && <p className="text-[10px] text-bubble-600">{stop.offer_note}</p>}
    </div>
  )
}
