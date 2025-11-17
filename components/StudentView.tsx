import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthentication } from '../hooks/useAuth';
// FIX: Import firebase for compat services like firestore.FieldValue
import { db, storage, firebase } from '../services/firebase';
import { Assignment, Submission, SchoolEvent, SchoolEventType, Timetable, TimetableData, TimetablePeriod, AttendanceRecord, Notification, LiveTutoringSession, TranscriptEntry, GES_STANDARD_CURRICULUM, Presentation, UserProfile, LiveLesson, TeachingMaterial, PortfolioItem, TerminalReport, ReportSummary, SchoolSettings, Group, GroupMember, GroupMessage, Conversation, Slide } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import AIAssistant from './AIAssistant';
// FIX: Changed to named import for ProgressDashboard
import { ProgressDashboard } from './ProgressDashboard';
import Sidebar from './common/Sidebar';
import NotebookTimetable from './common/NotebookTimetable';
import TTSAudioPlayer from './common/TTSAudioPlayer';
import Toast from './common/Toast';
import { GoogleGenAI, Modality, LiveServerMessage, Blob as GenAIBlob, Session, Type } from '@google/genai';
import PieChart from './common/charts/PieChart';
import LineChart from './common/charts/LineChart';
import StudentLiveClassroom from './StudentLiveClassroom';
import BECEPastQuestionsView from './common/BECEPastQuestionsView';
import ConfirmationModal from './common/ConfirmationModal';
import StudentStudyMode from './StudentStudyMode';
import StudentProfile from './StudentProfile';
import MessagingView from './MessagingView';
import ChatInput from './common/ChatInput';


// Helper functions for audio encoding/decoding for Live API
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- START OF GROUP WORK COMPONENTS ---

const StudentGroupChatView: React.FC<{ group: Group; userProfile: UserProfile; }> = ({ group, userProfile }) => {
    const [messages, setMessages] = useState<GroupMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [askingEdu, setAskingEdu] = useState(false);
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = db.collection('groups').doc(group.id).collection('groupMessages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupMessage)));
                setLoading(false);
            }, () => setLoading(false));
        return () => unsubscribe();
    }, [group.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, aiResponse]);

    const handleSendMessage = async ({ text, image, audio }: { text: string; image: File | null; audio: Blob | null; }) => {
        if ((!text.trim() && !image && !audio) || sending) return;

        setSending(true);
        const messageRef = db.collection('groups').doc(group.id).collection('groupMessages').doc();
        const messageData: Partial<GroupMessage> = {
            groupId: group.id,
            senderId: userProfile.uid,
            senderName: userProfile.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp
        };
        
        if (text) messageData.text = text;

        try {
            if (image) {
                const storagePath = `group_messages/${group.id}/${messageRef.id}-${image.name}`;
                const storageRef = storage.ref(storagePath);
                await storageRef.put(image);
                messageData.imageUrl = await storageRef.getDownloadURL();
                messageData.storagePath = storagePath;
            }

            if (audio) {
                const storagePath = `group_messages/${group.id}/${messageRef.id}.webm`;
                const storageRef = storage.ref(storagePath);
                await storageRef.put(audio);
                messageData.audioUrl = await storageRef.getDownloadURL();
                messageData.audioStoragePath = storagePath;
            }

            await messageRef.set(messageData);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };
    
    const handleAskEdu = async () => {
        setAskingEdu(true);
        setAiResponse(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chatHistory = messages.slice(-10).map(m => `${m.senderName}: ${m.text}`).join('\n');
            const prompt = `You are an educational assistant called Edu. A group of students are working on an assignment with the following topic/description: "${group.assignmentTitle}: ${group.assignmentDescription}".
            Here is their recent conversation:
            ${chatHistory}

            A student has asked for a hint. Your task is to provide a guiding question or a small hint to help them think and collaborate better. Do not give them the direct answer. Keep your response concise and encouraging.`;

            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            setAiResponse(response.text);

        } catch (err) {
            setAiResponse("Sorry, I couldn't come up with a hint right now. Please try again later.");
        } finally {
            setAskingEdu(false);
        }
    };

    if (loading) return <div className="flex h-full items-center justify-center"><Spinner /></div>;

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex flex-col ${msg.senderId === userProfile.uid ? 'items-end' : 'items-start'}`}>
                        <span className="text-xs text-gray-400 font-bold mx-1">{msg.senderId === userProfile.uid ? 'You' : msg.senderName}</span>
                        <div className={`p-2 rounded-lg max-w-xs break-words ${msg.senderId === userProfile.uid ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                           {msg.imageUrl && <img src={msg.imageUrl} alt="Attachment" className="rounded-md max-w-xs mb-1" />}
                           {msg.audioUrl && <audio controls src={msg.audioUrl} className="w-full max-w-xs" />}
                           {msg.text && <p className="text-sm px-1">{msg.text}</p>}
                        </div>
                    </div>
                ))}
                {aiResponse && (
                     <div className="flex flex-col items-start">
                        <span className="text-xs text-blue-400 font-bold ml-1">Edu (AI Assistant)</span>
                        <div className="p-3 bg-slate-800 border border-blue-500/50 rounded-lg max-w-xs text-sm break-words">
                           {aiResponse}
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 p-2 border-t border-slate-700">
                <Button onClick={handleAskEdu} disabled={askingEdu} size="sm" variant="secondary" className="w-full mb-2">{askingEdu ? 'Thinking...' : 'Ask Edu for a Hint'}</Button>
                <ChatInput onSendMessage={handleSendMessage} isSending={sending} />
            </div>
        </div>
    );
};


const StudentGroupView: React.FC<{
    group: Group;
    userProfile: UserProfile;
    setToast: (toast: { message: string, type: 'success' | 'error' } | null) => void;
}> = ({ group, userProfile, setToast }) => {
    const [submissionContent, setSubmissionContent] = useState(group.submission?.content || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const canSubmit = !group.isSubmitted;

    const handleSubmit = async () => {
        if (!submissionContent.trim() || !canSubmit) {
            setShowConfirm(false);
            return;
        }
        
        setIsSubmitting(true);
        try {
            await db.collection('groups').doc(group.id).update({
                isSubmitted: true,
                'submission.content': submissionContent,
                'submission.submittedBy': { uid: userProfile.uid, name: userProfile.name },
                'submission.submittedAt': firebase.firestore.FieldValue.serverTimestamp()
            });
            setToast({ message: 'Group assignment submitted successfully!', type: 'success' });
        } catch (err: any) {
            setToast({ message: `Submission failed: ${err.message}`, type: 'error' });
        } finally {
            setIsSubmitting(false);
            setShowConfirm(false);
        }
    };
    
    return (
        <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                <div className="md:col-span-1 flex flex-col space-y-4">
                    <h3 className="text-2xl font-bold">{group.name}</h3>
                    <div className="p-3 bg-slate-900/50 rounded-lg">
                        <h4 className="font-semibold text-gray-300">Assignment: <span className="text-white font-bold">{group.assignmentTitle}</span></h4>
                        <p className="text-xs text-gray-400 whitespace-pre-wrap mt-1">{group.assignmentDescription}</p>
                        <p className="text-xs text-yellow-400 mt-1">Due: {group.dueDate || 'N/A'}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-gray-300">Members</h4>
                        <ul className="list-disc list-inside text-sm text-gray-200">
                            {group.members.map(m => <li key={m.uid} className={m.uid === userProfile.uid ? 'font-bold' : ''}>{m.name}</li>)}
                        </ul>
                    </div>
                     <div className="flex-grow space-y-2 flex flex-col">
                         <h4 className="font-semibold text-gray-300">Submission</h4>
                         <textarea 
                            value={submissionContent} 
                            onChange={e => setSubmissionContent(e.target.value)} 
                            placeholder={canSubmit ? "Enter your group's final submission here..." : "View submission content..."}
                            disabled={!canSubmit}
                            rows={6}
                            className="w-full p-2 bg-slate-700 rounded-md border border-slate-600 flex-grow"
                         />
                         {canSubmit ? (
                            <Button onClick={() => setShowConfirm(true)} disabled={isSubmitting || !submissionContent.trim()}>{isSubmitting ? 'Submitting...' : 'Submit Assignment'}</Button>
                         ) : (
                            <p className="text-center text-sm text-green-400 p-2 bg-green-900/50 rounded-md">Submitted on {group.submission?.submittedAt.toDate().toLocaleString()}</p>
                         )}
                    </div>
                    {group.grade && (
                        <div className="p-3 bg-slate-900/50 rounded-lg">
                            <h4 className="font-semibold text-gray-300">Grade & Feedback</h4>
                            <p className="font-bold text-2xl text-blue-400">{group.grade}</p>
                            {group.feedback && <p className="text-sm italic mt-1">"{group.feedback}"</p>}
                        </div>
                    )}
                </div>
                <div className="md:col-span-2 flex flex-col bg-slate-900/50 rounded-lg">
                    <h4 className="font-semibold p-3 border-b border-slate-700 flex-shrink-0">Group Chat</h4>
                    <StudentGroupChatView group={group} userProfile={userProfile} />
                </div>
            </div>
            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleSubmit}
                title="Confirm Submission"
                message="Are you sure you want to submit? Only one person from the group needs to submit, and it cannot be undone."
                isLoading={isSubmitting}
                confirmButtonText="Yes, Submit"
            />
        </Card>
    );
};

// --- END OF GROUP WORK COMPONENTS ---


interface StudentViewProps {
  isSidebarExpanded: boolean;
  setIsSidebarExpanded: (isExpanded: boolean) => void;
}

const StudentView: React.FC<StudentViewProps> = ({ isSidebarExpanded, setIsSidebarExpanded }) => {
  const { user, userProfile } = useAuthentication();
  const [activeTab, setActiveTab] = useState('dashboard');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<LiveLesson | null>(null);
  const [learningMaterials, setLearningMaterials] = useState<TeachingMaterial[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [submissionText, setSubmissionText] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<Assignment | null>(null);
  const [aiSystemInstruction, setAiSystemInstruction] = useState('');
  const [aiSuggestedPrompts, setAiSuggestedPrompts] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showStudyMode, setShowStudyMode] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('all');

  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState('');

  const sessionPromiseRef = useRef<Promise<Session> | null>(null);
  const liveAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  

  const submissions = useMemo(() => {
    return allSubmissions.reduce((acc, sub) => {
        acc[sub.assignmentId] = sub;
        return acc;
    }, {} as Record<string, Submission>);
  }, [allSubmissions]);
  

  const subjectsForClass = useMemo(() => {
    if (!userProfile?.class || !GES_STANDARD_CURRICULUM) return [];
    return GES_STANDARD_CURRICULUM[userProfile.class as keyof typeof GES_STANDARD_CURRICULUM] || [];
  }, [userProfile?.class]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter(assignment => {
        return subjectFilter === 'all' || assignment.subject === subjectFilter;
    });
  }, [assignments, subjectFilter]);

  useEffect(() => {
    if (!user || !userProfile || userProfile.status !== 'approved' || !userProfile.class) {
      setLoading(false);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    // Assignments
    unsubscribers.push(db.collection('assignments').where('classId', '==', userProfile.class).onSnapshot(snapshot => {
      const fetchedAssignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment));
      fetchedAssignments.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAssignments(fetchedAssignments);
    }));

    // Submissions
    unsubscribers.push(db.collection('submissions').where('studentId', '==', user.uid).onSnapshot(snapshot => {
      const fetchedSubmissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Submission }));
      setAllSubmissions(fetchedSubmissions);
    }));
    
    // School Feed
    unsubscribers.push(db.collection('calendarEvents').where('audience', 'in', ['All', 'Students']).onSnapshot(snapshot => {
      const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
      setEvents(fetchedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }));
    
    // Timetable
    unsubscribers.push(db.collection('timetables').doc(userProfile.class).onSnapshot(doc => {
      setTimetable(doc.exists ? doc.data() as Timetable : null);
    }));
    
    // Live Lesson
    unsubscribers.push(db.collection('liveLessons').where('classId', '==', userProfile.class).where('status', '==', 'active').onSnapshot(snap => {
        setActiveLesson(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as LiveLesson);
    }));
    
    // Learning Materials
    unsubscribers.push(db.collection('teachingMaterials').where('targetClasses', 'array-contains', userProfile.class).orderBy('createdAt', 'desc').onSnapshot(snap => {
        setLearningMaterials(snap.docs.map(doc => ({id: doc.id, ...doc.data()} as TeachingMaterial)));
    }));

     // Group Project
    unsubscribers.push(db.collection('groups').where('classId', '==', userProfile.class).where('memberUids', 'array-contains', user.uid).limit(1).onSnapshot(snap => {
        setGroup(snap.empty ? null : {id: snap.docs[0].id, ...snap.docs[0].data()} as Group);
    }));
    
    // Notifications
    unsubscribers.push(db.collection('notifications').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(30).onSnapshot(snapshot => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(fetchedNotifications);
    }));

    // Fetch Teachers
    const teachersUnsubscribe = db.collection('users')
        .where('role', '==', 'teacher')
        .where('status', '==', 'approved')
        .onSnapshot(snapshot => {
            const allTeachers = snapshot.docs.map(doc => doc.data() as UserProfile);
            const relevantTeachers = allTeachers.filter(teacher =>
                teacher.classTeacherOf === userProfile.class ||
                teacher.classesTaught?.includes(userProfile.class || '')
            );
            setTeachers(relevantTeachers);
        });
    unsubscribers.push(teachersUnsubscribe);


    setLoading(false);
    return () => unsubscribers.forEach(unsub => unsub());

  }, [user, userProfile]);
  
  // AI Assistant Context
  useEffect(() => {
    if (!userProfile) return;
    const baseInstruction = "You are an AI assistant for a student at UTOPIA INTERNATIONAL SCHOOL. Your role is to help with homework, explain concepts, and provide study tips. Maintain a supportive and encouraging tone. Do not give direct answers to assignments; instead, guide the student to find the answer themselves. You can summarize the content on the student's current page if asked. As a bilingual AI, you can also be 'Kofi AI'. If a user speaks Twi, respond as Kofi AI in fluent Asante Twi, using correct grammar and letters like 'ɛ' and 'ɔ'.";
    let context = '';
    let prompts: string[] = ["Explain the concept of photosynthesis.", "Kofi, kyerɛ me Twi ase."];

    switch(activeTab) {
        case 'dashboard':
            const pendingCount = assignments.filter(a => !submissions[a.id]).length;
            context = `The student is on the Dashboard. They have ${pendingCount} pending assignments.`;
            prompts.push("What are some good study habits?");
            break;
        case 'assignments':
            const assignmentCount = assignments.length;
            context = `The student is viewing their list of ${assignmentCount} assignments.`;
            if (viewingAssignment) {
                context += ` They are currently looking at the assignment titled "${viewingAssignment.title}".`;
                prompts.push(`Can you help me understand the first question in the "${viewingAssignment.title}" assignment?`);
            } else {
                prompts.push("Which assignment should I start with?");
            }
            break;
        case 'my_profile':
            context = `The student is viewing their 'My Profile' page, which includes their academic progress.`;
            prompts.push("How can I improve my grades?");
            break;
        default:
            context = `The student is on the ${activeTab.replace(/_/g, ' ')} page.`;
            break;
    }
    setAiSystemInstruction(`${baseInstruction}\n\nCURRENT CONTEXT:\n${context}`);
    setAiSuggestedPrompts(aiSuggestedPrompts);
  }, [activeTab, assignments, submissions, userProfile, viewingAssignment]);

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

    const handleViewAssignment = (assignment: Assignment) => {
        setViewingAssignment(assignment);
        setSubmissionText(submissions[assignment.id]?.text || '');
        setSubmissionFile(null);
        setObjectiveAnswers(submissions[assignment.id]?.answers || {});
    };

    const handleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viewingAssignment || !userProfile || isSubmitting) return;
    
        setIsSubmitting(viewingAssignment.id);
        
        const submissionData: Partial<Submission> = {
            assignmentId: viewingAssignment.id,
            studentId: userProfile.uid,
            studentName: userProfile.name,
            classId: userProfile.class!,
            teacherId: viewingAssignment.teacherId,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
            status: 'Submitted',
            parentUids: userProfile.parentUids || []
        };
        
        if (viewingAssignment.type === 'Objective') {
            submissionData.answers = objectiveAnswers;
        } else {
            submissionData.text = submissionText;
        }

        try {
            if (submissionFile) {
                const storagePath = `submissions/${viewingAssignment.id}/${userProfile.uid}/${submissionFile.name}`;
                const storageRef = storage.ref(storagePath);
                await storageRef.put(submissionFile);
                submissionData.attachmentURL = await storageRef.getDownloadURL();
                submissionData.attachmentName = submissionFile.name;
            }
            
            const existingSubmission = submissions[viewingAssignment.id];
            if (existingSubmission) {
                await db.collection('submissions').doc(existingSubmission.id).update(submissionData);
            } else {
                await db.collection('submissions').add(submissionData);
            }

            setToast({ message: 'Assignment submitted successfully!', type: 'success' });
            setViewingAssignment(null);
        } catch (err) {
            console.error(err);
            setToast({ message: 'Submission failed. Please try again.', type: 'error' });
        } finally {
            setIsSubmitting(null);
        }
    };

  const stopListening = async () => {
    setIsListening(false);
    if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (liveAudioContextRef.current && liveAudioContextRef.current.state !== 'closed') {
        await liveAudioContextRef.current.close();
        liveAudioContextRef.current = null;
    }
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
    }
  };

  const startListening = async () => {
    setIsListening(true);
    setMicError('');
    const baseTranscript = submissionText.trim() ? submissionText.trim() + ' ' : '';
    let currentTranscription = baseTranscript;

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        micStreamRef.current = stream;
                        liveAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const audioCtx = liveAudioContextRef.current;
                        mediaStreamSourceRef.current = audioCtx.createMediaStreamSource(stream);
                        scriptProcessorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (event) => {
                            const inputData = event.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(audioCtx.destination);
                    } catch (err) {
                        setMicError("Could not access microphone. Please check permissions.");
                        stopListening();
                    }
                },
                onmessage: (message: LiveServerMessage) => {
                    const transcription = message.serverContent?.inputTranscription;
                    if (transcription) {
                        if (transcription.isFinal) {
                            currentTranscription += transcription.text + ' ';
                            setSubmissionText(currentTranscription);
                        } else {
                            setSubmissionText(currentTranscription + transcription.text);
                        }
                    }
                },
                onerror: (e: ErrorEvent) => {
                    setMicError('A connection error occurred with the voice service.');
                    stopListening();
                },
                onclose: () => {
                    setIsListening(false);
                },
            },
            config: { inputAudioTranscription: {} },
        });
        await sessionPromiseRef.current;
    } catch (e) {
        setMicError('Failed to start voice recognition service.');
        stopListening();
    }
  };

  const handleToggleListening = () => {
    if (isSubmitting) return;
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);
    
    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: '📈' },
        { key: 'assignments', label: 'Assignments', icon: '📝' },
        { key: 'my_profile', label: 'My Profile', icon: '👤' },
        { key: 'group_work', label: 'Group Work', icon: '👥' },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: '💬' },
        { key: 'study_mode', label: 'AI Learning Hub', icon: '▶️' },
        { key: 'live_lesson', label: 'Live Lesson', icon: '💡' },
        { key: 'timetable', label: 'Timetable', icon: '❓' },
        { key: 'past_questions', label: 'BECE Questions', icon: 'ℹ️' },
    ];
    
    if (loading || !userProfile) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const contactsForMessaging = [...teachers];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                             <h2 className="text-3xl font-bold">Welcome, {userProfile.name}</h2>
                             <Button onClick={() => setShowStudyMode(true)}>Enter AI Learning Hub</Button>
                        </div>
                        <ProgressDashboard student={userProfile} isModal={false} />
                    </div>
                );
            case 'assignments':
                return (
                    <div className="space-y-6">
                       <div className="flex justify-between items-center">
                         <h2 className="text-3xl font-bold">My Assignments</h2>
                         <div className="flex items-center gap-2">
                            <label htmlFor="subject-filter" className="text-sm text-gray-400">Subject:</label>
                            <select id="subject-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm">
                                <option value="all">All Subjects</option>
                                {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                         </div>
                       </div>
                       {filteredAssignments.map(assignment => (
                         <Card key={assignment.id}>
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="text-xl font-bold">{assignment.title}</h3>
                                    <p className="text-sm text-gray-400">{assignment.subject}</p>
                                </div>
                                <span className={`flex-shrink-0 px-3 py-1 text-sm font-semibold rounded-full ${submissions[assignment.id] ? (submissions[assignment.id].status === 'Graded' ? 'bg-green-500' : 'bg-blue-500') : 'bg-yellow-500'}`}>
                                    {submissions[assignment.id] ? submissions[assignment.id].status : 'Pending'}
                                </span>
                            </div>
                            <div className="mt-4 flex justify-between items-end">
                                <p className="text-sm text-yellow-400">Due: {assignment.dueDate || 'Not set'}</p>
                                <Button onClick={() => handleViewAssignment(assignment)}>
                                    {submissions[assignment.id] ? 'View Submission' : 'Start Assignment'}
                                </Button>
                            </div>
                         </Card>
                       ))}
                    </div>
                );
            case 'my_profile':
                return <StudentProfile userProfile={userProfile} assignments={assignments} submissions={allSubmissions} />;
            case 'group_work':
                return group ? <StudentGroupView group={group} userProfile={userProfile} setToast={setToast}/> : <Card><p className="text-center text-gray-400">You are not part of any group project right now.</p></Card>;
            case 'messages':
                return <MessagingView userProfile={userProfile} contacts={contactsForMessaging} />;
            case 'live_lesson':
                return activeLesson ? <StudentLiveClassroom lessonId={activeLesson.id} userProfile={userProfile} onClose={() => setActiveLesson(null)} /> : <Card><p className="text-center text-gray-400">There is no live lesson for your class at the moment.</p></Card>;
            case 'timetable':
                return timetable && userProfile.class ? <NotebookTimetable classId={userProfile.class} timetableData={timetable.timetableData} /> : <Card><p className="text-center text-gray-400">Timetable not available.</p></Card>;
            case 'past_questions':
                return <BECEPastQuestionsView />;
            default:
                return <div>Select a tab</div>;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            <Sidebar 
                isExpanded={isSidebarExpanded}
                navItems={navItems}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onClose={() => setIsSidebarExpanded(false)}
                title="Student Portal"
            />
            <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                 {renderContent()}
            </main>
            <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {viewingAssignment && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                    <Card className="w-full max-w-2xl h-[90vh] flex flex-col">
                        <form onSubmit={handleSubmission} className="flex flex-col h-full">
                            <div className="flex justify-between items-start flex-shrink-0">
                                <h3 className="text-xl font-bold">{viewingAssignment.title}</h3>
                                <Button type="button" variant="secondary" size="sm" onClick={() => setViewingAssignment(null)}>Close</Button>
                            </div>
                             <div className="flex-grow overflow-y-auto py-4 pr-2 my-4 border-y border-slate-700 space-y-4">
                                <p className="text-sm text-gray-400 whitespace-pre-wrap">{viewingAssignment.description}</p>
                                {viewingAssignment.attachmentURL && <a href={viewingAssignment.attachmentURL} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View Attachment</a>}
                                
                                {viewingAssignment.type === 'Theory' ? (
                                    <div className="relative">
                                        <textarea
                                            value={submissionText}
                                            onChange={e => setSubmissionText(e.target.value)}
                                            rows={10}
                                            placeholder="Type your answer here..."
                                            className="w-full p-2 bg-slate-800 rounded-md"
                                        />
                                        <button type="button" onClick={handleToggleListening} className={`absolute bottom-3 right-3 p-2 rounded-full hover:bg-slate-700 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-300'}`} title="Use microphone">🎙️</button>
                                    </div>
                                ) : viewingAssignment.quiz ? (
                                    <div className="space-y-4">
                                        {viewingAssignment.quiz.quiz.map((q, index) => (
                                            <div key={index} className="p-3 bg-slate-800 rounded-md">
                                                <p className="font-semibold">{index + 1}. {q.question}</p>
                                                <div className="mt-2 space-y-1">
                                                    {q.options.map(opt => (
                                                        <label key={opt} className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-700 cursor-pointer">
                                                            <input type="radio" name={`q_${index}`} value={opt} checked={objectiveAnswers[index] === opt} onChange={e => setObjectiveAnswers(p => ({...p, [index]: e.target.value}))} className="h-4 w-4 text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500" />
                                                            <span>{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}

                                <input type="file" onChange={e => setSubmissionFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                            </div>
                            <div className="flex-shrink-0 flex justify-end">
                                <Button type="submit" disabled={!!isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : (submissions[viewingAssignment.id] ? 'Update Submission' : 'Submit Assignment')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
            {showStudyMode && (
                <StudentStudyMode
                    onExit={() => setShowStudyMode(false)}
                    userProfile={userProfile}
                    assignments={assignments}
                    submissions={submissions}
                    learningMaterials={learningMaterials}
                />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default StudentView;