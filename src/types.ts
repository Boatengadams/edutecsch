
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const Timestamp = firebase.firestore.Timestamp;

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type AdminType = 'super' | 'co-admin';

// --- ACTIVITY LOGGING ---
export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userClass?: string;
  action: 'login' | 'logout';
  timestamp: firebase.firestore.Timestamp;
}

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

export type DrawingToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'text' | 'line';

export interface DrawingElement {
    id?: string;
    type: DrawingToolType;
    color: string;
    points?: Point[]; // For pen and eraser
    x?: number;       // For shapes/text (normalized 0-1)
    y?: number;       // For shapes/text (normalized 0-1)
    width?: number;   // For shapes (normalized 0-1)
    height?: number;  // For shapes (normalized 0-1)
    text?: string;    // For text tool
    fontSize?: number;
}

export interface LiveLessonStep {
  boardContent: string;
  audioUrl?: string; // Pre-generated audio for this step
  question: {
    id: string;
    text: string;
    options: string[];
    correctAnswer: string;
  } | null;
}

export type LiveActionType = 'poll' | 'direct_question' | 'explanation' | 'celebration';

export interface LiveAction {
    id: string;
    type: LiveActionType;
    text: string; // The question or explanation text
    options?: string[]; // For polls (e.g. ["Yes", "No"])
    targetStudentId?: string; // If set, only this student sees it (Direct Question)
    targetStudentName?: string;
    timestamp: number;
    // Context for AI generation
    relatedSlideContent?: string; 
}

export interface LiveLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  subject: string;
  topic: string;
  // 'starting' status is used for the dynamic pre-loading phase before a lesson begins.
  status: 'configuring' | 'starting' | 'active' | 'ended';
  createdAt: firebase.firestore.Timestamp;
  currentStepIndex: number;
  lessonPlan: LiveLessonStep[];
  // Denormalized for easy student access
  currentBoardContent: string;
  currentAudioUrl?: string; // URL of the audio file for the current step
  currentQuestion: LiveLessonStep['question'] | null;
  sourcePresentationId?: string;
  
  activeAction?: LiveAction | null; // The current transient event (Poll/Question)
  
  drawingData?: DrawingElement[];
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
  
  raisedHands?: string[]; // UIDs of students with raised hands
}

export interface BreakoutWhiteboard {
    id: string; // roomId
    drawingData?: DrawingElement[];
}

export interface SavedWhiteboard {
    id: string;
    teacherId: string;
    name: string;
    data: DrawingElement[];
    createdAt: firebase.firestore.Timestamp;
}

export interface LiveLessonResponse {
  id: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  questionId?: string;
  actionId?: string; // Links response to a specific LiveAction
  answer: string;
  confusionPoint?: string; // Specific text they clicked on if they said "No"
  isCorrect?: boolean;
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
    scheduledAt?: firebase.firestore.Timestamp | null;
}

export interface Correction {
    answers: Record<string, string>;
    grade: string;
    feedback: string;
    submittedAt: firebase.firestore.Timestamp;
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
    correction?: Correction; // Separate object for correction data
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
    sleepModeConfig?: {
        enabled: boolean;
        sleepTime: string; // e.g. "21:00"
        wakeTime: string; // e.g. "05:00"
    };
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
  audioUrl?: string;
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

// --- GROUP WORK ---
export interface GroupMember {
    uid: string;
    name: string;
}

export interface GroupSubmission {
    content: string;
    submittedBy: { uid: string, name: string };
    submittedAt: firebase.firestore.Timestamp;
}

export interface Group {
    id: string;
    name: string;
    classId: string;
    subject: string;
    teacherId: string;
    members: GroupMember[];
    memberUids: string[];
    assignmentTitle: string;
    assignmentDescription: string;
    dueDate: string | null;
    createdAt: firebase.firestore.Timestamp;
    isSubmitted: boolean;
    submission?: GroupSubmission;
    grade?: string;
    feedback?: string;
}

export interface GroupMessage {
    id: string;
    groupId: string;
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    createdAt: firebase.firestore.Timestamp;
}

// --- TIMETABLE ---
export interface TimetablePeriod {
    subject: string;
    startTime: string;
    endTime: string;
    teacher?: string;
}

export interface TimetableData {
    [day: string]: TimetablePeriod[];
}

export interface Timetable {
    id: string;
    classId: string;
    timetableData: TimetableData;
    updatedAt: firebase.firestore.Timestamp;
}

// --- TERMINAL REPORTS ---
export interface TerminalReportMark {
    studentName: string;
    position?: number;
    classTest?: number;
    indivTest?: number;
    groupWork?: number;
    project?: number;
    totalClassScore?: number;
    scaledClassScore?: number;
    endOfTermExams?: number;
    scaledExamScore?: number;
    overallTotal?: number;
    grade?: string;
    remarks?: string;
}

export interface TerminalReport {
    id: string;
    academicYear: string;
    term: number;
    classId: string;
    subjects: {
        [subjectName: string]: {
            teacherId: string;
            updatedAt: firebase.firestore.Timestamp;
            marks: Record<string, TerminalReportMark>;
        }
    };
}

export interface ReportSummary {
    id: string;
    studentId: string;
    classId: string;
    academicYear: string;
    term: number;
    conduct?: string;
    attitude?: string;
    interest?: string;
    classTeacherRemarks?: string;
    headTeacherRemarks?: string;
    promotedTo?: string;
    attendance?: number;
    totalAttendance?: number;
}

// --- FLYERS ---
export interface PublishedFlyer {
    id: string;
    title: string;
    imageUrl: string;
    createdAt: firebase.firestore.Timestamp;
    publisherId: string;
    publisherName: string;
    targetAudience: 'all' | 'role' | 'selected';
    targetRoles?: UserRole[];
    targetUids?: string[];
}

// --- UTILS / MISC ---
export interface ParsedUser {
  clientId: string;
  id: number;
  name: string;
  email?: string;
  password?: string;
  classId?: string;
}

export interface LiveTutoringSession {
    id: string;
    teacherId: string;
    teacherName: string;
    subject: string;
    topic: string;
    scheduledAt: firebase.firestore.Timestamp;
    meetingLink?: string;
    attendees: string[];
}
