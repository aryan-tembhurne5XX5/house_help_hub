import { connectDB, pool } from './db.js';

async function migrate() {
  try {
    await connectDB();

    console.log('Adding is_blocked to users...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    console.log('Adding is_superuser to users...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_superuser BOOLEAN DEFAULT FALSE');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    console.log('Dropping admins table if exists...');
    try {
      await pool.query('DROP TABLE IF EXISTS admins');
    } catch(e) { console.error('Failed to drop admins table:', e); }

    console.log('Inserting default superuser...');
    try {
      const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', ['admin@example.com']);
      if (existing.length === 0) {
        await pool.query(
          "INSERT INTO users (name, email, password, is_superuser, profile_pic) VALUES (?, ?, ?, TRUE, ?)",
          [
            'Super Admin',
            'admin@example.com',
            '$2b$10$wOHtW7k1FwhQU/JyrN1rh.b2xFX10C/MWkE7ukjkaYgHnmlWc1l9W',
            'https://ui-avatars.com/api/?name=Super+Admin&background=random&color=fff'
          ]
        );
        console.log('Default superuser inserted.');
      } else {
        await pool.query('UPDATE users SET is_superuser = TRUE WHERE email = ?', ['admin@example.com']);
        console.log('Existing user updated to superuser.');
      }
    } catch(e) { console.error('Failed to insert default superuser:', e); }

    console.log('Adding is_blocked and is_verified to workers...');
    try {
      await pool.query('ALTER TABLE workers ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }
    try {
      await pool.query('ALTER TABLE workers ADD COLUMN is_verified BOOLEAN DEFAULT FALSE');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

    console.log('Creating password_resets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(100) NOT NULL,
        role ENUM('user', 'worker', 'admin') NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token (token)
      )
    `);

    console.log('Creating support_tickets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        ticket_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        worker_id INT,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
      )
    `);

    console.log('Adding location fields to users...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN latitude DECIMAL(10,8)');
      await pool.query('ALTER TABLE users ADD COLUMN longitude DECIMAL(11,8)');
      await pool.query('ALTER TABLE users ADD COLUMN location_text VARCHAR(255)');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') console.error(e); }

    console.log('Adding location fields to workers...');
    try {
      await pool.query('ALTER TABLE workers ADD COLUMN latitude DECIMAL(10,8)');
      await pool.query('ALTER TABLE workers ADD COLUMN longitude DECIMAL(11,8)');
      await pool.query('ALTER TABLE workers ADD COLUMN location_text VARCHAR(255)');
      await pool.query('ALTER TABLE workers ADD COLUMN service_radius_km INT DEFAULT 10');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') console.error(e); }

    console.log('Creating worker_locations table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS worker_locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        worker_id INT NOT NULL,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
        INDEX idx_worker_id (worker_id)
      )
    `);

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
