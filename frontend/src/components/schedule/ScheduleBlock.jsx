import PropTypes from 'prop-types';
import { getCourseColor, formatTimeRange } from '../../utils/scheduleUtils';

/**
 * ScheduleBlock Component
 * Interactive colored block representing a scheduled class
 */
const ScheduleBlock = ({ schedule, onClick, style, overlapping = false }) => {
    const color = getCourseColor(schedule.course_id);
    const isCancelled = schedule.status === 'cancelled';

    return (
        <div
            className={`
                absolute rounded-md shadow-sm border-2 border-opacity-50 cursor-pointer
                transition-all duration-200 overflow-hidden
                ${color.bg} ${color.text} ${color.hover}
                ${isCancelled ? 'opacity-50 line-through' : ''}
                ${overlapping ? 'border-yellow-400' : 'border-white'}
            `}
            style={style}
            onClick={() => onClick(schedule)}
            title={`${schedule.course_code} - ${schedule.course_name}\n${schedule.instructor_name}\n${schedule.room_code}`}
        >
            <div className="p-2 h-full flex flex-col justify-between">
                {/* Course Code - Always visible */}
                <div className="font-bold text-sm truncate">
                    {schedule.course_code}
                </div>

                {/* Additional info - visible for taller blocks */}
                <div className="text-xs space-y-0.5 flex-1 min-h-0">
                    <div className="truncate">{schedule.instructor_name}</div>
                    <div className="truncate">{schedule.room_code}</div>
                    <div className="truncate opacity-90">
                        {formatTimeRange(schedule.start_time, schedule.end_time)}
                    </div>
                </div>

                {/* Status indicator for cancelled */}
                {isCancelled && (
                    <div className="text-xs font-semibold bg-black bg-opacity-20 px-1 rounded">
                        CANCELLED
                    </div>
                )}
            </div>
        </div>
    );
};

ScheduleBlock.propTypes = {
    schedule: PropTypes.shape({
        id: PropTypes.number.isRequired,
        course_id: PropTypes.number.isRequired,
        course_code: PropTypes.string.isRequired,
        course_name: PropTypes.string.isRequired,
        instructor_name: PropTypes.string.isRequired,
        room_code: PropTypes.string.isRequired,
        start_time: PropTypes.string.isRequired,
        end_time: PropTypes.string.isRequired,
        status: PropTypes.string,
    }).isRequired,
    onClick: PropTypes.func.isRequired,
    style: PropTypes.object.isRequired,
    overlapping: PropTypes.bool,
};

export default ScheduleBlock;
