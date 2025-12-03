import { ChevronDown } from 'lucide-react';

const FilterDropdown = ({ label, options, value, onChange }) => {
    return (
        <div className="relative inline-block text-left">
            <div className="flex items-center space-x-2">
                {label && (
                    <span className="text-sm font-medium text-secondary-700">{label}:</span>
                )}
                <div className="relative">
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="appearance-none block w-full pl-3 pr-10 py-2 text-base border border-secondary-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg cursor-pointer bg-white"
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-secondary-500">
                        <ChevronDown className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterDropdown;
