
const typeDefs = `#graphql

  # ─── Scalar Types ──────────────────────────────────────────────────────────────

  scalar JSON

  # ─── Object Types ──────────────────────────────────────────────────────────────

  type User {
    user_id: Int!
    name: String!
    email: String!
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
    profile_pic: String
    created_at: String
  }

  type Worker {
    worker_id: Int!
    name: String!
    email: String!
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
    service_radius_km: Int
    bio: String
    profile_pic: String
    avg_rating: Float
    created_at: String
    services: [WorkerService]
    availability: [WorkerAvailability]
    reviews: [Review]
  }

  type Admin {
    admin_id: Int!
    name: String!
    email: String!
  }

  type Service {
    service_id: Int!
    name: String!
    description: String
    base_price: Float!
    icon_name: String
  }

  type WorkerService {
    service_id: Int!
    name: String!
    price_per_hour: Float!
  }

  type WorkerAvailability {
    day_of_week: String!
    time_slot: String!
    is_available: Boolean!
  }

  type AvailableWorker {
    worker_id: Int!
    name: String!
    phone: String
    profile_pic: String
    avg_rating: Float
    price_per_hour: Float!
    latitude: Float
    longitude: Float
    location_text: String
    distanceKm: Float
    recommendationScore: Float
  }

  type Booking {
    booking_id: Int!
    ticket_number: String!
    user_id: Int
    worker_id: Int
    service_id: Int
    booking_date: String!
    booking_time: String!
    duration_hours: Float!
    address: String!
    booking_latitude: Float
    booking_longitude: Float
    booking_location_text: String
    notes: String
    total_price: Float!
    status: String!
    created_at: String
    user_name: String
    user_phone: String
    user_email: String
    worker_name: String
    worker_phone: String
    worker_profile_pic: String
    service_name: String
  }

  type Review {
    review_id: Int!
    booking_id: Int
    rating: Int!
    comment: String
    created_at: String
    reviewer_name: String
    reviewer_pic: String
  }

  type Notification {
    notification_id: Int!
    user_id: Int
    worker_id: Int
    title: String!
    message: String!
    type: String!
    is_read: Boolean!
    created_at: String
  }

  type DashboardStats {
    totalUsers: Int!
    totalWorkers: Int!
    totalBookings: Int!
    totalRevenue: Float!
  }

  type AuthPayload {
    token: String!
    user_id: Int
    worker_id: Int
    admin_id: Int
    name: String!
    email: String!
    profile_pic: String
    role: String!
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
    service_radius_km: Int
    bio: String
    avg_rating: Float
  }

  type MessageResponse {
    message: String!
  }

  type BookingResult {
    message: String!
    bookingId: Int!
    ticketNumber: String!
  }

  type ReviewResult {
    message: String!
    reviewId: Int!
  }

  type BookingTimeline {
    booking: Booking!
    events: [TimelineEvent!]!
  }

  type TimelineEvent {
    id: String!
    title: String!
    description: String!
    timestamp: String!
    status: String!
  }

  type ServiceAnalytics {
    totalBookings: Int!
    averageRating: Float!
    totalRevenue: Float!
  }

  type RevenueData {
    date: String!
    revenue: Float!
    bookings: Int!
  }

  type SupportTicket {
    ticket_id: Int!
    user_id: Int
    worker_id: Int
    subject: String!
    message: String!
    status: String!
    created_at: String
  }

  type WorkerLocation {
    id: Int!
    worker_id: Int!
    latitude: Float!
    longitude: Float!
    updated_at: String
  }

  type TravelEstimate {
    distanceKm: Float!
    durationMin: Float!
    etaTimestamp: String!
    routeCoordinates: [[Float!]!]
  }

  type LocationAnalytics {
    area: String!
    totalBookings: Int!
    totalWorkers: Int!
    revenue: Float!
  }

  type WorkerCoverage {
    worker_id: Int!
    radiusKm: Int!
    coveredAreas: [String!]!
  }

  # ─── Input Types ───────────────────────────────────────────────────────────────

  input RegisterUserInput {
    name: String!
    email: String!
    password: String!
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
  }

  input RegisterWorkerInput {
    name: String!
    email: String!
    password: String!
    phone: String!
    address: String
    latitude: Float
    longitude: Float
    location_text: String
    service_radius_km: Int
    bio: String
  }

  input UpdateProfileInput {
    name: String
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
  }

  input UpdateWorkerProfileInput {
    name: String
    phone: String
    address: String
    latitude: Float
    longitude: Float
    location_text: String
    service_radius_km: Int
    bio: String
  }

  input ServiceInput {
    id: Int!
    rate: Float!
    selected: Boolean!
  }

  input CreateBookingInput {
    userId: Int!
    serviceId: Int!
    workerId: Int!
    bookingDate: String!
    bookingTime: String!
    durationHours: Float!
    address: String!
    latitude: Float
    longitude: Float
    locationText: String
    notes: String
  }

  # ─── Queries ───────────────────────────────────────────────────────────────────

  type AuthPayload {
    id: Int!
    role: String!
    email: String
  }

  type Query {
    me: AuthPayload
    # User
    userProfile(userId: Int!): User
    userBookings(userId: Int!): [Booking!]!

    # Worker
    workerProfile(workerId: Int!): Worker
    workerRequests(workerId: Int!): [Booking!]!
    searchWorkers(query: String!): [Worker!]!
    workerReviews(workerId: Int!): [Review!]!

    # Booking
    bookingDetails(bookingId: Int!): Booking
    bookingTimeline(bookingId: Int!): BookingTimeline!

    # Services
    services: [Service!]!
    availableWorkers(serviceId: Int!, date: String!, time: String!, latitude: Float, longitude: Float, radiusKm: Int): [AvailableWorker!]!
    nearbyWorkers(latitude: Float!, longitude: Float!, radiusKm: Int, serviceId: Int): [AvailableWorker!]!
    workerLocation(workerId: Int!): WorkerLocation
    travelEstimate(workerId: Int!, bookingId: Int!): TravelEstimate
    workerCoverage(workerId: Int!): WorkerCoverage

    # Notifications & Support
    userNotifications(userId: Int!): [Notification!]!
    workerNotifications(workerId: Int!): [Notification!]!

    # Admin
    dashboardStats: DashboardStats!
    allUsers: [User!]!
    allWorkers: [Worker!]!
    allBookings: [Booking!]!
    serviceAnalytics(serviceId: Int): ServiceAnalytics!
    revenueAnalytics(period: String!): [RevenueData!]!
    locationAnalytics(area: String): [LocationAnalytics!]!
  }

  # ─── Mutations ─────────────────────────────────────────────────────────────────

  type Mutation {
    # Auth
    registerUser(input: RegisterUserInput!): AuthPayload!
    registerWorker(input: RegisterWorkerInput!): AuthPayload!
    loginUser(email: String!, password: String!): AuthPayload!
    loginWorker(email: String!, password: String!): AuthPayload!
    loginAdmin(email: String!, password: String!): AuthPayload!
    changeUserPassword(userId: Int!, currentPassword: String!, newPassword: String!): MessageResponse!
    changeWorkerPassword(workerId: Int!, currentPassword: String!, newPassword: String!): MessageResponse!
    forgotPassword(email: String!, role: String!): MessageResponse!
    resetPassword(token: String!, newPassword: String!): MessageResponse!

    # User
    updateUserProfile(userId: Int!, input: UpdateProfileInput!): User!
    createSupportTicket(subject: String!, message: String!): MessageResponse!

    # Worker
    updateWorkerProfile(workerId: Int!, input: UpdateWorkerProfileInput!): Worker!
    registerWorkerServices(workerId: Int!, services: [ServiceInput!]!): MessageResponse!
    updateWorkerAvailability(workerId: Int!, availability: JSON!): MessageResponse!
    updateLocation(latitude: Float!, longitude: Float!, locationText: String): MessageResponse!
    updateWorkerRadius(radiusKm: Int!): MessageResponse!

    # Booking
    createBooking(input: CreateBookingInput!): BookingResult!
    acceptBooking(bookingId: Int!): MessageResponse!
    rejectBooking(bookingId: Int!): MessageResponse!
    cancelBooking(bookingId: Int!): MessageResponse!
    startTravel(bookingId: Int!): MessageResponse!
    markArrived(bookingId: Int!): MessageResponse!
    completeBooking(bookingId: Int!): MessageResponse!

    # Review
    createReview(bookingId: Int!, rating: Int!, comment: String): ReviewResult!

    # Notifications
    markNotificationRead(notificationId: Int!): MessageResponse!
    markAllUserNotificationsRead(userId: Int!): MessageResponse!
    markAllWorkerNotificationsRead(workerId: Int!): MessageResponse!

    # Admin
    deleteUser(userId: Int!): MessageResponse!
    deleteWorker(workerId: Int!): MessageResponse!
    verifyWorker(workerId: Int!): MessageResponse!
    blockUser(userId: Int!, isBlocked: Boolean!): MessageResponse!
    blockWorker(workerId: Int!, isBlocked: Boolean!): MessageResponse!
  }
`;

export default typeDefs;
