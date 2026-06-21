import { connectDB, pool } from '../db.js';

async function migrate() {
  try {
    await connectDB();
    console.log('Running Location Phase 2 Migration...');

    const queries = [
      // Add independent location coordinates to bookings
      `ALTER TABLE bookings ADD COLUMN booking_latitude DECIMAL(10,8);`,
      `ALTER TABLE bookings ADD COLUMN booking_longitude DECIMAL(11,8);`,
      `ALTER TABLE bookings ADD COLUMN booking_location_text VARCHAR(255);`,

      // Update the status ENUM to include the new journey states
      // In MySQL, to alter ENUM you must redefine the entire column.
      // Current: ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected')
      `ALTER TABLE bookings 
       MODIFY COLUMN status ENUM('pending', 'confirmed', 'accepted', 'travelling', 'arrived', 'in_progress', 'completed', 'cancelled', 'rejected') DEFAULT 'pending';`
    ];

    for (const query of queries) {
      console.log(`Executing: ${query}`);
      try {
        await pool.query(query);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log('Column already exists, skipping...');
        } else {
          throw e;
        }
      }
    }

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
