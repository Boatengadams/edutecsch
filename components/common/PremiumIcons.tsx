import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  active?: boolean;
}

const IconWrapper: React.FC<IconProps & { children: React.ReactNode; id: string; viewBox?: string }> = ({ children, size = 24, className = '', id, viewBox = "0 0 32 32" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox={viewBox}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} transition-all duration-500 transform group-hover:scale-110 group-hover:-translate-y-0.5`}
  >
    <defs>
      {/* Dynamic Glow Filter */}
      <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      
      {/* 3D Depth Shadow */}
      <filter id={`depth-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0.8" dy="1.5" stdDeviation="1" floodOpacity="0.4"/>
      </filter>

      {/* Glassmorphism Gradient */}
      <linearGradient id={`glass-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.4" />
        <stop offset="50%" stopColor="white" stopOpacity="0.1" />
        <stop offset="100%" stopColor="white" stopOpacity="0.05" />
      </linearGradient>

      {/* Core Surface Gradient */}
      <linearGradient id={`surface-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

export const RocketIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="rocket">
    <g filter="url(#depth-rocket)">
      <path d="M16 4C10 4 6 12 6 20C6 24 8 26 16 28C24 26 26 24 26 20C26 12 22 4 16 4Z" fill="url(#surface-rocket)" />
      <path d="M16 6C11 6 8 13 8 20C8 23 9.5 25 16 26.5C22.5 25 24 23 24 20C24 13 21 6 16 6Z" fill="url(#glass-rocket)" />
      <circle cx="16" cy="14" r="3" fill="white" fillOpacity="0.4" />
      <path d="M12 28L10 30H22L20 28" fill="#F87171" filter="url(#glow-rocket)" />
    </g>
  </IconWrapper>
);

export const GraduationIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="grad">
    <g filter="url(#depth-grad)">
      <path d="M4 12L16 6L28 12L16 18L4 12Z" fill="#3B82F6" />
      <path d="M16 6L28 12L16 18L4 12L16 6Z" fill="url(#glass-grad)" />
      <path d="M8 14V22C8 22 12 25 16 25C20 25 24 22 24 22V14" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 12V20" stroke="#FBBF24" strokeWidth="2" filter="url(#glow-grad)" />
    </g>
  </IconWrapper>
);

export const PulseIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="pulse">
    <rect x="4" y="6" width="24" height="20" rx="4" fill="#1e293b" />
    <path d="M6 16H10L12 8L16 24L18 16H26" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-pulse)" />
    <rect x="4" y="6" width="24" height="20" rx="4" fill="url(#glass-pulse)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="shield">
    <g filter="url(#depth-shield)">
      <path d="M16 4L6 8V16C6 22 16 28 16 28C16 28 26 22 26 16V8L16 4Z" fill="#10B981" />
      <path d="M16 5L25 9V16C25 21.5 16 27 16 27C16 27 7 21.5 7 16V9L16 5Z" fill="url(#glass-shield)" />
      <path d="M11 16L14 19L21 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-shield)" />
    </g>
  </IconWrapper>
);

export const BallotIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="ballot">
    <rect x="6" y="10" width="20" height="16" rx="2" fill="#6366f1" filter="url(#depth-ballot)" />
    <rect x="10" y="4" width="12" height="8" rx="1" fill="#4f46e5" />
    <path d="M13 14H19M13 18H19" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <rect x="7" y="11" width="18" height="14" rx="1" fill="url(#glass-ballot)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const InstitutionIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="inst">
    <path d="M16 4L4 12V28H28V12L16 4Z" fill="#475569" filter="url(#depth-inst)" />
    <path d="M16 6L26 13V26H16V6Z" fill="url(#glass-inst)" />
    <rect x="14" y="20" width="4" height="8" fill="#1e293b" />
    <path d="M8 16H12V20H8V16ZM20 16H24V20H20V16Z" fill="white" fillOpacity="0.2" />
  </IconWrapper>
);

export const UserMatrixIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="users">
    <circle cx="16" cy="11" r="6" fill="#3b82f6" filter="url(#depth-users)" />
    <circle cx="16" cy="11" r="5" fill="url(#glass-users)" />
    <path d="M6 26C6 21 10 18 16 18C22 18 26 21 26 26" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
    <path d="M7 26C7 22 11 19 16 19C21 19 25 22 25 26" stroke="white" strokeOpacity="0.2" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

export const ScheduleIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="sched">
    <rect x="4" y="6" width="24" height="22" rx="3" fill="#db2777" filter="url(#depth-sched)" />
    <rect x="4" y="6" width="24" height="7" rx="2" fill="#9d174d" />
    <rect x="5" y="7" width="22" height="20" rx="2" fill="url(#glass-sched)" />
    <circle cx="9" cy="15" r="2" fill="white" fillOpacity="0.5" />
    <circle cx="16" cy="15" r="2" fill="white" fillOpacity="0.5" />
    <circle cx="23" cy="15" r="2" fill="white" fillOpacity="0.5" />
  </IconWrapper>
);

export const AnalyticsIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="anly">
    <path d="M6 24L12 16L18 20L26 8" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-anly)" />
    <circle cx="26" cy="8" r="3" fill="#60a5fa" filter="url(#depth-anly)" />
    <rect x="4" y="4" width="24" height="24" rx="4" stroke="white" strokeOpacity="0.1" strokeDasharray="2 2" />
  </IconWrapper>
);

export const LibraryIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="lib">
    <path d="M8 6H24V26H8V6Z" fill="#0369a1" filter="url(#depth-lib)" />
    <path d="M12 6V26" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" />
    <path d="M8 8H24M8 12H24M8 16H24" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
    <rect x="8" y="6" width="16" height="20" rx="1" fill="url(#glass-lib)" />
  </IconWrapper>
);

export const MegaphoneIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mega">
    <g filter="url(#depth-mega)">
      <path d="M6 14L10 14L18 8L20 8L20 24L18 24L10 18L6 18V14Z" fill="#f43f5e" />
      <path d="M24 12C26 14 26 18 24 20" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow-mega)" />
      <path d="M7 15L10 15L18 9L19 9L19 23L18 23L10 17L7 17V15Z" fill="url(#glass-mega)" />
    </g>
  </IconWrapper>
);

export const WalletIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="wallet">
    <rect x="4" y="8" width="24" height="16" rx="3" fill="#059669" filter="url(#depth-wallet)" />
    <rect x="18" y="12" width="12" height="8" rx="2" fill="#065f46" />
    <circle cx="24" cy="16" r="2" fill="#fbbf24" filter="url(#glow-wallet)" />
    <rect x="5" y="9" width="22" height="14" rx="2" fill="url(#glass-wallet)" />
  </IconWrapper>
);

export const GearIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="gear">
    <circle cx="16" cy="16" r="10" stroke="#475569" strokeWidth="3" strokeDasharray="4 2" />
    <circle cx="16" cy="16" r="4" fill="#3b82f6" filter="url(#glow-gear)" />
    <path d="M16 2V6M16 26V30M2 16H6M26 16H30" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="16" r="12" stroke="url(#glass-gear)" strokeWidth="1" strokeOpacity="0.2" />
  </IconWrapper>
);

export const BrainIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="brain">
    <path d="M16 6C13 6 10 8 10 12C10 13 11 14 11 15C10 16 8 16 8 19C8 22 10 24 13 25L16 26" stroke="#8b5cf6" strokeWidth="2" filter="url(#depth-brain)" />
    <path d="M16 6C19 6 22 8 22 12C22 13 21 14 21 15C22 16 24 16 24 19C24 22 22 24 19 25L16 26" stroke="#8b5cf6" strokeWidth="2" filter="url(#depth-brain)" />
    <circle cx="16" cy="16" r="3" fill="#a78bfa" filter="url(#glow-brain)" />
    <path d="M16 6V26" stroke="white" strokeOpacity="0.1" strokeWidth="1" />
  </IconWrapper>
);

export const FlaskIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flask">
    <path d="M12 4H20V10L28 24C29 26 27.5 28 25.5 28H6.5C4.5 28 3 26 4 24L12 10V4Z" fill="#10b981" fillOpacity="0.2" />
    <path d="M8 24L12 16L16 20L24 24" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
    <path d="M12 4H20V10L28 24C29 26 27.5 28 25.5 28H6.5C4.5 28 3 26 4 24L12 10V4Z" stroke="#34d399" strokeWidth="2" />
    <circle cx="14" cy="22" r="1.5" fill="white" fillOpacity="0.6" className="animate-pulse" />
  </IconWrapper>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="home">
    <g filter="url(#depth-home)">
      <path d="M16 4L4 14V28H12V20H20V28H28V14L16 4Z" fill="#3b82f6" />
      <path d="M16 6L26 15V26H21V18H11V26H6V15L16 6Z" fill="url(#glass-home)" />
      <rect x="14" y="22" width="4" height="6" fill="#1d4ed8" />
    </g>
  </IconWrapper>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="bell">
    <g filter="url(#depth-bell)">
      <path d="M16 4C13.2 4 11 6.2 11 9V12L9 14V22H23V14L21 12V9C21 6.2 18.8 4 16 4Z" fill="#facc15" />
      <path d="M13 22C13 23.7 14.3 25 16 25C17.7 25 19 23.7 19 22" fill="#ca8a04" />
      <path d="M16 5C13.8 5 12 6.8 12 9V12.5L10.5 14H21.5L20 12.5V9C20 6.8 18.2 5 16 5Z" fill="url(#glass-bell)" />
    </g>
  </IconWrapper>
);

export const ChatIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="chat">
    <path d="M6 6H26V22H18L12 28V22H6V6Z" fill="#3b82f6" filter="url(#depth-chat)" />
    <path d="M7 7H25V21H17.5L13 25.5V21H7V7Z" fill="url(#glass-chat)" />
    <circle cx="11" cy="14" r="1.5" fill="white" fillOpacity="0.6" />
    <circle cx="16" cy="14" r="1.5" fill="white" fillOpacity="0.6" />
    <circle cx="21" cy="14" r="1.5" fill="white" fillOpacity="0.6" />
  </IconWrapper>
);

// FIX: Added missing ClipboardIcon for assignment tracking
export const ClipboardIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="clip">
    <rect x="8" y="4" width="16" height="22" rx="2" fill="#475569" filter="url(#depth-clip)" />
    <rect x="11" y="2" width="10" height="5" rx="1" fill="#334155" />
    <path d="M12 12H20M12 16H20M12 20H17" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <rect x="9" y="5" width="14" height="20" rx="1" fill="url(#glass-clip)" />
  </IconWrapper>
);

// FIX: Added missing BroadcastIcon for live lessons
export const BroadcastIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="broad">
    <circle cx="16" cy="16" r="4" fill="#ef4444" filter="url(#glow-broad)" />
    <path d="M16 8C11.5 8 8 11.5 8 16M16 4C9.5 4 4 9.5 4 16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <path d="M16 8C20.5 8 24 11.5 24 16M16 4C22.5 4 28 9.5 28 16" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </IconWrapper>
);

// FIX: Added missing ProfileIcon for user profile identification
export const ProfileIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="prof">
    <circle cx="16" cy="12" r="6" fill="#3b82f6" filter="url(#depth-prof)" />
    <path d="M6 28C6 22 10 18 16 18C22 18 26 22 26 28" fill="#3b82f6" />
    <circle cx="16" cy="12" r="5" fill="url(#glass-prof)" />
  </IconWrapper>
);

// FIX: Added missing AttendanceIcon for tracking presence
export const AttendanceIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="attn">
    <rect x="4" y="6" width="24" height="22" rx="3" fill="#10b981" filter="url(#depth-attn)" />
    <path d="M11 16L14 19L21 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-attn)" />
    <rect x="5" y="7" width="22" height="20" rx="2" fill="url(#glass-attn)" />
  </IconWrapper>
);

// FIX: Added missing FlyerIcon for calendar broadcasts
export const FlyerIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flyer">
    <path d="M4 6H28V22L16 28L4 22V6Z" fill="#f59e0b" filter="url(#depth-flyer)" />
    <path d="M8 12H24M8 16H20" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <path d="M4 6H28V22L16 28L4 22V6Z" fill="url(#glass-flyer)" />
  </IconWrapper>
);

// FIX: Added missing NeuralIcon for AI features
export const NeuralIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="neur">
    <circle cx="16" cy="16" r="10" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="16" cy="16" r="4" fill="#8b5cf6" filter="url(#glow-neur)" />
    <path d="M16 2V8M16 24V30M2 16H6M26 16H30" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
  </IconWrapper>
);

// FIX: Added missing MicIcon for audio related features
export const MicIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mic">
    <rect x="12" y="4" width="8" height="16" rx="4" fill="#3b82f6" filter="url(#depth-mic)" />
    <path d="M8 14C8 18.4 11.6 22 16 22C20.4 22 24 18.4 24 14" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M16 22V28M12 28H20" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
  </IconWrapper>
);