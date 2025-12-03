import React, { useState, useEffect, useRef } from 'react';
import axios from '../../utils/axios';
import { format } from 'date-fns';

// Get refresh interval from env or default to 45 seconds
const DEFAULT_REFRESH_INTERVAL = parseInt(import.meta.env.VITE_REFRESH_INTERVAL || '45000');
const MIN_INTERVAL = 15000; // 15 seconds
const MAX_INTERVAL = 120000; // 2 minutes

/**
 * LiveRoomAvailability Component
 * Real-time room availability dashboard with configurable auto-refresh
 * Refreshes every 45 seconds when tab is active (Page Visibility API)
 * Accessible to Instructor/Coordinator/Admin roles only
 */
export default function LiveRoomAvailability() {
    const [rooms, setRooms] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState(() => {
        const saved = localStorage.getItem('liveRoomRefreshInterval');
        return saved ? parseInt(saved) : DEFAULT_REFRESH_INTERVAL;
    });
    const intervalRef = useRef(null);
    const fetchingRef = useRef(false); // Concurrency guard

    useEffect(() => {
        fetchData();

        // Set up auto-refresh with Page Visibility API
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Stop refresh when tab is hidden
                clearInterval(intervalRef.current);
            } else {
                // Resume refresh when tab becomes visible
                clearInterval(intervalRef.current);
                fetchData();
                intervalRef.current = setInterval(fetchData, refreshInterval);
            }
        };

        // Initial interval setup
        intervalRef.current = setInterval(fetchData, refreshInterval);

        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            clearInterval(intervalRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshInterval]);

    const fetchData = async () => {
        // Concurrency guard: prevent overlapping fetches
        if (fetchingRef.current) {
            return;
        }

        fetchingRef.current = true;
        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Fetch all rooms
            const roomsResponse = await axios.get('/rooms', {
                params: { limit: 1000 }
            });

            // Fetch today's schedules
            const schedulesResponse = await axios.get('/schedules', {
                params: {
                    date: today,
                    limit: 1000
                }
            });

            setRooms(roomsResponse.data.data.rooms || []);
            setSchedules(schedulesResponse.data.data.schedules || []);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to fetch data:', error);
            if (window.showToast) {
                window.showToast('Failed to refresh room data', 'error');
            }
        } finally {
            setLoading(false);
            fetchingRef.current = false; // Always release lock
        }
    };

    const handleManualRefresh = () => {
        // Clear existing interval and fetch immediately
        clearInterval(intervalRef.current);
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshInterval);
    };

    const handleIntervalChange = (newInterval) => {
        const validInterval = Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, newInterval));
        setRefreshInterval(validInterval);
        localStorage.setItem('liveRoomRefreshInterval', validInterval.toString());

        // Restart interval with new timing
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(fetchData, validInterval);

        if (window.showToast) {
            window.showToast(`Refresh interval updated to ${validInterval / 1000}s`, 'success');
        }
    };

    const getRoomStatus = (roomId) => {
        const now = new Date();
        const currentTime = format(now, 'HH:mm:ss');

        // Find active or upcoming schedules for this room
        const roomSchedules = schedules
            .filter(s => s.room_id === roomId && s.status === 'confirmed')
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

        // Check if there's a current schedule
        const currentSchedule = roomSchedules.find(
            s => s.start_time <= currentTime && s.end_time > currentTime
        );

        if (currentSchedule) {
            return {
                status: 'occupied',
                label: 'Occupied',
                schedule: currentSchedule,
                nextSchedule: null
            };
        }

        // Check for upcoming schedule
        const nextSchedule = roomSchedules.find(s => s.start_time > currentTime);

        if (nextSchedule) {
            // Calculate time until next class
            const [nextHour, nextMin] = nextSchedule.start_time.split(':').map(Number);
            const [nowHour, nowMin] = currentTime.split(':').map(Number);
            const minutesUntil = (nextHour * 60 + nextMin) - (nowHour * 60 + nowMin);

            if (minutesUntil <= 30) {
                return {
                    status: 'soon',
                    label: 'Soon Occupied',
                    schedule: null,
                    nextSchedule,
                    minutesUntil
                };
            }
        }

        return {
            status: 'available',
            label: 'Available',
            schedule: null,
            nextSchedule,
            minutesUntil: null
        };
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'occupied': return 'status-occupied';
            case 'soon': return 'status-soon';
            case 'available': return 'status-available';
            default: return '';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'occupied':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                );
            case 'soon':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                );
            case 'available':
                return (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                );
            default:
                return null;
        }
    };

    return (
        <div className="live-room-availability-page">
            <div className="page-header">
                <div className="header-content">
                    <h1>Live Room Availability</h1>
                    <p>Real-time room status and upcoming schedules</p>
                </div>
                <div className="header-actions">
                    <div className="last-updated">
                        {lastUpdated && (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Last updated: {format(lastUpdated, 'HH:mm:ss')}
                            </>
                        )}
                    </div>
                    <button
                        className="refresh-btn"
                        onClick={handleManualRefresh}
                        disabled={loading}
                    >
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={loading ? 'spinning' : ''}
                        >
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="status-legend">
                <div className="legend-item">
                    <span className="legend-dot status-available"></span>
                    <span>Available</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot status-soon"></span>
                    <span>Soon Occupied (≤30 min)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot status-occupied"></span>
                    <span>Currently Occupied</span>
                </div>
            </div>

            {loading && rooms.length === 0 && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading room data...</p>
                </div>
            )}

            <div className="rooms-grid">
                {rooms.map(room => {
                    const statusInfo = getRoomStatus(room.id);
                    return (
                        <div key={room.id} className={`room-card ${getStatusClass(statusInfo.status)}`}>
                            <div className="room-header">
                                <div className="room-title">
                                    <h3>{room.code}</h3>
                                    <p className="room-name">{room.name}</p>
                                </div>
                                <div className="status-badge">
                                    {getStatusIcon(statusInfo.status)}
                                    <span>{statusInfo.label}</span>
                                </div>
                            </div>

                            <div className="room-details">
                                <div className="detail-row">
                                    <span className="detail-label">Type:</span>
                                    <span className="detail-value capitalize">{room.type}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Capacity:</span>
                                    <span className="detail-value">{room.capacity}</span>
                                </div>
                                {room.location && (
                                    <div className="detail-row">
                                        <span className="detail-label">Location:</span>
                                        <span className="detail-value">{room.location}</span>
                                    </div>
                                )}
                            </div>

                            {statusInfo.schedule && (
                                <div className="current-schedule">
                                    <div className="schedule-header">Current Class</div>
                                    <div className="schedule-info">
                                        <div>{statusInfo.schedule.course_name}</div>
                                        <div className="schedule-time">
                                            {statusInfo.schedule.start_time.slice(0, 5)} - {statusInfo.schedule.end_time.slice(0, 5)}
                                        </div>
                                        <div className="schedule-instructor">{statusInfo.schedule.instructor_name}</div>
                                    </div>
                                </div>
                            )}

                            {statusInfo.nextSchedule && (
                                <div className="next-schedule">
                                    <div className="schedule-header">
                                        Next Class
                                        {statusInfo.minutesUntil && ` (in ${statusInfo.minutesUntil} min)`}
                                    </div>
                                    <div className="schedule-info">
                                        <div>{statusInfo.nextSchedule.course_name}</div>
                                        <div className="schedule-time">
                                            {statusInfo.nextSchedule.start_time.slice(0, 5)} - {statusInfo.nextSchedule.end_time.slice(0, 5)}
                                        </div>
                                        <div className="schedule-instructor">{statusInfo.nextSchedule.instructor_name}</div>
                                    </div>
                                </div>
                            )}

                            {!statusInfo.schedule && !statusInfo.nextSchedule && (
                                <div className="no-schedule">
                                    <p>No scheduled classes today</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .live-room-availability-page {
                    padding: 2rem;
                    max-width: 1600px;
                    margin: 0 auto;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .header-content h1 {
                    font-size: 2rem;
                    margin-bottom: 0.5rem;
                }

                .header-content p {
                    color: var(--text-secondary);
                }

                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .last-updated {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .refresh-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.625rem 1rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .refresh-btn:hover:not(:disabled) {
                    background: var(--primary-dark);
                }

                .refresh-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .refresh-btn svg.spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .status-legend {
                    display: flex;
                    gap: 2rem;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                }

                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.875rem;
                }

                .legend-dot {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                }

                .loading-spinner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
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

                .rooms-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }

                .room-card {
                    background: white;
                    border-radius: 8px;
                    padding: 1.5rem;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-left: 4px solid;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .room-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }

                .room-card.status-available {
                    border-color: #16a34a;
                }

                .room-card.status-soon {
                    border-color: #ea580c;
                }

                .room-card.status-occupied {
                    border-color: #dc2626;
                }

                .room-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid var(--border-color);
                }

                .room-title h3 {
                    font-size: 1.25rem;
                    margin-bottom: 0.25rem;
                }

                .room-name {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .status-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .status-available .status-badge {
                    background: #dcfce7;
                    color: #15803d;
                }

                .status-soon .status-badge {
                    background: #fed7aa;
                    color: #c2410c;
                }

                .status-occupied .status-badge {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .room-details {
                    margin-bottom: 1rem;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    font-size: 0.875rem;
                }

                .detail-label {
                    color: var(--text-secondary);
                }

                .detail-value {
                    font-weight: 500;
                }

                .capitalize {
                    text-transform: capitalize;
                }

                .current-schedule, .next-schedule {
                    margin-top: 1rem;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                }

                .schedule-header {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .schedule-info {
                    font-size: 0.875rem;
                }

                .schedule-info > div {
                    margin-bottom: 0.25rem;
                }

                .schedule-time {
                    font-weight: 600;
                    color: var(--primary-color);
                }

                .schedule-instructor {
                    color: var(--text-secondary);
                    font-size: 0.8125rem;
                }

                .no-schedule {
                    margin-top: 1rem;
                    padding: 1rem;
                    text-align: center;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    font-style: italic;
                }

                @media (max-width: 768px) {
                    .live-room-availability-page {
                        padding: 1rem;
                    }

                    .page-header {
                        flex-direction: column;
                    }

                    .rooms-grid {
                        grid-template-columns: 1fr;
                    }

                    .status-legend {
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                }
            `}</style>
        </div>
    );
}
