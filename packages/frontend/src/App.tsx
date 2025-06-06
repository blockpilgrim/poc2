import { Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <nav style={{ padding: '1rem', marginBottom: '1rem', background: '#eee', borderBottom: '1px solid #ccc' }}>
          <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem', margin: 0, padding: 0 }}>
            <li>
              <Link to="/" style={{ textDecoration: 'none', color: '#333' }}>Home</Link>
            </li>
            <li>
              <Link to="/login" style={{ textDecoration: 'none', color: '#333' }}>Login</Link>
            </li>
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </div>
    </QueryClientProvider>
  )
}

export default App