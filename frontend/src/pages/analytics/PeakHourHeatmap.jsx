import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { format, parseISO } from 'date-fns';

/**
 * PeakHourHeatmap Component
 * Interactive heatmap showing peak room usage hours
 * Days (Mon-Fri) × Time slots (00:00-23:00)
 * Accessible to Instructor/Coordinator/Admin roles only
 */
export default function PeakHourHeatmap() {
    const [dateRange, setDateRange] = useState({
        startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

    useEffect(() => {
        fetchSchedules();
    }, [dateRange]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/schedules', {
                params: {
                    start_date: dateRange.startDate,
                    end_date: dateRange.endDate,
                    limit: 10000
                }
            });
            setSchedules(response.data.data.schedules || []);
        } catch (error) {
            console.error('Failed to fetch schedules:', error);
            if (window.showToast) {
                window.showToast('Failed to load schedule data', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Build heatmap data: day × hour → count
    const buildHeatmapData = () => {
        const data = {};
        DAYS.forEach(day => {
            data[day] = {};
            HOURS.forEach(hour => {
                data[day][hour] = 0;
            });
        });

        schedules.forEach(schedule => {
            try {
                const scheduleDate = parseISO(schedule.date);
                const dayName = format(scheduleDate, 'EEEE');

                // Only count Monday-Friday
                if (!DAYS.includes(dayName)) return;

                // Parse start and end times
                const [startHour] = schedule.start_time.split(':').map(Number);
                const [endHour] = schedule.end_time.split(':').map(Number);

                // Increment count for each hour this schedule occupies
                for (let hour = startHour; hour < endHour; hour++) {
                    if (hour >= 0 && hour < 24) {
                        data[dayName][hour]++;
                    }
                }
            } catch (error) {
                console.error('Error processing schedule:', error);
            }
        });

        return data;
    };

    const heatmapData = buildHeatmapData();

    // Find max count for color scaling
    const maxCount = Math.max(
        ...DAYS.flatMap(day =>
            HOURS.map(hour => heatmapData[day][hour])
        ),
        1 // Ensure at least 1 to avoid division by zero
    );

    const getHeatColor = (count) => {
        if (count === 0) return '#f3f4f6'; // Gray for empty
        const intensity = Math.min(count / maxCount, 1);
        // Blue gradient from light to dark
        const r = Math.round(59 + (255 - 59) * (1 - intensity));
        const g = Math.round(130 + (255 - 130) * (1 - intensity));
        const b = Math.round(246 + (255 - 246) * (1 - intensity));
        return `rgb(${r}, ${g}, ${b})`;
    };

    const formatHour = (hour) => {
        return `${hour.toString().padStart(2, '0')}:00`;
    };

    return (
        <div className="peak-hour-heatmap-page">
            <div className="page-header">
                <h1>Peak Hour Heatmap</h1>
                <p>Visualize room occupancy patterns by day and time</p>
            </div>

            <div className="filters-section">
                <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={setDateRange}
                />
            </div>

            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading heatmap data...</p>
                </div>
            )}

            {!loading && (
                <div className="heatmap-container">
                    <div className="heatmap-legend">
                        <div className="legend-label">Low Activity</div>
                        <div className="legend-gradient"></div>
                        <div className="legend-label">High Activity</div>
                        <div className="legend-max">Max: {maxCount} schedules</div>
                    </div>

                    <div className="heatmap-wrapper">
                        <div className="heatmap-grid">
                            {/* Header row with hours */}
                            <div className="cell header-cell corner-cell"></div>
                            {HOURS.map(hour => (
                                <div key={`hour-${hour}`} className="cell header-cell">
                                    {formatHour(hour)}
                                </div>
                            ))}

                            {/* Data rows */}
                            {DAYS.map(day => (
                                <React.Fragment key={day}>
                                    <div className="cell day-label">{day}</div>
                                    {HOURS.map(hour => {
                                        const count = heatmapData[day][hour];
                                        const isHovered = hoveredCell?.day === day && hoveredCell?.hour === hour;
                                        return (
                                            <div
                                                key={`${day}-${hour}`}
                                                className={`cell data-cell ${isHovered ? 'hovered' : ''}`}
                                                style={{ backgroundColor: getHeatColor(count) }}
                                                onMouseEnter={() => setHoveredCell({ day, hour, count })}
                                                onMouseLeave={() => setHoveredCell(null)}
                                            >
                                                {isHovered && (
                                                    <div className="cell-tooltip">
                                                        <div className="tooltip-day">{day}</div>
                                                        <div className="tooltip-time">{formatHour(hour)}</div>
                                                        <div className="tooltip-count">{count} schedules</div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {maxCount === 0 && (
                        <div className="empty-overlay">
                            <p>No schedule data for selected date range</p>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .peak-hour-heatmap-page {
                    padding: 2rem;
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .page-header {
                    margin-bottom: 2rem;
                }

                .page-header h1 {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }

                .page-header p {
                    color: var(--text-secondary);
                }

                .filters-section {
                    margin-bottom: 2rem;
                }

                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    gap: 1rem;
                }

                .spinner {
                    width: 48px;
                    height: 48px;
                    border: 4px solid var(--border-color);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .heatmap-container {
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    position: relative;
                }

                .heatmap-legend {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                }

                .legend-label {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .legend-gradient {
                    flex: 1;
                    height: 20px;
                    background: linear-gradient(to right, #f3f4f6, #3b82f6);
                    border-radius: 4px;
                }

                .legend-max {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .heatmap-wrapper {
                    overflow-x: auto;
                }

                .heatmap-grid {
                    display: grid;
                    grid-template-columns: 100px repeat(24, 50px);
                    gap: 2px;
                    background: var(--border-color);
                    padding: 2px;
                    border-radius: 6px;
                    min-width: max-content;
                }

                .cell {
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5rem;
                    position: relative;
                }

                .header-cell {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    height: 40px;
                }

                .corner-cell {
                    background: var(--bg-secondary);
                }

                .day-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    background: var(--bg-secondary);
                    height: 50px;
                }

                .data-cell {
                    height: 50px;
                    width: 50px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .data-cell.hovered {
                    outline: 3px solid #2563eb;
                    outline-offset: -3px;
                    z-index: 10;
                }

                .cell-tooltip {
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 0.75rem;
                    border-radius: 6px;
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 100;
                    margin-bottom: 0.5rem;
                }

                .cell-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 6px solid transparent;
                    border-top-color: rgba(0, 0, 0, 0.9);
                }

                .tooltip-day {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }

                .tooltip-time {
                    font-size: 0.875rem;
                    margin-bottom: 0.25rem;
                    opacity: 0.9;
                }

                .tooltip-count {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #60a5fa;
                }

                .empty-overlay {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 1.125rem;
                    pointer-events: none;
                }

                @media (max-width: 768px) {
                    .peak-hour-heatmap-page {
                        padding: 1rem;
                    }

                    .heatmap-container {
                        padding: 1rem;
                    }

                    .heatmap-grid {
                        grid-template-columns: 80px repeat(24, 40px);
                    }

                    .data-cell {
                        width: 40px;
                        height: 40px;
                    }

                    .header-cell {
                        font-size: 0.625rem;
                    }
                }
            `}</style>
        </div>
    );
}
