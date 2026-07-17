import { useState } from 'react'
import { StoreManagementPanel } from '../components/StoreManagementPanel'
import { ToastContainer, useToast } from '../components/Toast'
import { UserManagementPanel } from '../components/UserManagementPanel'
import Leaf from '../components/decor/Leaf'
import GrassBorder from '../components/decor/GrassBorder'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'stores'>('users')
  const { toast, showToast } = useToast()

  return (
    <>
      <header className="ac-header relative">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-4">
          <div>
            <h1 className="text-2xl font-extrabold">管理画面</h1>
            <p className="text-sm font-bold text-leaf-100">ユーザ・店舗マスタ管理</p>
          </div>
        </div>
        <GrassBorder className="absolute -bottom-[5px] left-0 h-2 w-full" color="#eef9ff" />
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 inline-flex gap-2 rounded-full border-2 border-wood-200 bg-sand-100 p-1">
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === 'users'
                ? 'bg-leaf-500 text-white shadow-ac-sm'
                : 'text-wood-600 hover:bg-sand-200'
            }`}
          >
            ユーザ管理
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              activeTab === 'stores'
                ? 'bg-leaf-500 text-white shadow-ac-sm'
                : 'text-wood-600 hover:bg-sand-200'
            }`}
          >
            店舗管理
          </button>
        </div>

        <div className="ac-card relative">
          <Leaf className="absolute -top-4 -left-4 h-9 w-9 -rotate-12 drop-shadow" />
          {activeTab === 'users' ? (
            <UserManagementPanel onNotify={showToast} />
          ) : (
            <StoreManagementPanel onNotify={showToast} />
          )}
        </div>
      </main>

      <ToastContainer toast={toast} />
    </>
  )
}
