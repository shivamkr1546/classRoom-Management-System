import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button';
import ScheduleBlock from './ScheduleBlock';
import {
    getWeekDates,
    getTimeSlots,
    formatDateDisplay,
    getDateKey,
    isToday,
    calculateBlockHeight,
    calculateBlockTop,
    detectOverlaps,
    calculateBlockPosition,
} from '../../utils/scheduleUtils';

/**
 * ScheduleGrid Component
 * Weekly calendar grid (Mon-Fri) with time slots and schedule blocks
 */
const ScheduleGrid = ({ schedules, onBlockClick, onEmptySlotClick, loading, weekOffset, onWeekChange }) => {
    const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
    const timeSlots = useMemo(() => getTimeSlots(), []);

    const handlePrevWeek = () => onWeekChange(weekOffset - 1);
    const handleNextWeek = () => onWeekChange(weekOffset + 1);
    const handleToday = () => onWeekChange(0);

    // Group schedules by date
    const schedulesByDate = useMemo(() => {
        const grouped = {};
        schedules.forEach((schedule) => {
            // Normalize date to YYYY-MM-DD
            let dateKey = schedule.date;
            if (typeof dateKey === 'string') {
                dateKey = dateKey.split('T')[0];
            } else if (dateKey instanceof Date) {
                dateKey = dateKey.toISOString().split('T')[0];
            }

            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(schedule);
        });
        return grouped;
    }, [schedules]);

    // Handle empty slot click
    const handleSlotClick = (date, timeSlot) => {
        const startTime = timeSlot.time.substring(0, 5); // HH:MM
        const endHour = parseInt(timeSlot.time.substring(0, 2)) + 1;
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;

        onEmptySlotClick({
            date: getDateKey(date),
            start_time: startTime,
            end_time: endTime,
        });
    };

    // Render schedule blocks for a specific day
    const renderDaySchedules = (date) => {
        const dateKey = getDateKey(date);
        const daySchedules = schedulesByDate[dateKey] || [];

        if (daySchedules.length === 0) return null;

        // Detect overlaps
        const overlapMap = detectOverlaps(daySchedules);

        // Group overlapping schedules
        const processed = new Set();
        const overlapGroups = [];

        daySchedules.forEach((schedule) => {
            if (processed.has(schedule.id)) return;

            const overlaps = overlapMap.get(schedule.id);
            if (overlaps && overlaps.length > 0) {
                // Create overlap group
                const group = [schedule];
                overlaps.forEach((overlapId) => {
                    const overlapSchedule = daySchedules.find((s) => s.id === overlapId);
                    if (overlapSchedule && !processed.has(overlapId)) {
                        group.push(overlapSchedule);
                    }
                });
                group.forEach((s) => processed.add(s.id));
                overlapGroups.push(group);
            } else {
                // Non-overlapping schedule
                overlapGroups.push([schedule]);
                processed.add(schedule.id);
            }
        });

        // Render blocks with deterministic z-index
        return overlapGroups.map((group, groupIndex) => {
            return group.map((schedule, index) => {
                const height = calculateBlockHeight(schedule.start_time, schedule.end_time);
                const top = calculateBlockTop(schedule.start_time);
                const { left, width } = calculateBlockPosition(schedule, index, group.length);

                // Deterministic z-index: overlapGroupIndex * 10 + blockIndex
                const zIndex = groupIndex * 10 + index;

                return (
                    <ScheduleBlock
                        key={schedule.id}
                        schedule={schedule}
                        onClick={onBlockClick}
                        overlapping={group.length > 1}
                        style={{
                            top: `${top}px`,
                            left: `${left}%`,
                            width: `${width}%`,
                            height: `${height}px`,
                            zIndex,
                        }}
                    />
                );
            });
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200">
            {/* Week Navigation */}
            <div className="p-4 border-b border-secondary-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" icon={ChevronLeft} onClick={handlePrevWeek} />
                    <Button variant="outline" size="sm" onClick={handleToday}>
                        Today
                    </Button>
                    <Button variant="outline" size="sm" icon={ChevronRight} onClick={handleNextWeek} />
                </div>
                <div className="font-semibold text-secondary-900">
                    {formatDateDisplay(weekDates[0])} - {formatDateDisplay(weekDates[4])}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Day Headers */}
                    <div className="grid grid-cols-6 border-b border-secondary-200">
                        <div className="p-3 text-sm font-medium text-secondary-500 bg-secondary-50">
                            Time
                        </div>
                        {weekDates.map((date, index) => (
                            <div
                                key={index}
                                className={`p-3 text-center text-sm font-medium ${isToday(date)
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'bg-secondary-50 text-secondary-700'
                                    }`}
                            >
                                <div>{formatDateDisplay(date)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Time Slots & Schedule Grid */}
                    <div className="relative">
                        {timeSlots.map((slot, slotIndex) => (
                            <div key={slotIndex} className="grid grid-cols-6 border-b border-secondary-200">
                                {/* Time Label */}
                                <div className="p-3 text-xs text-secondary-500 bg-secondary-50">
                                    {slot.display}
                                </div>

                                {/* Day Columns */}
                                {weekDates.map((date, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        className={`relative border-l border-secondary-200 hover:bg-secondary-50 cursor-pointer transition-colors ${isToday(date) ? 'bg-primary-50 bg-opacity-20' : ''
                                            }`}
                                        style={{ height: '60px' }}
                                        onClick={() => handleSlotClick(date, slot)}
                                    >
                                        {/* Schedule blocks are rendered with absolute positioning */}
                                        {slotIndex === 0 && renderDaySchedules(date)}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                    <div className="text-secondary-500">Loading schedules...</div>
                </div>
            )}
        </div>
    );
};

ScheduleGrid.propTypes = {
    schedules: PropTypes.array.isRequired,
    onBlockClick: PropTypes.func.isRequired,
    onEmptySlotClick: PropTypes.func.isRequired,
    loading: PropTypes.bool,
    weekOffset: PropTypes.number.isRequired,
    onWeekChange: PropTypes.func.isRequired,
};

export default ScheduleGrid;
