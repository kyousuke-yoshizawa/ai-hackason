import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StoreManagementPanel } from '../components/StoreManagementPanel'
import { ToastContainer, useToast } from '../components/Toast'
import { UserManagementPanel } from '../components/UserManagementPanel'

export default function AdminPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'users' | 'stores'>('users')
  const { toast, showToast } = useToast()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">管理画面</h1>
            <p className="text-sm text-gray-600">ユーザ・店舗マスタ管理</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ← ダッシュボードに戻る
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'users'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ユーザ管理
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'stores'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            店舗管理
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
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
