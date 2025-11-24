
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, functions, firebase } from '../services/firebase';
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
import { TeacherLiveClassroom } from './TeacherLiveClassroom';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import MessagingView from './MessagingView';
import html2canvas from 'html2canvas';
import { ProgressDashboard } from './ProgressDashboard';
import TeacherStudentCard from './TeacherStudentCard';

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

    if (loading) return <div className="flex h-full items-center justify-center p-8"><Spinner /></div>;

    return (
        <div className="flex flex-col h-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Monitor Mode
                </span>
                <span className="text-xs text-slate-500">Read-only</span>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 opacity-50">
                        <span className="text-4xl mb-2">💬</span>
                        <p>No messages yet.</p>
                    </div>
                ) : messages.map(msg => (
                    <div key={msg.id} className="flex flex-col items-start animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-white/10">
                                {msg.senderName.charAt(0)}
                            </div>
                            <span className="text-xs text-slate-300 font-bold">{msg.senderName}</span>
                            <span className="text-[10px] text-slate-500">{msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="ml-8 p-3 bg-slate-800/80 rounded-2xl rounded-tl-none border border-slate-700 text-sm text-slate-200 shadow-md max-w-[90%]">
                           {msg.imageUrl && (
                               <div className="mb-2 overflow-hidden rounded-lg border border-slate-600">
                                   <img src={msg.imageUrl} alt="Attachment" className="max-w-full h-auto" />
                               </div>
                           )}
                           {msg.audioUrl && <audio controls src={msg.audioUrl} className="w-full max-w-[200px] mb-1" />}
                           {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                        </div>
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
            <Card className="w-full max-w-5xl h-[85vh] flex flex-col !p-0 overflow-hidden border-slate-700 shadow-2xl">
                <div className="bg-slate-900/90 p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl shadow-lg">
                            👥
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{group.name}</h2>
                            <p className="text-sm text-slate-400">{group.classId} &bull; {group.subject}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 overflow-hidden bg-slate-900">
                    {/* Left Panel: Info & Grading */}
                    <div className="lg:col-span-1 flex flex-col border-r border-slate-800 bg-slate-800/30 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 shadow-sm">
                            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span>📝</span> Assignment
                            </h4>
                            <p className="font-bold text-white text-lg mb-1">{group.assignmentTitle}</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{group.assignmentDescription}</p>
                            {group.dueDate && (
                                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono">
                                    📅 Due: {group.dueDate}
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Squad Members</h4>
                            <div className="flex flex-wrap gap-2">
                                {group.members.map(m => (
                                    <div key={m.uid} className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 shadow-sm">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                                            {m.name.charAt(0)}
                                        </div>
                                        <span className="text-sm text-slate-300">{m.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-700/50 pt-6">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assessment</h4>
                            {group.isSubmitted && group.submission ? (
                                <div className="mb-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-green-400 font-bold bg-green-900/30 px-2 py-0.5 rounded border border-green-500/30">SUBMITTED</span>
                                        <span className="text-[10px] text-slate-500">{group.submission.submittedAt.toDate().toLocaleDateString()}</span>
                                    </div>
                                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 max-h-40 overflow-y-auto custom-scrollbar shadow-inner leading-relaxed">
                                        {group.submission.content}
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-4 p-4 bg-yellow-900/10 border border-yellow-500/20 rounded-xl text-center">
                                    <span className="text-2xl block mb-1">🚧</span>
                                    <p className="text-sm text-yellow-500 font-medium">Work in Progress</p>
                                    <p className="text-xs text-yellow-600/70">No final submission yet</p>
                                </div>
                            )}
                            
                            <div className="space-y-4 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Score / Grade</label>
                                    <input 
                                        type="text" 
                                        value={grade} 
                                        onChange={e => setGrade(e.target.value)} 
                                        placeholder="e.g., 85/100" 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white placeholder-slate-600 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">Feedback</label>
                                    <textarea 
                                        value={feedback} 
                                        onChange={e => setFeedback(e.target.value)} 
                                        placeholder="Constructive feedback..." 
                                        rows={4} 
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-white placeholder-slate-600"
                                    />
                                </div>
                                <Button onClick={handleSaveGrade} disabled={isSaving} className="w-full shadow-lg shadow-blue-600/20">
                                    {isSaving ? <Spinner size="sm" /> : 'Save Assessment'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Chat */}
                    <div className="lg:col-span-2 flex flex-col bg-slate-950 p-4 lg:p-6">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-lg h-[85vh] flex flex-col border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/50">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {isEditing ? 'Edit Squad' : 'New Squad Mission'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                    {isSubmitted && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
                            <span className="text-xl">🔒</span>
                            <p className="text-yellow-400 text-sm">Group has submitted work. Editing limited.</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Class</label>
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} disabled={isEditing} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                {classes.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Subject</label>
                            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} disabled={isEditing || subjectsForClass.length === 0} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                {subjectsForClass.length > 0 ? subjectsForClass.map(s => <option key={s} value={s}>{s}</option>) : <option>Select Class</option>}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Group Name</label>
                        <input type="text" placeholder="e.g., The Innovators" value={groupName} onChange={e => setGroupName(e.target.value)} required disabled={isSubmitted} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Assignment Title</label>
                        <input type="text" placeholder="e.g., Renewable Energy Project" value={assignmentTitle} onChange={e => setAssignmentTitle(e.target.value)} required disabled={isSubmitted} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                        <textarea placeholder="Instructions for the group..." value={assignmentDesc} onChange={e => setAssignmentDesc(e.target.value)} rows={3} disabled={isSubmitted} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 resize-none" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={isSubmitted} className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-300" />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Select Members</h4>
                            <span className="text-xs text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded-full">{selectedStudentUids.length} selected</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto grid grid-cols-2 gap-2 p-2 bg-slate-900/50 rounded-xl border border-slate-800 custom-scrollbar">
                            {studentsInSelectedClass.length > 0 ? studentsInSelectedClass.map(s => (
                                <label key={s.uid} className={`flex items-center gap-3 p-2 hover:bg-slate-800/80 rounded-lg transition-colors ${isSubmitted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedStudentUids.includes(s.uid) ? 'bg-blue-500 border-blue-500' : 'border-slate-600 bg-slate-800'}`}>
                                        {selectedStudentUids.includes(s.uid) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <input type="checkbox" checked={selectedStudentUids.includes(s.uid)} onChange={() => setSelectedStudentUids(p => p.includes(s.uid) ? p.filter(id => id !== s.uid) : [...p, s.uid])} disabled={isSubmitted} className="hidden" />
                                    <span className="text-sm text-slate-300 truncate">{s.name}</span>
                                </label>
                            )) : <p className="text-sm text-gray-500 col-span-2 text-center py-4">No students found for this class.</p>}
                        </div>
                    </div>
                </div>
                 <div className="flex-shrink-0 pt-6 flex justify-end gap-3 border-t border-slate-700/50 mt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isProcessing || isSubmitted} className="shadow-lg shadow-blue-600/20">{isProcessing ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Squad')}</Button>
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
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900 to-fuchsia-900 border border-white/10 shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute -right-20 -top-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <p className="text-pink-200 font-bold uppercase tracking-wider text-xs mb-2">Teacher Command Center</p>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-200 to-blue-200">{userProfile.name.split(' ')[0]}</span>!
                        </h2>
                        <p className="text-slate-200 text-lg max-w-xl">Ready to inspire the next generation? You have <span className="font-bold text-white">{pendingSubmissions}</span> new submissions waiting for review.</p>
                    </div>
                    <div className="hidden md:block text-6xl animate-float">
                        👩‍🏫
                    </div>
                </div>
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Total Students</p>
                            <p className="text-4xl font-black text-white mt-1">{students.length || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-2xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-3/4"></div>
                    </div>
                </div>

                <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-purple-500/50 rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Classes Active</p>
                            <p className="text-4xl font-black text-white mt-1">{teacherClasses.length || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-2xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                            🏫
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-1/2"></div>
                    </div>
                </div>

                <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-yellow-500/50 rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.15)]">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Pending Grade</p>
                            <p className="text-4xl font-black text-white mt-1">{pendingSubmissions}</p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-2xl border border-yellow-500/20 group-hover:scale-110 transition-transform">
                            📝
                        </div>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 w-1/4"></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-blue-400">⏳</span> Upcoming Deadlines
                        </h3>
                    </div>
                    <div className="space-y-3">
                        {upcomingAssignments.length > 0 ? upcomingAssignments.map(a => (
                            <div key={a.id} className="group p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-slate-200 group-hover:text-white transition-colors">{a.title}</p>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{a.classId}</span>
                                        <span>•</span>
                                        <span>{new Date(a.dueDate!).toLocaleDateString()}</span>
                                    </p>
                                </div>
                                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-md">Due Soon</span>
                            </div>
                        )) : <p className="text-slate-500 text-center py-8 italic">No upcoming deadlines.</p>}
                    </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-green-400">📥</span> Recent Submissions
                        </h3>
                    </div>
                    <div className="space-y-3">
                         {recentSubmissionsToGrade.length > 0 ? recentSubmissionsToGrade.map(s => {
                             const assignment = assignments.find(a => a.id === s.assignmentId);
                             return (
                                <div key={s.id} className="group p-4 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 hover:border-green-500/30 transition-all flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">{s.studentName.charAt(0)}</div>
                                        <div>
                                            <p className="font-bold text-slate-200 group-hover:text-white">{s.studentName}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{assignment?.title || 'Assignment'}</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-bold text-slate-900 bg-green-400 hover:bg-green-300 px-3 py-1.5 rounded-lg transition-colors">Grade</button>
                                </div>
                             )
                         }) : <p className="text-slate-500 text-center py-8 italic">All caught up! No submissions pending.</p>}
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
    
    // UI states
    const [loading, setLoading] = useState(true);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<Assignment | null>(null);
    const [isGrading, setIsGrading] = useState<string | null>(null);
    const [showPresentationGenerator, setShowPresentationGenerator] = useState(false);
    const [editingPresentation, setEditingPresentation] = useState<GeneratedContent | null>(null);
    const [contentToDelete, setContentToDelete] = useState<GeneratedContent | null>(null);
    const [isDeletingContent, setIsDeletingContent] = useState(false);
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');

    // My Students state
    const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
    const [studentCreationClass, setStudentCreationClass] = useState<string | null>(null);
    const [showCreateParentModal, setShowCreateParentModal] = useState(false);
    const [viewingStudentProgress, setViewingStudentProgress] = useState<UserProfile | null>(null);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');

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
    
    const [aiSystemInstruction, setAiSystemInstruction] = useState('');
    const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
  
    const teacherClasses = useMemo<string[]>(() => {
        if (!userProfile) return [];
        const allClasses = new Set([
            ...(userProfile.classesTaught || []),
            ...(userProfile.classTeacherOf ? [userProfile.classTeacherOf] : []),
        ]);
        return Array.from(allClasses).sort();
    }, [userProfile]);
    
    const teacherSubjects = useMemo<string[]>(() => {
        if (!userProfile || !userProfile.subjectsByClass || typeof userProfile.subjectsByClass !== 'object') {
            return [];
        }
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

        unsubscribers.push(db.collection('assignments').where('teacherId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)))));

        unsubscribers.push(db.collection('submissions').where('teacherId', '==', user.uid)
            .onSnapshot(snap => setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)))));

        unsubscribers.push(db.collection('users').where('class', 'in', teacherClasses)
            .where('role', '==', 'student')
            .onSnapshot(snap => setStudents(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u && u.uid))));
        
        unsubscribers.push(db.collection('generatedContent').where('collaboratorUids', 'array-contains', user.uid)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snap => setMyLibraryContent(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedContent)))));

        unsubscribers.push(db.collection('liveLessons').where('teacherId', '==', user.uid).where('status', '==', 'active')
            .onSnapshot(snap => setActiveLiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson)));
        
        unsubscribers.push(db.collection('users').where('role', '==', 'parent').onSnapshot(snap => setAllParents(snap.docs.map(d => d.data() as UserProfile).filter(u => u && u.uid))));
        unsubscribers.push(db.collection('users').where('role', '==', 'teacher').onSnapshot(snap => setAllTeachers(snap.docs.map(d => d.data() as UserProfile).filter(u => u && u.uid))));
        
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
    
    useEffect(() => {
        const baseInstruction = "You are an AI assistant for a teacher at UTOPIA INTERNATIONAL SCHOOL. Your role is to help with lesson planning, student progress analysis, and administrative tasks. Maintain a professional and supportive tone. You can summarize the content on the teacher's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
        let context = '';
        let prompts: string[] = ["Draft a lesson plan for a Basic 5 science class on ecosystems."];

        switch (activeTab) {
            case 'dashboard':
                context = `The teacher is on their main dashboard. They have ${submissions.filter(s => s.status === 'Submitted').length} submissions to grade.`;
                prompts.push("Summarize my students' recent performance.");
                break;
            default:
                context = `The teacher is on the ${activeTab.replace(/_/g, ' ')} page.`;
                break;
        }
        setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
        setAiSuggestedPrompts(prompts);
    }, [activeTab, submissions, assignments]);

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
            handleCancelGrading();
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
            await db.collection('assignments').doc(assignmentId).delete();
        }
    };
    
    const handleStartLiveLesson = useCallback(async (content: GeneratedContent) => {
        if (!user || !userProfile) return;

        setShowPresentationGenerator(false);

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
            classId: content.classes[0], 
            subject: content.subject,
            topic: content.topic,
            status: 'active',
            currentStepIndex: 0,
            lessonPlan: lessonPlan,
            currentBoardContent: lessonPlan[0].boardContent,
            currentQuestion: lessonPlan[0].question,
        };

        if (content.id) {
            newLessonData.sourcePresentationId = content.id;
        }

        try {
            const lessonRef = await db.collection('liveLessons').add({
                ...newLessonData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (!content.id) {
                const imagePromises = content.presentation.slides.map(async (slide, index) => {
                    if (slide.imageUrl && slide.imageUrl.startsWith('data:')) {
                        const response = await fetch(slide.imageUrl);
                        const blob = await response.blob();
                        const compressedBlob = await compressImage(blob);
                        const storagePath = `liveLessons/${lessonRef.id}/images/slide_${index}.jpg`;
                        const storageRef = storage.ref(storagePath);
                        await storageRef.put(compressedBlob);
                        const downloadURL = await storageRef.getDownloadURL();
                        
                        return lessonRef.collection('images').doc(index.toString()).set({
                            imageUrl: downloadURL,
                            imageStyle: slide.imageStyle
                        });
                    }
                });
                Promise.all(imagePromises).catch(err => {
                    console.error("Background image upload failed:", err);
                    setToast({ message: "Some lesson images failed to upload.", type: 'error' });
                });
            } else {
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
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-xl">📊</span> },
        { key: 'my_students', label: 'My Students', icon: <span className="text-xl">👨‍🎓</span> },
        { key: 'assignments', label: 'Assignments', icon: <span className="text-xl">📝</span> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {activeLiveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-xl">📡</span> },
        { key: 'group_work', label: 'Group Work', icon: <span className="text-xl">👥</span> },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <span className="text-xl">💬</span> },
        { key: 'my_library', label: 'My Library', icon: <span className="text-xl">📚</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-xl">📅</span> },
        { key: 'terminal_reports', label: 'Terminal Reports', icon: <span className="text-xl">📄</span> },
        { key: 'past_questions', label: 'BECE Questions', icon: <span className="text-xl">🎓</span> },
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
                const studentsByClass = students.reduce((acc: Record<string, UserProfile[]>, student) => {
                    const classKey = student.class || 'Unassigned';
                    if (!acc[classKey]) {
                        acc[classKey] = [];
                    }
                    acc[classKey].push(student);
                    return acc;
                }, {});
                
                return (
                    <div className="space-y-8">
                         <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                             <div>
                                 <h2 className="text-3xl font-bold">My Students</h2>
                                 <p className="text-slate-400 text-sm mt-1">Manage student profiles and track progress across {Object.keys(studentsByClass).length} classes.</p>
                             </div>
                             <div className="flex gap-3">
                                 <div className="relative">
                                     <input 
                                        type="search" 
                                        placeholder="Search students..." 
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64 transition-all"
                                     />
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
                                 </div>
                                 <Button onClick={() => setShowCreateParentModal(true)} variant="secondary">Link Parent</Button>
                             </div>
                         </div>
                         
                         {Object.keys(studentsByClass).map((classId) => {
                            const classStudents = studentsByClass[classId].filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()));
                            if (classStudents.length === 0) return null;

                            return (
                                <div key={classId} className="animate-fade-in-up">
                                    <div className="flex justify-between items-center mb-4 px-1">
                                        <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                                            <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                                            {classId} <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">{classStudents.length}</span>
                                        </h3>
                                        <Button size="sm" onClick={() => { setStudentCreationClass(classId); setShowCreateStudentModal(true); }}>+ Add Student</Button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {classStudents.map(student => (
                                            <TeacherStudentCard 
                                                key={student.uid}
                                                student={student}
                                                classAssignments={assignments.filter(a => a.classId === classId)}
                                                studentSubmissions={submissions.filter(s => s.studentId === student.uid)}
                                                onClick={() => setViewingStudentProgress(student)}
                                                onMessage={() => { /* Logic to open message modal could go here */ }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                         })}
                     </div>
                 );
            case 'assignments':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-3xl font-bold">Assignments</h2>
                            <div className="flex items-center gap-3 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                                <select id="class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)} className="bg-transparent text-sm p-2 outline-none text-slate-300 cursor-pointer">
                                    <option value="all">All Classes</option>
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="w-px h-4 bg-slate-600"></div>
                                <select id="subject-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="bg-transparent text-sm p-2 outline-none text-slate-300 cursor-pointer">
                                    <option value="all">All Subjects</option>
                                    {subjectsForFilter.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <Button onClick={handleCreateNewAssignment} className="shadow-lg shadow-blue-600/20">+ New Assignment</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredAssignments.map(assignment => {
                                const submissionCount = submissions.filter(s => s.assignmentId === assignment.id).length;
                                const gradedCount = submissions.filter(s => s.assignmentId === assignment.id && s.status === 'Graded').length;
                                
                                return (
                                    <div key={assignment.id} className="group bg-slate-800/40 backdrop-blur-md border border-slate-700 hover:border-blue-500/50 rounded-2xl p-0 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col">
                                        <div className="p-5 border-b border-slate-700/50 relative overflow-hidden">
                                            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider ${assignment.type === 'Objective' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                {assignment.type || 'Theory'}
                                            </div>
                                            <h3 className="text-lg font-bold text-white line-clamp-1 pr-12">{assignment.title}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600">{assignment.classId}</span>
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 border border-slate-600 truncate max-w-[150px]">{assignment.subject}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="p-5 flex-grow">
                                            <p className="text-sm text-slate-400 line-clamp-3 mb-4">{assignment.description}</p>
                                            
                                            <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                                                <span>Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No Date'}</span>
                                                <span className={gradedCount === submissionCount && submissionCount > 0 ? 'text-green-400' : 'text-yellow-400'}>
                                                    {gradedCount}/{submissionCount} Graded
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-700 h-1 mt-2 rounded-full overflow-hidden">
                                                <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${submissionCount > 0 ? (gradedCount/submissionCount)*100 : 0}%` }}></div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-900/30 border-t border-slate-700/50 flex justify-between items-center rounded-b-2xl">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEditAssignment(assignment)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors" title="Edit">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors" title="Delete">
                                                    🗑️
                                                </button>
                                            </div>
                                            <Button size="sm" onClick={() => setViewingSubmissionsFor(assignment)}>
                                                View Work
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'live_lesson':
                return activeLiveLesson ? 
                        <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => {}} userProfile={userProfile} />
                        :
                        <div className="flex flex-col items-center justify-center h-[80vh] text-center">
                            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl border border-slate-700 animate-pulse">
                                📡
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Live Classroom</h2>
                            <p className="text-slate-400 max-w-md mb-8">Start an interactive session with real-time whiteboard, polls, and Q&A.</p>
                            <Button size="lg" onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }} className="shadow-lg shadow-blue-600/20">
                                Launch New Session
                            </Button>
                        </div>;
            case 'group_work':
                return (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">Group Projects</h2>
                            <div className="flex items-center gap-4">
                               <select value={groupClassFilter} onChange={e => setGroupClassFilter(e.target.value)} className="p-2 bg-slate-800 rounded-lg border border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="all">All Classes</option>
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <Button onClick={() => { setEditingGroup(null); setShowCreateGroupModal(true); }}>+ New Group</Button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredGroups.length > 0 ? filteredGroups.map(group => (
                                <div key={group.id} className="group relative bg-slate-800/40 backdrop-blur-md border border-slate-700 hover:border-purple-500/50 rounded-2xl p-5 transition-all hover:shadow-xl flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{group.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1">{group.classId} &bull; {group.subject}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg border ${group.isSubmitted ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {group.isSubmitted ? 'Submitted' : 'Active'}
                                        </span>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <p className="text-sm text-slate-300 font-medium mb-2 truncate">{group.assignmentTitle}</p>
                                        <div className="flex -space-x-2 overflow-hidden py-1">
                                            {group.members.slice(0, 5).map((m, i) => (
                                                <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white" title={m.name}>
                                                    {m.name.charAt(0)}
                                                </div>
                                            ))}
                                            {group.members.length > 5 && (
                                                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-800 bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                                    +{group.members.length - 5}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
                                        <Button size="sm" variant="secondary" onClick={() => setViewingGroup(group)}>Manage & Chat</Button>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingGroup(group); setShowCreateGroupModal(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">✏️</button>
                                            <button onClick={() => setGroupToDelete(group)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl">
                                    <p className="text-slate-500">No groups created yet.</p>
                                </div>
                            )}
                        </div>
                     </div>
                );
            case 'messages':
                return <MessagingView userProfile={userProfile} contacts={contactsForMessaging} />;
            case 'my_library':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">My Library</h2>
                            <Button onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }}>+ Create Content</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myLibraryContent.map(content => (
                                <Card key={content.id}>
                                    <div className="aspect-video bg-slate-900 mb-4 rounded-lg flex items-center justify-center text-4xl relative overflow-hidden group">
                                        {/* If we had a thumbnail, show it here. For now, generic icon */}
                                        <span className="group-hover:scale-110 transition-transform duration-500">📚</span>
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                            <Button size="sm" onClick={() => handleStartLiveLesson(content)}>Present</Button>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold truncate">{content.topic}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{content.classes.join(', ')} &bull; {content.subject}</p>
                                    <div className="mt-4 flex justify-end gap-2 border-t border-slate-700 pt-3">
                                        <button onClick={() => { setEditingPresentation(content); setShowPresentationGenerator(true); }} className="text-slate-400 hover:text-blue-400 text-xs font-medium">Edit</button>
                                        <button onClick={() => setShowVideoGenerator(true)} className="text-slate-400 hover:text-purple-400 text-xs font-medium">Make Video</button>
                                        <button onClick={() => setContentToDelete(content)} className="text-slate-400 hover:text-red-400 text-xs font-medium">Delete</button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'attendance':
                if (!userProfile.classTeacherOf) {
                    return <div className="p-8 text-center text-slate-500">You are not a designated class teacher. Only class teachers can take attendance.</div>;
                }
                const classStudents = students.filter(s => s.class === userProfile.classTeacherOf);
                return (
                     <div className="max-w-4xl mx-auto">
                         <Card>
                             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">{userProfile.classTeacherOf} Register</h2>
                                    <p className="text-sm text-slate-400">Date: {new Date(attendanceDate).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <Button onClick={handleSaveAttendance} disabled={isSavingAttendance}>{isSavingAttendance ? 'Saving...' : 'Save Register'}</Button>
                                </div>
                             </div>
                             
                             <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden">
                                 <div className="flex justify-between items-center p-3 bg-slate-800 border-b border-slate-700 text-xs font-bold uppercase text-slate-400 tracking-wider">
                                     <span className="pl-2">Student Name</span>
                                     <div className="flex gap-2 pr-2">
                                         <button onClick={() => handleMarkAll('Present')} className="hover:text-green-400 transition-colors">All Present</button>
                                         <span>|</span>
                                         <button onClick={() => handleMarkAll('Absent')} className="hover:text-red-400 transition-colors">All Absent</button>
                                     </div>
                                 </div>
                                 <div className="divide-y divide-slate-800 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                     {classStudents.map(student => (
                                         <div key={student.uid} className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">{student.name.charAt(0)}</div>
                                                 <span className="font-medium text-slate-200">{student.name}</span>
                                             </div>
                                             <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                                                 {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(status => {
                                                     const isActive = attendanceData[student.uid] === status;
                                                     let activeClass = '';
                                                     if (isActive) {
                                                         if (status === 'Present') activeClass = 'bg-green-600 text-white shadow-lg shadow-green-900/50';
                                                         if (status === 'Absent') activeClass = 'bg-red-600 text-white shadow-lg shadow-red-900/50';
                                                         if (status === 'Late') activeClass = 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/50';
                                                     } else {
                                                         activeClass = 'text-slate-500 hover:text-slate-300';
                                                     }
                                                     
                                                     return (
                                                         <button
                                                             key={status}
                                                             onClick={() => handleAttendanceChange(student.uid, status)}
                                                             className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${activeClass}`}
                                                         >
                                                             {status}
                                                         </button>
                                                     );
                                                 })}
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </Card>
                     </div>
                );
            case 'terminal_reports':
                const studentsForReport = students.filter(s => s.class === reportClass);
                return (
                    <Card className="!p-0 overflow-hidden border border-slate-700 bg-slate-900">
                        <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                             <div>
                                <h2 className="text-2xl font-bold">Terminal Reports</h2>
                                <p className="text-sm text-slate-400 mt-1">Enter marks and generate end-of-term reports.</p>
                             </div>
                             <div className="flex flex-wrap items-center gap-3">
                                <select value={reportClass} onChange={e => setReportClass(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={reportSubject} onChange={e => setReportSubject(e.target.value)} disabled={subjectsForReport.length === 0} className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    {subjectsForReport.length > 0 ? subjectsForReport.map(s => <option key={s} value={s}>{s}</option>) : <option>No subjects for class</option>}
                                </select>
                                <div className="h-8 w-px bg-slate-700 mx-2"></div>
                                <Button variant="secondary" onClick={handleAutoFillScores} size="sm">✨ Auto-fill</Button>
                                <Button onClick={calculateTotalsAndSave} disabled={isSavingMarks} size="sm">{isSavingMarks ? 'Saving...' : 'Save Changes'}</Button>
                             </div>
                        </div>
                        
                         <div className="overflow-x-auto">
                             <table className="min-w-full text-sm border-collapse">
                                 <thead className="bg-slate-950 text-slate-400 uppercase text-xs sticky top-0 z-20">
                                    <tr>
                                        <th rowSpan={2} className="px-4 py-3 text-left border-r border-slate-800 sticky left-0 bg-slate-950 z-30 shadow-[4px_0_8px_rgba(0,0,0,0.2)] min-w-[250px]">
                                            Student Name
                                        </th>
                                        <th colSpan={5} className="px-2 py-2 text-center border-r border-slate-800 bg-blue-900/10 text-blue-400 font-bold border-b border-slate-800">
                                            Class Assessment (60)
                                        </th>
                                        <th rowSpan={2} className="px-2 py-2 text-center border-r border-slate-800 bg-purple-900/10 text-purple-400 font-bold min-w-[100px]">
                                            Exam Score (100)
                                        </th>
                                        <th colSpan={5} className="px-2 py-2 text-center bg-green-900/10 text-green-400 font-bold border-b border-slate-800">
                                            Final Grading
                                        </th>
                                    </tr>
                                    <tr>
                                        {/* CA Columns */}
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-blue-900/5 min-w-[80px]">Assign<br/><span className="text-[10px] opacity-60">(15)</span></th>
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-blue-900/5 min-w-[80px]">Group<br/><span className="text-[10px] opacity-60">(15)</span></th>
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-blue-900/5 min-w-[80px]">Test<br/><span className="text-[10px] opacity-60">(15)</span></th>
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-blue-900/5 min-w-[80px]">Project<br/><span className="text-[10px] opacity-60">(15)</span></th>
                                        <th className="px-2 py-2 text-center font-bold text-slate-200 border-r border-slate-800 bg-blue-900/20 min-w-[80px]">Total<br/><span className="text-[10px] opacity-60">(60)</span></th>
                                        
                                        {/* Final Columns */}
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-green-900/5 min-w-[80px]">Class<br/><span className="text-[10px] opacity-60">(50%)</span></th>
                                        <th className="px-2 py-2 text-center font-medium border-r border-slate-800 bg-green-900/5 min-w-[80px]">Exam<br/><span className="text-[10px] opacity-60">(50%)</span></th>
                                        <th className="px-2 py-2 text-center font-black text-white border-r border-slate-800 bg-green-900/20 min-w-[80px]">Total<br/><span className="text-[10px] opacity-60">(100%)</span></th>
                                        <th className="px-2 py-2 text-center font-bold border-r border-slate-800 bg-green-900/5 min-w-[60px]">Grade</th>
                                        <th className="px-2 py-2 text-center font-bold bg-green-900/5 min-w-[60px]">Pos</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800 bg-slate-900">
                                    {studentsForReport.map(student => {
                                        const mark = marks[student.uid] || {};
                                        const totalClassScore = (mark.indivTest || 0) + (mark.groupWork || 0) + (mark.classTest || 0) + (mark.project || 0);
                                        const scaledClassScore = (totalClassScore / 60) * 50;
                                        const scaledExamScore = ((mark.endOfTermExams || 0) / 100) * 50;
                                        const overallTotal = scaledClassScore + scaledExamScore;
                                        const grade = getGrade(overallTotal);

                                        let gradeColor = 'text-slate-400';
                                        if (grade === 'A' || grade === 'B+') gradeColor = 'text-green-400 font-bold';
                                        else if (grade === 'F') gradeColor = 'text-red-400 font-bold';
                                        else if (grade === 'D' || grade === 'D+') gradeColor = 'text-yellow-400';

                                        return (
                                            <tr key={student.uid} className="hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-4 py-3 font-medium text-slate-200 sticky left-0 bg-slate-900 group-hover:bg-slate-800 transition-colors border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.2)]">{student.name}</td>
                                                <td className="p-2 text-center"><input type="number" step="0.1" min="0" max="15" value={mark.indivTest ?? ''} onChange={e => handleMarkChange(student.uid, 'indivTest', e.target.value)} className="w-16 p-1.5 bg-slate-800 border border-slate-700 rounded text-center focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-slate-300"/></td>
                                                <td className="p-2 text-center"><input type="number" step="0.1" min="0" max="15" value={mark.groupWork ?? ''} onChange={e => handleMarkChange(student.uid, 'groupWork', e.target.value)} className="w-16 p-1.5 bg-slate-800 border border-slate-700 rounded text-center focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-slate-300"/></td>
                                                <td className="p-2 text-center"><input type="number" step="0.1" min="0" max="15" value={mark.classTest ?? ''} onChange={e => handleMarkChange(student.uid, 'classTest', e.target.value)} className="w-16 p-1.5 bg-slate-800 border border-slate-700 rounded text-center focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-slate-300"/></td>
                                                <td className="p-2 text-center"><input type="number" step="0.1" min="0" max="15" value={mark.project ?? ''} onChange={e => handleMarkChange(student.uid, 'project', e.target.value)} className="w-16 p-1.5 bg-slate-800 border border-slate-700 rounded text-center focus:border-blue-500 outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-slate-300"/></td>
                                                <td className="p-2 text-center font-bold text-slate-300 bg-slate-800/30 border-r border-slate-800">{totalClassScore.toFixed(1)}</td>
                                                <td className="p-2 text-center border-r border-slate-800 bg-slate-800/30"><input type="number" step="0.1" min="0" max="100" value={mark.endOfTermExams ?? ''} onChange={e => handleMarkChange(student.uid, 'endOfTermExams', e.target.value)} className="w-20 p-1.5 bg-slate-900 border border-purple-500/30 rounded text-center focus:border-purple-500 outline-none focus:ring-1 focus:ring-purple-500 transition-all font-mono font-bold text-purple-300"/></td>
                                                <td className="p-2 text-center font-medium text-slate-400 border-r border-slate-800">{scaledClassScore.toFixed(1)}</td>
                                                <td className="p-2 text-center font-medium text-slate-400 border-r border-slate-800">{scaledExamScore.toFixed(1)}</td>
                                                <td className="p-2 text-center font-black text-white text-lg bg-green-500/5 border-r border-slate-800">{overallTotal.toFixed(1)}</td>
                                                <td className={`p-2 text-center font-bold text-lg border-r border-slate-800 ${gradeColor}`}>{grade}</td>
                                                <td className="p-2 text-center font-mono text-slate-500">{mark.position || '-'}</td>
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
            default:
                return <div>Select a tab</div>;
        }
    };
    
    // RENDER MAIN COMPONENT
    return (
        <div className="flex flex-1 overflow-hidden bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
            <Sidebar 
                isExpanded={isSidebarExpanded}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setIsSidebarExpanded(false)}
                title="Teacher Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto relative custom-scrollbar">
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

export default TeacherView;
