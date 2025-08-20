
import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/sonner';

// Lazy-loaded page components
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Auth = lazy(() => import('./pages/Auth'))

// User routes
const UserDashboard = lazy(() => import('./pages/user/Dashboard'))
const BookService = lazy(() => import('./pages/user/BookService'))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'))
const UserProfile = lazy(() => import('./pages/user/Profile'))

// Worker routes
const WorkerDashboard = lazy(() => import('./pages/worker/Dashboard'))
const SetupServices = lazy(() => import('./pages/worker/SetupServices'))
const WorkerProfile = lazy(() => import('./pages/worker/Profile'))

// Admin routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProfile = lazy(() => import('./pages/admin/Profile'))

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* User routes */}
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/book" element={<BookService />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            
            {/* Worker routes */}
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/setup-services" element={<SetupServices />} />
            <Route path="/worker/profile" element={<WorkerProfile />} />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}

export default App
