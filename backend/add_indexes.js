import { connectDB, pool } from './db.js';

async function addIndexes() {
  try {
    await connectDB();
    
    console.log('Adding indexes for Phase 20: Performance...');
    
    const queries = [
      'ALTER TABLE workers ADD INDEX idx_worker_location (latitude, longitude)',
      'ALTER TABLE worker_locations ADD INDEX idx_worker_locations_worker (worker_id, updated_at)',
      'ALTER TABLE worker_availability ADD INDEX idx_worker_availability_day_time (day_of_week, time_slot, is_available)',
      'ALTER TABLE bookings ADD INDEX idx_booking_worker_status (worker_id, status)'
    ];

    for (const query of queries) {
      try {
        await pool.query(query);
        console.log(`Executed: ${query}`);
      } catch (e) {
        if (e.code === 'ER_DUP_KEYNAME') {
          console.log(`Index already exists: ${query}`);
        } else {
          console.error(`Error executing ${query}:`, e.message);
        }
      }
    }
    
    console.log('Indexes added successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addIndexes();
