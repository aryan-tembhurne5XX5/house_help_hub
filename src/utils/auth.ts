// ─── Centralized Auth Utilities ─────────────────────────────────────────────
// Single source of truth for authentication state, role detection, and
// smart routing throughout the application.

export type UserRole = 'user' | 'worker' | 'admin';

export interface AuthUser {
  id: number;
  name?: string;
  email?: string;
  role: UserRole;
}

/**
 * Get the currently logged-in user from localStorage
 */
export function getUser(): AuthUser | null {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

/**
 * Get the current JWT token
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

/**
 * Get the current user's role, or null if not authenticated.
 */
export function getCurrentRole(): UserRole | null {
  const user = getUser();
  return user ? user.role : null;
}

/**
 * Get the current user's numeric ID based on their role.
 */
export function getCurrentUserId(): number {
  const user = getUser();
  return user ? user.id : 0;
}

/**
 * Centralized login method to store the session securely.
 */
export function login(token: string, user: AuthUser): void {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Centralized logout method to clear the session completely.
 */
export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Clear legacy tokens if they exist just in case
  localStorage.removeItem('userId');
  localStorage.removeItem('workerId');
  localStorage.removeItem('adminId');
  localStorage.removeItem('userType');
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
