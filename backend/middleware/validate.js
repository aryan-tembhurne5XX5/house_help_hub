
import { validationResult, body, param, query } from 'express-validator';

/**
 * Middleware: Check validation results from express-validator chains.
 * Returns 400 with error details if validation fails.
 */
export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
}

// ─── Reusable Validation Chains ─────────────────────────────────────────────

export const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
  body('address')
    .optional()
    .trim(),
  handleValidationErrors,
];

export const validateWorkerRegistration = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
  body('address')
    .optional()
    .trim(),
  body('bio')
    .optional()
    .trim(),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

export const validateBooking = [
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
  body('serviceId')
    .notEmpty().withMessage('Service ID is required')
    .isInt({ min: 1 }).withMessage('Service ID must be a positive integer'),
  body('workerId')
    .notEmpty().withMessage('Worker ID is required')
    .isInt({ min: 1 }).withMessage('Worker ID must be a positive integer'),
  body('bookingDate')
    .notEmpty().withMessage('Booking date is required')
    .isDate().withMessage('Invalid date format'),
  body('bookingTime')
    .notEmpty().withMessage('Booking time is required')
    .matches(/^\d{2}:\d{2}$/).withMessage('Time must be in HH:MM format'),
  body('durationHours')
    .notEmpty().withMessage('Duration is required')
    .isFloat({ min: 0.5, max: 8 }).withMessage('Duration must be 0.5-8 hours'),
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors,
];

export const validateReview = [
  body('bookingId')
    .notEmpty().withMessage('Booking ID is required')
    .isInt({ min: 1 }).withMessage('Booking ID must be a positive integer'),
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment must be under 1000 characters'),
  handleValidationErrors,
];

export const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 }).withMessage('Phone must be 10-20 characters'),
  body('address')
    .optional()
    .trim(),
  handleValidationErrors,
];

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors,
];
