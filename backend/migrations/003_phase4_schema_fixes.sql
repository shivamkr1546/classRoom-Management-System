-- ============================================================================
-- Phase 4: Database Schema Migration - Production Grade
-- ============================================================================
-- This migration:
-- 1. Creates course_enrollments table for explicit enrollment tracking
-- 2. Rebuilds attendance table with per-schedule tracking + audit fields
-- 3. Adds materialized analytics tables for performance
-- 4. Implements soft deletes for students/courses
-- 5. Adds comprehensive performance indexes
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE COURSE ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('active','withdrawn','completed') DEFAULT 'active',
  enrolled_by INT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enroll_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT fk_enroll_by FOREIGN KEY (enrolled_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_course_student (course_id, student_id),
  INDEX idx_course_status (course_id, status),
  INDEX idx_student_status (student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: BACKFILL ENROLLMENTS FROM EXISTING ATTENDANCE DATA
-- ============================================================================
-- Infer enrollments from historical attendance records
-- This creates enrollments for any student who has attended a course

INSERT INTO course_enrollments (course_id, student_id, enrolled_at, status)
SELECT DISTINCT 
  s.course_id, 
  a.student_id, 
  MIN(a.created_at) as enrolled_at,
  'active' as status
FROM attendance a
JOIN schedules s ON a.schedule_id = s.id
WHERE a.student_id IS NOT NULL 
  AND a.schedule_id IS NOT NULL
  AND s.course_id IS NOT NULL
GROUP BY s.course_id, a.student_id
ON DUPLICATE KEY UPDATE 
  enrolled_at = LEAST(enrolled_at, VALUES(enrolled_at));

-- ============================================================================
-- STEP 3: BACKUP AND REBUILD ATTENDANCE TABLE
-- ============================================================================

-- Create backup of existing attendance data
DROP TABLE IF EXISTS attendance_backup;
CREATE TABLE attendance_backup AS SELECT * FROM attendance;

-- Drop existing attendance table
DROP TABLE attendance;

-- Recreate attendance with correct schema
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  student_id INT NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL DEFAULT 'absent',
  marked_by INT NULL,
  marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NULL,
  updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_att_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  CONSTRAINT fk_att_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_att_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY unique_student_schedule (student_id, schedule_id),
  INDEX idx_schedule_status (schedule_id, status),
  INDEX idx_student_status (student_id, status),
  INDEX idx_marked_at (marked_at),
  INDEX idx_schedule_student_status (schedule_id, student_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restore attendance data from backup (only valid records)
-- Map old status values to new enum (only present/absent existed before)
INSERT INTO attendance (id, schedule_id, student_id, status, marked_at)
SELECT 
  id,
  schedule_id,
  student_id,
  CASE 
    WHEN status = 'present' THEN 'present'
    ELSE 'absent'
  END as status,
  created_at as marked_at
FROM attendance_backup
WHERE schedule_id IS NOT NULL 
  AND student_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  status = VALUES(status);

-- ============================================================================
-- STEP 4: ADD SOFT DELETE COLUMNS TO STUDENTS AND COURSES
-- ============================================================================

-- Add soft delete columns to students table
ALTER TABLE students 
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by INT NULL,
  ADD CONSTRAINT fk_student_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_students_deleted (deleted_at);

-- Add soft delete columns to courses table
ALTER TABLE courses 
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deleted_by INT NULL,
  ADD CONSTRAINT fk_course_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD INDEX idx_courses_deleted (deleted_at);

-- ============================================================================
-- STEP 5: CREATE MATERIALIZED ANALYTICS TABLES
-- ============================================================================

-- Course attendance summary (refreshed nightly)
CREATE TABLE course_attendance_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  schedule_id INT NOT NULL,
  enrolled_count INT DEFAULT 0,
  present_count INT DEFAULT 0,
  absent_count INT DEFAULT 0,
  late_count INT DEFAULT 0,
  excused_count INT DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0.00,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cas_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_cas_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  UNIQUE KEY unique_schedule (schedule_id),
  INDEX idx_course (course_id),
  INDEX idx_computed_at (computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Room utilization daily summary (refreshed nightly)
CREATE TABLE room_utilization_daily (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  date DATE NOT NULL,
  total_hours DECIMAL(5,2) DEFAULT 0.00,
  available_hours DECIMAL(5,2) DEFAULT 24.00,
  utilization_rate DECIMAL(5,2) DEFAULT 0.00,
  schedule_count INT DEFAULT 0,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rud_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  UNIQUE KEY unique_room_date (room_id, date),
  INDEX idx_date (date),
  INDEX idx_computed_at (computed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 6: ADD ADDITIONAL PERFORMANCE INDEXES
-- ============================================================================

-- Composite indexes for common analytics queries
CREATE INDEX idx_schedules_course_date_status ON schedules(course_id, date, status);
CREATE INDEX idx_schedules_instructor_date ON schedules(instructor_id, date, start_time, end_time);
CREATE INDEX idx_schedules_room_date ON schedules(room_id, date, start_time, end_time);

-- ============================================================================
-- STEP 7: SEED ENROLLMENT DATA (Basic Examples)
-- ============================================================================

-- Enroll some students in courses for testing
-- This assumes students with IDs 1-20 exist and courses with IDs 1-3 exist
INSERT INTO course_enrollments (course_id, student_id, enrolled_by, status)
SELECT 
  c.id as course_id,
  s.id as student_id,
  1 as enrolled_by, -- Admin user
  'active' as status
FROM students s
CROSS JOIN courses c
WHERE s.id BETWEEN 1 AND 10
  AND c.id BETWEEN 1 AND 2
  AND NOT EXISTS (
    SELECT 1 FROM course_enrollments ce 
    WHERE ce.course_id = c.id AND ce.student_id = s.id
  )
LIMIT 20;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Phase 4 schema migration completed successfully!' AS Status;
SELECT COUNT(*) as EnrollmentsCreated FROM course_enrollments;
SELECT COUNT(*) as AttendanceRecordsMigrated FROM attendance;
