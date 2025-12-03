-- Seed data for development and testing

-- Insert admin user (password: admin123)
-- Password hash generated with bcrypt (cost 12): admin123
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@classroom.com', '$2b$12$NY3pFsqrFQgje4rfZTshnusc4NRzpXqBeI6niCb3EX1pB1VpFAmGi', 'admin'),
('John Doe', 'john@classroom.com', '$2b$12$NY3pFsqrFQgje4rfZTshnusc4NRzpXqBeI6niCb3EX1pB1VpFAmGi', 'instructor'),
('Jane Smith', 'jane@classroom.com', '$2b$12$NY3pFsqrFQgje4rfZTshnusc4NRzpXqBeI6niCb3EX1pB1VpFAmGi', 'coordinator');

-- Insert sample rooms
INSERT INTO rooms (code, name, type, capacity, location) VALUES
('R101', 'Computer Lab 1', 'lab', 40, 'Block A - Floor 1'),
('R102', 'Classroom A', 'classroom', 60, 'Block A - Floor 1'),
('R201', 'Seminar Hall', 'seminar', 100, 'Block B - Floor 2'),
('R202', 'Physics Lab', 'lab', 30, 'Block B - Floor 2'),
('R301', 'Auditorium', 'auditorium', 200, 'Block C - Floor 3'),
('R103', 'Classroom B', 'classroom', 50, 'Block A - Floor 1'),
('R104', 'Chemistry Lab', 'lab', 35, 'Block A - Floor 1');

-- Insert sample courses
INSERT INTO courses (code, name, required_capacity) VALUES
('CS101', 'Data Structures', 40),
('CS201', 'Algorithms', 40),
('PH101', 'Physics I', 30),
('CH101', 'Chemistry I', 35),
('MA101', 'Calculus', 50),
('CS301', 'Database Systems', 40);

-- Assign instructors to courses
INSERT INTO course_instructors (course_id, instructor_id) VALUES
(1, 2), -- John teaches Data Structures
(2, 2), -- John teaches Algorithms
(3, 3), -- Jane teaches Physics
(4, 3), -- Jane teaches Chemistry
(5, 2), -- John teaches Calculus
(6, 3); -- Jane teaches Database Systems

-- Insert sample students
INSERT INTO students (roll_no, name, email, class_label) VALUES
('2023001', 'Alice Johnson', 'alice@student.com', 'CSE-3A'),
('2023002', 'Bob Williams', 'bob@student.com', 'CSE-3A'),
('2023003', 'Charlie Brown', 'charlie@student.com', 'CSE-3A'),
('2023004', 'Diana Prince', 'diana@student.com', 'CSE-3B'),
('2023005', 'Eve Adams', 'eve@student.com', 'CSE-3B'),
('2023006', 'Frank Miller', 'frank@student.com', 'CSE-3B'),
('2023007', 'Grace Lee', 'grace@student.com', 'CSE-3A'),
('2023008', 'Henry Ford', 'henry@student.com', 'CSE-3A');

SELECT 'Seed data inserted successfully!' AS Status;
