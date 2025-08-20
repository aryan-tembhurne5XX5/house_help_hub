
-- House Help Hub Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS house_help_hub;
USE house_help_hub;

-- Create Users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    profile_pic VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Workers table
CREATE TABLE workers (
    worker_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    bio TEXT,
    profile_pic VARCHAR(255) DEFAULT NULL,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Admins table
CREATE TABLE admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Services table
CREATE TABLE services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Worker_Services junction table
CREATE TABLE worker_services (
    worker_service_id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    service_id INT NOT NULL,
    price_per_hour DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE,
    UNIQUE (worker_id, service_id)
);

-- Create Worker_Availability table
CREATE TABLE worker_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    day_of_week ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    time_slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    UNIQUE (worker_id, day_of_week, time_slot)
);

-- Create Bookings table with ticket number
CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(10) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    worker_id INT,
    service_id INT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    address TEXT NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'rejected', 'canceled') NOT NULL DEFAULT 'pending',
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(service_id) ON DELETE CASCADE
);

-- Create Reviews table
CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    UNIQUE (booking_id)
);

-- Create Notifications table
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    worker_id INT,
    booking_id INT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE
);

-- Insert sample services
INSERT INTO services (name, description, base_price) VALUES
('Home Cleaning', 'Comprehensive home cleaning service', 250.00),
('Cooking', 'Meal preparation services', 300.00),
('Laundry', 'Washing, drying and folding clothes', 200.00),
('Grocery Shopping', 'Purchase and delivery of groceries', 150.00),
('Medical Assistance', 'Basic medical care and assistance', 350.00),
('Pest Control', 'Inspection and elimination of pests', 400.00);

-- Insert sample users with Indian names
INSERT INTO users (name, email, password, phone, address, profile_pic) VALUES
('Aanya Sharma', 'aanya@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '9876543210', 'Sector 18, Noida', NULL),
('Vivaan Patel', 'vivaan@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '9876543211', 'Malviya Nagar, Delhi', NULL),
('Meera Singh', 'meera@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '9876543212', 'Indiranagar, Bangalore', NULL);

-- Insert sample workers with Indian names
INSERT INTO workers (name, email, password, phone, address, bio, profile_pic) VALUES
('Raj Malhotra', 'raj@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '8765432109', 'Vasant Kunj, Delhi', 'Experienced home cleaner with 5+ years of professional experience', NULL),
('Priya Verma', 'priya@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '8765432108', 'HSR Layout, Bangalore', 'Professional cook specializing in North Indian cuisine', NULL),
('Arjun Kumar', 'arjun@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy', '8765432107', 'Andheri East, Mumbai', 'Experienced laundry and housekeeping professional', NULL);

-- Insert sample admin
INSERT INTO admins (name, email, password) VALUES
('Admin User', 'admin@example.com', '$2b$10$X7SLJu3tHwgU2U9ViM8AXeQDHKNhnQYOUjYYU9TMi9EgfW4PODOiy');
