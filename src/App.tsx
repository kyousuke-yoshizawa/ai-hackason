import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import LikesListPage from './pages/LikesListPage'

type View = 'dashboard' | 'likes'

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [view, setView] = useState<View>('dashboard')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    if (view === 'likes') {
      return <LikesListPage onBack={() => setView('dashboard')} />
    }
    return <Dashboard onNavigateLikes={() => setView('likes')} />
  }

  return <LoginPage />
}

export default App
