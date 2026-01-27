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

    const getSubjectEmoji = (subject: string) => {
        const s = subject.toLowerCase();
        if (s.includes('math')) return '📐';
        if (s.includes('science')) return '🧪';
        if (s.includes('english') || s.includes('literacy')) return '📖';
        if (s.includes('history')) return '📜';
        if (s.includes('computing') || s.includes('ict')) return '💻';
        if (s.includes('art')) return '🎨';
        if (s.includes('french')) return '🇫🇷';
        if (s.includes('social')) return '🌍';
        if (s.includes('religious') || s.includes('rme')) return '🙏';
        if (s.includes('physical') || s.includes('pe')) return '⚽';
        return '📑';
    };

    const fontStyle = { fontFamily: "'Kalam', cursive" };

    return (
        <div className="p-8 sm:p-16 bg-[#FFFDF5] rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border-2 border-slate-300 relative overflow-hidden group">
            {/* Immersive Notebook Accents */}
            <div className="absolute top-0 left-[80px] bottom-0 w-[1px] bg-rose-400/30 z-10"></div>
            <div className="absolute top-0 left-[84px] bottom-0 w-[1px] bg-rose-400/20 z-10"></div>
            
            {/* Binding Holes Decor */}
            <div className="absolute left-6 top-0 bottom-0 flex flex-col justify-around py-10 opacity-20 pointer-events-none">
                {Array.from({length: 12}).map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-700 shadow-inner"></div>
                ))}
            </div>

            <div className="absolute top-0 right-10 bottom-0 w-8 bg-gradient-to-l from-slate-200/40 to-transparent pointer-events-none"></div>
            
            <div className="overflow-x-auto pl-24 relative z-0 custom-scrollbar pb-10">
                <div className="mb-12 flex flex-col sm:row justify-between items-start sm:items-end border-b-2 border-blue-200 pb-6 gap-4">
                    <div>
                        <h3 className="text-5xl font-black text-slate-800 tracking-tighter uppercase leading-none" style={fontStyle}>
                            {classId} <span className="text-blue-600">Official</span> Schedule
                        </h3>
                        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] mt-3" style={fontStyle}>
                            Active Term Registry // Authorized Access Only
                        </p>
                    </div>
                    <div className="hidden sm:flex gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center text-xl shadow-inner">📄</div>
                         <div className="w-10 h-10 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center text-xl shadow-inner">🖋️</div>
                    </div>
                </div>

                <table className="w-full border-collapse min-w-[1200px]" style={fontStyle}>
                    <thead>
                        <tr>
                            <th className="p-6 border-b-4 border-r-2 border-blue-200 text-left text-xl font-black text-blue-900 uppercase tracking-widest bg-blue-50/20">DAY</th>
                            {timeSlots.map(slot => (
                                <th key={slot} className="p-6 border-b-4 border-r-2 border-blue-200 text-center text-sm font-black text-slate-700 uppercase tracking-tighter">{slot.replace('-', '–')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(day => (
                            <tr key={day} className="border-b border-dotted border-blue-200 group/row hover:bg-blue-50/40 transition-colors duration-500">
                                <td className="p-8 border-r-2 border-blue-200 text-left text-base font-black text-blue-800 align-middle uppercase tracking-widest bg-blue-50/10">{day}</td>
                                {timeSlots.map(slot => {
                                    const period = scheduleByDay[day]?.[slot];
                                    if (!period) return <td key={`${day}-${slot}`} className="p-4 border-r border-dotted border-slate-200 h-32"></td>;
                                    
                                    const subject = period.subject.toLowerCase();
                                    const isBreak = subject.includes('break') || subject.includes('lunch');
                                    const highlight = isMySubject(period.teacher);
                                    
                                    return (
                                        <td key={`${day}-${slot}`} className={`p-4 border-r border-dotted border-slate-200 text-center align-middle h-32 transition-all relative group/cell ${
                                            isBreak ? 'bg-amber-50/40' : highlight ? 'bg-blue-100/60 ring-2 ring-inset ring-blue-500/20' : ''
                                        }`}>
                                            {isBreak ? (
                                                <div className="flex flex-col items-center gap-2 transform group-hover/cell:scale-110 transition-transform">
                                                    <span className="text-3xl opacity-30 group-hover:opacity-100 transition-opacity">{subject.includes('lunch') ? '🍱' : '☕'}</span>
                                                    <p className="font-bold text-amber-800 text-xs uppercase tracking-[0.2em]">{period.subject}</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 transform group-hover/row:scale-105 transition-all duration-500">
                                                    <div className="text-2xl mb-1 filter drop-shadow-sm">{getSubjectEmoji(period.subject)}</div>
                                                    <p className={`font-black text-2xl leading-none tracking-tight ${highlight ? 'text-blue-800' : 'text-slate-800'}`}>{period.subject}</p>
                                                    {period.teacher && (
                                                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] pt-1 ${highlight ? 'text-blue-600 underline decoration-2' : 'text-slate-500'}`}>
                                                            {highlight ? '★ COMMAND' : period.teacher}
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
            
            <div className="mt-12 flex flex-col sm:flex-row justify-between items-center border-t-2 border-slate-200 pt-10 px-8 opacity-70" style={fontStyle}>
                 <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 sm:mb-0">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-blue-200/80 rounded-md border border-blue-300"></div> Authorized Link</div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-amber-50 rounded-md border border-amber-300"></div> System Recess</div>
                 </div>
                 <div className="text-right">
                    <p className="text-slate-600 text-lg font-black uppercase tracking-tighter">Edutec Secure Registry</p>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mt-1">Verified Digital Artifact // {new Date().getFullYear()}</p>
                 </div>
            </div>
        </div>
    );
};

export default NotebookTimetable;
