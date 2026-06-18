
import client from '@/lib/apolloClient';
import {
  GET_USER_PROFILE,
  GET_USER_BOOKINGS,
  GET_WORKER_PROFILE,
  GET_WORKER_REQUESTS,
  GET_BOOKING_DETAILS,
  GET_SERVICES,
  GET_AVAILABLE_WORKERS,
  GET_USER_NOTIFICATIONS,
  GET_WORKER_NOTIFICATIONS,
  GET_DASHBOARD_STATS,
  GET_ALL_USERS,
  GET_ALL_WORKERS,
  GET_ALL_BOOKINGS,
  SEARCH_WORKERS,
  GET_WORKER_REVIEWS,
  GET_BOOKING_TIMELINE,
  GET_SERVICE_ANALYTICS,
  GET_REVENUE_ANALYTICS,
} from '@/graphql/queries';
import {
  REGISTER_USER,
  REGISTER_WORKER,
  LOGIN_USER,
  LOGIN_WORKER,
  LOGIN_ADMIN,
  CHANGE_USER_PASSWORD,
  CHANGE_WORKER_PASSWORD,
  UPDATE_USER_PROFILE,
  UPDATE_WORKER_PROFILE,
  REGISTER_WORKER_SERVICES,
  UPDATE_WORKER_AVAILABILITY,
  CREATE_BOOKING,
  ACCEPT_BOOKING,
  REJECT_BOOKING,
  CANCEL_BOOKING,
  COMPLETE_BOOKING,
  CREATE_REVIEW,
  MARK_NOTIFICATION_READ,
  MARK_ALL_USER_NOTIFICATIONS_READ,
  MARK_ALL_WORKER_NOTIFICATIONS_READ,
  DELETE_USER,
  DELETE_WORKER,
  VERIFY_WORKER,
  BLOCK_USER,
  BLOCK_WORKER,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
  CREATE_SUPPORT_TICKET,
} from '@/graphql/mutations';

// ─── Helper to wrap Apollo responses in Axios-like format ────────────────────
// This preserves the { data: ... } shape that all existing components expect.
// It also converts Apollo errors to Axios-like error format so existing
// catch blocks (error?.response?.data?.message) continue to work.

const toAxiosError = (error: any) => {
  // Extract the meaningful error message from Apollo error
  const message =
    error?.graphQLErrors?.[0]?.message ||
    error?.message ||
    'An unexpected error occurred';

  // Build an Axios-compatible error shape
  const axiosLikeError: any = new Error(message);
  axiosLikeError.response = {
    data: { message },
    status: error?.graphQLErrors?.[0]?.extensions?.code === 'UNAUTHENTICATED' ? 401 : 400,
  };
  return axiosLikeError;
};

const wrapQuery = async (query: any, variables: any, dataKey: string) => {
  try {
    const result = await client.query({ query, variables });
    return { data: result.data[dataKey] };
  } catch (error: any) {
    throw toAxiosError(error);
  }
};

const wrapMutation = async (mutation: any, variables: any, dataKey: string) => {
  try {
    const result = await client.mutate({ mutation, variables });
    return { data: result.data[dataKey] };
  } catch (error: any) {
    throw toAxiosError(error);
  }
};

// ─── Auth Services ──────────────────────────────────────────────────────────

export const registerUser = (userData: any) =>
  wrapMutation(REGISTER_USER, { input: userData }, 'registerUser');

export const loginUser = (credentials: any) =>
  wrapMutation(LOGIN_USER, { email: credentials.email, password: credentials.password }, 'loginUser');

export const registerWorker = (workerData: any) =>
  wrapMutation(REGISTER_WORKER, { input: workerData }, 'registerWorker');

export const loginWorker = (credentials: any) =>
  wrapMutation(LOGIN_WORKER, { email: credentials.email, password: credentials.password }, 'loginWorker');

export const loginAdmin = (credentials: any) =>
  wrapMutation(LOGIN_ADMIN, { email: credentials.email, password: credentials.password }, 'loginAdmin');

export const forgotPassword = (email: string, role: string) =>
  wrapMutation(FORGOT_PASSWORD, { email, role }, 'forgotPassword');

export const resetPassword = (token: string, newPassword: string) =>
  wrapMutation(RESET_PASSWORD, { token, newPassword }, 'resetPassword');

// ─── User Services ──────────────────────────────────────────────────────────

export const getUserProfile = (userId: number) =>
  wrapQuery(GET_USER_PROFILE, { userId }, 'userProfile');

export const updateUserProfile = (userId: number, data: any) =>
  wrapMutation(UPDATE_USER_PROFILE, { userId, input: data }, 'updateUserProfile');

export const getUserBookings = (userId: number) =>
  wrapQuery(GET_USER_BOOKINGS, { userId }, 'userBookings');

export const changeUserPassword = (userId: number, current: string, newPass: string) =>
  wrapMutation(CHANGE_USER_PASSWORD, {
    userId,
    currentPassword: current,
    newPassword: newPass,
  }, 'changeUserPassword');

// ─── Worker Services ────────────────────────────────────────────────────────

export const getWorkerProfile = (workerId: number) =>
  wrapQuery(GET_WORKER_PROFILE, { workerId }, 'workerProfile');

export const updateWorkerProfile = (workerId: number, data: any) =>
  wrapMutation(UPDATE_WORKER_PROFILE, { workerId, input: data }, 'updateWorkerProfile');

export const changeWorkerPassword = (workerId: number, current: string, newPass: string) =>
  wrapMutation(CHANGE_WORKER_PASSWORD, {
    workerId,
    currentPassword: current,
    newPassword: newPass,
  }, 'changeWorkerPassword');

export const registerWorkerServices = (workerId: number, services: any) =>
  wrapMutation(REGISTER_WORKER_SERVICES, { workerId, services }, 'registerWorkerServices');

export const updateWorkerAvailability = (workerId: number, availability: any) =>
  wrapMutation(UPDATE_WORKER_AVAILABILITY, { workerId, availability }, 'updateWorkerAvailability');

export const getWorkerRequests = (workerId: number) =>
  wrapQuery(GET_WORKER_REQUESTS, { workerId }, 'workerRequests');

// ─── Booking Services ───────────────────────────────────────────────────────

export const createBooking = (bookingData: any) =>
  wrapMutation(CREATE_BOOKING, { input: bookingData }, 'createBooking');

export const acceptBooking = (bookingId: number) =>
  wrapMutation(ACCEPT_BOOKING, { bookingId }, 'acceptBooking');

export const rejectBooking = (bookingId: number) =>
  wrapMutation(REJECT_BOOKING, { bookingId }, 'rejectBooking');

export const cancelBooking = (bookingId: number) =>
  wrapMutation(CANCEL_BOOKING, { bookingId }, 'cancelBooking');

export const completeBooking = (bookingId: number) =>
  wrapMutation(COMPLETE_BOOKING, { bookingId }, 'completeBooking');

export const getBookingDetails = (bookingId: number) =>
  wrapQuery(GET_BOOKING_DETAILS, { bookingId }, 'bookingDetails');

// ─── Review Services ────────────────────────────────────────────────────────

export const createReview = (reviewData: any) =>
  wrapMutation(CREATE_REVIEW, {
    bookingId: reviewData.bookingId,
    rating: reviewData.rating,
    comment: reviewData.comment,
  }, 'createReview');

// ─── Notification Services ──────────────────────────────────────────────────

export const getUserNotifications = (userId: number) =>
  wrapQuery(GET_USER_NOTIFICATIONS, { userId }, 'userNotifications');

export const getWorkerNotifications = (workerId: number) =>
  wrapQuery(GET_WORKER_NOTIFICATIONS, { workerId }, 'workerNotifications');

export const markNotificationRead = (notificationId: number) =>
  wrapMutation(MARK_NOTIFICATION_READ, { notificationId }, 'markNotificationRead');

export const markAllUserNotificationsRead = (userId: number) =>
  wrapMutation(MARK_ALL_USER_NOTIFICATIONS_READ, { userId }, 'markAllUserNotificationsRead');

export const markAllWorkerNotificationsRead = (workerId: number) =>
  wrapMutation(MARK_ALL_WORKER_NOTIFICATIONS_READ, { workerId }, 'markAllWorkerNotificationsRead');

// ─── Search Services ────────────────────────────────────────────────────────

export const getServices = () =>
  wrapQuery(GET_SERVICES, {}, 'services');

export const getAvailableWorkers = (params: { serviceId: number, date: string, time: string }) =>
  wrapQuery(GET_AVAILABLE_WORKERS, params, 'availableWorkers');

// ─── Admin Services ─────────────────────────────────────────────────────────

export const getAdminDashboardData = () =>
  wrapQuery(GET_DASHBOARD_STATS, {}, 'dashboardStats');

export const getAllUsers = () =>
  wrapQuery(GET_ALL_USERS, {}, 'allUsers');

export const getAllWorkers = () =>
  wrapQuery(GET_ALL_WORKERS, {}, 'allWorkers');

export const getAllBookings = () =>
  wrapQuery(GET_ALL_BOOKINGS, {}, 'allBookings');

export const deleteUser = (userId: number) =>
  wrapMutation(DELETE_USER, { userId }, 'deleteUser');

export const deleteWorker = (workerId: number) =>
  wrapMutation(DELETE_WORKER, { workerId }, 'deleteWorker');

export const verifyWorker = (workerId: number) =>
  wrapMutation(VERIFY_WORKER, { workerId }, 'verifyWorker');

export const blockUser = (userId: number, isBlocked: boolean) =>
  wrapMutation(BLOCK_USER, { userId, isBlocked }, 'blockUser');

export const blockWorker = (workerId: number, isBlocked: boolean) =>
  wrapMutation(BLOCK_WORKER, { workerId, isBlocked }, 'blockWorker');

export const getServiceAnalytics = (serviceId?: number) =>
  wrapQuery(GET_SERVICE_ANALYTICS, { serviceId }, 'serviceAnalytics');

export const getRevenueAnalytics = (period: string) =>
  wrapQuery(GET_REVENUE_ANALYTICS, { period }, 'revenueAnalytics');

// ─── Support Services ───────────────────────────────────────────────────────

export const createSupportTicket = (subject: string, message: string) =>
  wrapMutation(CREATE_SUPPORT_TICKET, { subject, message }, 'createSupportTicket');

// ─── Extra Query Services ───────────────────────────────────────────────────

export const searchWorkers = (query: string) =>
  wrapQuery(SEARCH_WORKERS, { query }, 'searchWorkers');

export const getWorkerReviews = (workerId: number) =>
  wrapQuery(GET_WORKER_REVIEWS, { workerId }, 'workerReviews');

export const getBookingTimeline = (bookingId: number) =>
  wrapQuery(GET_BOOKING_TIMELINE, { bookingId }, 'bookingTimeline');

export default client;
