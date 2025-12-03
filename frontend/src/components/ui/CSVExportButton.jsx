import React, { useState } from 'react';
import Papa from 'papaparse';

/**
 * CSVExportButton Component
 * Exports data to CSV with UTF-8 encoding and downloads to browser
 * - Limits exports to 10,000 rows for performance
 * - Shows warning modal if data exceeds limit
 */
const MAX_EXPORT_ROWS = 10000;

export default function CSVExportButton({ data, filename, label = 'Export CSV', className = '' }) {
    const [showWarning, setShowWarning] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        if (!data || data.length === 0) {
            if (window.showToast) {
                window.showToast('No data available to export', 'warning');
            }
            return;
        }

        // Check if data exceeds safe export limit
        if (data.length > MAX_EXPORT_ROWS) {
            setShowWarning(true);
            return;
        }

        performExport(data);
    };

    const handleConfirmExport = () => {
        const limitedData = data.slice(0, MAX_EXPORT_ROWS);
        performExport(limitedData);
        setShowWarning(false);
    };

    const performExport = (exportData) => {
        setIsExporting(true);

        try {
            // Convert to CSV with headers
            const csv = Papa.unparse(exportData, {
                quotes: true,
                header: true
            });

            // Add UTF-8 BOM for Excel compatibility
            const csvWithBOM = '\uFEFF' + csv;

            // Create blob and download
            const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (window.showToast) {
                window.showToast(`Exported ${exportData.length} rows successfully`, 'success');
            }
        } catch (error) {
            console.error('CSV export error:', error);
            if (window.showToast) {
                window.showToast('Failed to export CSV', 'error');
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                className={`csv-export-btn ${className}`}
                onClick={handleExport}
                disabled={!data || data.length === 0 || isExporting}
            >
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path d="M2 11v3h12v-3M8 2v9m0 0l-3-3m3 3l3-3" />
                </svg>
                {isExporting ? 'Exporting...' : (label || 'Export CSV')}
            </button>

            {/* Warning Modal */}
            {showWarning && (
                <div className="csv-modal-overlay" onClick={() => setShowWarning(false)}>
                    <div className="csv-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="csv-modal-header">
                            <h3>Large Export Warning</h3>
                            <button className="close-btn" onClick={() => setShowWarning(false)}>×</button>
                        </div>
                        <div className="csv-modal-body">
                            <p>
                                <strong>Dataset too large:</strong> You're trying to export {data.length.toLocaleString()} rows.
                            </p>
                            <p>
                                For performance reasons, CSV exports are limited to {MAX_EXPORT_ROWS.toLocaleString()} rows.
                            </p>
                            <div className="csv-warning-options">
                                <p><strong>Options:</strong></p>
                                <ul>
                                    <li>Export the first {MAX_EXPORT_ROWS.toLocaleString()} rows</li>
                                    <li>Apply date/course filters to reduce the dataset</li>
                                    <li>Contact your administrator for full exports</li>
                                </ul>
                            </div>
                        </div>
                        <div className="csv-modal-footer">
                            <button className="btn-cancel" onClick={() => setShowWarning(false)}>
                                Cancel
                            </button>
                            <button className="btn-confirm" onClick={handleConfirmExport}>
                                Export First {MAX_EXPORT_ROWS.toLocaleString()} Rows
                            </button>
                        </div>
                    </div>
                </div >
            )
            }

            <style jsx>{`
                .csv-export-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background: #16a34a;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .csv-export-btn:hover:not(:disabled) {
                    background: #15803d;
                }

                .csv-export-btn:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                    opacity: 0.6;
                }

                .csv-export-btn svg {
                    flex-shrink: 0;
                }

                .csv-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .csv-modal {
                    background: white;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .csv-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }

                .csv-modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #dc2626;
                }

                .close-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 0;
                    width: 2rem;
                    height: 2rem;
                    line-height: 1;
                }

                .close-btn:hover {
                    color: #111827;
                }

                .csv-modal-body {
                    padding: 1.5rem;
                }

                .csv-modal-body p {
                    margin: 0 0 1rem;
                }

                .csv-warning-options {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 1rem;
                    border-radius: 4px;
                    margin-top: 1rem;
                }

                .csv-warning-options p {
                    margin: 0 0 0.5rem;
                }

                .csv-warning-options ul {
                    margin: 0.5rem 0 0 1.25rem;
                    padding: 0;
                }

                .csv-warning-options li {
                    margin-bottom: 0.25rem;
                }

                .csv-modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid #e5e7eb;
                }

                .btn-cancel, .btn-confirm {
                    padding: 0.625rem 1rem;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-cancel {
                    background: #e5e7eb;
                    color: #374151;
                }

                .btn-cancel:hover {
                    background: #d1d5db;
                }

                .btn-confirm {
                    background: #16a34a;
                    color: white;
                }

                .btn-confirm:hover {
                    background: #15803d;
                }
            `}</style>
        </>
    );
}
