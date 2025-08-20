
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request/response interceptors for better error handling
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('API Response Error:', errorMessage, error.response?.data);
    console.error('Failed request details:', {
      url: error.config?.url,
      method: error.config?.method,
      data: error.config?.data,
    });
    return Promise.reject(error);
  }
);

// User Authentication API
export const registerUser = (userData: { name: string; email: string; password: string; phone?: string; }) => {
  console.log('Registering user:', userData);
  return api.post('/users/register', userData)
    .catch(error => {
      console.error('Failed to register user:', error);
      throw error;
    });
};

export const registerWorker = (workerData: { name: string; email: string; password: string; phone: string; }) => {
  console.log('Registering worker:', workerData);
  return api.post('/workers/register', workerData)
    .catch(error => {
      console.error('Failed to register worker:', error);
      throw error;
    });
};

export const loginUser = (credentials: { email: string; password: string; }) => {
  console.log('User login attempt:', credentials.email);
  return api.post('/users/login', credentials)
    .catch(error => {
      console.error('Failed to login user:', error);
      throw error;
    });
};

export const loginWorker = (credentials: { email: string; password: string; }) => {
  console.log('Worker login attempt:', credentials.email);
  return api.post('/workers/login', credentials)
    .catch(error => {
      console.error('Failed to login worker:', error);
      throw error;
    });
};

export const loginAdmin = (credentials: { email: string; password: string; }) => {
  console.log('Admin login attempt:', credentials.email);
  return api.post('/admins/login', credentials)
    .catch(error => {
      console.error('Failed to login admin:', error);
      throw error;
    });
};

// User Profile API
export const getUserProfile = (userId: number) => {
  return api.get(`/users/${userId}/profile`);
};

export const updateUserProfile = (userId: number, profileData: any) => {
  return api.put(`/users/${userId}/profile`, profileData);
};

// Worker Profile API
export const getWorkerProfile = (workerId: number) => {
  return api.get(`/workers/${workerId}/profile`);
};

export const updateWorkerProfile = (workerId: number, profileData: any) => {
  return api.put(`/workers/${workerId}/profile`, profileData);
};

// Services API
export const getServices = () => {
  console.log('Fetching services from:', `${API_URL}/services`);
  return api.get('/services')
    .catch(error => {
      console.error('Failed to fetch services:', error);
      throw error;
    });
};

// Workers API
export const getAvailableWorkers = (serviceId: number, date: string, time: string) => {
  console.log(`Finding available workers for: serviceId=${serviceId}, date=${date}, time=${time}`);
  return api.get(`/workers/available?serviceId=${serviceId}&date=${date}&time=${time}`)
    .catch(error => {
      console.error('Failed to find available workers:', error);
      throw error;
    });
};

export const registerWorkerServices = (workerId: number, services: any[]) => {
  console.log('Registering worker services:', workerId, services);
  // Convert to an object for better logging
  const selectedServices = services.filter(service => service.selected);
  console.log('Selected services count:', selectedServices.length);
  selectedServices.forEach(service => {
    console.log(`Service ${service.id}: ${service.name} at rate ₹${service.rate}`);
  });
  
  return api.post(`/workers/${workerId}/services`, { services })
    .catch(error => {
      console.error('Failed to register worker services:', error);
      throw error;
    });
};

export const updateWorkerAvailability = (workerId: number, availability: any) => {
  console.log('Updating worker availability:', workerId);
  // Log availability details for debugging
  Object.entries(availability).forEach(([day, slots]: [string, any]) => {
    const availableSlots = Object.entries(slots)
      .filter(([, isAvailable]) => isAvailable)
      .map(([slot]) => slot);
    
    if (availableSlots.length > 0) {
      console.log(`${day}: available at ${availableSlots.join(', ')}`);
    }
  });
  
  return api.post(`/workers/${workerId}/availability`, { availability })
    .catch(error => {
      console.error('Failed to update worker availability:', error);
      throw error;
    });
};

// Bookings API
export const createBooking = (bookingData: any) => {
  console.log('Creating booking:', bookingData);
  return api.post('/bookings', bookingData)
    .catch(error => {
      console.error('Failed to create booking:', error);
      throw error;
    });
};

export const getUserBookings = (userId: number) => api.get(`/users/${userId}/bookings`);
export const getWorkerRequests = (workerId: number) => api.get(`/workers/${workerId}/requests`);

export const acceptBooking = (bookingId: number, workerId: number) => {
  console.log(`Worker ${workerId} accepting booking ${bookingId}`);
  return api.put(`/bookings/${bookingId}/accept`, { workerId });
};

export const rejectBooking = (bookingId: number) => {
  console.log(`Rejecting booking ${bookingId}`);
  return api.put(`/bookings/${bookingId}/reject`);
};

export const getBookingDetails = (bookingId: number) => {
  return api.get(`/bookings/${bookingId}`);
};

// Admin API
export const getAdminDashboardData = () => {
  return api.get('/admin/dashboard');
};

export const getAllUsers = () => {
  return api.get('/admin/users');
};

export const getAllWorkers = () => {
  return api.get('/admin/workers');
};

export const getAllBookings = () => {
  return api.get('/admin/bookings');
};

export default api;
