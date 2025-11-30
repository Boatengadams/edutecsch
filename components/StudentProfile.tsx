
import React, { useMemo, useState, useEffect } from 'react';
import { UserProfile, Assignment, Submission } from '../types';
import Card from './common/Card';
import LineChart from './common/charts/LineChart';
import PieChart from './common/charts/PieChart';
import Button from './common/Button';
import ChangePasswordModal from './common/ChangePasswordModal';

const PortfolioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const gradeToNumeric = (grade?: string): number | null => {
    if (!grade) return null;
    const numericGrade = parseFloat(grade);
    if (!isNaN(numericGrade)) return numericGrade;

    const upperGrade = grade.toUpperCase();
    if (upperGrade.startsWith('A')) return 95;
    if (upperGrade.startsWith('B')) return 85;
    if (upperGrade.startsWith('C')) return 75;
    if (upperGrade.startsWith('D')) return 65;
    if (upperGrade.startsWith('F')) return 50;
    return null;
};


const StudentProfile: React.FC<{ userProfile: UserProfile; assignments: Assignment[]; submissions: Submission[] }> = ({ userProfile, assignments, submissions }) => {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [animateProgress, setAnimateProgress] = useState(false);
  
  const xpForNextLevel = (userProfile.level || 1) * 100;
  const currentXP = userProfile.xp || 0;
  const xpProgress = (currentXP / xpForNextLevel) * 100;

  useEffect(() => {
      // Trigger animation after mount
      const timer = setTimeout(() => setAnimateProgress(true), 100);
      return () => clearTimeout(timer);
  }, []);

  const dashboardData = useMemo(() => {
    if (!userProfile) return { overallAverageGrade: null, completionRate: 0, onTimeRate: 'N/A', timelinessChartData: [], gradeHistoryChartData: [] };

    const gradedSubmissions = submissions.filter(s => s.status === 'Graded' && s.grade);
    const numericGrades = gradedSubmissions.map(s => gradeToNumeric(s.grade)).filter((g): g is number => g !== null);
    const overallAverageGrade = numericGrades.length > 0 ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length) : null;

    const totalAssignments = assignments.length;
    const submittedCount = submissions.length;
    const completionRate = totalAssignments > 0 ? (submittedCount / totalAssignments) * 100 : 0;

    let onTime = 0;
    let late = 0;
    const assignmentsWithDueDate = assignments.filter(a => a.dueDate);

    assignmentsWithDueDate.forEach(a => {
        // FIX: Find submission directly instead of using a map to avoid type inference issues.
        const sub: Submission | undefined = submissions.find(s => s.assignmentId === a.id);
        if (sub && a.dueDate && sub.submittedAt && typeof sub.submittedAt.toDate === 'function') {
            const dueDate = new Date(a.dueDate + 'T23:59:59');
            const submittedAt = sub.submittedAt.toDate();
            if (submittedAt <= dueDate) {
                onTime++;
            } else {
                late++;
            }
        }
    });

    const submittedWithDueDateCount = onTime + late;
    const missingCount = assignmentsWithDueDate.length - submittedWithDueDateCount;
    const onTimeRate = submittedWithDueDateCount > 0 ? Math.round((onTime / submittedWithDueDateCount) * 100) : 'N/A';
    
    const timelinessChartData = [
        { label: 'On Time', value: onTime, color: '#10b981' },
        { label: 'Late', value: late, color: '#f97316' },
        { label: 'Missing', value: missingCount, color: '#ef4444' },
    ];
    
    const assignmentMap = new Map(assignments.map(a => [a.id, a]));
    const gradeHistoryChartData = gradedSubmissions
        .map(sub => ({ sub, assign: assignmentMap.get(sub.assignmentId) }))
        .filter((item): item is { sub: Submission; assign: Assignment } => !!item.assign)
        .sort((a, b) => a.assign.createdAt.toMillis() - b.assign.createdAt.toMillis())
        .map(item => ({
            label: item.assign.title,
            value: gradeToNumeric(item.sub.grade)!,
        }));

    return {
        overallAverageGrade,
        completionRate,
        onTimeRate,
        timelinessChartData,
        gradeHistoryChartData,
    };
  }, [userProfile, assignments, submissions]);


  return (
    <div className="animate-fade-in-up space-y-6">
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-lg">
            {(userProfile.name || '?').charAt(0)}
          </div>
          <div className="flex-grow">
            <h2 className="text-3xl font-bold glow-text">{userProfile.name}</h2>
            <p className="text-gray-400">{userProfile.email}</p>
            <p className="text-gray-300 font-semibold mt-1">Class: {userProfile.class}</p>
          </div>
           <div className="sm:ml-auto flex-shrink-0 mt-4 sm:mt-0 flex flex-col items-end gap-2">
             <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700 text-right">
                 <p className="text-xs text-gray-400 uppercase tracking-wider">Total Points</p>
                 <p className="text-xl font-mono font-bold text-yellow-400">{userProfile.xp || 0} XP</p>
             </div>
            <Button onClick={() => setShowChangePassword(true)} variant="secondary" size="sm">Change Password</Button>
          </div>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-xl font-bold mb-4">Academic Progress Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-gray-400">Overall Average</p>
                <p className="text-3xl font-bold text-blue-400">{dashboardData.overallAverageGrade ? `${dashboardData.overallAverageGrade.toFixed(1)}%` : 'N/A'}</p>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-gray-400">Completion Rate</p>
                <p className="text-3xl font-bold text-green-400">{dashboardData.completionRate.toFixed(0)}%</p>
            </div>
            <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                <p className="text-sm text-gray-400">On-Time Submission</p>
                <p className="text-3xl font-bold text-green-400">{dashboardData.onTimeRate}{dashboardData.onTimeRate !== 'N/A' && '%'}</p>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <h3 className="text-xl font-semibold mb-4 text-center">Submission Timeliness</h3>
            <div className="h-72">
                <PieChart data={dashboardData.timelinessChartData} />
            </div>
        </Card>
        <Card>
            <h3 className="text-xl font-semibold mb-4">Grade History (Last 10)</h3>
            <div className="h-72">
                <LineChart data={dashboardData.gradeHistoryChartData.slice(-10)} />
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-bold mb-4">Academic Level</h3>
          <div className="space-y-4">
            <div>
              <p className="text-5xl font-bold text-blue-400">Level {userProfile.level || 1}</p>
              <p className="text-sm text-gray-400">Current Level</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>XP Progress</span>
                <span>{currentXP} / {xpForNextLevel} XP</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: animateProgress ? `${xpProgress}%` : '0%' }}
                ></div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold mb-4">Badges Earned</h3>
          {userProfile.badges && userProfile.badges.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {userProfile.badges.map(badge => (
                <div key={badge.id} className="text-center group cursor-pointer" title={`${badge.name}: ${badge.description}`}>
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" dangerouslySetInnerHTML={{ __html: badge.icon }}>
                  </div>
                  <p className="text-xs mt-1 truncate w-16">{badge.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No badges earned yet. Keep learning!</p>
          )}
        </Card>
      </div>

      <Card>
        <h3 className="text-xl font-bold mb-4">My Portfolio</h3>
        {userProfile.portfolioItems && userProfile.portfolioItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {userProfile.portfolioItems.map(item => (
              <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" key={item.id} className="block group">
                <div className="aspect-square bg-slate-700 rounded-lg flex items-center justify-center overflow-hidden relative border-2 border-transparent group-hover:border-blue-500 transition-colors">
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover transition-transform group-hover:scale-105"/>
                  ) : (
                    <PortfolioIcon/>
                  )}
                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col justify-end p-2">
                       <p className="text-white text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity -translate-y-2 group-hover:translate-y-0">{item.title}</p>
                   </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Your portfolio is empty. Submit assignments to add items!</p>
        )}
      </Card>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
};

export default StudentProfile;
