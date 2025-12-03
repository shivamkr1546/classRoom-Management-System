import React from 'react';

/**
 * DateRangePicker Component
 * Reusable date range picker with quick select options
 */
export default function DateRangePicker({ startDate, endDate, onChange }) {
    const handleStartChange = (e) => {
        onChange({ startDate: e.target.value, endDate });
    };

    const handleEndChange = (e) => {
        onChange({ startDate, endDate: e.target.value });
    };

    const handleQuickSelect = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        onChange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        });
    };

    return (
        <div className="date-range-picker">
            <div className="date-inputs">
                <div className="form-group">
                    <label htmlFor="start-date">Start Date</label>
                    <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={handleStartChange}
                        max={endDate || undefined}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="end-date">End Date</label>
                    <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={handleEndChange}
                        min={startDate || undefined}
                    />
                </div>
            </div>
            <div className="quick-select">
                <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleQuickSelect(7)}
                >
                    Last 7 Days
                </button>
                <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => handleQuickSelect(30)}
                >
                    Last 30 Days
                </button>
                <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                        const now = new Date();
                        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                        onChange({
                            startDate: firstDay.toISOString().split('T')[0],
                            endDate: now.toISOString().split('T')[0]
                        });
                    }}
                >
                    This Month
                </button>
            </div>

            <style jsx>{`
                .date-range-picker {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                }

                .date-inputs {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                    min-width: 200px;
                }

                .form-group label {
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: var(--text-secondary);
                }

                .form-group input {
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-size: 0.875rem;
                }

                .quick-select {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .btn-sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.875rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .btn-sm:hover {
                    background: var(--primary-dark);
                }
            `}</style>
        </div>
    );
}
