/**
 * Utility functions for location intelligence
 */

/**
 * Calculate the distance between two coordinate points in kilometers
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return Number(distance.toFixed(2));
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Calculates the recommendation score for a worker based on distance, rating, jobs completed, and availability.
 * Formula: 40% distance + 30% rating + 20% completed jobs + 10% availability
 *
 * @param {number} distanceKm - Distance in km
 * @param {number} avgRating - Average rating (0-5)
 * @param {number} completedJobs - Total number of completed jobs
 * @param {boolean} isAvailable - Whether the worker is currently available
 * @returns {number} Score from 0 to 100
 */
export function calculateRecommendationScore(distanceKm, avgRating, completedJobs, isAvailable) {
  // 1. Distance Score (0-40 points)
  // Max points if distance is 0, 0 points if distance > 25km
  let distanceScore = 0;
  if (distanceKm !== null && distanceKm !== undefined) {
    const maxRadius = 25; // km
    const normalizedDistance = Math.max(0, maxRadius - distanceKm) / maxRadius;
    distanceScore = normalizedDistance * 40;
  }

  // 2. Rating Score (0-30 points)
  const safeRating = avgRating || 0;
  const ratingScore = (safeRating / 5) * 30;

  // 3. Experience Score (0-20 points)
  // Cap at 100 jobs for max points
  const experienceScore = Math.min(completedJobs || 0, 100) / 100 * 20;

  // 4. Availability Score (0 or 10 points)
  const availabilityScore = isAvailable ? 10 : 0;

  const totalScore = distanceScore + ratingScore + experienceScore + availabilityScore;
  return Number(totalScore.toFixed(2));
}
