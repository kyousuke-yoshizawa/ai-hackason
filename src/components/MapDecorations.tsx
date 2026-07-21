import type { Landmark } from './MapView'

interface MapDecorationsProps {
  landmarks: Landmark[]
}

// ぷかぷか商店街: 西端・東端2点を結ぶ石畳風の道＋両端の街灯。
// 座標は landmarks props から算出し、ハードコードしない
function ShoppingStreetDecoration({ points }: { points: Landmark[] }) {
  if (points.length < 2) return null

  const sorted = [...points].sort((a, b) => a.x - b.x)
  const west = sorted[0]
  const east = sorted[sorted.length - 1]
  const y = (west.y + east.y) / 2

  return (
    <g data-testid="map-decor-shopping-street">
      <rect
        x={west.x}
        y={y - 10}
        width={Math.max(east.x - west.x, 1)}
        height={20}
        rx={10}
        fill="#eeddc9"
        stroke="#c99b6c"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      {[west, east].map((point, index) => (
        <g key={`lamp-${index}`}>
          <line x1={point.x} y1={y - 22} x2={point.x} y2={y - 10} stroke="#97653b" strokeWidth={2} />
          <circle cx={point.x} cy={y - 24} r={3} fill="#ffd07d" />
        </g>
      ))}
    </g>
  )
}

// ぽかぷか駅: 駅舎（角丸矩形＋三角屋根）＋広場への短い道
function StationDecoration({ landmark, plaza }: { landmark: Landmark; plaza?: Landmark }) {
  const { x, y } = landmark

  return (
    <g data-testid="map-decor-station">
      {plaza && (
        <line
          x1={x}
          y1={y}
          x2={plaza.x}
          y2={plaza.y}
          stroke="#ddbd97"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.6}
        />
      )}
      <rect x={x - 16} y={y - 4} width={32} height={18} rx={4} fill="#f8f1ea" stroke="#b17e4d" strokeWidth={1.5} />
      <polygon
        points={`${x - 18},${y - 4} ${x + 18},${y - 4} ${x},${y - 18}`}
        fill="#c99b6c"
        stroke="#97653b"
        strokeWidth={1}
      />
    </g>
  )
}

// どんぐり広場: 同心円の広場＋ベンチのドット＋どんぐりモチーフ
function PlazaDecoration({ landmark }: { landmark: Landmark }) {
  const { x, y } = landmark

  return (
    <g data-testid="map-decor-plaza">
      <circle cx={x} cy={y} r={28} fill="none" stroke="#ffd07d" strokeWidth={2} strokeDasharray="3 3" />
      <circle cx={x} cy={y} r={17} fill="#fff3dc" opacity={0.7} />
      <circle cx={x - 20} cy={y - 6} r={2.5} fill="#97653b" />
      <circle cx={x + 20} cy={y + 6} r={2.5} fill="#97653b" />
      <ellipse cx={x} cy={y + 4} rx={4} ry={5} fill="#b17e4d" />
      <rect x={x - 4} y={y - 3} width={8} height={4} rx={2} fill="#7c5230" />
    </g>
  )
}

// しっぽ公園: 不定形の緑地ブロブ＋木を数本
function ParkDecoration({ landmark }: { landmark: Landmark }) {
  const { x, y } = landmark

  const blobPath = [
    `M ${x - 30},${y}`,
    `C ${x - 30},${y - 25} ${x - 5},${y - 30} ${x + 10},${y - 22}`,
    `C ${x + 35},${y - 18} ${x + 32},${y + 12} ${x + 12},${y + 22}`,
    `C ${x - 10},${y + 32} ${x - 30},${y + 18} ${x - 30},${y}`,
    'Z',
  ].join(' ')

  const trees: Array<[number, number]> = [
    [-12, -8],
    [8, -4],
    [-4, 14],
  ]

  return (
    <g data-testid="map-decor-park">
      <path d={blobPath} fill="#dff1cf" stroke="#9dd06c" strokeWidth={1.5} />
      {trees.map(([dx, dy], index) => (
        <g key={index}>
          <line x1={x + dx} y1={y + dy + 6} x2={x + dx} y2={y + dy + 12} stroke="#7c5230" strokeWidth={1.5} />
          <circle cx={x + dx} cy={y + dy} r={5} fill="#7ebd45" />
        </g>
      ))}
    </g>
  )
}

// Issue #125: SVGマップの世界観装飾。landmarksが空/一部欠けでも落ちない。
// 店舗マーカー・経路線より視認性を落とさないよう、呼び出し側で
// 背景直後（下層）に配置し、opacityで抑える
export default function MapDecorations({ landmarks }: MapDecorationsProps) {
  const station = landmarks.find((landmark) => landmark.kind === 'station')
  const plaza = landmarks.find((landmark) => landmark.kind === 'plaza')
  const park = landmarks.find((landmark) => landmark.kind === 'park')
  const shoppingStreetPoints = landmarks.filter((landmark) => landmark.kind === 'shopping_street')

  return (
    <g data-testid="map-decorations" opacity={0.7} pointerEvents="none">
      {shoppingStreetPoints.length >= 2 && <ShoppingStreetDecoration points={shoppingStreetPoints} />}
      {station && <StationDecoration landmark={station} plaza={plaza} />}
      {plaza && <PlazaDecoration landmark={plaza} />}
      {park && <ParkDecoration landmark={park} />}
    </g>
  )
}
