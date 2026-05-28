import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import DeckDetail from './pages/DeckDetail'
import Study from './pages/Study'
import SharedDeck from './pages/SharedDeck'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/decks/:id" element={<PrivateRoute><DeckDetail /></PrivateRoute>} />
      <Route path="/study/:id" element={<PrivateRoute><Study /></PrivateRoute>} />
      <Route path="/share/:token" element={<SharedDeck />} />
    </Routes>
  )
}
