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
import ChangePasswordModal from './common/ChangePasswordModal';
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
  const { user, userProfile, schoolSettings } = useAuthentication();
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

  // New states for objective answers and voice-to-text
  const [objectiveAnswers, setObjectiveAnswers] = useState<Record<string, string>>({});
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null); // Using 'any' for browser compatibility

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

  // Setup Speech Recognition
  useEffect(() => {
      // FIX: Cast window to any to access experimental SpeechRecognition APIs
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = (event: any) => {
              let interimTranscript = '';
              let finalTranscript = '';
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                  if (event.results[i].isFinal) {
                      finalTranscript += event.results[i][0].transcript;
                  } else {
                      interimTranscript += event.results[i][0].transcript;
                  }
              }
              setSubmissionText(prev => prev + finalTranscript);
          };
          
          recognitionRef.current.onend = () => {
              setIsListening(false);
          };
      }
  }, []);

  const handleToggleListening = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          recognitionRef.current.start();
          setIsListening(true);
      }
  };


  const handleSubmission = async (assignmentId: string) => {
    if (!user || !viewingAssignment) return;
    const isObjective = viewingAssignment.type === 'Objective';
    
    if (isObjective) {
        if (Object.keys(objectiveAnswers).length !== (viewingAssignment.quiz?.quiz.length || 0)) {
            setToast({ message: "Please answer all questions before submitting.", type: 'error' });
            return;
        }
    } else {
        if (!submissionText.trim() && !submissionFile) {
             setToast({ message: "Please provide an answer or an attachment.", type: 'error' });
             return;
        }
    }

    setIsSubmitting(assignmentId);

    try {
      const submissionRef = db.collection('submissions').doc(`${assignmentId}_${user.uid}`);
      let attachmentURL = '';
      let attachmentName = '';

      if (submissionFile) {
        const storagePath = `submissions/${assignmentId}/${user.uid}/${submissionFile.name}`;
        const uploadTask = storage.ref(storagePath).put(submissionFile);
        await uploadTask;
        attachmentURL = await uploadTask.snapshot.ref.getDownloadURL();
        attachmentName = submissionFile.name;
      }
      
      const assignment = assignments.find(a => a.id === assignmentId);
      if(!assignment) throw new Error("Assignment not found");

      const studentDoc = await db.collection('users').doc(user.uid).get();
      const parentUids = studentDoc.data()?.parentUids || [];

      const submissionData: Omit<Submission, 'id'> = {
        assignmentId: assignmentId,
        studentId: user.uid,
        studentName: userProfile?.name || 'Unknown',
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        text: isObjective ? '' : submissionText,
        answers: isObjective ? objectiveAnswers : undefined,
        attachmentURL,
        attachmentName,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
        status: 'Submitted',
        parentUids
      };

      await submissionRef.set(submissionData, { merge: true });
      
      setViewingAssignment(null);
      setSubmissionText('');
      setSubmissionFile(null);
      setObjectiveAnswers({});
      setToast({ message: "Assignment submitted successfully!", type: 'success' });

    } catch (err: any) {
      console.error("Error submitting assignment:", err);
      setToast({ message: `Error submitting: ${err.message}`, type: 'error' });
    } finally {
      setIsSubmitting(null);
    }
  };

    const renderDashboard = () => {
        if (!userProfile) return null;
        const pendingAssignments = assignments.filter(a => !submissions[a.id]);
        const recentEvents = events.slice(0, 3);
        const latestMaterial = learningMaterials[0];
        
        return (
            <div className="space-y-6">
                <h2 className="text-3xl font-bold">Welcome, {userProfile.name}</h2>
                <Card fullHeight={false}>
                    <h3 className="text-xl font-semibold mb-4">Quick Links</h3>
                    <div className="flex flex-wrap gap-4">
                        <Button onClick={() => setActiveTab('assignments')} variant="secondary">My Assignments</Button>
                        <Button onClick={() => setActiveTab('timetable')} variant="secondary">My Timetable</Button>
                        <Button onClick={() => setActiveTab('my_profile')} variant="secondary">My Profile & Progress</Button>
                    </div>
                </Card>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <h3 className="text-xl font-semibold mb-4">Pending Assignments ({pendingAssignments.length})</h3>
                        {pendingAssignments.length > 0 ? (
                            pendingAssignments.slice(0, 3).map(a => (
                                <div key={a.id} className="p-3 bg-slate-700 rounded-lg mb-2 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{a.title}</p>
                                        <p className="text-sm text-gray-400">{a.subject}</p>
                                    </div>
                                    <Button size="sm" onClick={() => { setActiveTab('assignments'); setViewingAssignment(a); setObjectiveAnswers({}); }}>View</Button>
                                </div>
                            ))
                        ) : <p className="text-gray-400">Great job! No pending assignments.</p>}
                    </Card>
                     <Card>
                        <h3 className="text-xl font-semibold mb-4">What's New</h3>
                        {latestMaterial ? (
                            <div className="p-3 bg-slate-700 rounded-lg">
                                <p className="text-xs text-blue-400 font-semibold">New Learning Material</p>
                                <p className="font-semibold">{latestMaterial.title}</p>
                            </div>
                        ) : <p className="text-gray-400 text-sm">No new learning materials.</p>}
                    </Card>
                </div>
                {group && (
                    <Card>
                        <h3 className="text-xl font-semibold mb-2">Group Project</h3>
                        <div className="p-3 bg-slate-700 rounded-lg flex justify-between items-center">
                           <div>
                             <p className="font-bold">{group.assignmentTitle}</p>
                             <p className={`text-sm font-semibold ${group.isSubmitted ? 'text-green-400' : 'text-yellow-400'}`}>
                                {group.isSubmitted ? 'Submitted' : 'In Progress'}
                             </p>
                           </div>
                           <Button size="sm" onClick={() => setActiveTab('groups')}>Open Group</Button>
                        </div>
                    </Card>
                )}
            </div>
        );
    };

    const renderAssignments = () => {
        if (viewingAssignment) {
            const submission = submissions[viewingAssignment.id];
            const isObjective = viewingAssignment.type === 'Objective' && viewingAssignment.quiz;

            return (
                 <Card>
                    <button onClick={() => setViewingAssignment(null)} className="mb-4 text-blue-400 hover:underline">&larr; Back to all assignments</button>
                    <h3 className="text-2xl font-bold">{viewingAssignment.title}</h3>
                    <p className="text-sm text-gray-400">{viewingAssignment.subject}</p>
                    <p className="text-xs text-yellow-400 mt-1">Due: {viewingAssignment.dueDate || 'Not set'}</p>
                    <div className="prose-styles prose-invert mt-4 max-w-none" dangerouslySetInnerHTML={{__html: viewingAssignment.description.replace(/\n/g, '<br/>')}} />
                    {viewingAssignment.attachmentURL && (
                        <a href={viewingAssignment.attachmentURL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-blue-400 hover:underline">Download Attachment</a>
                    )}
                    <div className="mt-6 pt-6 border-t border-slate-700">
                        {submission ? (
                            <div>
                                <h4 className="text-xl font-semibold">Your Submission</h4>
                                <p className={`text-sm font-bold ${submission.status === 'Graded' ? 'text-green-400' : 'text-yellow-400'}`}>Status: {submission.status}</p>
                                
                                {isObjective && submission.answers ? (
                                    <div className="mt-4 space-y-3">
                                        {viewingAssignment.quiz?.quiz.map((q, index) => {
                                            const studentAnswer = submission.answers?.[index];
                                            const isCorrect = studentAnswer === q.correctAnswer;
                                            return (
                                                <div key={index} className={`p-3 rounded-md ${isCorrect ? 'bg-green-900/50' : 'bg-red-900/50'}`}>
                                                    <p className="font-semibold">{index + 1}. {q.question}</p>
                                                    <p className="text-sm mt-1">Your Answer: <span className="font-bold">{studentAnswer || 'Not answered'}</span></p>
                                                    {!isCorrect && <p className="text-sm text-green-400">Correct Answer: {q.correctAnswer}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <pre className="mt-2 p-4 bg-slate-800 rounded-md whitespace-pre-wrap font-sans">{submission.text}</pre>
                                )}

                                {submission.grade && <p className="mt-2"><strong>Grade:</strong> {submission.grade}</p>}
                                {submission.feedback && <p className="mt-2"><strong>Feedback:</strong> {submission.feedback}</p>}
                            </div>
                        ) : (
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmission(viewingAssignment.id)}}>
                                <h4 className="text-xl font-semibold mb-4">Submit Your Work</h4>
                                {isObjective ? (
                                    <div className="space-y-4">
                                        {viewingAssignment.quiz?.quiz.map((q, index) => (
                                            <div key={index}>
                                                <p className="font-semibold mb-2">{index + 1}. {q.question}</p>
                                                <div className="space-y-2">
                                                    {q.options.map(opt => (
                                                        <label key={opt} className={`flex items-center gap-3 p-3 rounded-md cursor-pointer border ${objectiveAnswers[index] === opt ? 'bg-blue-800/80 border-blue-600' : 'bg-slate-700 hover:bg-slate-600 border-transparent'}`}>
                                                            <input type="radio" name={`q_${index}`} value={opt} checked={objectiveAnswers[index] === opt} onChange={e => setObjectiveAnswers(prev => ({ ...prev, [index]: e.target.value }))} className="h-4 w-4 text-blue-500 bg-slate-800 border-slate-600 focus:ring-blue-500"/>
                                                            <span>{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <textarea value={submissionText} onChange={(e) => setSubmissionText(e.target.value)} rows={5} className="w-full p-2 bg-slate-700 rounded-md mb-2" placeholder="Type or use voice to enter your answer..."/>
                                            <button type="button" onClick={handleToggleListening} className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-600 hover:bg-slate-500 text-white'}`} title={isListening ? "Stop Listening" : "Start Voice-to-Text"}>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m12 7.5v-1.5a6 6 0 0 0-6-6m-6 2.25v-1.5a6 6 0 0 1 6-6v1.5m0 0V5.625M12 18.75v-1.5m0 0a6.002 6.002 0 0 1-5.25-3 6.002 6.002 0 0 1 10.5 0 6.002 6.002 0 0 1-5.25 3Z" /></svg>
                                            </button>
                                        </div>
                                        <input type="file" onChange={(e) => setSubmissionFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                                    </>
                                )}
                                <Button type="submit" disabled={isSubmitting === viewingAssignment.id} className="mt-4">
                                    {isSubmitting === viewingAssignment.id ? 'Submitting...' : 'Submit'}
                                </Button>
                            </form>
                        )}
                    </div>
                 </Card>
            );
        }
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-3xl font-bold">My Assignments</h2>
                    <div className="flex items-center gap-2">
                        <label htmlFor="subject-filter" className="text-sm text-gray-400">Filter:</label>
                        <select id="subject-filter" value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="p-2 bg-slate-700 rounded-md border border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="all">All Subjects</option>
                            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                {filteredAssignments.map(assignment => {
                    const submission = submissions[assignment.id];
                    let status: 'Pending' | 'Submitted' | 'Graded' = 'Pending';
                    if (submission) status = submission.status;

                    return (
                        <Card key={assignment.id}>
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="text-xl font-bold">{assignment.title}</h3>
                                    <p className="text-sm text-gray-400">{assignment.subject} &bull; Due: {assignment.dueDate || 'Not set'}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status === 'Graded' ? 'bg-green-500 text-green-900' : status === 'Submitted' ? 'bg-yellow-500 text-yellow-900' : 'bg-slate-600 text-slate-200'}`}>
                                        {status}
                                    </span>
                                    <Button size="sm" onClick={() => { setViewingAssignment(assignment); setObjectiveAnswers({}); }}>
                                        {status === 'Pending' ? 'View & Submit' : 'View Details'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
                {filteredAssignments.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                        {subjectFilter === 'all' ? 'You have no assignments yet.' : `No assignments for ${subjectFilter}.`}
                    </p>
                )}
            </div>
        );
    }


    if (!user || !userProfile) {
        return <p>Loading profile...</p>;
    }

    if (showStudyMode) {
        return <StudentStudyMode onExit={() => setShowStudyMode(false)} userProfile={userProfile} assignments={assignments} submissions={submissions} learningMaterials={learningMaterials} />
    }
    
    const navItems = [
        { key: 'dashboard', label: 'Dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h12A2.25 2.25 0 0 0 20.25 14.25V3M3.75 21h16.5M16.5 3.75h.008v.008H16.5V3.75Z" /></svg> },
        { key: 'assignments', label: 'Assignments', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg> },
        { key: 'live_lesson', label: <span className="flex items-center">Live Lesson {activeLesson && <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</span>, icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0-2.51 2.225.515-3.572-3.108-3.108l4.286-1.071L12 3l2.225 4.515 4.286 1.07L15.215 11.7l.515 3.572Z" /></svg> },
        { key: 'groups', label: 'My Group', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg> },
        { key: 'messages', label: <span className="flex items-center justify-between w-full">Messages {unreadMessages > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{unreadMessages}</span>}</span>, icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm1.707 2.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414L10 10.586 3.707 7.293z" /></svg> },
        { key: 'timetable', label: 'Timetable', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0h18" /></svg> },
        { key: 'my_profile', label: 'My Profile', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
        { key: 'past_questions', label: 'BECE Questions', icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg> },
    ];
    
    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        }

        switch (activeTab) {
            case 'dashboard':
                return renderDashboard();
            case 'assignments':
                return renderAssignments();
            case 'live_lesson':
                return activeLesson ?
                    <StudentLiveClassroom lessonId={activeLesson.id} userProfile={userProfile} onClose={() => setActiveLesson(null)} /> :
                    <Card><div className="text-center p-8"><h3 className="text-xl font-bold">No Active Live Lesson</h3><p className="mt-2 text-gray-400">Please wait for your teacher to start a lesson.</p></div></Card>;
            case 'groups':
                return group ? <StudentGroupView group={group} userProfile={userProfile} setToast={setToast} /> : <Card><p className="text-center">You are not part of any group project.</p></Card>;
            case 'messages':
                return <MessagingView userProfile={userProfile} contacts={teachers} />;
            case 'timetable':
                return <Card>{timetable ? <NotebookTimetable classId={userProfile.class!} timetableData={timetable.timetableData} /> : <p>Timetable not available.</p>}</Card>;
            case 'my_profile':
                 return <StudentProfile userProfile={userProfile} assignments={assignments} submissions={Object.values(submissions)} />;
            case 'past_questions':
                return <BECEPastQuestionsView />;
            default:
                return renderDashboard();
        }
    }

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
                <div className="flex justify-between items-center mb-6">
                    <div/>
                    <Button onClick={() => setShowStudyMode(true)}>Enter AI Study Mode</Button>
                </div>
                 {renderContent()}
            </main>
             <AIAssistant systemInstruction={aiSystemInstruction} suggestedPrompts={aiSuggestedPrompts} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default StudentView;
