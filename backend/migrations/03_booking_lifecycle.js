import { connectDB, pool } from '../db.js';

async function migrate() {
  try {
    await connectDB();

    console.log('=== Migration 03: Booking Lifecycle State Machine ===\n');

    // 1. Add lifecycle timestamp columns to bookings
    const columnsToAdd = [
      { name: 'travel_started_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'arrived_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'service_started_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'completion_requested_at', type: 'TIMESTAMP NULL DEFAULT NULL' },
      { name: 'user_confirmed_arrival', type: 'BOOLEAN DEFAULT FALSE' },
    ];

    for (const col of columnsToAdd) {
      console.log(`Adding column ${col.name}...`);
      try {
        await pool.query(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`  ✅ ${col.name} added`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  ${col.name} already exists, skipping`);
        } else {
          throw e;
        }
      }
    }

    // 2. Update the status enum to include all lifecycle states
    console.log('\nUpdating booking status enum...');
    try {
      await pool.query(`
        ALTER TABLE bookings 
        MODIFY COLUMN status ENUM(
          'pending', 
          'accepted', 
          'confirmed',
          'travelling', 
          'arrived', 
          'service_started', 
          'in_progress',
          'completion_requested', 
          'completed', 
          'rejected', 
          'canceled',
          'under_review'
        ) DEFAULT 'pending'
      `);
      console.log('  ✅ Status enum updated');
    } catch (e) {
      console.error('  ❌ Failed to update status enum:', e.message);
    }

    // 3. Add indexes for the new timestamp columns (useful for querying active bookings)
    console.log('\nAdding indexes...');
    try {
      await pool.query('CREATE INDEX idx_booking_status ON bookings(status)');
      console.log('  ✅ idx_booking_status created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('  ⏭️  idx_booking_status already exists');
      } else {
        console.error('  ⚠️  Index creation warning:', e.message);
      }
    }

    try {
      await pool.query('CREATE INDEX idx_booking_service_started ON bookings(service_started_at)');
      console.log('  ✅ idx_booking_service_started created');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('  ⏭️  idx_booking_service_started already exists');
      } else {
        console.error('  ⚠️  Index creation warning:', e.message);
      }
    }

    console.log('\n=== Migration 03 complete! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
