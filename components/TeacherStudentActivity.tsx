
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { UserActivityLog } from '../types';
import Card from './common/Card';
import Spinner from './common/Spinner';

interface TeacherStudentActivityProps {
    teacherClasses: string[];
}

const TeacherStudentActivity: React.FC<TeacherStudentActivityProps> = ({ teacherClasses }) => {
    const [logs, setLogs] = useState<UserActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (teacherClasses.length === 0) {
            setLogs([]);
            setLoading(false);
            return;
        }

        // We fetch recent logs globally and filter client-side for the teacher's classes.
        // This avoids needing a complex composite index for every possible class combination.
        const unsubscribe = db.collection('userActivity')
            .orderBy('timestamp', 'desc')
            .limit(200) 
            .onSnapshot(snapshot => {
                const allLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivityLog));
                
                // Filter: Must be a student AND in one of the teacher's classes
                const filteredLogs = allLogs.filter(log => 
                    log.userRole === 'student' && 
                    log.userClass && 
                    teacherClasses.includes(log.userClass)
                );
                
                setLogs(filteredLogs);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching student activity:", err);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [teacherClasses]);

    if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Student Activity Log</h3>
                <p className="text-sm text-gray-400">Showing recent activity for students in: {teacherClasses.join(', ')}</p>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-200 uppercase bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Time</th>
                            <th className="px-6 py-3">Student</th>
                            <th className="px-6 py-3">Class</th>
                            <th className="px-6 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id} className="bg-slate-800 border-b border-slate-700 hover:bg-slate-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {log.timestamp?.toDate().toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-white">
                                    {log.userName}
                                </td>
                                <td className="px-6 py-4">
                                    {log.userClass}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${log.action === 'login' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {log.action.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                             <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    No recent activity found for your students.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default TeacherStudentActivity;
