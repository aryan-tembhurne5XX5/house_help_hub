
CREATE DATABASE IF NOT EXISTS house_help_hub;
USE house_help_hub;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_pic VARCHAR(255),
    is_blocked BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workers Table
CREATE TABLE IF NOT EXISTS workers (
    worker_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    bio TEXT,
    profile_pic VARCHAR(255),
    avg_rating DECIMAL(3, 2) DEFAULT 0.00,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'Wrench'
);

-- Worker Services (Many-to-Many relationship between workers and services)
CREATE TABLE IF NOT EXISTS worker_services (
    worker_id INT,
    service_id INT,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (worker_id, service_id),
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Worker Availability
CREATE TABLE IF NOT EXISTS worker_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    time_slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    UNIQUE KEY (worker_id, day_of_week, time_slot)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT,
    worker_id INT,
    service_id INT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_hours DECIMAL(4, 2) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT UNIQUE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    worker_id INT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'booking_request', 'system', 'review'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE
);

-- Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    role ENUM('user', 'worker', 'admin') NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token)
);

-- Support Tickets Table
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
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workers_email ON workers(email);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_worker ON notifications(worker_id, is_read);


-- Initial Seed Data
INSERT INTO users (name, email, password, is_superuser, profile_pic) 
VALUES ('Super Admin', 'admin@example.com', '$2b$10$wOHtW7k1FwhQU/JyrN1rh.b2xFX10C/MWkE7ukjkaYgHnmlWc1l9W', TRUE, 'https://ui-avatars.com/api/?name=Super+Admin&background=random&color=fff');

INSERT INTO services (name, description, base_price, icon_name) VALUES
('Cleaning', 'Deep cleaning, dusting, mopping, and organizing', 15.00, 'Sparkles'),
('Cooking', 'Preparation of meals, grocery shopping assistance', 20.00, 'ChefHat'),
('Laundry', 'Washing, drying, folding, and ironing clothes', 12.00, 'Shirt'),
('Babysitting', 'Child care, engaging activities, meal prep for kids', 18.00, 'Baby'),
('Elder Care', 'Assistance with daily activities, medication reminders', 22.00, 'HeartHandshake'),
('Pet Care', 'Dog walking, feeding, basic grooming', 15.00, 'Dog'),
('Plumbing', 'Fixing leaks, unclogging drains, pipe repairs', 35.00, 'Wrench'),
('Electrical', 'Fixing wiring, installing fixtures, repairs', 40.00, 'Zap');
