
import { gql } from '@apollo/client';

// ─── Auth Mutations ─────────────────────────────────────────────────────────

export const REGISTER_USER = gql`
  mutation RegisterUser($input: RegisterUserInput!) {
    registerUser(input: $input) {
      token
      user_id
      name
      email
      profile_pic
      role
    }
  }
`;

export const REGISTER_WORKER = gql`
  mutation RegisterWorker($input: RegisterWorkerInput!) {
    registerWorker(input: $input) {
      token
      worker_id
      name
      email
      profile_pic
      role
    }
  }
`;

export const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      token
      user_id
      name
      email
      profile_pic
      phone
      address
      role
    }
  }
`;

export const LOGIN_WORKER = gql`
  mutation LoginWorker($email: String!, $password: String!) {
    loginWorker(email: $email, password: $password) {
      token
      worker_id
      name
      email
      profile_pic
      phone
      address
      bio
      avg_rating
      role
    }
  }
`;

export const LOGIN_ADMIN = gql`
  mutation LoginAdmin($email: String!, $password: String!) {
    loginAdmin(email: $email, password: $password) {
      token
      admin_id
      name
      email
      role
    }
  }
`;

export const CHANGE_USER_PASSWORD = gql`
  mutation ChangeUserPassword($userId: Int!, $currentPassword: String!, $newPassword: String!) {
    changeUserPassword(userId: $userId, currentPassword: $currentPassword, newPassword: $newPassword) {
      message
    }
  }
`;

export const CHANGE_WORKER_PASSWORD = gql`
  mutation ChangeWorkerPassword($workerId: Int!, $currentPassword: String!, $newPassword: String!) {
    changeWorkerPassword(workerId: $workerId, currentPassword: $currentPassword, newPassword: $newPassword) {
      message
    }
  }
`;

// ─── User Mutations ─────────────────────────────────────────────────────────

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($userId: Int!, $input: UpdateProfileInput!) {
    updateUserProfile(userId: $userId, input: $input) {
      user_id
      name
      email
      phone
      address
      profile_pic
      created_at
    }
  }
`;

// ─── Worker Mutations ───────────────────────────────────────────────────────

export const UPDATE_WORKER_PROFILE = gql`
  mutation UpdateWorkerProfile($workerId: Int!, $input: UpdateWorkerProfileInput!) {
    updateWorkerProfile(workerId: $workerId, input: $input) {
      worker_id
      name
      email
      phone
      address
      bio
      profile_pic
      avg_rating
      created_at
    }
  }
`;

export const REGISTER_WORKER_SERVICES = gql`
  mutation RegisterWorkerServices($workerId: Int!, $services: [ServiceInput!]!) {
    registerWorkerServices(workerId: $workerId, services: $services) {
      message
    }
  }
`;

export const UPDATE_WORKER_AVAILABILITY = gql`
  mutation UpdateWorkerAvailability($workerId: Int!, $availability: JSON!) {
    updateWorkerAvailability(workerId: $workerId, availability: $availability) {
      message
    }
  }
`;

// ─── Booking Mutations ──────────────────────────────────────────────────────

export const CREATE_BOOKING = gql`
  mutation CreateBooking($input: CreateBookingInput!) {
    createBooking(input: $input) {
      message
      bookingId
      ticketNumber
    }
  }
`;

export const ACCEPT_BOOKING = gql`
  mutation AcceptBooking($bookingId: Int!) {
    acceptBooking(bookingId: $bookingId) {
      message
    }
  }
`;

export const REJECT_BOOKING = gql`
  mutation RejectBooking($bookingId: Int!) {
    rejectBooking(bookingId: $bookingId) {
      message
    }
  }
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($bookingId: Int!) {
    cancelBooking(bookingId: $bookingId) {
      message
    }
  }
`;

export const COMPLETE_BOOKING = gql`
  mutation CompleteBooking($bookingId: Int!) {
    completeBooking(bookingId: $bookingId) {
      message
    }
  }
`;

// ─── Review Mutations ───────────────────────────────────────────────────────

export const CREATE_REVIEW = gql`
  mutation CreateReview($bookingId: Int!, $rating: Int!, $comment: String) {
    createReview(bookingId: $bookingId, rating: $rating, comment: $comment) {
      message
      reviewId
    }
  }
`;

// ─── Notification Mutations ─────────────────────────────────────────────────

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($notificationId: Int!) {
    markNotificationRead(notificationId: $notificationId) {
      message
    }
  }
`;

export const MARK_ALL_USER_NOTIFICATIONS_READ = gql`
  mutation MarkAllUserNotificationsRead($userId: Int!) {
    markAllUserNotificationsRead(userId: $userId) {
      message
    }
  }
`;

export const MARK_ALL_WORKER_NOTIFICATIONS_READ = gql`
  mutation MarkAllWorkerNotificationsRead($workerId: Int!) {
    markAllWorkerNotificationsRead(workerId: $workerId) {
      message
    }
  }
`;

// ─── Admin Mutations ────────────────────────────────────────────────────────

export const DELETE_USER = gql`
  mutation DeleteUser($userId: Int!) {
    deleteUser(userId: $userId) {
      message
    }
  }
`;

export const DELETE_WORKER = gql`
  mutation DeleteWorker($workerId: Int!) {
    deleteWorker(workerId: $workerId) {
      message
    }
  }
`;

export const VERIFY_WORKER = gql`
  mutation VerifyWorker($workerId: Int!) {
    verifyWorker(workerId: $workerId) {
      message
    }
  }
`;

export const BLOCK_USER = gql`
  mutation BlockUser($userId: Int!, $isBlocked: Boolean!) {
    blockUser(userId: $userId, isBlocked: $isBlocked) {
      message
    }
  }
`;

export const BLOCK_WORKER = gql`
  mutation BlockWorker($workerId: Int!, $isBlocked: Boolean!) {
    blockWorker(workerId: $workerId, isBlocked: $isBlocked) {
      message
    }
  }
`;

export const FORGOT_PASSWORD = gql`
  mutation ForgotPassword($email: String!, $role: String!) {
    forgotPassword(email: $email, role: $role) {
      message
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      message
    }
  }
`;

export const CREATE_SUPPORT_TICKET = gql`
  mutation CreateSupportTicket($subject: String!, $message: String!) {
    createSupportTicket(subject: $subject, message: $message) {
      message
    }
  }
`;
