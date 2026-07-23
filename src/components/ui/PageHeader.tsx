import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import GrassBorder from '../decor/GrassBorder'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  // タイトルの左に添えるアイコン（Dashboardのロゴ的な用途）。指定するとタイトル・
  // サブタイトルをアイコンと横並びの「ブロック」レイアウトで表示する
  icon?: ReactNode
  // ヘッダー右上に絶対配置する背景装飾（Cloud/Leaf等）
  decor?: ReactNode
  backTo?: string
  backLabel?: string
  backVariant?: 'ghost' | 'secondary'
  rightSlot?: ReactNode
  maxWidth?: string
}

const BACK_BUTTON_CLASS: Record<NonNullable<PageHeaderProps['backVariant']>, string> = {
  ghost: 'ac-btn-ghost !px-3 !py-1.5 text-sm !text-white hover:!bg-white/20',
  secondary: 'ac-btn-secondary !px-4 !py-2 text-sm',
}

// 全画面ヘッダーに重複していた「decor + タイトル(+サブタイトル) + 戻るボタン + GrassBorder」を
// 集約する（Issue #107）。レイアウトは2種類:
// - subtitle か icon がある画面（Dashboard/AdminPage/ErrorManagementDashboard）:
//   タイトルブロック(左) + 戻るボタン/rightSlot(右) の justify-between
// - どちらもない画面（StoresPage等）: 戻るボタン + タイトルを横並びの1ブロック
export function PageHeader({
  title,
  subtitle,
  icon,
  decor,
  backTo,
  backLabel = '← ダッシュボードに戻る',
  backVariant = 'secondary',
  rightSlot,
  maxWidth = 'max-w-4xl',
}: PageHeaderProps) {
  const navigate = useNavigate()
  const isBlockLayout = !!subtitle || !!icon

  const backButton = backTo && (
    <button type="button" onClick={() => navigate(backTo)} className={BACK_BUTTON_CLASS[backVariant]}>
      {backLabel}
    </button>
  )

  return (
    <header className="ac-header relative">
      {decor}
      <div className={`mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-4 ${maxWidth}`}>
        {isBlockLayout ? (
          <>
            <div className="flex items-center gap-2">
              {icon}
              <div>
                <h1 className="text-xl font-extrabold">{title}</h1>
                {subtitle && <p className="text-xs font-bold text-leaf-100">{subtitle}</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {rightSlot}
              {backButton}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            {backButton}
            <h1 className="text-xl font-extrabold">{title}</h1>
          </div>
        )}
      </div>
      <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
    </header>
  )
}
