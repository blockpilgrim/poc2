import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import { AuthCallback } from './pages/AuthCallback'
import { AuthError } from './pages/AuthError'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'
import { authService } from './services/authService'
import { ThemeProvider } from './providers/ThemeProvider'
import { Header } from './components/layout/Header'
import { ProfilePage } from './pages/profile/Profile'
import LeadsPage from './pages/leads'
import LeadDetailPage from './pages/leads/[id]'
import VolunteerLeadsPage from './pages/leads/volunteer'
import ReadyNowLeadsPage from './pages/leads/ready-now'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

function AppContent() {
  const { isLoading } = useAuthStore()

  useEffect(() => {
    // Check for existing authentication on app load
    authService.checkAuth()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/volunteer" element={<VolunteerLeadsPage />} />
            <Route path="/leads/ready-now" element={<ReadyNowLeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            {/* Add more protected routes here */}
          </Route>
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App