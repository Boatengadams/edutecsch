import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const Timestamp = firebase.firestore.Timestamp;

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type AdminType = 'super' | 'co-admin';

// --- GAMIFICATION & PORTFOLIO ---
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path
  earnedAt: firebase.firestore.Timestamp;
}

export interface PortfolioItem {
  id: string; // uuid
  title: string;
  description: string;
  fileUrl: string;
  storagePath: string;
  thumbnailUrl?: string; // for video/image previews
  createdAt: firebase.firestore.Timestamp;
}

export interface CustomVoice {
  id: string; // uuid
  name: string;
  status: 'ready'; // Simplified status for simulation
  createdAt: firebase.firestore.Timestamp;
}


// --- CORE USER PROFILE ---
export interface UserProfile {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: firebase.firestore.Timestamp;
  
  // Role-specific
  class?: string; // For students
  // FIX: Added parentUids to student profile to track linked parent accounts.
  parentUids?: string[]; // For students
  classesTaught?: string[]; // For teachers
  subjectsTaught?: string[]; // For teachers
  subjectsByClass?: Record<string, string[]>; // Granular mapping of subjects per class
  classTeacherOf?: string; // For the designated class teacher
  childUids?: string[]; // For parents
  adminType?: AdminType; // For admins
  isAlsoTeacher?: boolean; // For admins who can also be teachers
  isAlsoAdmin?: boolean; // For teachers who can also be admins


  // New Futuristic Features
  xp: number; // Experience Points
  level: number;
  badges: Badge[];
  portfolioItems: PortfolioItem[];
  lastWellbeingCheck?: firebase.firestore.Timestamp;
  preferredVoice?: string; // For Gemini TTS - can be prebuilt name or custom voice ID
  customVoices?: CustomVoice[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading/writing';
}

// --- LEARNING PATHWAYS ---
export type PathwayNodeType = 'assignment' | 'reading' | 'video' | 'challenge';
export interface PathwayNode {
  id: string; // uuid
  type: PathwayNodeType;
  title: string;
  description: string;
  position: { x: number; y: number };
  resourceId?: string; // ID for TeachingMaterial, VideoContent, etc.
  points: number; // XP for completing this node
}

export interface Pathway {
  id: string;
  title: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  nodes: PathwayNode[];
  edges: { id: string; source: string; target: string }[]; // react-flow edge format
  createdAt: firebase.firestore.Timestamp;
  published: boolean;
}

export interface StudentProgress {
  id: string; // Should be studentId_pathwayId
  studentId: string;
  pathwayId: string;
  teacherId: string;
  completedNodes: { [nodeId: string]: { completedAt: firebase.firestore.Timestamp, submissionId?: string } };
  currentNodeId: string;
}

// --- WELL-BEING (EDU-PULSE) ---
export type WellbeingFeeling = 'great' | 'good' | 'okay' | 'not-so-good' | 'bad';
export interface WellbeingEntry {
  id: string;
  studentId: string;
  teacherId?: string; // Class teacher
  classId: string;
  feeling: WellbeingFeeling;
  date: string; // YYYY-MM-DD
  createdAt: firebase.firestore.Timestamp;
}

// --- LIVE LESSON ---
export interface Point { x: number; y: number; }
export interface Stroke {
    points: Point[];
    color: string;
}

export interface LiveLessonStep {
  boardContent: string;
  question: {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
  } | null;
}

export interface LiveLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  subject: string;
  topic: string;
  status: 'configuring' | 'active' | 'ended';
  createdAt: firebase.firestore.Timestamp;
  currentStepIndex: number;
  lessonPlan: LiveLessonStep[];
  // Denormalized for easy student access
  currentBoardContent: string;
  currentQuestion: LiveLessonStep['question'] | null;
  sourcePresentationId?: string;
  
  drawingData?: Stroke[];
  pointerPosition?: { x: number; y: number } | null;

  // New collaborative features
  whiteboardActive?: boolean;
  screenShareActive?: boolean;
  screenShareFrame?: string | null;
  breakoutRoomsActive?: boolean;
  breakoutRooms?: { 
      [roomId: string]: { 
          students: {uid: string, name: string}[];
      } 
  } | null;
}

export interface BreakoutWhiteboard {
    id: string; // roomId
    drawingData?: Stroke[];
}

export interface LiveLessonResponse {
  id: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timestamp: firebase.firestore.Timestamp;
}

// --- MESSAGING ---
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  createdAt: firebase.firestore.Timestamp;
  readBy?: string[];
  imageUrl?: string;
  storagePath?: string;
  audioUrl?: string;
  audioStoragePath?: string;
}

export interface ConversationParticipantInfo {
  name: string;
  role: UserRole;
}

export interface Conversation {
  id:string;
  participantUids: string[];
  participantInfo: {
    [uid: string]: ConversationParticipantInfo;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: firebase.firestore.Timestamp;
  };
  updatedAt: firebase.firestore.Timestamp;
  unreadCount: {
    [uid: string]: number;
  };
}


// --- LEGACY & SUPPORTING TYPES ---

export const GES_CLASSES = [
    'Creche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2',
    'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6',
    'JHS 1', 'JHS 2', 'JHS 3'
];

export interface SubjectsByClass { [className: string]: string[]; }

export const GES_STANDARD_CURRICULUM: SubjectsByClass = {
    'KG 1': ['Language & Literacy', 'Numeracy', 'Our World Our People', 'Creative Arts'],
    'KG 2': ['Language & Literacy', 'Numeracy', 'Our World Our People', 'Creative Arts'],
    'Basic 1': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing'],
    'Basic 2': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French'],
    'Basic 3': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French'],
    'Basic 4': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French'],
    'Basic 5': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French'],
    'Basic 6': ['English Language', 'Mathematics', 'Integrated Science', 'History', 'Creative Arts', 'Our World Our People', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French'],
    'JHS 1': ['English Language', 'Mathematics', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French', 'Social Studies', 'Integrated Science'],
    'JHS 2': ['English Language', 'Mathematics', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French', 'Social Studies', 'Integrated Science'],
    'JHS 3': ['English Language', 'Mathematics', 'History', 'Creative Arts', 'Religious and Moral Education', 'Physical Education', 'Ghanaian Language', 'Computing', 'French', 'Social Studies', 'Integrated Science'],
};

// Create a master list of all unique subjects from the curriculum
const allSubjects = new Set<string>();
Object.values(GES_STANDARD_CURRICULUM).forEach(subjects => {
  subjects.forEach(subject => allSubjects.add(subject));
});
// Add subjects that might not be in the standard curriculum but could be taught
allSubjects.add('Social Studies');
allSubjects.add('Integrated Science');
export const GES_SUBJECTS = Array.from(allSubjects).sort();


export type AttendanceStatus = 'Present' | 'Absent' | 'Late';

export interface AttendanceRecord {
    id: string; date: string; classId: string; teacherId: string; teacherName: string;
    records: Record<string, AttendanceStatus>; studentUids: string[]; parentUids?: string[];
}

export type AssignmentType = 'Theory' | 'Objective';

export interface Assignment {
    id: string; title: string; description: string; classId: string; teacherId: string;
    teacherName: string; createdAt: firebase.firestore.Timestamp; dueDate: string | null;
    attachmentURL: string; attachmentName: string; subject: string;
    type?: AssignmentType; // Can be 'Theory' or 'Objective'
    quiz?: Quiz | null; // For objective assignments
}

export interface Submission {
    id: string; assignmentId: string; studentId: string; studentName: string;
    teacherId: string; classId: string;
    text: string; // Used for theory answers
    answers?: Record<string, string>; // Used for objective answers { questionIndex: 'selectedOption' }
    attachmentURL: string;
    attachmentName: string; submittedAt: firebase.firestore.Timestamp;
    status: 'Submitted' | 'Graded' | 'Pending'; grade?: string; feedback?: string;
    parentUids?: string[];
}

export interface TeachingMaterial {
  id: string;
  title: string;
  targetClasses: string[];
  uploaderId: string;
  uploaderName: string;
  originalFileName: string;
  aiFormattedContent: string;
  createdAt: firebase.firestore.Timestamp;
}

// FIX: Added missing VideoContent interface.
export interface VideoContent {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  videoUrl: string;
  storagePath: string;
  targetClasses: string[];
  createdAt: firebase.firestore.Timestamp;
  expiresAt: firebase.firestore.Timestamp;
}

export interface Notification {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    createdAt: firebase.firestore.Timestamp;
    userId: string; // The specific user this notification is for
    readBy: string[]; // Still useful to track read status for the user
}

export type SchoolEventType = 'Holiday' | 'Exam' | 'Event' | 'Meeting' | 'Reminder';
export const EVENT_TYPES: SchoolEventType[] = ['Holiday', 'Exam', 'Event', 'Meeting', 'Reminder'];
export type SchoolEventAudience = 'All' | 'Teachers' | 'Students' | 'Parents';
export const EVENT_AUDIENCE: SchoolEventAudience[] = ['All', 'Teachers', 'Students', 'Parents'];

export interface SchoolSettings { 
    schoolName: string; 
    schoolMotto: string; 
    academicYear: string;
    currentTerm?: number;
    coAdminUids?: string[];
}

export interface SubscriptionStatus {
    isActive: boolean;
    planType: 'trial' | 'monthly' | 'termly' | 'yearly' | null;
    trialEndsAt: firebase.firestore.Timestamp | null;
    subscriptionEndsAt: firebase.firestore.Timestamp | null;
}

export interface ActivationToken {
  id: string;
  isUsed: boolean;
  planType: 'trial' | 'monthly' | 'termly' | 'yearly';
  usedAt?: firebase.firestore.Timestamp;
  usedBy?: string;
}

export interface SchoolEvent {
  id: string; title: string; description: string; date: string; type: SchoolEventType;
  audience: SchoolEventAudience; createdAt: firebase.firestore.Timestamp;
  createdBy: string; createdByName: string;
}

export interface Slide {
  title: string;
  content: string[];
  imageUrl: string;
  imageStyle?: 'contain' | 'cover';
}
export interface Presentation {
  slides: Slide[];
}
export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}
export interface Quiz {
    quiz: QuizQuestion[];
}

export interface Collaborator {
    uid: string;
    name: string | null;
    email: string | null;
}

export interface GeneratedContent {
    id: string;
    teacherId: string;
    teacherName: string;
    classes: string[];
    subject: string;
    topic: string;
    audience?: string;
    presentation: Presentation;
    quiz: Quiz | null;
    createdAt: firebase.firestore.Timestamp;
    expiresAt?: firebase.firestore.Timestamp;
    collaboratorUids: string[];
    collaborators: Collaborator[];
    liveCollaborators?: Collaborator[];
}

export interface TimetablePeriod {
    subject: string;
    teacher: string;
    startTime: string;
    endTime: string;
}
export interface TimetableData {
    Monday?: TimetablePeriod[];
    Tuesday?: TimetablePeriod[];
    Wednesday?: TimetablePeriod[];
    Thursday?: TimetablePeriod[];
    Friday?: TimetablePeriod[];
}
export interface Timetable {
    id: string;
    classId: string;
    timetableData: TimetableData;
    publishedBy: string;
    publishedAt: firebase.firestore.Timestamp;
}

export interface TerminalReportMark {
    studentName: string;
    indivTest?: number;      // 15
    groupWork?: number;      // 15
    classTest?: number;      // 15
    project?: number;        // 15
    totalClassScore?: number; // 60 -> scaled to 50
    endOfTermExams?: number; // 100 -> scaled to 50
    scaledClassScore?: number;
    scaledExamScore?: number;
    overallTotal?: number;   // 100
    grade?: string;
    position?: number;
}
export interface TerminalReport {
    id: string; // e.g., 2023-2024_1_Basic-1
    academicYear: string;
    term: number;
    classId: string;
    subjects: {
        [subjectName: string]: {
            teacherId: string;
            updatedAt: firebase.firestore.Timestamp;
            marks: {
                [studentId: string]: TerminalReportMark;
            }
        }
    }
}
export interface ReportSummary {
    id: string; // e.g., 2023-2024_1_studentUid
    studentId: string;
    classId: string;
    academicYear: string;
    term: number;
    conduct?: string;
    attitude?: string;
    interest?: string;
    classTeacherRemarks?: string;
    headTeacherRemarks?: string;
}

export interface GroupMember {
    uid: string;
    name: string;
}
export interface GroupMessage {
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    text?: string;
    createdAt: firebase.firestore.Timestamp;
    imageUrl?: string;
    storagePath?: string;
    audioUrl?: string;
    audioStoragePath?: string;
}

export interface Group {
    id: string;
    name: string;
    classId: string;
    subject: string;
    teacherId: string;
    members: GroupMember[];
    memberUids: string[];
    createdAt: firebase.firestore.Timestamp;
    assignmentTitle: string;
    assignmentDescription: string;
    dueDate: string | null;
    isSubmitted: boolean;
    submission?: {
        content: string;
        submittedBy: GroupMember;
        submittedAt: firebase.firestore.Timestamp;
    };
    grade?: string;
    feedback?: string;
}

export interface ParsedUser {
  clientId: string; // A temporary client-side ID for list management
  id: number;
  name: string;
  email: string | null;
  password?: string;
  classId: string | null;
}
export interface TranscriptEntry {
  speaker: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
}
export interface LiveTutoringSession {
  id: string;
  studentId: string;
  studentName: string;
  teacherId?: string;
  subject: string;
  status: 'active' | 'ended';
  startedAt: firebase.firestore.Timestamp;
  endedAt?: firebase.firestore.Timestamp;
  transcript: TranscriptEntry[];
}