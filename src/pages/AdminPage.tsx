import { useState } from 'react'
import { StoreManagementPanel } from '../components/StoreManagementPanel'
import { ToastContainer, useToast } from '../components/Toast'
import { UserManagementPanel } from '../components/UserManagementPanel'
import { PageHeader } from '../components/ui/PageHeader'
import Leaf from '../components/decor/Leaf'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'stores'>('users')
  const { toast, showToast } = useToast()

  return (
    <div className="ac-page-bg">
      <PageHeader
        title="管理画面"
        subtitle="ユーザ・店舗マスタ管理"
        backTo="/dashboard"
        maxWidth="max-w-7xl"
      />

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
    </div>
  )
}
