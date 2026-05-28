import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      const { data } = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      })
      const me = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      setAuth(data.access_token, me.data)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Memutq</h1>
        <p className="text-slate-500 text-sm mb-6">Создайте аккаунт</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { name: 'username', label: 'Имя пользователя', type: 'text', placeholder: 'username' },
            { name: 'password', label: 'Пароль', type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
              <input
                name={f.name} type={f.type} value={(form as any)[f.name]}
                onChange={handleChange} required placeholder={f.placeholder}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Создаём...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Войти</Link>
        </p>
      </div>
    </div>
  )
}
