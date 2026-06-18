// ─── Centralized Auth Utilities ─────────────────────────────────────────────
// Single source of truth for authentication state, role detection, and
// smart routing throughout the application.

export type UserRole = 'user' | 'worker' | 'admin';

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  const userType = localStorage.getItem('userType');
  if (!userType) return false;

  // Verify the corresponding ID exists
  switch (userType) {
    case 'user':
      return !!localStorage.getItem('userId');
    case 'worker':
      return !!localStorage.getItem('workerId');
    case 'admin':
      return !!localStorage.getItem('adminId');
    default:
      return false;
  }
}

/**
 * Get the current user's role, or null if not authenticated.
 */
export function getCurrentRole(): UserRole | null {
  const userType = localStorage.getItem('userType');
  if (userType === 'user' || userType === 'worker' || userType === 'admin') {
    return userType;
  }
  return null;
}

/**
 * Get the current user's numeric ID based on their role.
 */
export function getCurrentUserId(): number {
  const role = getCurrentRole();
  if (!role) return 0;

  switch (role) {
    case 'user':
      return parseInt(localStorage.getItem('userId') || '0');
    case 'worker':
      return parseInt(localStorage.getItem('workerId') || '0');
    case 'admin':
      return parseInt(localStorage.getItem('adminId') || '0');
    default:
      return 0;
  }
}

/**
 * Get the dashboard path for the current user's role.
 */
export function getDashboardPath(role?: UserRole | null): string {
  const r = role ?? getCurrentRole();
  switch (r) {
    case 'user':
      return '/user/dashboard';
    case 'worker':
      return '/worker/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/auth';
  }
}

/**
 * Get the profile path for the current user's role.
 */
export function getProfilePath(role?: UserRole | null): string {
  const r = role ?? getCurrentRole();
  switch (r) {
    case 'user':
      return '/user/profile';
    case 'worker':
      return '/worker/profile';
    case 'admin':
      return '/admin/profile';
    default:
      return '/auth';
  }
}

/**
 * Smart navigation path: returns dashboard if logged in, /auth if not.
 */
export function getSmartAuthPath(): string {
  if (isAuthenticated()) {
    return getDashboardPath();
  }
  return '/auth';
}

/**
 * Get the booking path — users go to book, others go to their dashboard.
 */
export function getBookingPath(): string {
  const role = getCurrentRole();
  if (role === 'user') return '/user/book';
  if (isAuthenticated()) return getDashboardPath();
  return '/auth';
}
