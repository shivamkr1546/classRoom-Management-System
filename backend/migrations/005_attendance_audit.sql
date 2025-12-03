-- Attendance Audit Log Table (Updated Migration)
-- Tracks all changes to attendance records for accountability
-- Version: 2 - Added schedule_id denormalization and index

DROP TABLE IF EXISTS attendance_audit;

CREATE TABLE IF NOT EXISTS attendance_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_id INT NOT NULL,
    schedule_id INT NOT NULL COMMENT 'Denormalized for efficient querying',
    old_status ENUM('present', 'absent', 'late', 'excused') NULL COMMENT 'NULL for new records',
    new_status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(500) NULL COMMENT 'Required for status changes, optional for new records',
    
    FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_attendance_audit_attendance (attendance_id),
    INDEX idx_attendance_audit_schedule (schedule_id, changed_at),
    INDEX idx_attendance_audit_changed_by (changed_by),
    INDEX idx_attendance_audit_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Attendance audit table created with schedule_id denormalization!' AS Status;
