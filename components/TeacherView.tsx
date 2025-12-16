
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuthentication } from '../hooks/useAuth';
import { db, storage, functions, firebase } from '../services/firebase';
import { GES_STANDARD_CURRICULUM } from '../types';
import type { Assignment, Submission, UserProfile, GeneratedContent, SubjectsByClass, GES_CLASSES, Timetable, Quiz, LiveLesson, LiveLessonStep, Group, GroupMessage, Conversation, TerminalReport, TerminalReportMark, AttendanceStatus, VideoContent } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { PresentationGenerator } from './PresentationGenerator';
import Sidebar from './common/Sidebar';
import ConfirmationModal from './common/ConfirmationModal';
import AIAssistant from './AIAssistant';
import ChangePasswordModal from './common/ChangePasswordModal';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import AssignmentModal from './AssignmentModal';
import Toast from './common/Toast';
import VideoGenerator from './VideoGenerator';
import TeacherCreateStudentForm from './TeacherCreateStudentForm';
import TeacherCreateParentForm from './TeacherCreateParentForm';
import { TeacherLiveClassroom } from './TeacherLiveClassroom';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import MessagingView from './MessagingView';
import { ProgressDashboard } from './ProgressDashboard';
import UserEditModal from './UserEditModal';
import TeacherAITools from './TeacherAITools';
import TeacherMyVoice from './TeacherMyVoice';
// Import the shared component
import AdminTerminalReports from './AdminTerminalReports';

const getGrade = (score: number) => {
    if (isNaN(score)) return '-';
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
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <p className="text-center text-gray-500">No messages yet.</p>
                ) : messages.map(msg => (
                    <div key={msg.id} className="flex flex-col items-start">
                        <span className="text-xs text-gray-400 font-bold ml-1">{msg.senderName}</span>
                        <div className="p-2 bg-slate-700 rounded-lg max-w-xs break-words">
                           {msg.imageUrl && <img src={msg.imageUrl} alt="Group attachment" className="rounded-md max-w-xs mb-1" />}
                           {msg.audioUrl && <audio controls src={msg.audioUrl} className="w-full max-w-xs" />}
                           {msg.text && <p className="text-sm px-1">{msg.text}</p>}
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            <p className="text-xs text-center text-gray-500 p-2 border-t border-slate-700">You are viewing this chat in monitor mode.</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-4xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">{group.name}</h2>
                        <p className="text-sm text-gray-400">{group.classId} - {group.subject}</p>
                    </div>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
                <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
                    <div className="md:col-span-1 flex flex-col space-y-4 overflow-y-auto pr-2">
                        <div>
                            <h4 className="font-semibold text-gray-300">Assignment: <span className="text-white font-bold">{group.assignmentTitle}</span></h4>
                            <p className="text-xs text-gray-400 whitespace-pre-wrap mt-1">{group.assignmentDescription}</p>
                            <p className="text-xs text-yellow-400 mt-1">Due: {group.dueDate || 'N/A'}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-300">Members</h4>
                            <ul className="list-disc list-inside text-sm text-gray-200">
                                {group.members.map(m => <li key={m.uid}>{m.name}</li>)}
                            </ul>
                        </div>
                        {group.isSubmitted && group.submission ? (
                            <div className="space-y-2 p-3 bg-slate-900/50 rounded-lg">
                                <h4 className="font-semibold text-gray-300">Submission</h4>
                                <pre className="text-sm whitespace-pre-wrap font-sans bg-slate-800 p-2 rounded-md max-h-48 overflow-y-auto">{group.submission.content}</pre>
                                <p className="text-xs text-gray-400">Submitted by {group.submission.submittedBy.name} on {group.submission.submittedAt.toDate().toLocaleString()}</p>
                            </div>
                        ) : (
                             <div className="space-y-2 p-3 bg-slate-900/50 rounded-lg text-center text-gray-400">
                                Not submitted yet.
                             </div>
                        )}
                        <div className="space-y-2 flex-grow flex flex-col">
                            <h4 className="font-semibold text-gray-300">Grade & Feedback</h4>
                            <input type="text" value={grade} onChange={e => setGrade(e.target.value)} placeholder="Enter grade (e.g., 14)" className="w-full p-2 bg-slate-700 rounded-md"/>
                            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Enter feedback..." rows={4} className="w-full p-2 bg-slate-700 rounded-md flex-grow"/>
                            <Button onClick={handleSaveGrade} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex flex-col bg-slate-900/50 rounded-lg">
                         <h4 className="font-semibold p-3 border-b border-slate-700 flex-shrink-0">Group Chat (Monitor Mode)</h4>
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
        <div className="space-y-8 animate-fade-in-up">
             <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{userProfile.name}</span>
                    </h1>
                    <p className="text-slate-400 text-lg">Your command center for today's educational journey.</p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <div className="text-right">
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Academic Term</p>
                         <p className="text-xl font-bold text-white">2</p>
                    </div>
                     <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-2xl shadow-inner">🗓️</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="!bg-blue-900/20 !border-blue-500/30 flex items-center justify-between p-6 group hover:!bg-blue-900/30 transition-all">
                    <div>
                        <p className="text-sm text-blue-300 font-bold uppercase tracking-wider">Total Students</p>
                        <p className="text-4xl font-black text-white mt-1">{students.length || 0}</p>
                    </div>
                    <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        🎓
                    </div>
                </Card>
                
                <Card className="!bg-purple-900/20 !border-purple-500/30 flex items-center justify-between p-6 group hover:!bg-purple-900/30 transition-all">
                    <div>
                        <p className="text-sm text-purple-300 font-bold uppercase tracking-wider">Active Classes</p>
                        <p className="text-4xl font-black text-white mt-1">{teacherClasses.length || 0}</p>
                    </div>
                    <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        🏫
                    </div>
                </Card>

                 <Card className="!bg-orange-900/20 !border-orange-500/30 flex items-center justify-between p-6 group hover:!bg-orange-900/30 transition-all">
                    <div>
                        <p className="text-sm text-orange-300 font-bold uppercase tracking-wider">To Grade</p>
                        <p className="text-4xl font-black text-white mt-1">{pendingSubmissions}</p>
                    </div>
                    <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        📝
                    </div>
                </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="text-blue-500">🔥</span> Upcoming Deadlines
                    </h3>
                    <div className="space-y-3">
                        {upcomingAssignments.length > 0 ? upcomingAssignments.map(a => (
                            <div key={a.id} className="p-4 bg-slate-800/50 rounded-xl flex justify-between items-center border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                <div>
                                    <p className="font-bold text-white">{a.title}</p>
                                    <p className="text-sm text-slate-400">{a.classId} &bull; {a.subject}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-yellow-400">{new Date(a.dueDate!).toLocaleDateString()}</p>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">Due Date</p>
                                </div>
                            </div>
                        )) : <p className="text-slate-500 text-center py-6">No upcoming deadlines.</p>}
                    </div>
                </Card>
                <Card>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="text-green-500">📥</span> Recent Submissions
                    </h3>
                    <div className="space-y-3">
                         {recentSubmissionsToGrade.length > 0 ? recentSubmissionsToGrade.map(s => {
                             const assignment = assignments.find(a => a.id === s.assignmentId);
                             return (
                                <div key={s.id} className="p-4 bg-slate-800/50 rounded-xl flex justify-between items-center border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400">
                                            {s.studentName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{s.studentName}</p>
                                            <p className="text-sm text-slate-400 truncate max-w-[200px]">{assignment?.title || 'Unknown Assignment'}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-500/20">Needs Grading</span>
                                </div>
                             )
                         }) : <p className="text-slate-500 text-center py-6">All caught up! No new submissions.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

interface TeacherViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const TeacherView: React.FC<TeacherViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
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
    const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Attendance state
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
    const [isSavingAttendance, setIsSavingAttendance] = useState(false);

    // Filter states
    const [classFilter, setClassFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
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
        return Object.values(subjectsMap).filter(Array.isArray).flat();
    }, [userProfile?.subjectsByClass]);

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
                    options: quizQuestion.options || [],
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

    const handleSaveStudent = async (uid: string, data: Partial<UserProfile>) => {
        try {
            await db.collection('users').doc(uid).update(data);
            setToast({ message: "Student updated successfully", type: "success" });
            setIsEditModalOpen(false);
            setEditingStudent(null);
        } catch (error: any) {
             setToast({ message: `Error updating student: ${error.message}`, type: "error" });
        }
    };


    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <span className="text-2xl">🚀</span> },
        { key: 'my_students', label: 'My Students', icon: <span className="text-2xl">👨‍🎓</span> },
        { key: 'assignments', label: 'Assignments', icon: <span className="text-2xl">📚</span> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {activeLiveLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <span className="text-2xl">📡</span> },
        { key: 'group_work', label: 'Group Work', icon: <span className="text-2xl">🤝</span> },
        { key: 'ai_tools', label: 'AI Copilot', icon: <span className="text-2xl">🤖</span> },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <span className="text-2xl">💬</span> },
        { key: 'my_library', label: 'My Library', icon: <span className="text-2xl">🗃️</span> },
        { key: 'my_voice', label: 'My Voice', icon: <span className="text-2xl">🎙️</span> },
        { key: 'attendance', label: 'Attendance', icon: <span className="text-2xl">📅</span> },
        { key: 'terminal_reports', label: 'Terminal Reports', icon: <span className="text-2xl">📊</span> },
        { key: 'past_questions', label: 'BECE Questions', icon: <span className="text-2xl">📝</span> },
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
                    <div className="space-y-6">
                         <div className="flex justify-between items-center">
                             <h2 className="text-3xl font-bold">My Students</h2>
                             <Button onClick={() => setShowCreateParentModal(true)}>Create Parent Account</Button>
                         </div>
                         {Object.keys(studentsByClass).map((classId) => {
                            const classStudents = studentsByClass[classId];
                            return (
                                <Card key={classId}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-semibold">{classId} ({classStudents.length} students)</h3>
                                        <Button size="sm" onClick={() => { setStudentCreationClass(classId); setShowCreateStudentModal(true); }}>+ Add Student</Button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {classStudents.map(student => (
                                            <button key={student.uid} onClick={() => setViewingStudentProgress(student)} className="p-3 bg-slate-700 rounded-lg text-left hover:bg-slate-600 transition-colors flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-600">
                                                    {student.photoURL ? (
                                                        <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{student.name.charAt(0)}</div>
                                                    )}
                                                </div>
                                                <span className="font-medium text-slate-200">{student.name}</span>
                                                <div 
                                                    className="ml-auto p-1.5 hover:bg-slate-500 rounded text-slate-400 hover:text-white"
                                                    onClick={(e) => { e.stopPropagation(); setEditingStudent(student); setIsEditModalOpen(true); }}
                                                    title="Edit Student"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.433 13.917l1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </Card>
                            );
                         })}
                     </div>
                 );
            case 'assignments':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-3xl font-bold">Assignments</h2>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="class-filter" className="text-sm text-gray-400">Class:</label>
                                    <select id="class-filter" value={classFilter} onChange={e => setClassFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                                        <option value="all">All Classes</option>
                                        {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                     <label htmlFor="subject-filter" className="text-sm text-gray-400">Subject:</label>
                                    <select id="subject-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                                        <option value="all">All Subjects</option>
                                        {subjectsForFilter.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <Button onClick={handleCreateNewAssignment}>+ Create</Button>
                            </div>
                        </div>

                        {filteredAssignments.map(assignment => (
                            <Card key={assignment.id}>
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <h3 className="text-xl font-bold">{assignment.title}</h3>
                                        <p className="text-sm text-gray-400">{assignment.classId} &bull; {assignment.subject}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleEditAssignment(assignment)}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeleteAssignment(assignment.id)}>Delete</Button>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <h4 className="font-semibold text-gray-300">Description</h4>
                                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{assignment.description.substring(0, 150)}{assignment.description.length > 150 && '...'}</p>
                                </div>
                                 <div className="mt-4 flex justify-between items-center">
                                    <p className="text-sm text-yellow-400">Due: {assignment.dueDate || 'Not set'}</p>
                                    <Button onClick={() => setViewingSubmissionsFor(assignment)}>
                                        View Submissions ({submissions.filter(s => s.assignmentId === assignment.id).length})
                                    </Button>
                                 </div>
                            </Card>
                        ))}
                    </div>
                );
            case 'live_lesson':
                return activeLiveLesson ? 
                        <TeacherLiveClassroom lessonId={activeLiveLesson.id} onClose={() => {}} setToast={setToast} userProfile={userProfile} />
                        :
                        <div className="text-center p-8">
                            <h2 className="text-3xl font-bold">Live Lesson</h2>
                            <p className="mt-4 text-gray-400">Start an interactive lesson with your class.</p>
                             <div className="mt-6 flex justify-center gap-4">
                                <Button onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }}>Create New Lesson</Button>
                            </div>
                        </div>;
            case 'group_work':
                return (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">Group Work</h2>
                            <div className="flex items-center gap-4">
                               <select value={groupClassFilter} onChange={e => setGroupClassFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                                    <option value="all">All Classes</option>
                                    {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                                <Button onClick={() => { setEditingGroup(null); setShowCreateGroupModal(true); }}>Create New Group</Button>
                            </div>
                        </div>
                        {filteredGroups.length > 0 ? filteredGroups.map(group => (
                            <Card key={group.id}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{group.name}</h3>
                                        <p className="text-sm text-gray-400">{group.classId} - {group.subject}</p>
                                        <p className="text-xs text-gray-500 mt-1">{group.members.length} members</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${group.isSubmitted ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                            {group.isSubmitted ? 'Submitted' : 'In Progress'}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => setViewingGroup(group)}>View Details</Button>
                                            <Button size="sm" variant="secondary" onClick={() => { setEditingGroup(group); setShowCreateGroupModal(true); }}>Edit</Button>
                                            <Button size="sm" variant="danger" onClick={() => setGroupToDelete(group)}>Delete</Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )) : <p className="text-center text-gray-400">No groups created yet.</p>}
                     </div>
                );
            case 'ai_tools':
                return <TeacherAITools students={students} userProfile={userProfile} />;
            case 'messages':
                return <MessagingView userProfile={userProfile} contacts={contactsForMessaging} />;
            case 'my_library':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-bold">My Library</h2>
                            <Button onClick={() => { setEditingPresentation(null); setShowPresentationGenerator(true); }}>+ Create New</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myLibraryContent.map(content => (
                                <Card key={content.id}>
                                    <h3 className="text-xl font-bold truncate">{content.topic}</h3>
                                    <p className="text-sm text-gray-400">{content.classes.join(', ')} - {content.subject}</p>
                                    <p className="text-xs text-gray-500 mt-2">Created on {content.createdAt.toDate().toLocaleDateString()}</p>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button size="sm" onClick={() => handleStartLiveLesson(content)}>Start Live Lesson</Button>
                                        <Button size="sm" variant="secondary" onClick={() => { setEditingPresentation(content); setShowPresentationGenerator(true); }}>Edit</Button>
                                        <Button size="sm" variant="danger" onClick={() => setContentToDelete(content)}>Delete</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setShowVideoGenerator(true)}>Create a Video</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                );
            case 'my_voice':
                return <TeacherMyVoice userProfile={userProfile} />;
            case 'attendance':
                if (!userProfile.classTeacherOf) {
                    return <Card><p className="text-center">You are not a designated class teacher. Only class teachers can take attendance.</p></Card>;
                }
                const classStudents = students.filter(s => s.class === userProfile.classTeacherOf);
                return (
                     <Card>
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-bold">Take Attendance for {userProfile.classTeacherOf}</h2>
                            <div className="flex items-center gap-4">
                                <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="p-2 bg-slate-700 rounded-md" />
                                <Button onClick={handleSaveAttendance} disabled={isSavingAttendance}>{isSavingAttendance ? 'Saving...' : 'Save Attendance'}</Button>
                            </div>
                         </div>
                         <div className="flex gap-2 mb-4">
                            <Button size="sm" variant="secondary" onClick={() => handleMarkAll('Present')}>Mark All Present</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleMarkAll('Absent')}>Mark All Absent</Button>
                         </div>
                         <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                             {classStudents.map(student => (
                                 <div key={student.uid} className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                                     <span className="font-semibold">{student.name}</span>
                                     <div className="flex gap-4">
                                         {(['Present', 'Absent', 'Late'] as AttendanceStatus[]).map(status => (
                                             <label key={status} className="flex items-center gap-2 cursor-pointer">
                                                 <input type="radio" name={`attendance_${student.uid}`} value={status} checked={attendanceData[student.uid] === status} onChange={() => handleAttendanceChange(student.uid, status)} className="h-4 w-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500" />
                                                 {status}
                                             </label>
                                         ))}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </Card>
                );
            case 'terminal_reports':
                return (
                    <AdminTerminalReports 
                        schoolSettings={schoolSettings} 
                        user={user} 
                        teacherMode={true}
                        allowedClasses={teacherClasses}
                        allStudents={students} // Pass already fetched students to optimize
                        assignments={assignments}
                        submissions={submissions}
                        groups={groups}
                    />
                );
            case 'past_questions':
                return <BECEPastQuestionsView />;
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
            {isEditModalOpen && editingStudent && (
                <UserEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={editingStudent}
                    onSave={handleSaveStudent}
                    allUsers={students}
                    subjectsByClass={null}
                />
            )}
        </div>
    );
};

export default TeacherView;
