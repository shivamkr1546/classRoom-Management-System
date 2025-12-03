
╔════════════════════════════════════════════════════════════╗
║     Phase 3 Scheduling Engine Test Suite                  ║
╚════════════════════════════════════════════════════════════╝

Testing API at: http://localhost:5000


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AUTHENTICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Admin login
✓ Coordinator login
✓ Instructor login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SETUP TEST DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Using Room ID: 11
✓ Get existing room
  Using Course ID: 4
✓ Get existing course
  Using Instructor ID: 2
✓ Get instructor ID
✓ Assign instructor to course

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SCHEDULE CREATION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Created Schedule ID: 49
✓ Create valid schedule (coordinator)
✓ Create valid schedule (admin)
✓ Instructor cannot create schedule (403)
✓ Invalid time range rejected
✓ Cleanup valid schedules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ROOM CONFLICT DETECTION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Create schedule in Room A at 09:00-10:00
✓ Reject overlapping schedule in same room (09:30-10:30)
✓ Allow non-overlapping schedule (10:00-11:00 touching boundary)
✓ Cleanup room conflict test schedules

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INSTRUCTOR CONFLICT DETECTION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Using second Room ID: 12
✓ Get second room for instructor conflict test
✓ Create schedule with Instructor X at 14:00-15:00
✓ Reject same instructor at overlapping time (different room)
✓ Allow same instructor at different time (different room)
✓ Cleanup instructor conflict test schedule

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CAPACITY VALIDATION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Create course with required_capacity=50
✓ Assign instructor to capacity test course
✓ Create small room (capacity=30)
✓ Create large room (capacity=60)
✓ Reject schedule: room capacity < course requirement
✓ Allow schedule: room capacity >= course requirement
✓ Cleanup capacity test data

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INSTRUCTOR ASSIGNMENT VALIDATION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠ Only 1 instructor - skipping unassigned instructor test
✓ Get second instructor (unassigned)
✓ Create test course
✓ Assign instructor and create schedule successfully
✓ Cleanup assignment test course

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SCHEDULE MANAGEMENT TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ List schedules
✓ Filter schedules by date range
✓ Filter schedules by room
✓ Get schedule by ID
✓ Update schedule time
✓ Instructor cannot update schedule (403)
✓ Cancel schedule

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BULK SCHEDULE CREATION TESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Created 3 schedules
✓ Bulk create valid schedules
✓ Bulk create rejects with conflict (transaction rollback)

╔════════════════════════════════════════════════════════════╗
║     Test Summary                                           ║
╚════════════════════════════════════════════════════════════╝

  ✓ Passed: 41/41
  ✗ Failed: 0/41
  Success Rate: 100.0%

🎉 All tests passed!

