
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
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const HelpSupport = lazy(() => import('./pages/HelpSupport'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsConditions = lazy(() => import('./pages/TermsConditions'))
const HowItWorks = lazy(() => import('./pages/HowItWorks'))

// User routes
const UserDashboard = lazy(() => import('./pages/user/Dashboard'))
const BookService = lazy(() => import('./pages/user/BookService'))
const BookingConfirmation = lazy(() => import('./pages/BookingConfirmation'))
const UserProfile = lazy(() => import('./pages/user/Profile'))
const UserNotifications = lazy(() => import('./pages/user/Notifications'))
const UserBookingDetail = lazy(() => import('./pages/user/BookingDetail'))

// Worker routes
const WorkerDashboard = lazy(() => import('./pages/worker/Dashboard'))
const SetupServices = lazy(() => import('./pages/worker/SetupServices'))
const WorkerProfile = lazy(() => import('./pages/worker/Profile'))
const WorkerBookingDetail = lazy(() => import('./pages/worker/BookingDetail'))

// Admin routes
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProfile = lazy(() => import('./pages/admin/Profile'))
const UsersList = lazy(() => import('./pages/admin/UsersList'))
const WorkersList = lazy(() => import('./pages/admin/WorkersList'))
const BookingsList = lazy(() => import('./pages/admin/BookingsList'))
const ServicesList = lazy(() => import('./pages/admin/ServicesList'))
const AdminReports = lazy(() => import('./pages/admin/Reports'))

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
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/help-support" element={<HelpSupport />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-and-conditions" element={<TermsConditions />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            
            {/* User routes */}
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/book" element={<BookService />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/user/notifications" element={<UserNotifications />} />
            <Route path="/user/booking/:id" element={<UserBookingDetail />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            
            {/* Worker routes */}
            <Route path="/worker/dashboard" element={<WorkerDashboard />} />
            <Route path="/worker/setup-services" element={<SetupServices />} />
            <Route path="/worker/profile" element={<WorkerProfile />} />
            <Route path="/worker/booking/:id" element={<WorkerBookingDetail />} />
            
            {/* Admin routes */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/users" element={<UsersList />} />
            <Route path="/admin/workers" element={<WorkersList />} />
            <Route path="/admin/bookings" element={<BookingsList />} />
            <Route path="/admin/services" element={<ServicesList />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}

export default App
