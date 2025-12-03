import Skeleton from './Skeleton';

const Table = ({
    columns = [],
    data = [],
    loading = false,
    onRowClick = null,
    actions = null,
    className = ''
}) => {
    if (loading) {
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                        <tr>
                            {columns.map((col, idx) => (
                                <th key={idx} className="px-6 py-3 text-left">
                                    <Skeleton className="h-4 w-24" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                        {[...Array(5)].map((_, idx) => (
                            <tr key={idx}>
                                {columns.map((_, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4">
                                        <Skeleton className="h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-secondary-200">
                <p className="text-secondary-500">No data found</p>
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="min-w-full divide-y divide-secondary-200">
                <thead className="bg-secondary-50">
                    <tr>
                        {columns.map((column, idx) => (
                            <th
                                key={idx}
                                className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider"
                            >
                                {column.label}
                            </th>
                        ))}
                        {actions && (
                            <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                Actions
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                    {data.map((row, rowIdx) => (
                        <tr
                            key={rowIdx}
                            onClick={() => onRowClick && onRowClick(row)}
                            className={onRowClick ? 'hover:bg-secondary-50 cursor-pointer transition-colors' : ''}
                        >
                            {columns.map((column, colIdx) => (
                                <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900">
                                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                                </td>
                            ))}
                            {actions && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {actions(row)}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Table;
