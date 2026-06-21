
import { gql } from '@apollo/client';

// ─── User Queries ───────────────────────────────────────────────────────────

export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: Int!) {
    userProfile(userId: $userId) {
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

export const GET_USER_BOOKINGS = gql`
  query GetUserBookings($userId: Int!) {
    userBookings(userId: $userId) {
      booking_id
      ticket_number
      service_name
      booking_date
      booking_time
      duration_hours
      address
      notes
      total_price
      status
      created_at
      worker_name
      worker_phone
      worker_profile_pic
    }
  }
`;

// ─── Worker Queries ─────────────────────────────────────────────────────────

export const GET_WORKER_PROFILE = gql`
  query GetWorkerProfile($workerId: Int!) {
    workerProfile(workerId: $workerId) {
      worker_id
      name
      email
      phone
      address
      bio
      profile_pic
      avg_rating
      created_at
      services {
        service_id
        name
        price_per_hour
      }
      availability {
        day_of_week
        time_slot
        is_available
      }
      reviews {
        review_id
        rating
        comment
        created_at
        reviewer_name
        reviewer_pic
      }
    }
  }
`;

export const GET_WORKER_REQUESTS = gql`
  query GetWorkerRequests($workerId: Int!) {
    workerRequests(workerId: $workerId) {
      booking_id
      user_id
      user_name
      service_name
      booking_date
      booking_time
      duration_hours
      address
      notes
      total_price
      status
      created_at
      ticket_number
      arrival_delay_minutes
      service_start_delay_minutes
      service_duration_minutes
      travel_duration_minutes
      early_arrival_minutes
    }
  }
`;

// ─── Booking Queries ────────────────────────────────────────────────────────

export const GET_BOOKING_DETAILS = gql`
  query GetBookingDetails($bookingId: Int!) {
    bookingDetails(bookingId: $bookingId) {
      booking_id
      ticket_number
      user_id
      worker_id
      service_id
      booking_date
      booking_time
      duration_hours
      address
      booking_latitude
      booking_longitude
      notes
      total_price
      status
      created_at
      travel_started_at
      arrived_at
      service_started_at
      completion_requested_at
      scheduled_start_datetime
      scheduled_end_datetime
      arrival_delay_minutes
      service_start_delay_minutes
      travel_duration_minutes
      service_duration_minutes
      early_arrival_minutes
      user_confirmed_arrival
      user_name
      user_phone
      user_email
      worker_name
      worker_phone
      worker_profile_pic
      service_name
    }
  }
`;

// ─── Service Queries ────────────────────────────────────────────────────────

export const GET_SERVICES = gql`
  query GetServices {
    services {
      service_id
      name
      description
      base_price
      icon_name
    }
  }
`;

export const GET_AVAILABLE_WORKERS = gql`
  query GetAvailableWorkers($serviceId: Int!, $date: String!, $time: String!, $latitude: Float, $longitude: Float, $radiusKm: Int) {
    availableWorkers(serviceId: $serviceId, date: $date, time: $time, latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm) {
      worker_id
      name
      phone
      profile_pic
      avg_rating
      price_per_hour
      distanceKm
    }
  }
`;

export const GET_NEARBY_WORKERS = gql`
  query GetNearbyWorkers($latitude: Float!, $longitude: Float!, $radiusKm: Int, $serviceId: Int) {
    nearbyWorkers(latitude: $latitude, longitude: $longitude, radiusKm: $radiusKm, serviceId: $serviceId) {
      worker_id
      name
      phone
      profile_pic
      avg_rating
      price_per_hour
      distanceKm
    }
  }
`;

// ─── Notification Queries ───────────────────────────────────────────────────

export const GET_USER_NOTIFICATIONS = gql`
  query GetUserNotifications($userId: Int!) {
    userNotifications(userId: $userId) {
      notification_id
      user_id
      title
      message
      type
      is_read
      created_at
    }
  }
`;

export const GET_WORKER_NOTIFICATIONS = gql`
  query GetWorkerNotifications($workerId: Int!) {
    workerNotifications(workerId: $workerId) {
      notification_id
      worker_id
      title
      message
      type
      is_read
      created_at
    }
  }
`;

// ─── Admin Queries ──────────────────────────────────────────────────────────

export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalUsers
      totalWorkers
      totalBookings
      totalRevenue
    }
  }
`;

export const GET_ALL_USERS = gql`
  query GetAllUsers {
    allUsers {
      user_id
      name
      email
      phone
      created_at
    }
  }
`;

export const GET_ALL_WORKERS = gql`
  query GetAllWorkers {
    allWorkers {
      worker_id
      name
      email
      phone
      created_at
      avg_rating
    }
  }
`;

export const GET_ALL_BOOKINGS = gql`
  query GetAllBookings {
    allBookings {
      booking_id
      ticket_number
      status
      created_at
      total_price
      user_name
      worker_name
      service_name
    }
  }
`;

export const SEARCH_WORKERS = gql`
  query SearchWorkers($query: String!) {
    searchWorkers(query: $query) {
      worker_id
      name
      phone
      profile_pic
      avg_rating
      bio
    }
  }
`;

export const GET_WORKER_REVIEWS = gql`
  query GetWorkerReviews($workerId: Int!) {
    workerReviews(workerId: $workerId) {
      review_id
      rating
      comment
      created_at
      reviewer_name
      reviewer_pic
    }
  }
`;

export const GET_BOOKING_TIMELINE = gql`
  query GetBookingTimeline($bookingId: Int!) {
    bookingTimeline(bookingId: $bookingId) {
      booking {
        booking_id
        ticket_number
        status
        created_at
        user_name
        worker_name
        service_name
        total_price
        address
        duration_hours
        notes
      }
      events {
        id
        title
        description
        timestamp
        status
        delay
        notes
      }
    }
  }
`;

export const GET_SERVICE_ANALYTICS = gql`
  query GetServiceAnalytics($serviceId: Int) {
    serviceAnalytics(serviceId: $serviceId) {
      totalBookings
      totalRevenue
      averageRating
    }
  }
`;

export const GET_REVENUE_ANALYTICS = gql`
  query GetRevenueAnalytics($period: String!) {
    revenueAnalytics(period: $period) {
      date
      revenue
      bookings
    }
  }
`;

export const TRAVEL_ESTIMATE = gql`
  query TravelEstimate($workerId: Int!, $bookingId: Int!) {
    travelEstimate(workerId: $workerId, bookingId: $bookingId) {
      distanceKm
      durationMin
      etaTimestamp
      routeCoordinates
    }
  }
`;

export const LOCATION_ANALYTICS = gql`
  query LocationAnalytics($area: String) {
    locationAnalytics(area: $area) {
      area
      totalBookings
      totalWorkers
      revenue
    }
  }
`;

export const WORKER_COVERAGE = gql`
  query WorkerCoverage($workerId: Int!) {
    workerCoverage(workerId: $workerId) {
      worker_id
      radiusKm
      coveredAreas
    }
  }
`;
