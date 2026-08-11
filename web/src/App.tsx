import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider } from './context/ToastContext'
import VaultPage from './pages/VaultPage'
import LoginPage from './pages/LoginPage'
import ProfilePage from './pages/ProfilePage'
import RequestPage from './pages/RequestPage'
import ManagerPage from './pages/ManagerPage'
import ChatWidget from './components/chat/ChatWidget'

// A simple wrapper for protected routes
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500"></div></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/manager" element={<ManagerPage />} />
              <Route path="/request" element={<RequestPage />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <VaultPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <ChatWidget />
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  )
}
