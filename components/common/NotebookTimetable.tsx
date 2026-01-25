import React, { useMemo } from 'react';
import { TimetableData, TimetablePeriod } from '../../types';
import { useAuthentication } from '../../hooks/useAuth';

interface NotebookTimetableProps {
  timetableData: TimetableData;
  classId: string;
}

const NotebookTimetable: React.FC<NotebookTimetableProps> = ({ timetableData, classId }) => {
    const { userProfile } = useAuthentication();
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

    const isMySubject = (teacherName?: string) => {
        if (!teacherName || !userProfile || userProfile.role !== 'teacher') return false;
        const myName = userProfile.name.toLowerCase();
        const tName = teacherName.toLowerCase();
        return tName.includes(myName) || myName.includes(tName);
    };

    const fontStyle = { fontFamily: "'Kalam', cursive" };

    return (
        <div className="p-10 bg-[#FFFDF5] rounded-[3rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.3)] border-2 border-slate-300 relative overflow-hidden group">
            {/* Realistic Notebook Accents */}
            <div className="absolute top-0 left-16 bottom-0 w-[2px] bg-rose-300/40 z-10"></div>
            <div className="absolute top-0 left-[68px] bottom-0 w-[1px] bg-rose-300/20 z-10"></div>
            <div className="absolute top-0 right-10 bottom-0 w-4 bg-gradient-to-l from-slate-200/50 to-transparent pointer-events-none"></div>
            
            <div className="overflow-x-auto pl-16 relative z-0 custom-scrollbar pb-6">
                <div className="mb-10 flex justify-between items-end border-b-2 border-blue-200 pb-4">
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase" style={fontStyle}>{classId} Master Schedule</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest pb-1" style={fontStyle}>Active Term Protocol</p>
                </div>

                <table className="w-full border-collapse min-w-[1000px]" style={fontStyle}>
                    <thead>
                        <tr>
                            <th className="p-4 border-b-4 border-r-2 border-blue-200 text-left text-lg font-black text-blue-800 uppercase tracking-widest">DAY</th>
                            {timeSlots.map(slot => (
                                <th key={slot} className="p-4 border-b-4 border-r-2 border-blue-200 text-center text-sm font-black text-slate-700">{slot.replace('-', '–')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} className="border-b border-dotted border-blue-100 group/row hover:bg-blue-50/30 transition-colors">
                                <td className="p-6 border-r-2 border-blue-200 text-left text-sm font-black text-blue-700 align-middle uppercase tracking-widest">{day}</td>
                                {timeSlots.map(slot => {
                                    const period = scheduleByDay[day]?.[slot];
                                    if (!period) return <td key={`${day}-${slot}`} className="p-4 border-r border-dotted border-slate-200 h-28"></td>;
                                    
                                    const subject = period.subject.toLowerCase();
                                    const isBreak = subject.includes('break') || subject.includes('lunch');
                                    const highlight = isMySubject(period.teacher);
                                    
                                    return (
                                        <td key={`${day}-${slot}`} className={`p-4 border-r border-dotted border-slate-200 text-center align-middle h-28 transition-all ${
                                            isBreak ? 'bg-amber-50/50' : highlight ? 'bg-blue-100/50 ring-2 ring-inset ring-blue-400/20' : ''
                                        }`}>
                                            {isBreak ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-2xl opacity-40">☕</span>
                                                    <p className="font-bold text-amber-800 text-xs uppercase tracking-widest">{period.subject}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5 transform group-hover/row:scale-105 transition-transform">
                                                    <p className={`font-black text-xl leading-none ${highlight ? 'text-blue-700' : 'text-slate-800'}`}>{period.subject}</p>
                                                    {period.teacher && (
                                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-blue-500' : 'text-slate-400'}`}>
                                                            {highlight ? '★ YOU' : period.teacher}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-10 flex justify-between items-center border-t-2 border-slate-100 pt-6 px-10" style={fontStyle}>
                 <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-200 rounded-sm"></div> Personal Assignment</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-50 rounded-sm border border-amber-200"></div> Interval / Break</div>
                 </div>
                 <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic opacity-50">Edutec Secure Registry &bull; Verified Copy</p>
            </div>
        </div>
    );
};

export default NotebookTimetable;