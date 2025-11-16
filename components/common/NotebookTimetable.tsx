import React, { useMemo } from 'react';
import { TimetableData, TimetablePeriod } from '../../types';

interface NotebookTimetableProps {
  timetableData: TimetableData;
  classId: string;
}

const NotebookTimetable: React.FC<NotebookTimetableProps> = ({ timetableData, classId }) => {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    const timeSlots = useMemo(() => {
        const allSlots = new Set<string>();
        Object.values(timetableData).flat().forEach(period => {
            if (period) {
                const typedPeriod = period as TimetablePeriod;
                allSlots.add(`${typedPeriod.startTime} - ${typedPeriod.endTime}`);
            }
        });

        return Array.from(allSlots).sort((a, b) => {
          const timeA = parseInt(a.split(' ')[0].replace(':', ''), 10);
          const timeB = parseInt(b.split(' ')[0].replace(':', ''), 10);
          return timeA - timeB;
        });
    }, [timetableData]);

    const scheduleByDay = useMemo(() => {
        const schedule: { [day: string]: { [timeSlot: string]: TimetablePeriod } } = {};
        days.forEach(day => {
            schedule[day] = {};
            const daySchedule = timetableData[day as keyof TimetableData];
            if (daySchedule) {
                daySchedule.forEach(period => {
                    const slot = `${period.startTime} - ${period.endTime}`;
                    schedule[day][slot] = period;
                });
            }
        });
        return schedule;
    }, [timetableData, days]);

    const fontStyle = { fontFamily: "'Kalam', cursive" };

    return (
        <div className="p-4 bg-[#FFFDF5] rounded-lg shadow-lg border-2 border-slate-300 relative">
            {/* Red vertical margin line */}
            <div className="absolute top-0 left-10 bottom-0 w-[2px] bg-[#fca5a5]"></div>
            
            <div className="overflow-x-auto pl-12"> {/* Padding left to not overlap with red line */}
                <table className="w-full border-collapse min-w-[800px]" style={fontStyle}>
                    <thead>
                        <tr>
                            <th className="p-2 border-b-2 border-r-2 border-[#93c5fd] text-left text-sm font-bold text-slate-700">DAY</th>
                            {timeSlots.map(slot => (
                                <th key={slot} className="p-2 border-b-2 border-r-2 border-[#93c5fd] text-center text-sm font-bold text-slate-700">{slot.replace('-', '–')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} className="border-b border-dotted border-[#dbeafe]"> {/* light blue dotted lines for rows */}
                                <td className="p-2 border-r-2 border-[#93c5fd] text-left text-xs font-bold text-slate-600 align-middle">{day.toUpperCase()}</td>
                                {timeSlots.map(slot => {
                                    const period = scheduleByDay[day]?.[slot];
                                    const subject = period?.subject?.toLowerCase();
                                    const isCellBreakOrLunch = subject?.includes('break') || subject?.includes('lunch');
                                    
                                    return (
                                    <td key={`${day}-${slot}`} className={`p-2 border-r border-dotted border-slate-300 text-center align-middle h-20 ${isCellBreakOrLunch ? 'bg-yellow-100' : ''}`}>
                                        {period ? (
                                        <div>
                                            <p className="font-bold text-slate-800 text-base">{period.subject}</p>
                                            {period.teacher && period.teacher !== 'N/A' && !isCellBreakOrLunch && <p className="text-xs text-slate-500">{period.teacher}</p>}
                                        </div>
                                        ) : null}
                                    </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="text-right text-xs text-slate-500 mt-2 pr-2" style={fontStyle}>
                {classId} Timetable
            </div>
        </div>
    );
};

export default NotebookTimetable;
