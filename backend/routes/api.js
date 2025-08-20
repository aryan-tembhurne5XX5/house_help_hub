
import express from 'express';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import { format } from 'date-fns';

const router = express.Router();

// Helper function to generate ticket numbers
const generateTicketNumber = async () => {
  try {
    const [result] = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const count = result[0].count + 1;
    return `${count.toString().padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating ticket number:', error);
    return `${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  }
};

// User Registration
router.post('/users/register', async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  
  try {
    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate avatar based on name
    const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    
    // Insert new user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, phone, address, profile_pic) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, address || null, profilePic]
    );
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user_id: result.insertId,
      name: name,
      profile_pic: profilePic
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Worker Registration
router.post('/workers/register', async (req, res) => {
  const { name, email, password, phone, address, bio } = req.body;
  
  try {
    // Check if worker already exists
    const [existingWorkers] = await pool.query('SELECT * FROM workers WHERE email = ?', [email]);
    if (existingWorkers.length > 0) {
      return res.status(400).json({ message: 'Worker with this email already exists' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate avatar based on name
    const profilePic = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    
    // Insert new worker
    const [result] = await pool.query(
      'INSERT INTO workers (name, email, password, phone, address, bio, profile_pic) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, address || null, bio || null, profilePic]
    );
    
    res.status(201).json({ 
      message: 'Worker registered successfully',
      worker_id: result.insertId,
      name: name,
      profile_pic: profilePic
    });
  } catch (error) {
    console.error('Error registering worker:', error);
    res.status(500).json({ message: 'Error registering worker' });
  }
});

// User Login
router.post('/users/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const user = users[0];
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return user data (without password)
    const { password: _, ...userData } = user;
    res.json(userData);
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Worker Login
router.post('/workers/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find worker
    const [workers] = await pool.query('SELECT * FROM workers WHERE email = ?', [email]);
    
    if (workers.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const worker = workers[0];
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, worker.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return worker data (without password)
    const { password: _, ...workerData } = worker;
    res.json(workerData);
  } catch (error) {
    console.error('Error logging in worker:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Admin Login
router.post('/admins/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find admin
    const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    
    if (admins.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    const admin = admins[0];
    
    // Compare password
    const passwordMatch = await bcrypt.compare(password, admin.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Return admin data (without password)
    const { password: _, ...adminData } = admin;
    res.json(adminData);
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// User Profile
router.get('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const [rows] = await pool.query(
      'SELECT user_id, name, email, phone, address, profile_pic, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error retrieving user profile:', error);
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
});

router.put('/users/:userId/profile', async (req, res) => {
  const { userId } = req.params;
  const { name, phone, address } = req.body;
  
  try {
    const [result] = await pool.query(
      'UPDATE users SET name = ?, phone = ?, address = ? WHERE user_id = ?',
      [name, phone || null, address || null, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const [updatedUser] = await pool.query(
      'SELECT user_id, name, email, phone, address, profile_pic, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    
    res.json(updatedUser[0]);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating user profile' });
  }
});

// Worker Profile
router.get('/workers/:workerId/profile', async (req, res) => {
  const { workerId } = req.params;
  
  try {
    const [rows] = await pool.query(
      'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
      [workerId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    // Get worker's services
    const [services] = await pool.query(
      `SELECT s.service_id, s.name, ws.price_per_hour 
       FROM worker_services ws
       JOIN services s ON ws.service_id = s.service_id
       WHERE ws.worker_id = ?`,
      [workerId]
    );
    
    // Get worker's availability
    const [availability] = await pool.query(
      'SELECT day_of_week, time_slot, is_available FROM worker_availability WHERE worker_id = ?',
      [workerId]
    );
    
    const workerProfile = {
      ...rows[0],
      services,
      availability
    };
    
    res.json(workerProfile);
  } catch (error) {
    console.error('Error retrieving worker profile:', error);
    res.status(500).json({ message: 'Error retrieving worker profile' });
  }
});

router.put('/workers/:workerId/profile', async (req, res) => {
  const { workerId } = req.params;
  const { name, phone, address, bio } = req.body;
  
  try {
    const [result] = await pool.query(
      'UPDATE workers SET name = ?, phone = ?, address = ?, bio = ? WHERE worker_id = ?',
      [name, phone, address || null, bio || null, workerId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Worker not found' });
    }
    
    const [updatedWorker] = await pool.query(
      'SELECT worker_id, name, email, phone, address, bio, profile_pic, avg_rating, created_at FROM workers WHERE worker_id = ?',
      [workerId]
    );
    
    res.json(updatedWorker[0]);
  } catch (error) {
    console.error('Error updating worker profile:', error);
    res.status(500).json({ message: 'Error updating worker profile' });
  }
});

// Get all services
router.get('/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services');
    console.log('Fetched services:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving services:', error);
    res.status(500).json({ message: 'Error retrieving services' });
  }
});

// Get available workers for a specific service, date, and time
router.get('/workers/available', async (req, res) => {
  const { serviceId, date, time } = req.query;
  
  try {
    // Convert day of week from date
    const bookingDate = new Date(date);
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][bookingDate.getDay()];
    
    // Determine time slot based on time
    let timeSlot = 'morning'; // Default
    const hourOfDay = parseInt(time.split(':')[0]);
    if (hourOfDay >= 12 && hourOfDay < 17) {
      timeSlot = 'afternoon';
    } else if (hourOfDay >= 17) {
      timeSlot = 'evening';
    }
    
    console.log(`Finding workers for: service=${serviceId}, date=${date}, day=${dayOfWeek}, time=${time}, slot=${timeSlot}`);
    
    // Find available workers who provide this service and are available at the requested time
    const [rows] = await pool.query(
      `SELECT w.worker_id, w.name, w.phone, w.profile_pic, ws.price_per_hour 
       FROM workers w
       JOIN worker_services ws ON w.worker_id = ws.worker_id
       JOIN worker_availability wa ON w.worker_id = wa.worker_id
       WHERE ws.service_id = ?
       AND wa.day_of_week = ?
       AND wa.time_slot = ?
       AND wa.is_available = 1
       AND NOT EXISTS (
         SELECT 1 FROM bookings b
         WHERE b.worker_id = w.worker_id
         AND b.booking_date = ?
         AND b.booking_time = ?
         AND b.status = 'confirmed'
       )
       GROUP BY w.worker_id`,  // Add GROUP BY to prevent duplicate workers
      [serviceId, dayOfWeek, timeSlot, date, time]
    );
    
    console.log('Available workers found:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error finding available workers:', error);
    res.status(500).json({ message: 'Error finding available workers' });
  }
});

// Register worker services
router.post('/workers/:workerId/services', async (req, res) => {
  const { workerId } = req.params;
  const { services } = req.body;
  
  console.log('Registering services for worker:', workerId, services);
  
  try {
    await pool.query('START TRANSACTION');
    
    // Delete existing worker services
    await pool.query('DELETE FROM worker_services WHERE worker_id = ?', [workerId]);
    console.log('Deleted existing services for worker:', workerId);
    
    // Insert new worker services
    const selectedServices = services.filter(service => service.selected);
    console.log('Selected services to insert:', selectedServices);
    
    if (selectedServices.length === 0) {
      throw new Error('No services selected');
    }
    
    for (const service of selectedServices) {
      console.log('Inserting service:', service.id, 'with rate:', service.rate);
      await pool.query(
        'INSERT INTO worker_services (worker_id, service_id, price_per_hour) VALUES (?, ?, ?)',
        [workerId, service.id, service.rate]
      );
    }
    
    await pool.query('COMMIT');
    console.log('Worker services updated successfully');
    res.json({ message: 'Worker services updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating worker services:', error);
    res.status(500).json({ message: `Error updating worker services: ${error.message}` });
  }
});

// Update worker availability
router.post('/workers/:workerId/availability', async (req, res) => {
  const { workerId } = req.params;
  const { availability } = req.body;
  
  console.log('Updating availability for worker:', workerId, availability);
  
  try {
    await pool.query('START TRANSACTION');
    
    // Delete existing worker availability
    await pool.query('DELETE FROM worker_availability WHERE worker_id = ?', [workerId]);
    console.log('Deleted existing availability for worker:', workerId);
    
    // Insert new worker availability
    for (const [day, slots] of Object.entries(availability)) {
      for (const [timeSlot, isAvailable] of Object.entries(slots)) {
        console.log(`Setting availability: day=${day}, slot=${timeSlot}, available=${isAvailable}`);
        await pool.query(
          'INSERT INTO worker_availability (worker_id, day_of_week, time_slot, is_available) VALUES (?, ?, ?, ?)',
          [workerId, day, timeSlot, isAvailable ? 1 : 0]
        );
      }
    }
    
    await pool.query('COMMIT');
    console.log('Worker availability updated successfully');
    res.json({ message: 'Worker availability updated successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error updating worker availability:', error);
    res.status(500).json({ message: `Error updating worker availability: ${error.message}` });
  }
});

// Get worker's service requests
router.get('/workers/:workerId/requests', async (req, res) => {
  const { workerId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT b.*, u.name AS user_name, u.profile_pic AS user_profile_pic, u.phone AS user_phone,
              s.name AS service_name, b.ticket_number
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       WHERE b.worker_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
       ORDER BY b.created_at DESC`,
      [workerId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving service requests:', error);
    res.status(500).json({ message: 'Error retrieving service requests' });
  }
});

// Accept a booking request
router.put('/bookings/:bookingId/accept', async (req, res) => {
  const { bookingId } = req.params;
  const { workerId } = req.body;
  
  try {
    // Start a transaction
    await pool.query('START TRANSACTION');
    
    // Update booking status
    const [result] = await pool.query(
      'UPDATE bookings SET status = "confirmed", worker_id = ? WHERE booking_id = ? AND status = "pending"',
      [workerId, bookingId]
    );
    
    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }
    
    // Get booking details for notification
    const [bookings] = await pool.query(
      `SELECT b.*, u.name AS user_name, s.name AS service_name, w.name AS worker_name 
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    
    if (bookings.length > 0) {
      const booking = bookings[0];
      
      // Create notification for user
      await pool.query(
        'INSERT INTO notifications (user_id, booking_id, message) VALUES (?, ?, ?)',
        [
          booking.user_id, 
          bookingId, 
          `Your booking #${booking.ticket_number} for ${booking.service_name} has been confirmed by ${booking.worker_name}.`
        ]
      );
    }
    
    // Commit the transaction
    await pool.query('COMMIT');
    res.json({ message: 'Booking accepted successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error accepting booking:', error);
    res.status(500).json({ message: 'Error accepting booking' });
  }
});

// Reject a booking request
router.put('/bookings/:bookingId/reject', async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    await pool.query('START TRANSACTION');
    
    // Get booking details before updating status
    const [bookings] = await pool.query(
      `SELECT b.*, u.name AS user_name, s.name AS service_name, w.name AS worker_name 
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       JOIN services s ON b.service_id = s.service_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    
    if (bookings.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found' });
    }
    
    const booking = bookings[0];
    
    // Update booking status
    const [result] = await pool.query(
      'UPDATE bookings SET status = "rejected" WHERE booking_id = ? AND status = "pending"',
      [bookingId]
    );
    
    if (result.affectedRows === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Booking not found or already processed' });
    }
    
    // Create notification for user
    await pool.query(
      'INSERT INTO notifications (user_id, booking_id, message) VALUES (?, ?, ?)',
      [
        booking.user_id, 
        bookingId, 
        `Your booking #${booking.ticket_number} for ${booking.service_name} has been rejected.`
      ]
    );
    
    await pool.query('COMMIT');
    res.json({ message: 'Booking rejected successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error rejecting booking:', error);
    res.status(500).json({ message: 'Error rejecting booking' });
  }
});

// Create a new booking (for users)
router.post('/bookings', async (req, res) => {
  const { userId, serviceId, workerId, bookingDate, bookingTime, durationHours, address, notes } = req.body;
  
  try {
    // Start transaction
    await pool.query('START TRANSACTION');
    
    // Get worker price for this service
    const [priceRows] = await pool.query(
      'SELECT price_per_hour FROM worker_services WHERE worker_id = ? AND service_id = ?', 
      [workerId, serviceId]
    );
    
    if (priceRows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ message: 'Worker does not provide this service' });
    }
    
    const pricePerHour = priceRows[0].price_per_hour;
    const totalPrice = pricePerHour * durationHours;
    
    // Generate ticket number
    const ticketNumber = await generateTicketNumber();
    
    console.log(`Creating booking: user=${userId}, worker=${workerId}, service=${serviceId}, date=${bookingDate}, time=${bookingTime}, price=${totalPrice}, ticket=${ticketNumber}`);
    
    // Insert new booking
    const [result] = await pool.query(
      `INSERT INTO bookings (ticket_number, user_id, worker_id, service_id, booking_date, booking_time, duration_hours, address, total_price, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [ticketNumber, userId, workerId, serviceId, bookingDate, bookingTime, durationHours, address, totalPrice, notes]
    );
    
    // Get service name and user name for notification
    const [serviceRows] = await pool.query('SELECT name FROM services WHERE service_id = ?', [serviceId]);
    const [userRows] = await pool.query('SELECT name FROM users WHERE user_id = ?', [userId]);
    
    // Create notification for worker
    if (serviceRows.length > 0 && userRows.length > 0) {
      const serviceName = serviceRows[0].name;
      const userName = userRows[0].name;
      
      await pool.query(
        'INSERT INTO notifications (worker_id, booking_id, message) VALUES (?, ?, ?)',
        [
          workerId, 
          result.insertId, 
          `New booking request #${ticketNumber} for ${serviceName} from ${userName} on ${bookingDate} at ${bookingTime}.`
        ]
      );
    }
    
    await pool.query('COMMIT');
    
    res.status(201).json({
      message: 'Booking created successfully',
      bookingId: result.insertId,
      ticketNumber: ticketNumber
    });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
});

// Get specific booking details
router.get('/bookings/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  
  try {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS service_name, 
              u.name AS user_name, u.phone AS user_phone, u.profile_pic AS user_profile_pic,
              w.name AS worker_name, w.phone AS worker_phone, w.profile_pic AS worker_profile_pic
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.booking_id = ?`,
      [bookingId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error retrieving booking details:', error);
    res.status(500).json({ message: 'Error retrieving booking details' });
  }
});

// Get user's bookings
router.get('/users/:userId/bookings', async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS service_name, w.name AS worker_name, 
              w.phone AS worker_phone, w.profile_pic AS worker_profile_pic
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.booking_time DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({ message: 'Error retrieving bookings' });
  }
});

// Admin API endpoints
router.get('/admin/dashboard', async (req, res) => {
  try {
    // Get statistics
    const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [workerCount] = await pool.query('SELECT COUNT(*) as count FROM workers');
    const [bookingCount] = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const [pendingCount] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = "pending"');
    const [confirmedCount] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = "confirmed"');
    const [completedCount] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = "completed"');
    const [revenueResult] = await pool.query('SELECT SUM(total_price) as total FROM bookings WHERE status IN ("confirmed", "completed")');
    
    // Get recent bookings
    const [recentBookings] = await pool.query(
      `SELECT b.*, s.name AS service_name, u.name AS user_name, w.name AS worker_name
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       ORDER BY b.created_at DESC
       LIMIT 10`
    );
    
    res.json({
      statistics: {
        users: userCount[0].count,
        workers: workerCount[0].count,
        bookings: bookingCount[0].count,
        pending: pendingCount[0].count,
        confirmed: confirmedCount[0].count,
        completed: completedCount[0].count,
        revenue: revenueResult[0].total || 0,
      },
      recentBookings
    });
  } catch (error) {
    console.error('Error retrieving admin dashboard data:', error);
    res.status(500).json({ message: 'Error retrieving admin dashboard data' });
  }
});

router.get('/admin/users', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.*, 
        (SELECT COUNT(*) FROM bookings WHERE user_id = u.user_id) as booking_count
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ message: 'Error retrieving users' });
  }
});

router.get('/admin/workers', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT w.*, 
        (SELECT COUNT(*) FROM bookings WHERE worker_id = w.worker_id) as booking_count
       FROM workers w
       ORDER BY w.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving workers:', error);
    res.status(500).json({ message: 'Error retrieving workers' });
  }
});

router.get('/admin/bookings', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, s.name AS service_name, u.name AS user_name, w.name AS worker_name
       FROM bookings b
       JOIN services s ON b.service_id = s.service_id
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN workers w ON b.worker_id = w.worker_id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error retrieving bookings:', error);
    res.status(500).json({ message: 'Error retrieving bookings' });
  }
});

export default router;
