import React, { useState, useEffect } from 'react';
import axios from '../../utils/axios';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { format } from 'date-fns';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * UtilizationCharts Component
 * Visualize room utilization with line, bar, and pie charts using Recharts
 * Accessible to Instructor/Coordinator/Admin roles only
 */
export default function UtilizationCharts() {
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [dateRange, setDateRange] = useState({
        startDate: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd')
    });
    const [utilizationData, setUtilizationData] = useState([]);
    const [loading, setLoading] = useState(false);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        fetchUtilization();
    }, [dateRange, selectedRoom]);

    const fetchRooms = async () => {
        try {
            const response = await axios.get('/rooms', {
                params: { limit: 1000 }
            });
            setRooms(response.data.data.rooms || []);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
            if (window.showToast) {
                window.showToast('Failed to load rooms', 'error');
            }
        }
    };

    const fetchUtilization = async () => {
        setLoading(true);
        try {
            const params = {
                start_date: dateRange.startDate,
                end_date: dateRange.endDate
            };
            if (selectedRoom) {
                params.room_id = selectedRoom;
            }

            const response = await axios.get('/analytics/rooms', { params });
            setUtilizationData(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch utilization data:', error);
            if (window.showToast) {
                window.showToast('Failed to load utilization data', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    // Prepare data for charts
    const barChartData = utilizationData.map(room => ({
        name: room.code,
        utilization: parseFloat(room.utilization_rate) || 0,
        hours: parseFloat(room.total_hours) || 0
    }));

    const pieChartData = utilizationData
        .reduce((acc, room) => {
            const existing = acc.find(item => item.type === room.type);
            if (existing) {
                existing.value += parseFloat(room.total_hours) || 0;
            } else {
                acc.push({
                    type: room.type,
                    value: parseFloat(room.total_hours) || 0
                });
            }
            return acc;
        }, [])
        .map(item => ({
            name: item.type.charAt(0).toUpperCase() + item.type.slice(1),
            value: Math.round(item.value * 10) / 10
        }));

    // For line chart, we'll show trend (simplified - top 5 rooms)
    const lineChartData = utilizationData
        .slice(0, 5)
        .map(room => ({
            name: room.code,
            utilization: parseFloat(room.utilization_rate) || 0
        }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip">
                    <p className="label">{payload[0].name || payload[0].payload.name}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                            {entry.name === 'utilization' ? '%' : entry.name === 'hours' ? ' hrs' : ''}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="utilization-charts-page">
            <div className="page-header">
                <h1>Room Utilization Analytics</h1>
                <p>Visualize room usage patterns with interactive charts</p>
            </div>

            <div className="filters-section">
                <div className="form-group">
                    <label htmlFor="room-select">Filter by Room (Optional)</label>
                    <select
                        id="room-select"
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                        className="form-control"
                    >
                        <option value="">All Rooms</option>
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>
                                {room.code} - {room.name}
                            </option>
                        ))}
                    </select>
                </div>

                <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onChange={setDateRange}
                />
            </div>

            {loading && (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            )}

            {!loading && utilizationData.length > 0 && (
                <div className="charts-grid">
                    {/* Bar Chart - Comparative Utilization */}
                    <div className="chart-card">
                        <h3>Room Utilization Comparison</h3>
                        <p className="chart-description">Utilization rate by room</p>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Line Chart - Utilization Trend (Top 5) */}
                    <div className="chart-card">
                        <h3>Top 5 Most Utilized Rooms</h3>
                        <p className="chart-description">Utilization rate comparison</p>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={lineChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="utilization"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Utilization %"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pie Chart - Distribution by Type */}
                    <div className="chart-card">
                        <h3>Total Hours by Room Type</h3>
                        <p className="chart-description">Distribution of usage across room types</p>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Data Table */}
                    <div className="chart-card full-width">
                        <h3>Detailed Statistics</h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Room Code</th>
                                        <th>Room Name</th>
                                        <th>Type</th>
                                        <th>Capacity</th>
                                        <th>Total Schedules</th>
                                        <th>Total Hours</th>
                                        <th>Utilization %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {utilizationData.map(room => (
                                        <tr key={room.id}>
                                            <td>{room.code}</td>
                                            <td>{room.name}</td>
                                            <td className="capitalize">{room.type}</td>
                                            <td>{room.capacity}</td>
                                            <td>{room.total_schedules}</td>
                                            <td>{parseFloat(room.total_hours || 0).toFixed(2)}</td>
                                            <td>
                                                <span className={`utilization-badge ${getUtilizationClass(room.utilization_rate)}`}>
                                                    {parseFloat(room.utilization_rate || 0).toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {!loading && utilizationData.length === 0 && (
                <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="9" />
                        <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    <p>No utilization data available for the selected date range</p>
                </div>
            )}

            <style jsx>{`
                .utilization-charts-page {
                    padding: 2rem;
                    max-width: 1400px;
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
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .form-group label {
                    font-weight: 500;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }

                .form-control {
                    padding: 0.625rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    font-size: 0.875rem;
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

                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 2rem;
                }

                .chart-card {
                    background: white;
                    padding: 1.5rem;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .chart-card.full-width {
                    grid-column: 1 / -1;
                }

                .chart-card h3 {
                    margin-bottom: 0.5rem;
                    font-size: 1.25rem;
                }

                .chart-description {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }

                .custom-tooltip {
                    background: white;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: 6px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                }

                .custom-tooltip .label {
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }

                .custom-tooltip p {
                    margin: 0.25rem 0;
                    font-size: 0.875rem;
                }

                .table-container {
                    overflow-x: auto;
                }

                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                }

                .data-table thead {
                    background: var(--bg-secondary);
                }

                .data-table th {
                    padding: 0.75rem;
                    text-align: left;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border-bottom: 2px solid var(--border-color);
                }

                .data-table td {
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--border-color);
                    font-size: 0.875rem;
                }

                .data-table tbody tr:hover {
                    background: var(--bg-secondary);
                }

                .capitalize {
                    text-transform: capitalize;
                }

                .utilization-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 12px;
                    font-weight: 500;
                    display: inline-block;
                }

                .utilization-high {
                    background: #dcfce7;
                    color: #15803d;
                }

                .utilization-medium {
                    background: #fed7aa;
                    color: #c2410c;
                }

                .utilization-low {
                    background: #fee2e2;
                    color: #b91c1c;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem;
                    color: var(--text-secondary);
                    gap: 1rem;
                }

                .empty-state svg {
                    opacity: 0.5;
                }

                @media (max-width: 768px) {
                    .utilization-charts-page {
                        padding: 1rem;
                    }

                    .charts-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

function getUtilizationClass(rate) {
    const utilizationRate = parseFloat(rate) || 0;
    if (utilizationRate >= 70) return 'utilization-high';
    if (utilizationRate >= 40) return 'utilization-medium';
    return 'utilization-low';
}
