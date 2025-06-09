import { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import { AuthCallback } from './pages/AuthCallback'
import { AuthError } from './pages/AuthError'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'
import { authService } from './services/authService'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    // Check for existing authentication on app load
    authService.checkAuth()
  }, [])

  const handleLogout = async () => {
    await authService.logout()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <nav style={{ padding: '1rem', marginBottom: '1rem', background: '#eee', borderBottom: '1px solid #ccc' }}>
        <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem', margin: 0, padding: 0, alignItems: 'center' }}>
          <li>
            <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>Home</Link>
          </li>
          {isAuthenticated ? (
            <>
              <li style={{ marginLeft: 'auto' }}>
                <span style={{ marginRight: '1rem', color: '#666' }}>
                  {user?.displayName || user?.email}
                </span>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </li>
            </>
          ) : (
            <li style={{ marginLeft: 'auto' }}>
              <Link to="/login" style={{ textDecoration: 'none', color: '#333' }}>Login</Link>
            </li>
          )}
        </ul>
      </nav>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/auth/error" element={<AuthError />} />
        
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          {/* Add more protected routes here */}
        </Route>
      </Routes>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App