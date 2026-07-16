import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Cloud from '../components/decor/Cloud'
import Leaf from '../components/decor/Leaf'
import Flower from '../components/decor/Flower'
import GrassBorder from '../components/decor/GrassBorder'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.message || 'ログインに失敗しました')
      }
    } catch (err) {
      setError('エラーが発生しました')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="ac-page-bg relative flex items-center justify-center overflow-hidden p-4">
      <Cloud className="absolute left-8 top-10 h-14 w-28 opacity-90 md:left-16" />
      <Cloud className="absolute right-10 top-24 h-10 w-20 opacity-80 md:right-24" />
      <Cloud className="absolute right-1/3 top-6 h-8 w-16 opacity-70" />
      <Flower className="absolute bottom-8 left-6 h-10 w-10 md:left-20" />
      <Flower className="absolute bottom-6 right-8 h-8 w-8 md:right-24" color="#ffd07d" center="#ff8fb8" />

      <div className="ac-card relative w-full max-w-md">
        <Leaf className="absolute -top-6 -left-6 h-14 w-14 -rotate-12 drop-shadow" />

        <h1 className="font-sans text-3xl font-extrabold text-wood-800">ことこと町</h1>
        <p className="mb-6 text-sm font-bold text-leaf-700">お出かけプラン AI アシスタント</p>

        {error && (
          <div className="mb-4 rounded-2xl border-2 border-bubble-200 bg-bubble-50 p-3">
            <p className="text-sm font-bold text-bubble-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="ac-label">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              className="ac-input"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="ac-label">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="ac-input"
              required
              disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading} className="ac-btn-primary w-full">
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>

      <GrassBorder className="absolute bottom-0 left-0 h-6 w-full" />
    </div>
  )
}
