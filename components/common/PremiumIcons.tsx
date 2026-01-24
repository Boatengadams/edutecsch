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
      <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.5" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id={`depth-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0.8" dy="1.5" stdDeviation="1.2" floodOpacity="0.5"/>
      </filter>
      <linearGradient id={`glass-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.6" />
        <stop offset="50%" stopColor="white" stopOpacity="0.2" />
        <stop offset="100%" stopColor="white" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={`brand-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <linearGradient id={`danger-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#f43f5e" />
      </linearGradient>
      <linearGradient id={`success-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id={`warning-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id={`ai-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

export const RocketIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="rocket">
    <g filter="url(#depth-rocket)">
      <path d="M22 6C22 6 18 4 12 4C6 4 4 12 4 12C4 12 2 18 2 22C2 22 2 30 10 30C14 30 20 28 20 28C20 28 28 26 28 20C28 14 22 6 22 6Z" fill="url(#brand-rocket)" />
      <path d="M22 8C22 8 19 6.5 14 6.5C9 6.5 7.5 13 7.5 13C7.5 13 6 18 6 21C6 21 6 27 12 27C15 27 20 25.5 20 25.5C20 25.5 26 24 26 20C26 15 22 8 22 8Z" fill="url(#glass-rocket)" />
      <circle cx="16" cy="12" r="3" fill="white" fillOpacity="0.5" />
      <path d="M10 28L7 31H15L12 28" fill="#f87171" filter="url(#glow-rocket)" />
    </g>
  </IconWrapper>
);

export const GraduationIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="grad">
    <g filter="url(#depth-grad)">
      <path d="M4 12L16 6L28 12L16 18L4 12Z" fill="url(#brand-grad)" />
      <path d="M16 6L28 12L16 18L4 12L16 6Z" fill="url(#glass-grad)" />
      <path d="M8 14V22C8 22 12 26 16 26C20 26 24 22 24 22V14" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M28 12V21" stroke="#fbbf24" strokeWidth="2.5" filter="url(#glow-grad)" />
      <circle cx="28" cy="22" r="2" fill="#fbbf24" />
    </g>
  </IconWrapper>
);

export const ClipboardIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="clip">
    <rect x="6" y="6" width="20" height="22" rx="4" fill="#475569" filter="url(#depth-clip)" />
    <rect x="11" y="4" width="10" height="6" rx="2" fill="#334155" />
    <path d="M10 14H22M10 19H22M10 24H18" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <rect x="7.5" y="7.5" width="17" height="19" rx="3" fill="url(#glass-clip)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const AttendanceIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="attn">
    <rect x="4" y="6" width="24" height="22" rx="5" fill="url(#success-attn)" filter="url(#depth-attn)" />
    <path d="M10 17L14 21L22 11" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-attn)" />
    <rect x="5.5" y="7.5" width="21" height="19" rx="4" fill="url(#glass-attn)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const BroadcastIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="broad">
    <circle cx="16" cy="16" r="6" fill="url(#danger-broad)" filter="url(#glow-broad)" />
    <path d="M16 8C11.5 8 8 11.5 8 16M16 4C9.5 4 4 9.5 4 16" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <path d="M16 8C20.5 8 24 11.5 24 16M16 4C22.5 4 28 9.5 28 16" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <circle cx="16" cy="16" r="4.5" fill="url(#glass-broad)" />
  </IconWrapper>
);

export const LibraryIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="lib">
    <path d="M4 6H12V26H4V6Z" fill="#0284c7" />
    <path d="M12 6H20V26H12V6Z" fill="#0369a1" />
    <path d="M20 6H28V26H20V6Z" fill="#075985" />
    <path d="M4 9H28M4 23H28" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
    <rect x="4.5" y="6.5" width="23" height="19" rx="1.5" fill="url(#glass-lib)" />
  </IconWrapper>
);

export const UserMatrixIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="users">
    <circle cx="16" cy="10" r="7" fill="url(#brand-users)" filter="url(#depth-users)" />
    <path d="M4 26C4 20 9 17 16 17C23 17 28 20 28 26V28H4V26Z" fill="url(#brand-users)" />
    <circle cx="16" cy="10" r="5.5" fill="url(#glass-users)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const NeuralIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="neur">
    <circle cx="16" cy="16" r="11" stroke="url(#ai-neur)" strokeWidth="3" strokeDasharray="6 4" />
    <circle cx="16" cy="16" r="5" fill="url(#ai-neur)" filter="url(#glow-neur)" />
    <path d="M16 2V7M16 25V30M2 16H7M25 16H30M6 6L10 10M22 22L26 26" stroke="url(#ai-neur)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="16" r="9" fill="url(#glass-neur)" opacity="0.15" />
  </IconWrapper>
);

export const MicIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mic">
    <rect x="10" y="4" width="12" height="18" rx="6" fill="url(#brand-mic)" filter="url(#depth-mic)" />
    <path d="M6 15C6 20.5 10.5 25 16 25C21.5 25 26 20.5 26 15" stroke="url(#brand-mic)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M16 25V30M10 30H22" stroke="url(#brand-mic)" strokeWidth="3.5" strokeLinecap="round" />
    <rect x="11.5" y="5.5" width="9" height="15" rx="4.5" fill="url(#glass-mic)" opacity="0.3" />
  </IconWrapper>
);

export const BallotIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="ballot">
    <rect x="6" y="12" width="20" height="16" rx="4" fill="#6366f1" filter="url(#depth-ballot)" />
    <rect x="11" y="4" width="10" height="10" rx="3" fill="#4f46e5" />
    <path d="M13 18H19M13 22H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    <rect x="7.5" y="13.5" width="17" height="13" rx="2.5" fill="url(#glass-ballot)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const AnalyticsIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="anly">
    <path d="M4 28L12 14L18 22L28 6" stroke="url(#brand-anly)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-anly)" />
    <circle cx="28" cy="6" r="4" fill="#3b82f6" filter="url(#depth-anly)" />
    <rect x="4" y="4" width="24" height="24" rx="6" stroke="white" strokeOpacity="0.15" strokeDasharray="4 4" />
  </IconWrapper>
);

export const ChatIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="chat">
    <path d="M4 6H28V24H18L12 30V24H4V6Z" fill="url(#brand-chat)" filter="url(#depth-chat)" />
    <path d="M5.5 7.5H26.5V22.5H17.5L13.5 26.5V22.5H5.5V7.5Z" fill="url(#glass-chat)" stroke="white" strokeOpacity="0.1" />
    <circle cx="10" cy="15" r="2" fill="white" fillOpacity="0.7" />
    <circle cx="16" cy="15" r="2" fill="white" fillOpacity="0.7" />
    <circle cx="22" cy="15" r="2" fill="white" fillOpacity="0.7" />
  </IconWrapper>
);

export const WalletIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="wallet">
    <rect x="4" y="8" width="24" height="18" rx="5" fill="url(#success-wallet)" filter="url(#depth-wallet)" />
    <rect x="18" y="13" width="12" height="8" rx="3" fill="#065f46" />
    <circle cx="24" cy="17" r="3" fill="#fbbf24" filter="url(#glow-wallet)" />
    <rect x="5.5" y="9.5" width="21" height="15" rx="4" fill="url(#glass-wallet)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const GearIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="gear">
    <circle cx="16" cy="16" r="11" stroke="#64748b" strokeWidth="4.5" strokeDasharray="7 4" />
    <circle cx="16" cy="16" r="5" fill="url(#brand-gear)" filter="url(#glow-gear)" />
    <path d="M16 2V6M16 26V30M2 16H6M26 16H30" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="16" cy="16" r="13" stroke="url(#glass-gear)" strokeWidth="2" strokeOpacity="0.25" />
  </IconWrapper>
);

export const PulseIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="pulse">
    <rect x="4" y="6" width="24" height="22" rx="6" fill="#0f172a" />
    <path d="M6 17H10L12 8L16 26L18 17H26" stroke="url(#brand-pulse)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-pulse)" />
    <rect x="5.5" y="7.5" width="21" height="19" rx="5" fill="url(#glass-pulse)" stroke="white" strokeOpacity="0.08" />
  </IconWrapper>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="shield">
    <g filter="url(#depth-shield)">
      <path d="M16 4L5 8V16C5 23 16 30 16 30C16 30 27 23 27 16V8L16 4Z" fill="url(#success-shield)" />
      <path d="M16 6L25 9V16C25 21 16 27.5 16 27.5C16 27.5 7 21 7 16V9L16 6Z" fill="url(#glass-shield)" stroke="white" strokeOpacity="0.1" />
      <path d="M11 17L14 20L21 13" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-shield)" />
    </g>
  </IconWrapper>
);

export const InstitutionIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="inst">
    <path d="M16 4L4 12V28H28V12L16 4Z" fill="#475569" filter="url(#depth-inst)" />
    <path d="M16 6.5L26 13.5V26.5H16V6.5Z" fill="url(#glass-inst)" stroke="white" strokeOpacity="0.1" />
    <rect x="14" y="21" width="4" height="7" fill="#1e293b" />
    <path d="M8 17H12V21H8V17ZM20 17H24V21H20V17Z" fill="white" fillOpacity="0.25" />
  </IconWrapper>
);

export const FlyerIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flyer">
    <path d="M5 6H27V23L16 30L5 23V6Z" fill="url(#warning-flyer)" filter="url(#depth-flyer)" />
    <path d="M9 13H23M9 18H19" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    <path d="M5 6H27V23L16 30L5 23V6Z" fill="url(#glass-flyer)" stroke="white" strokeOpacity="0.15" />
  </IconWrapper>
);

export const FlaskIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flask">
    <path d="M11 4H21V11L29 25C30 27 28.5 29 26.5 29H5.5C3.5 29 2 27 3 25L11 11V4Z" fill="url(#success-flask)" fillOpacity="0.3" />
    <path d="M7 25L12 17L16 21L25 25" stroke="white" strokeOpacity="0.6" strokeWidth="3" />
    <path d="M11 4H21V11L29 25C30 27 28.5 29 26.5 29H5.5C3.5 29 2 27 3 25L11 11V4Z" stroke="url(#success-flask)" strokeWidth="3.5" />
    <circle cx="14" cy="23" r="2.5" fill="white" fillOpacity="0.7" className="animate-pulse" />
  </IconWrapper>
);

export const BrainIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="brain">
    <path d="M16 6C12.5 6 9.5 9 9.5 13C9.5 14 10.5 15.5 10.5 16.5C9.5 17.5 7 17.5 7 21C7 24.5 9.5 26.5 12.5 27.5L16 28.5" stroke="#a855f7" strokeWidth="3.5" filter="url(#depth-brain)" />
    <path d="M16 6C19.5 6 22.5 9 22.5 13C22.5 14 21.5 15.5 21.5 16.5C22.5 17.5 25 17.5 25 21C25 24.5 22.5 26.5 19.5 27.5L16 28.5" stroke="#a855f7" strokeWidth="3.5" filter="url(#depth-brain)" />
    <circle cx="16" cy="16" r="4.5" fill="#c084fc" filter="url(#glow-brain)" />
    <path d="M16 6V28" stroke="white" strokeOpacity="0.25" strokeWidth="2" />
  </IconWrapper>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="home">
    <g filter="url(#depth-home)">
      <path d="M16 4L3 14V28H11V20H21V28H29V14L16 4Z" fill="url(#brand-home)" />
      <path d="M16 6.5L27 15V26.5H22.5V18.5H9.5V26.5H5V15L16 6.5Z" fill="url(#glass-home)" stroke="white" strokeOpacity="0.15" />
      <rect x="14" y="23" width="4" height="5" fill="#1d4ed8" />
    </g>
  </IconWrapper>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="bell">
    <g filter="url(#depth-bell)">
      <path d="M16 4C12.8 4 10.5 6.5 10.5 10V13L8 15V23H24V15L21.5 13V10C21.5 6.5 19.2 4 16 4Z" fill="url(#warning-bell)" />
      <path d="M12.5 23C12.5 25 14 26.5 16 26.5C18 26.5 19.5 25 19.5 23" fill="#ca8a04" />
      <path d="M16 6C13.5 6 11.5 8 11.5 10.5V14L9 16H23L20.5 14V10.5C20.5 8 18.5 6 16 6Z" fill="url(#glass-bell)" stroke="white" strokeOpacity="0.2" />
    </g>
  </IconWrapper>
);

export const ProfileIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="prof">
    <circle cx="16" cy="11" r="7.5" fill="url(#brand-prof)" filter="url(#depth-prof)" />
    <path d="M4 28C4 21 10 18 16 18C22 18 28 21 28 28" fill="url(#brand-prof)" />
    <circle cx="16" cy="11" r="6" fill="url(#glass-prof)" stroke="white" strokeOpacity="0.15" />
  </IconWrapper>
);

export const ScheduleIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="sched">
    <g filter="url(#depth-sched)">
      <rect x="4" y="6" width="24" height="22" rx="5" fill="url(#brand-sched)" />
      <path d="M4 13H28M10 6V4M22 6V4" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5.5" y="7.5" width="21" height="19" rx="4" fill="url(#glass-sched)" stroke="white" strokeOpacity="0.1" />
    </g>
  </IconWrapper>
);

export const MegaphoneIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mega">
    <g filter="url(#depth-mega)">
      <path d="M5 14L11 14L20 23V7L11 14H5V14Z" fill="url(#brand-mega)" />
      <path d="M24 10C26 12 26 18 24 20" stroke="url(#brand-mega)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M27 7C30 11 30 19 27 23" stroke="url(#brand-mega)" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <rect x="6.5" y="15.5" width="21" height="9" rx="1.5" fill="url(#glass-mega)" />
    </g>
  </IconWrapper>
);
