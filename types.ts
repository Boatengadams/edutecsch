import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export type UserRole = 'student' | 'teacher' | 'parent' | 'admin';
export type AdminType = 'super' | 'co-admin';

// --- SCIENCE LAB TYPES ---
export type LabType = 'Physics' | 'Chemistry' | 'Biology';
export type LabLevel = 'Primary' | 'SHS' | 'University';

export interface LabEquipment {
  id: string;
  name: string;
  type: 'tool' | 'chemical' | 'specimen' | 'glassware' | 'device';
  icon: string;
  description: string;
  properties?: {
    voltage?: number;
    resistance?: number;
    ph?: number;
    volume?: number;
    temperature?: number;
    state?: 'solid' | 'liquid' | 'gas';
    magnification?: number;
    color?: string;
  };
}

// --- CORE USER PROFILE ---

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: firebase.firestore.Timestamp;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  storagePath: string;
  thumbnailUrl?: string;
  createdAt: firebase.firestore.Timestamp;
}

export interface CustomVoice {
  id: string;
  name: string;
  status: 'ready';
  createdAt: firebase.firestore.Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: firebase.firestore.Timestamp;
  photoURL?: string;
  class?: string;
  parentUids?: string[];
  classesTaught?: string[];
  subjectsTaught?: string[];
  subjectsByClass?: Record<string, string[]>;
  classTeacherOf?: string;
  childUids?: string[];
  adminType?: AdminType;
  isAlsoTeacher?: boolean;
  isAlsoAdmin?: boolean;
  xp: number;
  level: number;
  badges: Badge[];
  portfolioItems: PortfolioItem[];
  preferredVoice?: string;
  customVoices?: CustomVoice[];
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading/writing';
  lastWellbeingCheck?: firebase.firestore.Timestamp;
}

// --- NOTIFICATIONS & EVENTS ---

export interface Notification {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    createdAt: firebase.firestore.Timestamp;
    userId: string;
    readBy: string[];
}

export type SchoolEventType = 'Holiday' | 'Exam' | 'Event' | 'Meeting' | 'Reminder';
export const EVENT_TYPES: SchoolEventType[] = ['Holiday', 'Exam', 'Event', 'Meeting', 'Reminder'];
export type SchoolEventAudience = 'All' | 'Teachers' | 'Students' | 'Parents';
export const EVENT_AUDIENCE: SchoolEventAudience[] = ['All', 'Teachers', 'Students', 'Parents'];

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: SchoolEventType;
  audience: SchoolEventAudience;
  createdAt: firebase.firestore.Timestamp;
  createdBy: string;
  createdByName: string;
}

// --- LIVE LESSON ---
export interface Point { x: number; y: number; }
export type DrawingToolType = 'pen' | 'eraser' | 'rect' | 'circle' | 'text' | 'line' | 'laser';

export interface DrawingElement {
    id?: string;
    type: DrawingToolType;
    color: string;
    points?: Point[];
    x?: number;
    y?: number;
}

// FIX: Added title, imageUrl, imageStyle, and teacherScript to LiveLessonStep to resolve TS errors in TeacherView.tsx and TeacherLiveClassroom.tsx. Also allowed audioUrl to be null.
export interface LiveLessonStep {
  title?: string;
  boardContent: string;
  imageUrl?: string;
  imageStyle?: 'contain' | 'cover';
  teacherScript?: string;
  audioUrl?: string | null;
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
    text: string;
    options?: string[];
    targetStudentId?: string;
    targetStudentName?: string;
    timestamp: number;
    relatedSlideContent?: string; 
}

// FIX: Added currentImageUrl, currentImageStyle, and currentTeacherScript to LiveLesson to resolve TS errors in TeacherView.tsx and TeacherLiveClassroom.tsx. Also allowed currentAudioUrl to be null.
export interface LiveLesson {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  subject: string;
  topic: string;
  status: 'configuring' | 'starting' | 'active' | 'ended';
  createdAt: firebase.firestore.Timestamp;
  currentStepIndex: number;
  lessonPlan: LiveLessonStep[];
  currentBoardContent: string;
  currentImageUrl?: string;
  currentImageStyle?: 'contain' | 'cover';
  currentTeacherScript?: string;
  currentAudioUrl?: string | null;
  currentQuestion: LiveLessonStep['question'] | null;
  sourcePresentationId?: string;
  activeAction?: LiveAction | null;
  drawingData?: DrawingElement[];
  pointerPosition?: { x: number; y: number } | null;
  whiteboardActive?: boolean;
  raisedHands?: string[];
}

export interface LiveLessonResponse {
  id: string;
  lessonId: string;
  studentId: string;
  studentName: string;
  questionId?: string;
  actionId?: string;
  answer: string;
  confusionPoint?: string;
  isCorrect?: boolean;
  timestamp: firebase.firestore.Timestamp;
}

// --- CURRICULUM ---

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
const allSubjects = new Set<string>();
Object.values(GES_STANDARD_CURRICULUM).forEach(subjects => {
  subjects.forEach(subject => allSubjects.add(subject));
});
allSubjects.add('Social Studies');
allSubjects.add('Integrated Science');
export const GES_SUBJECTS = Array.from(allSubjects).sort();

export type AttendanceStatus = 'Present' | 'Absent' | 'Late';
export interface AttendanceRecord {
    id: string; date: string; classId: string; teacherId: string; teacherName: string;
    records: Record<string, AttendanceStatus>; studentUids: string[]; parentUids?: string[];
}
export type AssignmentType = 'Theory' | 'Objective';

export interface QuizQuestion {
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    type?: 'Objective' | 'Theory';
}

export interface Quiz {
    quiz: QuizQuestion[];
}

export interface Assignment {
    id: string; title: string; description: string; classId: string; teacherId: string;
    teacherName: string; createdAt: firebase.firestore.Timestamp; dueDate: string | null;
    attachmentURL: string; attachmentName: string; subject: string;
    type?: AssignmentType;
    quiz?: Quiz | null;
    scheduledAt?: firebase.firestore.Timestamp | null;
}
export interface Correction {
    text?: string;
    attachmentURL?: string;
    attachmentName?: string;
    // FIX: Added answers, grade, and feedback to Correction interface to satisfy usage in StudentView.tsx
    answers?: Record<string, string>;
    grade?: string;
    feedback?: string;
    reattemptedAnswers?: Record<string, string>;
    submittedAt: firebase.firestore.Timestamp;
}
export interface Submission {
    id: string; assignmentId: string; studentId: string; studentName: string;
    teacherId: string; classId: string;
    text: string;
    answers?: Record<string, string>;
    attachmentURL: string;
    attachmentName: string; submittedAt: firebase.firestore.Timestamp;
    status: 'Submitted' | 'Graded' | 'Pending'; grade?: string; feedback?: string;
    parentUids?: string[];
    correction?: Correction;
}
export interface TeachingMaterial {
  id: string;
  title: string;
  targetClasses: string[];
  subject?: string;
  uploaderId: string;
  uploaderName: string;
  originalFileName: string;
  aiFormattedContent: string;
  createdAt: firebase.firestore.Timestamp;
}
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

export interface Slide {
  title: string;
  content: string[];
  imageUrl: string;
  imageStyle?: 'contain' | 'cover';
  audioUrl?: string;
  teacherScript?: string;
  summaryScript?: string;
  imagePrompt?: string;
}

export interface Presentation {
  slides: Slide[];
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

export interface GroupMember {
    uid: string;
    name: string;
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
    submission?: any;
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

export interface Conversation {
  id:string;
  participantUids: string[];
  participantInfo: {
    [uid: string]: any;
  };
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: firebase.firestore.Timestamp;
  };
  unreadCount: {
    [uid: string]: number;
  };
  updatedAt: firebase.firestore.Timestamp;
}
export interface SchoolSettings { 
    schoolName: string; 
    schoolMotto: string; 
    academicYear: string;
    currentTerm?: number;
    coAdminUids?: string[];
    schoolLogoUrl?: string;
    schoolLogoStoragePath?: string;
    sleepModeConfig?: {
        enabled: boolean;
        sleepTime: string;
        wakeTime: string;
    };
}
export interface SubscriptionStatus {
    isActive: boolean;
    planType: 'trial' | 'monthly' | 'termly' | 'yearly' | null;
    trialEndsAt: firebase.firestore.Timestamp | null;
    subscriptionEndsAt: firebase.firestore.Timestamp | null;
}
export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  userClass?: string;
  action: 'login' | 'logout';
  timestamp: firebase.firestore.Timestamp;
}
export interface Timetable {
    id: string;
    classId: string;
    timetableData: any;
    updatedAt: firebase.firestore.Timestamp;
}
export interface TimetableData {
    [day: string]: any[];
}
export interface TimetablePeriod {
    subject: string;
    startTime: string;
    endTime: string;
    teacher?: string;
}
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
    published?: boolean;
    subjects: {
        [subjectName: string]: {
            teacherId: string;
            updatedAt: firebase.firestore.Timestamp;
            marks: Record<string, TerminalReportMark>;
        }
    };
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

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  type: SchoolEventType;
  audience: SchoolEventAudience;
  createdAt: firebase.firestore.Timestamp;
  createdBy: string;
  createdByName: string;
}

export interface PublishedFlyer {
    id: string;
    title: string;
    content: string;
    imageUrl?: string;
    createdAt: firebase.firestore.Timestamp;
    publisherId: string;
    publisherName: string;
    targetAudience: 'all' | 'role' | 'selected';
    targetRoles?: UserRole[];
    targetUids?: string[];
}

export interface ParsedUser {
  clientId: string;
  id: number;
  name: string;
  email?: string;
  password?: string;
  classId?: string;
  linkedStudentId?: string;
}