
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, functions, firebase } from '../services/firebase';
// FIX: GES_STANDARD_CURRICULUM is a value, so it's imported separately from the types.
import { GES_STANDARD_CURRICULUM } from '../types';
import type { Assignment, Submission, UserProfile, TeachingMaterial, GeneratedContent, SubjectsByClass, GES_CLASSES, Timetable, Quiz, Presentation, LiveTutoringSession, AttendanceRecord, AttendanceStatus, Notification, GES_SUBJECTS, TerminalReport, TerminalReportMark, ReportSummary, SchoolSettings, VideoContent, SchoolEvent, TimetableData, TimetablePeriod, LiveLesson, LiveLessonStep, Group, GroupMember, GroupMessage, Conversation, Slide } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { PresentationGenerator } from './PresentationGenerator';
import Sidebar from './common/Sidebar';
import ConfirmationModal from './common/ConfirmationModal';
import AIAssistant from './AIAssistant';
import ChangePasswordModal from './common/ChangePasswordModal';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import TTSAudioPlayer from './common/TTSAudioPlayer';
import NotebookTimetable from './common/NotebookTimetable';
import AssignmentModal from './AssignmentModal';
import Toast from './common/Toast';
import Histogram from './common/charts/Histogram';
import PieChart from './common/charts/PieChart';
import VideoGenerator from './VideoGenerator';
import TeacherCreateStudentForm from './TeacherCreateStudentForm';
import TeacherCreateParentForm from './TeacherCreateParentForm';
import SnapToRegister from './SnapToRegister';
// FIX: Changed import of TeacherLiveClassroom to be a named import as it is not a default export.
import { TeacherLiveClassroom } from './TeacherLiveClassroom';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import MessagingView from './MessagingView';
import html2canvas from 'html2canvas';
import { ProgressDashboard } from './ProgressDashboard';
import TimetableManager from './TimetableManager';
import TeacherStudentCard from './TeacherStudentCard';
import TeacherMyVoice from './TeacherMyVoice';
import TeacherAITools from './TeacherAITools';

const getGrade = (score: number) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    return 'F';
};

// FIX: Added missing compressImage function definition.
const compressImage = (file: Blob, quality = 0.85): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1280;
                const scaleSize = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

// --- START OF GROUP WORK COMPONENTS ---

const TeacherGroupChatView: React.FC<{ group: Group }> = ({ group }) => {
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const q = db.collection('groups').doc(group.id).collection('groupMessages').orderBy('createdAt', 'asc');
        const unsubscribe = q.onSnapshot(snapshot => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage)));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsubscribe();
    }, [group.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

    return (
        <div className="flex flex-col h-full bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-3 bg-slate-800/80 border-b border-slate-700 backdrop-blur-sm">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Monitor</h4>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                        <span className="text-4xl mb-2">💬</span>
                        <p className="text-sm">No messages yet.</p>
                    </div>
                ) : messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === group.teacherId ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-gray-400 font-medium mb-1 ml-1">{msg.senderName}</span>
                        <div className={`p-2.5 rounded-xl max-w-[85%] break-words text-sm ${msg.senderId === group.teacherId ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                           {msg.imageUrl && <img src={msg.imageUrl} alt="Group attachment" className="rounded-lg max-w-full mb-2 border border-white/10" />}
                           {msg.audioUrl && <audio controls src={msg.audioUrl} className="w-full h-8 mb-1" />}
                           {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                        </div>
                        <span className="text-[9px] text-gray-600 mt-1">{msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

const GroupDetailsModal: React.FC<{
    group: Group;
    onClose: () => void;
    setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}> = ({ group, onClose, setToast }) => {
    const [grade, setGrade] = useState(group.grade || '');
    const [feedback, setFeedback] = useState(group.feedback || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveGrade = async () => {
        setIsSaving(true);
        try {
            await db.collection('groups').doc(group.id).update({ grade, feedback });
            setToast({ message: 'Grade and feedback saved.', type: 'success' });
            onClose();
        } catch (err: any) {
            setToast({ message: `Error saving grade: ${err.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-5xl h-[90vh] sm:h-[85vh] flex flex-col !bg-slate-800 !border-slate-700 shadow-2xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">🤝</div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white truncate max-w-[200px] sm:max-w-md">{group.name}</h2>
                            <p className="text-sm text-purple-300">{group.classId} • {group.subject}</p>
                        </div>
                    </div>
                    <Button variant="secondary" onClick={onClose} className="!rounded-full">Close</Button>
                </div>
                
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto lg:overflow-hidden">
                    {/* Left Panel: Details & Grading */}
                    <div className="lg:col-span-4 flex flex-col gap-6 pr-2">
                        <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Assignment Brief</h4>
                            <p className="font-semibold text-white text-lg mb-1">{group.assignmentTitle}</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{group.assignmentDescription}</p>
                            <div className="mt-3 flex items-center gap-2 text-xs font-mono text-yellow-400 bg-yellow-400/10 w-fit px-2 py-1 rounded">
                                <span>📅 DUE: {group.dueDate || 'No Date Set'}</span>
                            </div>
                        </div>

                        <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Team Members</h4>
                            <div className="flex flex-wrap gap-2">
                                {group.members.map(m => (
                                    <span key={m.uid} className="px-3 py-1.5 bg-slate-800 rounded-full text-xs font-medium text-slate-200 border border-slate-600 flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[8px] font-bold">{m.name ? m.name.charAt(0) : '?'}</div>
                                        {m.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col bg-slate-700/30 p-4 rounded-xl border border-slate-700">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Grading & Feedback</h4>
                            {group.isSubmitted && group.submission ? (
                                <div className="mb-4 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2 text-green-400 text-xs font-bold">
                                        <span>✅ SUBMITTED</span>
                                        <span>•</span>
                                        <span>{group.submission.submittedAt.toDate().toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-slate-200 line-clamp-4 italic">"{group.submission.content}"</p>
                                    <p className="text-xs text-slate-500 mt-1 text-right">By: {group.submission.submittedBy.name}</p>
                                </div>
                            ) : (
                                <div className="mb-4 p-4 bg-slate-800/50 border border-dashed border-slate-600 rounded-lg text-center">
                                    <p className="text-sm text-slate-400">Submission pending...</p>
                                </div>
                            )}
                            
                            <div className="space-y-3 mt-auto">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Score / Grade</label>
                                    <input type="text" value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. 18/20" className="w-full p-2.5 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"/>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Feedback</label>
                                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Helpful feedback for the group..." rows={4} className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"/>
                                </div>
                                <Button onClick={handleSaveGrade} disabled={isSaving} className="w-full py-3">{isSaving ? 'Saving...' : 'Submit Grade'}</Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Chat */}
                    <div className="lg:col-span-8 h-[500px] lg:h-full min-h-[400px]">
                         <TeacherGroupChatView group={group} />
                    </div>
                </div>
            </Card>
        </div>
    );
};


const CreateGroupModal: React.FC<{
    students: UserProfile[];
    classes: string[];
    subjectsByClass: Record<string, string[]>;
    teacherId: string;
    onClose: () => void;
    setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
    editingGroup: Group | null;
}> = ({ students, classes, subjectsByClass, teacherId, onClose, setToast, editingGroup }) => {
    const isEditing = !!editingGroup;
    const isSubmitted = isEditing && editingGroup.isSubmitted;

    const [groupName, setGroupName] = useState('');
    const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);
    const [assignmentTitle, setAssignmentTitle] = useState('');
    const [assignmentDesc, setAssignmentDesc] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [selectedClass, setSelectedClass] = useState(classes[0] || '');
    const [subjectsForClass, setSubjectsForClass] = useState<string[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');

    useEffect(() => {
        if (isEditing && editingGroup) {
            setGroupName(editingGroup.name);
            setSelectedClass(editingGroup.classId);
            setSelectedSubject(editingGroup.subject);
            setAssignmentTitle(editingGroup.assignmentTitle);
            setAssignmentDesc(editingGroup.assignmentDescription);
            setDueDate(editingGroup.dueDate || '');
            setSelectedStudentUids(editingGroup.memberUids);
        } else {
            // Reset for create mode
            setGroupName('');
            setSelectedClass(classes[0] || '');
            setAssignmentTitle('');
            setAssignmentDesc('');
            setDueDate('');
            setSelectedStudentUids([]);
        }
    }, [editingGroup, isEditing, classes]);

    useEffect(() => {
        const potentialSubs = subjectsByClass[selectedClass];
        const subs = Array.isArray(potentialSubs) ? potentialSubs : [];
        setSubjectsForClass(subs);
        
        if (!isEditing) {
            setSelectedSubject(subs[0] || '');
        }
    }, [selectedClass, subjectsByClass, isEditing]);


    const studentsInSelectedClass = useMemo(() => {
        return students.filter(s => s.class === selectedClass);
    }, [students, selectedClass]);


    const handleSubmit = async () => {
        if (!groupName.trim() || !assignmentTitle.trim() || selectedStudentUids.length < 2 || !selectedClass || !selectedSubject) {
            setToast({ message: 'Please fill all fields and select at least 2 students.', type: 'error' });
            return;
        }
        setIsProcessing(true);
        try {
            const members = students.filter(s => selectedStudentUids.includes(s.uid)).map(s => ({ uid: s.uid, name: s.name }));
            
            if (isEditing && editingGroup) {
                 const groupUpdateData = {
                    name: groupName,
                    members,
                    memberUids: selectedStudentUids,
                    assignmentTitle,
                    assignmentDescription: assignmentDesc,
                    dueDate: dueDate || null,
                };
                await db.collection('groups').doc(editingGroup.id).update(groupUpdateData);
                setToast({ message: 'Group updated successfully.', type: 'success' });

            } else {
                const groupData: Omit<Group, 'id'> = {
                    name: groupName,
                    classId: selectedClass,
                    subject: selectedSubject,
                    teacherId,
                    members,
                    memberUids: selectedStudentUids,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                    assignmentTitle,
                    assignmentDescription: assignmentDesc,
                    dueDate: dueDate || null,
                    isSubmitted: false,
                };
                await db.collection('groups').add(groupData);
                setToast({ message: 'Group created successfully.', type: 'success' });
            }
            onClose();
        } catch (err: any) {
             setToast({ message: `Failed to ${isEditing ? 'update' : 'create'} group: ${err.message}`, type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-lg h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 flex-shrink-0">{isEditing ? 'Edit Group' : 'Create New Group'}</h2>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {isSubmitted && <p className="text-yellow-400 text-sm p-2 bg-yellow-900/50 rounded-md">This group has already submitted their work and can no longer be edited.</p>}
                    <div className="grid grid-cols-2 gap-4">
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={isEditing} className="w-full p-2 bg-slate-700 rounded-md disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={isEditing || subjectsForClass.length === 0} className="w-full p-2 bg-slate-700 rounded-md disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">
                            {subjectsForClass.length > 0 ? subjectsForClass.map(s => <option key={s} value={s}>{s}</option>) : <option>Select Class</option>}
                        </select>
                    </div>
                    <input type="text" placeholder="Group Name (e.g., The Innovators)" value={groupName} onChange={e => setGroupName(e.target.value)} required disabled={isSubmitted} className="w-full p-2 bg-slate-700 rounded-md disabled:opacity-50" />
                    <input type="text" placeholder="Assignment Title" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} required disabled={isSubmitted} className="w-full p-2 bg-slate-700 rounded-md disabled:opacity-50" />
                    <textarea placeholder="Assignment Description" value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)} rows={3} disabled={isSubmitted} className="w-full p-2 bg-slate-700 rounded-md disabled:opacity-50" />
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isSubmitted} className="w-full p-2 bg-slate-700 rounded-md disabled:opacity-50" />
                    <div>
                        <h4 className="font-semibold text-gray-300 mb-2">Select Members ({selectedStudentUids.length})</h4>
                        <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2 p-2 bg-slate-800 rounded-md">
                            {studentsInSelectedClass.length > 0 ? studentsInSelectedClass.map(s => (
                                <label key={s.uid} className={`flex items-center gap-2 p-2 hover:bg-slate-700 rounded-md ${isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input type="checkbox" checked={selectedStudentUids.includes(s.uid)} onChange={() => setSelectedStudentUids(p => p.includes(s.uid) ? p.filter(id => id !== s.uid) : [...p, s.uid])} disabled={isSubmitted} className="h-4 w-4 rounded bg-slate-700 border-slate-500" />
                                    <span className="text-sm">{s.name}</span>
                                </label>
                            )) : <p className="text-sm text-gray-500 col-span-2 text-center">No students found for this class.</p>}
                        </div>
                    </div>
                </div>
                 <div className="flex-shrink-0 pt-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing || isSubmitted}>{isProcessing ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Group')}</Button>
                 </div>
            </Card>
        </div>
    );
};
// --- END OF GROUP WORK COMPONENTS ---


const TeacherDashboard: React.FC<{
    userProfile: UserProfile;
    students: UserProfile[];
    assignments: Assignment[];
    submissions: Submission[];
    teacherClasses: string[];
}> = ({ userProfile, students, assignments, submissions, teacherClasses }) => {
    
    const pendingSubmissions = submissions.filter(s => s.status === 'Submitted').length;
    
    const upcomingAssignments = assignments
        .filter(a => a.dueDate && new Date(a.dueDate) >= new Date())
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
        .slice(0, 5);

    const recentSubmissionsToGrade = submissions
        .filter(s => s.status === 'Submitted')
        .sort((a, b) => b.submittedAt.toMillis() - a.submittedAt.toMillis())
        .slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-r from-indigo-900 to-purple-900 p-6 sm:p-8 rounded-3xl overflow-hidden shadow-2xl border border-indigo-500/30">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tight">Welcome Back, {userProfile.name.split(' ')[0]}!</h2>
                    <p className="text-indigo-200 text-sm sm:text-base">Ready to shape the future today?</p>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">🎓</div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Total Students</p>
                    <p className="text-4xl font-black text-white mt-2">{students.length}</p>
                </div>
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-2xl relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📚</div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">Classes Taught</p>
                    <p className="text-4xl font-black text-white mt-2">{teacherClasses.length}</p>
                </div>
                <div className="bg-slate-800/60 backdrop-blur-md border border-slate-700 p-6 rounded-2xl relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl group-hover:scale-110 transition-transform">📝</div>
                    <p className="text-sm text-slate-400 uppercase tracking-wider font-bold">To Grade</p>
                    <p className="text-4xl font-black text-yellow-400 mt-2">{pendingSubmissions}</p>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
                        Upcoming Deadlines
                    </h3>
                    <div className="space-y-4">
                        {upcomingAssignments.length > 0 ? upcomingAssignments.map(a => (
                            <div key={a.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors gap-2">
                                <div>
                                    <p className="font-semibold text-white truncate max-w-[250px]">{a.title}</p>
                                    <p className="text-xs text-slate-400 mt-1">{a.classId} • {a.subject}</p>
                                </div>
                                <div className="text-right self-end sm:self-auto">
                                    <span className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                                        {new Date(a.dueDate!).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                    </span>
                                </div>
                            </div>
                        )) : <p className="text-slate-500 text-center py-8">No upcoming deadlines.</p>}
                    </div>
                </div>
                <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-green-500 rounded-full"></span>
                        Needs Grading
                    </h3>
                    <div className="space-y-4">
                         {recentSubmissionsToGrade.length > 0 ? recentSubmissionsToGrade.map(s => {
                             const assignment = assignments.find(a => a.id === s.assignmentId);
                             return (
                                <div key={s.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{s.studentName}</p>
                                        <p className="text-xs text-slate-400 mt-1 truncate max-w-[200px]">{assignment?.title || 'Unknown Assignment'}</p>
                                    </div>
                                    <span className="self-end sm:self-auto px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded uppercase">Review</span>
                                </div>
                             )
                         }) : <p className="text-slate-500 text-center py-8">All caught up!</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


interface TeacherViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

export const TeacherView: React.FC<TeacherViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
    const { user, userProfile, schoolSettings } = useAuthentication();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  
    // Data states
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [students, setStudents] = useState<UserProfile[]>([]);
    const [myLibraryContent, setMyLibraryContent] = useState<GeneratedContent[]>([]);
    const [activeLiveLesson, setActiveLiveLesson] = useState<LiveLesson | null>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [allParents, setAllParents] = useState<UserProfile[]>([]);
    const [allTeachers, setAllTeachers] = useState<UserProfile[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [terminalReports, setTerminalReports] = useState<TerminalReport[]>([]);
    const [timetableClass, setTimetableClass] = useState('');
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);
    const [isGrading, setIsGrading] = useState<string | null>(null); // holds submission ID
    const [showPresentationGenerator, setShowPresentationGenerator] = useState(false);
    const [editingPresentation, setEditingPresentation] = useState<GeneratedContent | null>(null);
    const [contentToDelete, setContentToDelete] = useState<GeneratedContent | null>(null);
    const [isDeletingContent, setIsDeletingContent] = useState(false);
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');

    // My Students state
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
    const [studentCreationClass, setStudentCreationClass] = useState<string | null>(null);
    const [showCreateParentModal, setShowCreateParentModal] = useState(false);
    const [viewingStudentProgress, setViewingStudentProgress] = useState<UserProfile | null>(null);

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
    const [isSavingAttendance, setIsSavingAttendance] = useState(false);

    // Terminal Reports state
    const [reportClass, setReportClass] = useState('');
    const [reportSubject, setReportSubject] = useState('');
    const [marks, setMarks] = useState<Record<string, Partial<TerminalReportMark>>>({});
    const [isSavingMarks, setIsSavingMarks] = useState(false);


    // Filter states
    const [classFilter, setClassFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');

    // Group Work states
    const [groupClassFilter, setGroupClassFilter] = useState('all');
    const [groupSubjectFilter, setGroupSubjectFilter] = useState('all');
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
    const [isDeletingGroup, setIsDeletingGroup] = useState(false);
    
    // FIX: Add missing state for AI Assistant
    const [aiSystemInstruction, setAiSystemInstruction] = useState('');
    const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
  
    // FIX: Add explicit type to useMemo to help with type inference.
    const teacherClasses = useMemo<string[]>(() => {
        if (!userProfile) return [];
        const allClasses = new Set([
            ...(userProfile.classesTaught || []),
            ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : []),
        ]);
        return Array.from(allClasses).sort();
    }, [userProfile]);
    
    // FIX: Add explicit type and more robust checks to prevent errors from malformed Firestore data.
    const teacherSubjects = useMemo<string[]>(() => {
        if (!userProfile || !userProfile.subjectsByClass || typeof userProfile.subjectsByClass !== 'object') {
            return [];
        }
        // Ensure subjectsByClass is treated as an object, and filter out non-array values before flattening.
        const subjectsMap = userProfile.subjectsByClass;
        return Object.values(subjectsMap)
                     .filter(Array.isArray)
                     .flat();
    }, [userProfile?.subjectsByClass]);

    const subjectsForReport = useMemo<string[]>(() => {
        const subs = userProfile?.subjectsByClass?.[reportClass];
        return Array.isArray(subs) ? subs : [];
    }, [userProfile?.subjectsByClass, reportClass]);
    
    useEffect(() => {
        if (teacherClasses.length > 0 && !reportClass) {
            setReportClass(teacherClasses[0]);
        }
    }, [teacherClasses, reportClass]);

    useEffect(() => {
        if (subjectsForReport.length > 0 && !subjectsForReport.includes(reportSubject)) {
            setReportSubject(subjectsForReport[0]);
        } else if (subjectsForReport.length === 0) {
            setReportSubject('');
        }
    }, [subjectsForReport, reportSubject]);

    useEffect(() => {
        if (teacherClasses.length > 0 && !timetableClass) {
            setTimetableClass(teacherClasses[0]);
        }
    }, [teacherClasses, timetableClass]);


    const subjectsForFilter = useMemo<string[]>(() => {
        if (!userProfile?.subjectsByClass) return [];
        const allSubs = new Set<string>();
        const subjectsMap = userProfile.subjectsByClass;
        if (classFilter === 'all') {
            teacherClasses.forEach(c => {
                 const subjects = subjectsMap[c];
                 if (Array.isArray(subjects)) {
                    subjects.forEach(s => allSubs.add(s));
                 }
            });
        } else {
            const subjects = subjectsMap[classFilter];
            if (Array.isArray(subjects)) {
                subjects.forEach(s => allSubs.add(s));
            }
        }
        return Array.from(allSubs).sort();
    }, [userProfile, classFilter, teacherClasses]);
    
    useEffect(() => {
        if (subjectFilter !== 'all' && subjectsForFilter.length > 0 && !subjectsForFilter.includes(subjectFilter)) {
            setSubjectFilter('all');
        }
    }, [subjectsForFilter, subjectFilter]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(assignment => {
            const classMatch = classFilter === 'all' || assignment.classId === classFilter;
            const subjectMatch = subjectFilter === 'all' || assignment.subject === subjectFilter;
            return classMatch && subjectMatch;
        });
    }, [assignments, classFilter, subjectFilter]);

     const filteredGroups = useMemo(() => {
        return groups.filter(g => {
            const classMatch = groupClassFilter === 'all' || g.classId === groupClassFilter;
            const subjectMatch = groupSubjectFilter === 'all' || g.subject === groupSubjectFilter;
            return classMatch && subjectMatch;
        });
    }, [groups, groupClassFilter, groupSubjectFilter]);


    useEffect(() => {
        if (!user || teacherClasses.length === 0) {
            setLoading(false);
            return;
        }

        const unsubscribers: (() => void)[] = [];

        // Fetch assignments for all classes taught by the teacher
        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)))));

        // Fetch submissions for all those classes
        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid)
            .onSnapshot(snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)))));

        // Fetch students in those classes
        unsubscribers.push(db.collection('users').where('class', 'in', teacherClasses)
            .where('role', '==', 'student')
            .onSnapshot(snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u && u.uid))));
        
        // Fetch generated content
        unsubscribers.push(db.collection('generatedContent').where('collaboratorUids', 'array-contains', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setMyLibraryContent(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedContent)))));

        // Fetch active live lesson
        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active')
            .onSnapshot(snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson)));
        
        // Fetch all parents and other teachers for messaging
        unsubscribers.push(db.collection('users').where('role', '==', 'parent').onSnapshot(snap => setAllParents(snap.docs.map(d => d.data() as UserProfile).filter(u => u && u.uid))));
        unsubscribers.push(db.collection('users').where('role', '==', 'teacher').onSnapshot(snap => setAllTeachers(snap.docs.map(d => d.data() as UserProfile).filter(u => u && u.uid))));
        
        // Fetch groups
        unsubscribers.push(db.collection('groups').where('teacherId', '==', user.uid).onSnapshot(snap => setGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group)))));
            
        if (teacherClasses.length > 0 && teacherSubjects.length > 0) {
            unsubscribers.push(
                db.collection('terminalReports')
                    .where('classId', 'in', teacherClasses)
                    .onSnapshot(snap => {
                        const reports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TerminalReport));
                        const relevantReports = reports.filter(report => 
                             Object.keys(report.subjects || {}).some(subject => teacherSubjects.includes(subject))
                        );
                        setTerminalReports(relevantReports);
                    })
            );
        }

        setLoading(false);

        return () => unsubscribers.forEach(unsub => unsub());
    }, [user, userProfile, teacherClasses, teacherSubjects]);

     // Fetch unread messages count
    useEffect(() => {
        if (!user) return;
        const unsubscribe = db.collection('conversations')
            .where('participantUids', 'array-contains', user.uid)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.forEach(doc => {
                    const conv = doc.data() as Conversation;
                    count += conv.unreadCount?.[user.uid] || 0;
                });
                setUnreadMessages(count);
            });
        return () => unsubscribe();
    }, [user]);
    
    // FIX: Add useEffect for AI Assistant context
    useEffect(() => {
        const baseInstruction = "You are an AI assistant for a teacher at UTOPIA INTERNATIONAL SCHOOL. Your role is to help with lesson planning, student progress analysis, and administrative tasks. Maintain a professional and supportive tone. You can summarize the content on the teacher's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
        let context = '';
        let prompts: string[] = ["Draft a lesson plan for a Basic 5 science class on ecosystems."];

        switch (activeTab) {
            case 'dashboard':
                context = `The teacher is on their main dashboard. They have ${submissions.filter(s => s.status === 'Submitted').length} submissions to grade.`;
                prompts.push("Summarize my students' recent performance.");
                prompts.push("Give me ideas for a group project for Basic 3 English.");
                break;
            case 'my_students':
                context = `The teacher is viewing their 'My Students' page, which lists all students in their classes.`;
                prompts.push("How can I identify students who are falling behind?");
                break;
            case 'assignments':
                context = `The teacher is on the 'Assignments' page.`;
                prompts.push("Create a 5-question multiple choice quiz on the water cycle.");
                prompts.push("Generate a project-based assignment for Social Studies.");
                break;
            case 'my_library':
                context = `The teacher is in 'My Library', viewing their saved lesson plans and presentations.`;
                prompts.push("Help me improve the presentation on 'The Solar System'.");
                break;
            default:
                context = `The teacher is on the ${activeTab.replace(/_/g, ' ')} page.`;
                break;
        }
        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
        setAiSuggestedPrompts(prompts);
    }, [activeTab, submissions, assignments]);

    // Attendance data fetcher
    useEffect(() => {
        if (activeTab === 'attendance' && userProfile?.classTeacherOf) {
            const recordId = `${attendanceDate}_${userProfile.classTeacherOf}`;
            const unsub = db.collection('attendance').doc(recordId).onSnapshot(doc => {
                if (doc.exists) {
                    setAttendanceData(doc.data()?.records || {});
                } else {
                    setAttendanceData({});
                }
            });
            return () => unsub();
        }
    }, [activeTab, attendanceDate, userProfile?.classTeacherOf]);

    // Terminal Reports data loader
    useEffect(() => {
        if (activeTab === 'terminal_reports' && reportClass && reportSubject && schoolSettings) {
            const academicYear = schoolSettings.academicYear?.replace(/\//g, '-') || '';
            const term = schoolSettings.currentTerm || 1;
            const reportId = `${academicYear}_${term}_${reportClass}`;

            const report = terminalReports.find(r => r.id === reportId);
            if (report && report.subjects && report.subjects[reportSubject]) {
                setMarks(report.subjects[reportSubject].marks || {});
            } else {
                setMarks({});
            }
        }
    }, [activeTab, reportClass, reportSubject, terminalReports, schoolSettings]);

    const handleStartGrading = (submission: Submission) => {
        setIsGrading(submission.id);
        
        const assignment = assignments.find(a => a.id === submission.assignmentId);
        if (assignment?.type === 'Objective' && assignment.quiz && submission.answers) {
            const quiz = assignment.quiz.quiz;
            let correctCount = 0;
            quiz.forEach((q, index) => {
                if (submission.answers?.[index] === q.correctAnswer) {
                    correctCount++;
                }
            });
            const grade = `${correctCount} / ${quiz.length}`;
            setGradeInput(grade);
        } else {
            setGradeInput(submission.grade || '');
        }

        setFeedbackInput(submission.feedback || '');
    };

    const handleCancelGrading = () => {
        setIsGrading(null);
        setGradeInput('');
        setFeedbackInput('');
    };

    const handleSaveGrade = async (submissionId: string) => {
        if (!submissionId) return;
        try {
            await db.collection('submissions').doc(submissionId).update({
                grade: gradeInput,
                feedback: feedbackInput,
                status: 'Graded'
            });
            setToast({ message: 'Grade saved successfully.', type: 'success' });
            handleCancelGrading(); // This will reset state and close the form
        } catch (err: any) {
            setToast({ message: `Error saving grade: ${err.message}`, type: 'error' });
        }
    };

    const handleEditAssignment = (assignment: Assignment) => {
        setEditingAssignment(assignment);
        setIsAssignmentModalOpen(true);
    };

    const handleCreateNewAssignment = () => {
        setEditingAssignment(null);
        setIsAssignmentModalOpen(true);
    };

    const handleDeleteAssignment = async (assignmentId: string) => {
        if (window.confirm('Are you sure you want to delete this assignment and all its submissions?')) {
            // It's safer to use a Cloud Function for this to ensure all related data is deleted.
            // For now, we'll just delete the assignment doc.
            await db.collection('assignments').doc(assignmentId).delete();
        }
    };
    
    const handleStartLiveLesson = useCallback(async (content: GeneratedContent) => {
        if (!user || !userProfile) return;

        setShowPresentationGenerator(false); // Close generator if it was open

        // FIX: Map the `question` property from the quiz to the `text` property required by LiveLessonStep.
        const lessonPlan: LiveLessonStep[] = content.presentation.slides.map((slide, index) => {
            const quizQuestion = content.quiz?.quiz[index];
            return {
                boardContent: `<h3>${slide.title}</h3><ul>${slide.content.map(p => `<li>${p}</li>`).join('')}</ul>`,
                question: quizQuestion ? {
                    id: `${content.id || 'new'}_q${index}`,
                    text: quizQuestion.question,
                    options: quizQuestion.options,
                    correctAnswer: quizQuestion.correctAnswer
                } : null
            };
        });
        
        const newLessonData: Omit<LiveLesson, 'id' | 'createdAt'> = {
            teacherId: user.uid,
            teacherName: userProfile.name,
            classId: content.classes[0], // For now, lesson is for the first selected class
            subject: content.subject,
            topic: content.topic,
            status: 'active',
            currentStepIndex: 0,
            lessonPlan: lessonPlan,
            currentBoardContent: lessonPlan[0].boardContent,
            currentQuestion: lessonPlan[0].question,
        };

        // If starting from a saved presentation, link it
        if (content.id) {
            newLessonData.sourcePresentationId = content.id;
        }

        try {
            const lessonRef = await db.collection('liveLessons').add({
                ...newLessonData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // The "optimistic start" approach: write text content instantly,
            // then process and upload images in the background.
            // Split data: main doc for text, sub-collection for images.
            if (!content.id) { // This is a new, unsaved presentation
                const imagePromises = content.presentation.slides.map(async (slide, index) => {
                    if (slide.imageUrl && slide.imageUrl.startsWith('data:')) {
                        const response = await fetch(slide.imageUrl);
                        const blob = await response.blob();
                        const compressedBlob = await compressImage(blob);
                        const storagePath = `liveLessons/${lessonRef.id}/images/slide_${index}.jpg`;
                        const storageRef = storage.ref(storagePath);
                        await storageRef.put(compressedBlob);
                        const downloadURL = await storageRef.getDownloadURL();
                        
                        // Save image URL to sub-collection
                        return lessonRef.collection('images').doc(index.toString()).set({
                            imageUrl: downloadURL,
                            imageStyle: slide.imageStyle
                        });
                    }
                });
                // We don't await these promises, letting them run in the background
                Promise.all(imagePromises).catch(err => {
                    console.error("Background image upload failed:", err);
                    setToast({ message: "Some lesson images failed to upload.", type: 'error' });
                });
            } else { // This is a saved presentation with permanent URLs
                const imagePromises = content.presentation.slides.map((slide, index) => {
                    return lessonRef.collection('images').doc(index.toString()).set({
                        imageUrl: slide.imageUrl,
                        imageStyle: slide.imageStyle
                    });
                });
                 await Promise.all(imagePromises);
            }

            setActiveTab('live_lesson');
        } catch(error) {
            console.error("Error starting live lesson:", error);
            setToast({ message: `Error starting live lesson`, type: 'error' });
        }
    }, [user, userProfile]);

    
    const handleDeleteContent = async () => {
        if (!contentToDelete) return;
        setIsDeletingContent(true);
        try {
            const deleteResource = functions.httpsCallable('deleteResource');
            await deleteResource({ resourceType: 'generatedContent', resourceId: contentToDelete.id });
            setToast({ message: 'Content deleted successfully.', type: 'success' });
        } catch(err: any) {
            setToast({ message: `Failed to delete content: ${err.message}`, type: 'error'});
        } finally {
            setIsDeletingContent(false);
            setContentToDelete(null);
        }
    };

    // --- ATTENDANCE HANDLERS ---
    const handleAttendanceChange = (studentId: string, status: AttendanceStatus) => {
        setAttendanceData(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSaveAttendance = async () => {
        if (!userProfile?.classTeacherOf || Object.keys(attendanceData).length === 0) {
            setToast({ message: "No attendance data to save.", type: 'error' });
            return;
        }

        setIsSavingAttendance(true);
        const recordId = `${attendanceDate}_${userProfile.classTeacherOf}`;
        const classStudents = students.filter(s => s.class === userProfile.classTeacherOf);
        const parentUids = Array.from(new Set(classStudents.flatMap(s => s.parentUids || [])));

        try {
            await db.collection('attendance').doc(recordId).set({
                id: recordId,
                date: attendanceDate,
                classId: userProfile.classTeacherOf,
                teacherId: user.uid,
                teacherName: userProfile.name,
                records: attendanceData,
                studentUids: classStudents.map(s => s.uid),
                parentUids: parentUids,
            }, { merge: true });
            
            // Send notifications for absences
            const absentStudentIds = classStudents.filter(s => attendanceData[s.uid] === 'Absent').map(s => s.uid);
            if (absentStudentIds.length > 0) {
                 const sendNotifications = functions.httpsCallable('sendNotificationsToParentsOfStudents');
                 await sendNotifications({
                     studentUids: absentStudentIds,
                     message: `Your child, ${classStudents.find(s=>s.uid === absentStudentIds[0])?.name}, was marked absent from class on ${new Date(attendanceDate).toLocaleDateString()}. Please contact the school if this is an error.`,
                     senderId: user.uid,
                     senderName: userProfile.name,
                 });
            }
            setToast({ message: "Attendance saved successfully.", type: 'success' });
        } catch(err: any) {
            console.error(err);
            setToast({ message: `Failed to save attendance: ${err.message}`, type: 'error' });
        } finally {
            setIsSavingAttendance(false);
        }
    };

    const handleMarkAll = (status: 'Present' | 'Absent') => {
        const classStudents = students.filter(s => s.class === userProfile?.classTeacherOf);
        const newAttendanceData = classStudents.reduce((acc, student) => {
            acc[student.uid] = status;
            return acc;
        }, {} as Record<string, AttendanceStatus>);
        setAttendanceData(newAttendanceData);
    };

    // --- TERMINAL REPORTS HANDLERS ---
    const handleMarkChange = (studentId: string, field: keyof TerminalReportMark, value: string) => {
        const numericValue = value === '' ? undefined : Number(value);
        setMarks(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: numericValue
            }
        }));
    };
    
    const handleAutoFillScores = () => {
        const studentsInClass = students.filter(s => s.class === reportClass);
        const assignmentsForSubject = assignments.filter(a => a.classId === reportClass && a.subject === reportSubject);
        const submissionsForSubject = submissions.filter(s => s.classId === reportClass && assignmentsForSubject.some(a => a.id === s.assignmentId) && s.grade);
        const groupsForSubject = groups.filter(g => g.classId === reportClass && g.subject === reportSubject && g.grade);

        const newMarks: Record<string, Partial<TerminalReportMark>> = {};

        studentsInClass.forEach(student => {
            const studentSubmissions = submissionsForSubject.filter(s => s.studentId === student.uid);

            let totalPercentageSum = 0;
            const totalAssignmentsCount = assignmentsForSubject.length;

            if (totalAssignmentsCount > 0) {
                assignmentsForSubject.forEach(assignment => {
                    const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
                    if (submission && submission.grade) {
                        let score: number | null = null;
                        let maxScore: number | null = null;

                        if (submission.grade.includes('/')) {
                            const parts = submission.grade.split('/').map(p => parseFloat(p.trim()));
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[1] > 0) {
                                score = parts[0];
                                maxScore = parts[1];
                            }
                        } else if (!isNaN(parseFloat(submission.grade))) {
                            score = parseFloat(submission.grade);
                            maxScore = 20; // Default max for single-number grades
                        }

                        if (score !== null && maxScore !== null && maxScore > 0) {
                            totalPercentageSum += (score / maxScore);
                        }
                    }
                    // If no submission, score is 0, so we add nothing to the sum.
                });
                
                const averagePercentage = totalPercentageSum / totalAssignmentsCount;
                const assignmentScore = averagePercentage * 15; // Scale to 15

                newMarks[student.uid] = {
                    ...marks[student.uid],
                    studentName: student.name,
                    indivTest: parseFloat(assignmentScore.toFixed(1)),
                };
            }

            const studentGroup = groupsForSubject.find(g => g.memberUids.includes(student.uid));
            if (studentGroup && studentGroup.grade) {
                 const groupWorkScore = parseFloat(studentGroup.grade);
                 if (!isNaN(groupWorkScore)) {
                     newMarks[student.uid] = {
                        ...newMarks[student.uid],
                        studentName: student.name,
                        groupWork: parseFloat(groupWorkScore.toFixed(1)),
                    };
                 }
            }
        });
        setMarks(newMarks);
        setToast({message: "Scores from assignments and group work have been filled in.", type: "success"});
    };

    const calculateTotalsAndSave = async () => {
        if (!reportClass || !reportSubject || !schoolSettings || !user) {
            setToast({ message: "Missing required report information.", type: 'error' });
            return;
        }
        setIsSavingMarks(true);

        const studentsInClass = students.filter(s => s.class === reportClass);
        const calculatedMarks: Record<string, TerminalReportMark> = {};
        const studentTotals: { studentId: string, total: number }[] = [];

        studentsInClass.forEach(student => {
            const studentMark = marks[student.uid] || {};
            
            const totalClassScore = (studentMark.indivTest || 0) + (studentMark.groupWork || 0) + (studentMark.classTest || 0) + (studentMark.project || 0);
            const examScore = studentMark.endOfTermExams || 0;

            const scaledClassScore = (totalClassScore / 60) * 50;
            const scaledExamScore = (examScore / 100) * 50;
            const overallTotal = scaledClassScore + scaledExamScore;
            
            calculatedMarks[student.uid] = {
                studentName: student.name,
                indivTest: studentMark.indivTest,
                groupWork: studentMark.groupWork,
                classTest: studentMark.classTest,
                project: studentMark.project,
                endOfTermExams: studentMark.endOfTermExams,
                totalClassScore: parseFloat(totalClassScore.toFixed(1)),
                scaledClassScore: parseFloat(scaledClassScore.toFixed(1)),
                scaledExamScore: parseFloat(scaledExamScore.toFixed(1)),
                overallTotal: parseFloat(overallTotal.toFixed(1)),
                grade: getGrade(overallTotal),
            };
            studentTotals.push({ studentId: student.uid, total: overallTotal });
        });
        
        studentTotals.sort((a, b) => b.total - a.total);
        studentTotals.forEach((item, index) => {
            let position = index + 1;
            if (index > 0 && item.total === studentTotals[index - 1].total) {
                position = calculatedMarks[studentTotals[index - 1].studentId].position || position;
            }
            calculatedMarks[item.studentId].position = position;
        });

        const academicYear = schoolSettings.academicYear.replace(/\//g, '-');
        const term = schoolSettings.currentTerm || 1;
        const reportId = `${academicYear}_${term}_${reportClass}`;
        const reportRef = db.collection('terminalReports').doc(reportId);

        try {
            await reportRef.set({
                id: reportId,
                academicYear: schoolSettings.academicYear,
                term,
                classId: reportClass,
                subjects: {
                    [reportSubject]: {
                        teacherId: user.uid,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        marks: calculatedMarks
                    }
                }
            }, { merge: true });

            setMarks(calculatedMarks);
            setToast({ message: 'Marks saved successfully!', type: 'success' });
        } catch (err: any) {
            setToast({ message: `Failed to save marks: ${err.message}`, type: 'error' });
        } finally {
            setIsSavingMarks(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        setIsDeletingGroup(true);
        try {
            const deleteResource = functions.httpsCallable('deleteResource');
            await deleteResource({ resourceType: 'group', resourceId: groupToDelete.id });
            setToast({ message: `Group '${groupToDelete.name}' has been deleted.`, type: 'success' });
        } catch (err: any) {
            setToast({ message: `Failed to delete group: ${err.message}`, type: 'error' });
        } finally {
            setIsDeletingGroup(false);
            setGroupToDelete(null);
        }
    };


    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">🚀</span> },
        { key: 'my_students', label: 'My Students', icon: <span className="text-xl">🎓</span> },
        { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📚</span> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {activeLiveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">📡</span> },
        { key: 'group_work', label: 'Group Work', icon: <span className="text-xl">🤝</span> },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <span className="text-xl">💬</span> },
        { key: 'timetable', label: 'Timetable', icon: <span className="text-xl">🗓️</span> },
        { key: 'my_library', label: 'My Library', icon: <span className="text-xl">🗂️</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
        { key: 'terminal_reports', label: 'Terminal Reports', icon: <span className="text-xl">📊</span> },
        { key: 'past_questions', label: 'BECE Questions', icon: <span className="text-xl">📝</span> },
        { key: 'my_voice', label: 'My Voice', icon: <span className="text-xl">🎙️</span> },
        { key: 'ai_tools', label: 'AI Copilot', icon: <span className="text-xl">🤖</span> },
    ];
    
    if (!user || !userProfile) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }
    
    const contactsForMessaging = [...students, ...allParents, ...allTeachers.filter(t => t.uid !== user.uid)];

    const renderContent = () => {
        if (loading) return <div className="flex-1 flex justify-center items-center"><Spinner /></div>;

        switch (activeTab) {
            case 'dashboard':
                return <TeacherDashboard userProfile={userProfile} students={students} assignments={assignments} submissions={submissions} teacherClasses={teacherClasses} />;
            case 'my_students':
                // Group students by class
                const studentsByClass = students.reduce((acc: Record<string, UserProfile[]>, student) => {
                    const classKey = student.class || 'Unassigned';
                    if (!acc[classKey]) acc[classKey] = [];
                    acc[classKey].push(student);
                    return acc;
                }, {});

                // Filter students based on search
                const filteredStudentsByClass = Object.keys(studentsByClass).reduce((acc: Record<string, UserProfile[]>, classKey) => {
                    const filtered = studentsByClass[classKey].filter(s => 
                        s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())
                    );
                    if (filtered.length > 0) acc[classKey] = filtered;
                    return acc;
                }, {});

                 return (
                    <div className="space-y-6">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                             <h2 className="text-3xl font-bold">My Students</h2>
                             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <div className="relative flex-grow sm:flex-grow-0">
                                    <input 
                                        type="text" 
                                        placeholder="Search students..." 
                                        value={studentSearchTerm}
                                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                                        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                                </div>
                                <Button onClick={() => setShowCreateParentModal(true)} className="w-full sm:w-auto">Create Parent Account</Button>
                             </div>
                         </div>
                         
                         {Object.keys(filteredStudentsByClass).map((classId) => {
                            const classStudents = filteredStudentsByClass[classId];
                            return (
                                <div key={classId} className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                        <h3 className="text-xl font-bold text-blue-400">{classId} <span className="text-slate-500 text-sm font-normal">({classStudents.length} students)</span></h3>
                                        <Button size="sm" variant="secondary" onClick={() => { setStudentCreationClass(classId); setShowCreateStudentModal(true); }}>+ Add Student</Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {classStudents.map(student => {
                                            const studentSubmissions = submissions.filter(s => s.studentId === student.uid);
                                            const classAssignments = assignments.filter(a => a.classId === student.class);
                                            
                                            return (
                                                <TeacherStudentCard 
                                                    key={student.uid}
                                                    student={student}
                                                    classAssignments={classAssignments}
                                                    studentSubmissions={studentSubmissions}
                                                    onClick={() => setViewingStudentProgress(student)}
                                                    onMessage={() => { setActiveTab('messages'); }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                         })}
                         {Object.keys(filteredStudentsByClass).length === 0 && (
                             <p className="text-center text-gray-500 py-10">No students found matching your search.</p>
                         )}
                     </div>
                 );
            case 'assignments':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-3xl font-bold">Assignments</h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                                        <label htmlFor="class-filter" className="text-sm text-gray-400 whitespace-nowrap">Class:</label>
                                        <select id="class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm w-full sm:w-auto">
                                            <option value="all">All Classes</option>
                                            {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                                         <label htmlFor="subject-filter" className="text-sm text-gray-400 whitespace-nowrap">Subject:</label>
                                        <select id="subject-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm w-full sm:w-auto">
                                            <option value="all">All Subjects</option>
                                            {subjectsForFilter.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <Button onClick={handleCreateNewAssignment} className="w-full sm:w-auto">+ Create</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAssignments.map(assignment => (
                                <Card key={assignment.id} className="flex flex-col h-full relative overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
                                    {/* Status Strip */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${assignment.dueDate && new Date(assignment.dueDate) < new Date() ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    
                                    <div className="flex justify-between items-start mb-2 pl-3">
                                        <div>
                                            <h3 className="text-lg font-bold truncate pr-2" title={assignment.title}>{assignment.title}</h3>
                                            <p className="text-xs text-gray-400 font-mono mt-1">{assignment.classId}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${assignment.type === 'Objective' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                            {assignment.type}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-grow pl-3">
                                        <p className="text-sm text-slate-400 line-clamp-3 mb-4">{assignment.description}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300">{assignment.subject}</span>
                                            {assignment.dueDate && (
                                                <span className={`text-xs border px-2 py-1 rounded flex items-center gap-1 ${new Date(assignment.dueDate) < new Date() ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'}`}>
                                                    <span>📅</span> {new Date(assignment.dueDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center pl-3">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditAssignment(assignment)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Edit">✏️</button>
                                            <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400 transition-colors" title="Delete">🗑️</button>
                                        </div>
                                        <Button size="sm" onClick={() => setViewingSubmissionsFor(assignment)} className="text-xs">
                                            Submissions ({submissions.filter(s => s.assignmentId === assignment.id).length})
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        {filteredAssignments.length === 0 && <p className="text-center text-gray-500 py-10">No assignments found.</p>}
                    </div>
                );
            case 'live_lesson':
                return activeLiveLesson ? 
                        <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => {}} setToast={setToast} userProfile={userProfile} />
                        :
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-slate-700">
                                <span className="text-5xl animate-pulse">📡</span>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Live Lesson Control Center</h2>
                            <p className="mt-2 text-slate-400 max-w-md">Start an interactive session to broadcast slides, polls, and questions to your students in real-time.</p>
                             <div className="mt-8 flex justify-center gap-4">
                                <Button size="lg" onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }} className="shadow-lg shadow-blue-600/20">
                                    Create New Lesson
                                </Button>
                            </div>
                        </div>;
            case 'group_work':
                return (
                     <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-3xl font-bold">Group Projects</h2>
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                               <select value={groupClassFilter} onChange={e => setGroupClassFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm flex-grow sm:flex-grow-0">
                                    <option value="all">All Classes</option>
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                                <Button onClick={() => { setEditingGroup(null); setShowCreateGroupModal(true); }} className="flex-grow sm:flex-grow-0">+ New Group</Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGroups.length > 0 ? filteredGroups.map(group => (
                                <Card key={group.id} className="flex flex-col h-full relative group hover:border-purple-500/50 transition-all duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{group.name}</h3>
                                            <p className="text-xs text-purple-300 font-mono mt-1 uppercase tracking-wider">{group.subject}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase border ${group.isSubmitted ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'}`}>
                                            {group.isSubmitted ? 'Submitted' : 'In Progress'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex-grow space-y-4">
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Members</p>
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {group.members.map((m, i) => (
                                                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-slate-700 flex items-center justify-center text-xs font-bold text-white" title={m.name}>
                                                        {m.name ? m.name.charAt(0) : '?'}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Assignment</p>
                                            <p className="text-sm text-slate-300 line-clamp-2">{group.assignmentTitle}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-slate-700/50 flex gap-2">
                                        <Button size="sm" onClick={() => setViewingGroup(group)} className="flex-grow">Manage</Button>
                                        <button onClick={() => { setEditingGroup(group); setShowCreateGroupModal(true); }} className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 hover:text-white transition-colors" title="Edit">✏️</button>
                                        <button onClick={() => setGroupToDelete(group)} className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-red-900/50 hover:text-red-400 transition-colors" title="Delete">🗑️</button>
                                    </div>
                                </Card>
                            )) : <div className="col-span-full text-center text-gray-500 py-10">No active groups. Create one to get started.</div>}
                        </div>
                     </div>
                );
            case 'messages':
                return <MessagingView userProfile={userProfile} contacts={contactsForMessaging} />;
            case 'timetable':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h2 className="text-3xl font-bold">My Timetable</h2>
                            <select value={timetableClass} onChange={e => setTimetableClass(e.target.value)} className="w-full sm:w-auto p-2 bg-slate-700 rounded-md border border-slate-600">
                                {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        {timetableClass ? (
                            <TimetableManager classId={timetableClass} readOnly={true} />
                        ) : (
                            <p className="text-center text-gray-500 py-10">Please select a class to view its timetable.</p>
                        )}
                    </div>
                );
            case 'my_library':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">My Library</h2>
                            <Button onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }}>+ Create New</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myLibraryContent.map(content => (
                                <Card key={content.id} className="flex flex-col group hover:border-indigo-500/50 transition-all">
                                    <div className="flex-grow">
                                        <h3 className="text-xl font-bold truncate mb-1">{content.topic}</h3>
                                        <p className="text-xs text-indigo-300 uppercase font-bold tracking-wider mb-3">{content.subject}</p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {content.classes.map(c => <span key={c} className="text-[10px] bg-slate-700 px-2 py-1 rounded text-slate-300">{c}</span>)}
                                        </div>
                                        <p className="text-xs text-gray-500">Created: {content.createdAt?.toDate().toLocaleDateString()}</p>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 gap-2">
                                        <Button size="sm" onClick={() => handleStartLiveLesson(content)} className="col-span-2">🚀 Launch Live</Button>
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingPresentation(content); setShowPresentationGenerator(true); }}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setContentToDelete(content)}>Delete</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setShowVideoGenerator(true)}>Create a Video</Button>
                                    </div>
                                </Card>
                            ))}
                            {myLibraryContent.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">Your library is empty. Create your first lesson resource!</p>}
                        </div>
                    </div>
                );
            case 'attendance':
                if (!userProfile.classTeacherOf) {
                    return <Card><p className="text-center text-gray-400 py-8">You are not a designated class teacher. Only class teachers can take attendance.</p></Card>;
                }
                const classStudents = students.filter(s => s.class === userProfile.classTeacherOf);
                
                // Summary Stats
                const presentCount = Object.values(attendanceData).filter(s => s === 'Present').length;
                const absentCount = Object.values(attendanceData).filter(s => s === 'Absent').length;
                const lateCount = Object.values(attendanceData).filter(s => s === 'Late').length;

                return (
                     <Card>
                         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h2 className="text-3xl font-bold">Attendance Register</h2>
                                <p className="text-blue-300 font-medium">{userProfile.classTeacherOf} &bull; {new Date(attendanceDate).toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-700 w-full md:w-auto justify-between md:justify-start">
                                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-2 bg-slate-800 rounded-lg text-sm border border-slate-600 focus:border-blue-500 outline-none" />
                                <Button onClick={handleSaveAttendance} disabled={isSavingAttendance}>{isSavingAttendance ? 'Saving...' : 'Save Register'}</Button>
                            </div>
                         </div>

                         {/* Daily Summary Dashboard */}
                         <div className="grid grid-cols-3 gap-4 mb-6">
                             <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-xl text-center">
                                 <p className="text-xs text-green-400 uppercase font-bold tracking-wider">Present</p>
                                 <p className="text-3xl font-black text-white">{presentCount}</p>
                             </div>
                             <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
                                 <p className="text-xs text-red-400 uppercase font-bold tracking-wider">Absent</p>
                                 <p className="text-3xl font-black text-white">{absentCount}</p>
                             </div>
                             <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl text-center">
                                 <p className="text-xs text-yellow-400 uppercase font-bold tracking-wider">Late</p>
                                 <p className="text-3xl font-black text-white">{lateCount}</p>
                             </div>
                         </div>

                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 p-3 bg-slate-800/50 rounded-lg gap-2">
                            <span className="text-xs text-slate-400 uppercase font-bold">Batch Actions</span>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={() => handleMarkAll('Present')} className="flex-1 sm:flex-none px-3 py-1 text-xs bg-slate-700 hover:bg-green-900/50 text-green-300 rounded border border-slate-600 transition-colors">Mark All Present</button>
                                <button onClick={() => handleMarkAll('Absent')} className="flex-1 sm:flex-none px-3 py-1 text-xs bg-slate-700 hover:bg-red-900/50 text-red-300 rounded border border-slate-600 transition-colors">Mark All Absent</button>
                            </div>
                         </div>

                         <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                             {classStudents.map(student => (
                                 <div key={student.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all gap-3">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-300">
                                             {(student.name || '?').charAt(0)}
                                         </div>
                                         <span className="font-medium text-white">{student.name}</span>
                                     </div>
                                     
                                     <div className="flex bg-slate-900 p-1 rounded-lg w-full sm:w-auto">
                                         {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(status => {
                                             const isActive = attendanceData[student.uid] === status;
                                             let activeClass = '';
                                             if(status === 'Present') activeClass = 'bg-green-600 text-white';
                                             if(status === 'Absent') activeClass = 'bg-red-600 text-white';
                                             if(status === 'Late') activeClass = 'bg-yellow-600 text-white';

                                             return (
                                                 <button
                                                     key={status}
                                                     onClick={() => handleAttendanceChange(student.uid, status)}
                                                     className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition-all ${isActive ? activeClass : 'text-slate-500 hover:text-slate-300'}`}
                                                 >
                                                     {status}
                                                 </button>
                                             );
                                         })}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </Card>
                );
            case 'terminal_reports':
                const studentsForReport = students.filter(s => s.class === reportClass);
                return (
                    <Card className="overflow-hidden flex flex-col h-full">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                             <div>
                                 <h2 className="text-2xl font-bold text-white">Terminal Reports</h2>
                                 <p className="text-xs text-slate-400 mt-1">Enter marks and generate end-of-term reports.</p>
                             </div>
                             <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <select value={reportClass} onChange={e => setReportClass(e.target.value)} className="flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={reportSubject} onChange={e => setReportSubject(e.target.value)} disabled={subjectsForReport.length === 0} className="flex-grow p-2 bg-slate-800 rounded-lg border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {subjectsForReport.length > 0 ? subjectsForReport.map(s => <option key={s} value={s}>{s}</option>) : <option>No subjects</option>}
                                </select>
                                <div className="hidden md:block h-8 w-px bg-slate-700 mx-2"></div>
                                <button onClick={handleAutoFillScores} className="flex-grow md:flex-grow-0 px-3 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-lg text-sm hover:bg-yellow-600/30 transition-colors flex items-center justify-center gap-2">
                                    ✨ Auto-fill
                                </button>
                                <Button onClick={calculateTotalsAndSave} disabled={isSavingMarks} className="flex-grow md:flex-grow-0 shadow-lg shadow-blue-600/20">
                                    {isSavingMarks ? 'Saving...' : 'Save Changes'}
                                </Button>
                             </div>
                        </div>
                        
                         <div className="overflow-auto border border-slate-700 rounded-xl shadow-inner custom-scrollbar flex-grow relative">
                             <div className="min-w-[1000px]"> {/* Force min width for scroll */}
                                 <table className="w-full text-sm border-collapse">
                                     <thead className="bg-slate-800 sticky top-0 z-20">
                                        <tr>
                                            <th rowSpan={2} className="p-3 text-left border-b border-r border-slate-600 font-bold text-slate-300 min-w-[180px] sticky left-0 bg-slate-800 z-30 shadow-lg">STUDENT NAME</th>
                                            <th colSpan={4} className="p-2 border-b border-r border-slate-600 text-center bg-blue-900/20 text-blue-200 font-bold">CLASS ASSESSMENT (15 each)</th>
                                            <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-20 font-bold bg-slate-700/50 text-slate-300">CLASS (50%)</th>
                                            <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-24 font-bold bg-purple-900/20 text-purple-200">EXAM (100)</th>
                                            <th rowSpan={2} className="p-2 border-b border-r border-slate-600 text-center w-20 font-bold bg-slate-700/50 text-slate-300">EXAM (50%)</th>
                                            <th colSpan={3} className="p-2 border-b border-slate-600 text-center bg-green-900/20 text-green-200 font-bold">FINAL GRADING</th>
                                        </tr>
                                        <tr className="text-xs text-slate-400">
                                            <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">ASSIGNMENTS (15)</th>
                                            <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">GROUP (15)</th>
                                            <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">TEST (15)</th>
                                            <th className="p-2 border-b border-r border-slate-600 font-medium text-center w-20">PROJECT (15)</th>
                                            <th className="p-2 border-b border-r border-slate-600 font-bold text-white bg-slate-900/50">TOTAL (100)</th>
                                            <th className="p-2 border-b border-r border-slate-600 font-bold text-white bg-slate-900/50">GRADE</th>
                                            <th className="p-2 border-b border-slate-600 font-bold text-white bg-slate-900/50">POS.</th>
                                        </tr>
                                     </thead>
                                     <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                        {studentsForReport.map((student, index) => {
                                            const mark = marks[student.uid] || {};
                                            const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
                                            const scaledClassScore = (totalClassScore / 60) * 50;
                                            const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
                                            const overallTotal = scaledClassScore + scaledExamScore;
                                            const grade = getGrade(overallTotal);

                                            let gradeColor = 'text-slate-400';
                                            if (grade === 'A') gradeColor = 'text-green-400 font-black';
                                            else if (grade.startsWith('B')) gradeColor = 'text-green-300 font-bold';
                                            else if (grade === 'F') gradeColor = 'text-red-500 font-black';
                                            else if (grade.startsWith('D')) gradeColor = 'text-yellow-400 font-bold';

                                            return (
                                                <tr key={student.uid} className="hover:bg-slate-800 transition-colors group">
                                                    <td className="p-3 text-left border-r border-slate-700 font-medium text-white sticky left-0 bg-slate-900 group-hover:bg-slate-800 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.2)] whitespace-nowrap uppercase">
                                                        {student.name}
                                                    </td>
                                                    {['indivTest', 'groupWork', 'classTest', 'project'].map((field) => (
                                                        <td key={field} className="p-1 border-r border-slate-700 bg-blue-900/5">
                                                            <input 
                                                                type="number" step="0.1" min="0" max="15" 
                                                                value={mark[field as keyof TerminalReportMark] ?? ''} 
                                                                onChange={e => handleMarkChange(student.uid, field as keyof TerminalReportMark, e.target.value)} 
                                                                className="w-full h-8 bg-transparent text-center focus:bg-slate-700 focus:ring-1 focus:ring-blue-500 outline-none rounded text-slate-300 placeholder-slate-700 font-mono"
                                                                placeholder="-"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="p-2 text-center font-bold border-r border-slate-700 text-slate-300 bg-slate-800/50">{scaledClassScore.toFixed(1)}</td>
                                                    <td className="p-1 border-r border-slate-700 bg-purple-900/5">
                                                        <input 
                                                            type="number" step="0.1" min="0" max="100" 
                                                            value={mark.endOfTermExams ?? ''} 
                                                            onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)} 
                                                            className="w-full h-8 bg-transparent text-center focus:bg-slate-700 focus:ring-1 focus:ring-purple-500 outline-none rounded text-white font-bold font-mono"
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center font-medium border-r border-slate-700 text-slate-400 bg-slate-800/50">{scaledExamScore.toFixed(1)}</td>
                                                    <td className="p-2 text-center font-black border-r border-slate-700 text-white text-lg bg-slate-900/50">{overallTotal.toFixed(1)}</td>
                                                    <td className={`p-2 text-center text-lg border-r border-slate-700 bg-slate-900/50 ${gradeColor}`}>{grade}</td>
                                                    <td className="p-2 text-center font-bold text-white bg-slate-900/50">{mark.position || '-'}</td>
                                                </tr>
                                            );
                                        })}
                                     </tbody>
                                 </table>
                             </div>
                    </Card>
                );
            case 'past_questions':
                return <BECEPastQuestionsView />;
            case 'my_voice':
                return <TeacherMyVoice userProfile={userProfile} />;
            case 'ai_tools':
                return <TeacherAITools students={students} userProfile={userProfile} />;
            default:
                return <div>Select a tab</div>;
        }
    };
    
    // RENDER MAIN COMPONENT
    return (
        <div className="flex flex-1 overflow-hidden">
            <Sidebar 
                isExpanded={isSidebarExpanded}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setIsSidebarExpanded(false)}
                title="Teacher Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                {renderContent()}
            </main>
            
            {/* Modals and other floating components */}
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {isAssignmentModalOpen && user && userProfile && (
                <AssignmentModal
                    isOpen={isAssignmentModalOpen}
                    onClose={() => setIsAssignmentModalOpen(false)}
                    assignment={editingAssignment}
                    classes={teacherClasses}
                    user={user}
                    userProfile={userProfile}
                    teacherSubjectsByClass={userProfile.subjectsByClass || null}
                />
            )}
             {viewingSubmissionsFor && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Submissions for "{viewingSubmissionsFor.title}"</h3>
                            <Button variant="secondary" onClick={() => setViewingSubmissionsFor(null)}>Close</Button>
                        </div>
                        <div className="flex-grow overflow-y-auto space-y-4">
                            {submissions.filter(s => s.assignmentId === viewingSubmissionsFor.id).map(submission => (
                                <div key={submission.id} className="p-4 bg-slate-700 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{submission.studentName}</p>
                                            <p className="text-xs text-gray-400">Submitted on {submission.submittedAt.toDate().toLocaleString()}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${submission.status === 'Graded' ? 'bg-green-500' : 'bg-yellow-500'}`}>{submission.status}</span>
                                    </div>
                                    
                                     {isGrading === submission.id ? (
                                        <div className="mt-4 space-y-2">
                                            <input type="text" value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="Grade" className="w-full p-2 bg-slate-800 rounded-md"/>
                                            <textarea value={feedbackInput} onChange={e => setFeedbackInput(e.target.value)} placeholder="Feedback" rows={3} className="w-full p-2 bg-slate-800 rounded-md"/>
                                            <div className="flex gap-2">
                                                <Button size="sm" onClick={() => handleSaveGrade(submission.id)}>Save Grade</Button>
                                                <Button size="sm" variant="secondary" onClick={handleCancelGrading}>Cancel</Button>
                                            </div>
                                        </div>
                                     ) : (
                                        <>
                                            {viewingSubmissionsFor.type === 'Objective' && viewingSubmissionsFor.quiz ? (
                                                <div className="mt-4 space-y-3">
                                                    {viewingSubmissionsFor.quiz.quiz.map((q, index) => {
                                                        const studentAnswer = submission.answers?.[index];
                                                        const isCorrect = studentAnswer === q.correctAnswer;
                                                        return (
                                                            <div key={index} className={`p-3 rounded-md ${isCorrect ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                                                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                                                <p className="text-sm mt-1">Student's Answer: <span className="font-bold">{studentAnswer || 'Not answered'}</span></p>
                                                                {!isCorrect && <p className="text-sm text-green-400">Correct Answer: {q.correctAnswer}</p>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <pre className="mt-4 p-2 bg-slate-800 rounded-md whitespace-pre-wrap font-sans">{submission.text}</pre>
                                            )}
                                            {submission.attachmentURL && (
                                                <div className="mt-2">
                                                     <a href={submission.attachmentURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-block">View Attachment</a>
                                                     {/\.(jpg|jpeg|png|gif|webp)$/i.test(submission.attachmentName) &&
                                                         <img src={submission.attachmentURL} alt="Submission" className="max-w-xs rounded-md mt-2"/>
                                                     }
                                                </div>
                                            )}
                                            <div className="mt-4 pt-2 border-t border-slate-600">
                                                <p><strong>Grade:</strong> {submission.grade || 'Not graded'}</p>
                                                <p><strong>Feedback:</strong> {submission.feedback || 'No feedback'}</p>
                                            </div>
                                            <Button size="sm" onClick={() => handleStartGrading(submission)} className="mt-2">
                                                {submission.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                                            </Button>
                                        </>
                                     )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
            {showPresentationGenerator && user && userProfile && (
                <PresentationGenerator
                    onClose={() => setShowPresentationGenerator(false)}
                    classes={teacherClasses}
                    subjectsByClass={userProfile.subjectsByClass || null}
                    user={user}
                    userProfile={userProfile}
                    initialContent={editingPresentation}
                    onStartLiveLesson={handleStartLiveLesson}
                    setToast={setToast}
                />
            )}
            {showVideoGenerator && user && userProfile && (
                <VideoGenerator 
                    onClose={() => setShowVideoGenerator(false)} 
                    userProfile={userProfile} 
                    allClasses={teacherClasses} 
                    subjectsByClass={userProfile.subjectsByClass || null} 
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
            {contentToDelete && (
                 <ConfirmationModal
                    isOpen={!!contentToDelete}
                    onClose={() => setContentToDelete(null)}
                    onConfirm={handleDeleteContent}
                    title="Delete Content?"
                    message={`Are you sure you want to delete "${contentToDelete.topic}"? This action cannot be undone.`}
                    isLoading={isDeletingContent}
                    confirmButtonText="Yes, Delete"
                 />
            )}
             {showCreateStudentModal && studentCreationClass && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <TeacherCreateStudentForm classId={studentCreationClass} />
                        <Button variant="secondary" onClick={() => setShowCreateStudentModal(false)} className="w-full mt-2">Cancel</Button>
                    </Card>
                 </div>
            )}
             {showCreateParentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <TeacherCreateParentForm allStudents={students} setToast={setToast} />
                        <Button variant="secondary" onClick={() => setShowCreateParentModal(false)} className="w-full mt-2">Cancel</Button>
                    </Card>
                </div>
            )}
            {viewingStudentProgress && (
                <ProgressDashboard 
                    student={viewingStudentProgress}
                    onClose={() => setViewingStudentProgress(null)}
                    isModal={true}
                />
            )}
             {showCreateGroupModal && user && userProfile && (
                <CreateGroupModal
                    students={students}
                    classes={teacherClasses}
                    subjectsByClass={userProfile.subjectsByClass || {}}
                    teacherId={user.uid}
                    onClose={() => { setShowCreateGroupModal(false); setEditingGroup(null); }}
                    setToast={setToast}
                    editingGroup={editingGroup}
                />
             )}
              {viewingGroup && <GroupDetailsModal group={viewingGroup} onClose={() => setViewingGroup(null)} setToast={setToast} />}
               <ConfirmationModal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={handleDeleteGroup}
                title="Delete Group?"
                message={<>Are you sure you want to permanently delete <strong>{groupToDelete?.name}</strong> and all its chat history?</>}
                isLoading={isDeletingGroup}
                confirmButtonText="Yes, Delete Group"
            />
        </div>
    );
};

export const TeacherViewComponent = TeacherView; // Ensure named export is available if needed
