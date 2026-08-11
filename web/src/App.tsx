import { AuthProvider } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ToastProvider } from './context/ToastContext'
import VaultPage from './pages/VaultPage'

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <VaultPage />
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  )
}
