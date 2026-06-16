
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth Services
export const registerUser = (userData: any) => api.post('/users/register', userData);
export const loginUser = (credentials: any) => api.post('/users/login', credentials);
export const registerWorker = (workerData: any) => api.post('/workers/register', workerData);
export const loginWorker = (credentials: any) => api.post('/workers/login', credentials);
export const loginAdmin = (credentials: any) => api.post('/admins/login', credentials);

// User Services
export const getUserProfile = (userId: number) => api.get(`/users/${userId}/profile`);
export const updateUserProfile = (userId: number, data: any) => api.put(`/users/${userId}/profile`, data);
export const getUserBookings = (userId: number) => api.get(`/users/${userId}/bookings`);
export const changeUserPassword = (userId: number, data: any) => api.put(`/users/${userId}/password`, data);

// Worker Services
export const getWorkerProfile = (workerId: number) => api.get(`/workers/${workerId}/profile`);
export const updateWorkerProfile = (workerId: number, data: any) => api.put(`/workers/${workerId}/profile`, data);
export const changeWorkerPassword = (workerId: number, data: any) => api.put(`/workers/${workerId}/password`, data);
export const registerWorkerServices = (workerId: number, services: any) => api.post(`/workers/${workerId}/services`, { services });
export const updateWorkerAvailability = (workerId: number, availability: any) => api.post(`/workers/${workerId}/availability`, { availability });
export const getWorkerRequests = (workerId: number) => api.get(`/workers/${workerId}/requests`);

// Booking Services
export const createBooking = (bookingData: any) => api.post('/bookings', bookingData);
export const acceptBooking = (bookingId: number) => api.put(`/bookings/${bookingId}/accept`);
export const rejectBooking = (bookingId: number) => api.put(`/bookings/${bookingId}/reject`);
export const cancelBooking = (bookingId: number) => api.put(`/bookings/${bookingId}/cancel`);
export const completeBooking = (bookingId: number) => api.put(`/bookings/${bookingId}/complete`);
export const getBookingDetails = (bookingId: number) => api.get(`/bookings/${bookingId}`);

// Review Services
export const createReview = (reviewData: any) => api.post('/reviews', reviewData);

// Notification Services
export const getUserNotifications = (userId: number) => api.get(`/users/${userId}/notifications`);
export const getWorkerNotifications = (workerId: number) => api.get(`/workers/${workerId}/notifications`);
export const markNotificationRead = (notificationId: number) => api.put(`/notifications/${notificationId}/read`);
export const markAllUserNotificationsRead = (userId: number) => api.put(`/users/${userId}/notifications/read-all`);
export const markAllWorkerNotificationsRead = (workerId: number) => api.put(`/workers/${workerId}/notifications/read-all`);

// Search Services
export const getServices = () => api.get('/services');
export const getAvailableWorkers = (params: { serviceId: number, date: string, time: string }) => 
  api.get('/workers/available', { params });

// Admin Services
export const getAdminDashboardData = () => api.get('/dashboard/stats');
export const getAllUsers = () => api.get('/users');
export const getAllWorkers = () => api.get('/workers');
export const getAllBookings = () => api.get('/bookings');
export const deleteUser = (userId: number) => api.delete(`/users/${userId}`);
export const deleteWorker = (workerId: number) => api.delete(`/workers/${workerId}`);

export default api;
