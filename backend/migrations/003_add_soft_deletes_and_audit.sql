-- Phase 2: Add soft delete and audit columns
-- This migration adds deleted_at timestamps and audit fields for traceability

USE classroom_db;

-- Add deleted_at to users (soft delete)
ALTER TABLE users
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN created_by INT NULL,
ADD COLUMN updated_by INT NULL,
ADD COLUMN deleted_by INT NULL,
ADD INDEX idx_deleted_at (deleted_at);

-- Add deleted_at to rooms (soft delete)
ALTER TABLE rooms
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN created_by INT NULL,
ADD COLUMN updated_by INT NULL,
ADD COLUMN deleted_by INT NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add deleted_at to courses (soft delete)
ALTER TABLE courses
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN created_by INT NULL,
ADD COLUMN updated_by INT NULL,
ADD COLUMN deleted_by INT NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add deleted_at to students (soft delete)
ALTER TABLE students
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL,
ADD COLUMN created_by INT NULL,
ADD COLUMN updated_by INT NULL,
ADD COLUMN deleted_by INT NULL,
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Success message
SELECT 'Soft delete and audit columns added successfully!' AS Status;
