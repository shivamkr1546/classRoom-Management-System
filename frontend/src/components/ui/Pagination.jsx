import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    pageSize = 10,
    totalItems = 0,
    onPageSizeChange = null,
}) => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-secondary-200">
            {/* Items info */}
            <div className="flex items-center gap-4">
                <p className="text-sm text-secondary-700">
                    Showing <span className="font-medium">{startItem}</span> to{' '}
                    <span className="font-medium">{endItem}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> items
                </p>

                {/* Page size selector */}
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="border border-secondary-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value={10}>10 per page</option>
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                    </select>
                )}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    icon={ChevronLeft}
                >
                    Previous
                </Button>

                <div className="flex gap-1">
                    {getPageNumbers().map((page, idx) => (
                        <button
                            key={idx}
                            onClick={() => typeof page === 'number' && onPageChange(page)}
                            disabled={page === '...'}
                            className={`
                px-3 py-1 text-sm rounded-md transition-colors
                ${page === currentPage
                                    ? 'bg-primary-600 text-white'
                                    : page === '...'
                                        ? 'cursor-default'
                                        : 'hover:bg-secondary-100 text-secondary-700'
                                }
              `}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    icon={ChevronRight}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

export default Pagination;
