import React, { useMemo } from 'react';
import { TimetableData, TimetablePeriod } from '../../types';

interface TimetableImageProps {
  timetableData: TimetableData;
  classId: string;
}

const TimetableImage: React.FC<TimetableImageProps> = ({ timetableData, classId }) => {
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
        daySchedule?.forEach(period => {
            const slot = `${period.startTime} - ${period.endTime}`;
            schedule[day][slot] = period;
        });
    });
    return schedule;
  }, [timetableData, days]);

  return (
    <div className="p-4 bg-slate-800 shadow-lg border border-slate-700 text-gray-200 rounded-lg overflow-x-auto">
      <h3 className="text-center text-xl font-bold text-blue-300 mb-4">{classId.toUpperCase()} TIMETABLE</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-900">
            <th className="border border-slate-600 p-2 text-blue-300">Day</th>
            {timeSlots.map(slot => (
              <th key={slot} className="border border-slate-600 p-2 text-blue-300">{slot}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td className="border border-slate-600 p-2 font-bold text-blue-300 text-center">{day}</td>
              {timeSlots.map(slot => {
                const period = scheduleByDay[day]?.[slot];
                const subject = period?.subject?.toLowerCase();
                const isBreak = subject?.includes('break') || subject?.includes('lunch');
                return (
                  <td key={`${day}-${slot}`} className={`border border-slate-600 p-2 text-center text-sm ${isBreak ? 'bg-slate-700' : ''}`}>
                    {period ? (
                      <div>
                        <p className="font-bold">{period.subject}</p>
                        {period.teacher && period.teacher !== 'N/A' && <p className="text-xs text-gray-400">{period.teacher}</p>}
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableImage;
