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
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#1f1f1e' }}>
      <div className="w-full max-w-sm p-6 sm:p-8 rounded-2xl"
        style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#f5a623' }}>Memutq</h1>
        <p className="text-sm mb-6" style={{ color: '#6b6860' }}>Создайте аккаунт</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'email',    label: 'Email',             type: 'email',    placeholder: 'you@example.com' },
            { name: 'username', label: 'Имя пользователя',  type: 'text',     placeholder: 'username' },
            { name: 'password', label: 'Пароль',            type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium mb-1" style={{ color: '#9e9b94' }}>{f.label}</label>
              <input
                name={f.name} type={f.type} value={(form as any)[f.name]}
                onChange={handleChange} required placeholder={f.placeholder}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ background: '#1f1f1e', border: '1px solid #3a3a38', color: '#e8e6e1' }}
              />
            </div>
          ))}
          {error && <p className="text-sm" style={{ color: '#e05252' }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ background: '#f5a623', color: '#1f1f1e' }}
          >
            {loading ? 'Создаём...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#6b6860' }}>
          Уже есть аккаунт?{' '}
          <Link to="/login" className="hover:underline" style={{ color: '#f5a623' }}>Войти</Link>
        </p>
      </div>
    </div>
  )
}