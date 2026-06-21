import { connectDB, pool } from '../db.js';

async function migrate() {
  try {
    await connectDB();

    console.log('=== Migration 04: Booking Schedule & Metrics ===\n');

    const columnsToAdd = [
      { name: 'scheduled_start_datetime', type: 'DATETIME NULL DEFAULT NULL' },
      { name: 'scheduled_end_datetime', type: 'DATETIME NULL DEFAULT NULL' },
      { name: 'arrival_delay_minutes', type: 'INT NULL DEFAULT NULL' },
      { name: 'service_start_delay_minutes', type: 'INT NULL DEFAULT NULL' },
      { name: 'travel_duration_minutes', type: 'INT NULL DEFAULT NULL' },
      { name: 'service_duration_minutes', type: 'INT NULL DEFAULT NULL' },
      { name: 'early_arrival_minutes', type: 'INT NULL DEFAULT NULL' },
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
          'waiting_for_schedule',
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

    console.log('\nPopulating scheduled datetimes for existing bookings...');
    try {
      await pool.query(`
        UPDATE bookings 
        SET scheduled_start_datetime = TIMESTAMP(booking_date, booking_time),
            scheduled_end_datetime = DATE_ADD(TIMESTAMP(booking_date, booking_time), INTERVAL duration_hours HOUR)
        WHERE scheduled_start_datetime IS NULL
      `);
      console.log('  ✅ Scheduled datetimes populated');
    } catch (e) {
      console.error('  ❌ Failed to populate scheduled datetimes:', e.message);
    }

    console.log('\n=== Migration 04 complete! ===');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
