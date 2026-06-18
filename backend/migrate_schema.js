import { connectDB, pool } from './db.js';

async function migrate() {
  try {
    await connectDB();

    console.log('Adding is_blocked to users...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE');
    } catch(e) { if(e.code !== 'ER_DUP_FIELDNAME') throw e; }

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

    console.log('Migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
