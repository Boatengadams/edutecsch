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
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
      <filter id={`depth-${id}`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.6"/>
      </filter>
      <linearGradient id={`glass-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.7" />
        <stop offset="40%" stopColor="white" stopOpacity="0.15" />
        <stop offset="100%" stopColor="white" stopOpacity="0.05" />
      </linearGradient>
      <linearGradient id={`brand-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="50%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id={`danger-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#e11d48" />
      </linearGradient>
      <linearGradient id={`success-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id={`warning-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <linearGradient id={`ai-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

export const RocketIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="rocket">
    <g filter="url(#depth-rocket)">
      <path d="M24 8C24 8 20 6 14 6C8 6 6 14 6 14C6 14 4 20 4 24C4 24 4 32 12 32C16 32 22 30 22 30C22 30 30 28 30 22C30 16 24 8 24 8Z" fill="url(#brand-rocket)" />
      <path d="M24 10C24 10 21 8.5 16 8.5C11 8.5 9.5 15 9.5 15C9.5 15 8 20 8 23C8 23 8 29 14 29C17 29 22 27.5 22 27.5C22 27.5 28 26 28 22C28 17 24 10 24 10Z" fill="url(#glass-rocket)" />
      <circle cx="18" cy="14" r="3" fill="white" fillOpacity="0.6" />
      <path d="M8 28L4 32H12L8 28Z" fill="#ff4d4d" filter="url(#glow-rocket)" />
    </g>
  </IconWrapper>
);

export const GraduationIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="grad">
    <g filter="url(#depth-grad)">
      <path d="M2 14L16 6L30 14L16 22L2 14Z" fill="url(#brand-grad)" />
      <path d="M16 6L30 14L16 22L2 14L16 6Z" fill="url(#glass-grad)" />
      <path d="M7 16V24C7 24 11 28 16 28C21 28 25 24 25 24V16" stroke="url(#brand-grad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 14V23" stroke="#fbbf24" strokeWidth="2.5" filter="url(#glow-grad)" />
      <circle cx="30" cy="24" r="2" fill="#fbbf24" />
    </g>
  </IconWrapper>
);

export const ClipboardIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="clip">
    <rect x="6" y="6" width="20" height="22" rx="4" fill="#475569" filter="url(#depth-clip)" />
    <rect x="11" y="4" width="10" height="6" rx="2" fill="#1e293b" />
    <path d="M11 15H21M11 20H21M11 25H17" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    <rect x="8" y="8" width="16" height="18" rx="2" fill="url(#glass-clip)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const AttendanceIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="attn">
    <rect x="4" y="6" width="24" height="22" rx="6" fill="url(#success-attn)" filter="url(#depth-attn)" />
    <path d="M10 17L14 21L22 11" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-attn)" />
    <rect x="6" y="8" width="20" height="18" rx="4" fill="url(#glass-attn)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const BroadcastIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="broad">
    <circle cx="16" cy="16" r="7" fill="url(#danger-broad)" filter="url(#glow-broad)" />
    <path d="M16 8C11.5 8 8 11.5 8 16M16 4C9.5 4 4 9.5 4 16" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <path d="M16 8C20.5 8 24 11.5 24 16M16 4C22.5 4 28 9.5 28 16" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <circle cx="16" cy="16" r="5" fill="url(#glass-broad)" />
  </IconWrapper>
);

export const LibraryIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="lib">
    <path d="M4 6H12V26H4V6Z" fill="#0369a1" />
    <path d="M12 6H20V26H12V6Z" fill="#075985" />
    <path d="M20 6H28V26H20V6Z" fill="#0c4a6e" />
    <path d="M4 9H28M4 23H28" stroke="white" strokeOpacity="0.2" strokeWidth="2" />
    <rect x="5" y="7" width="22" height="18" rx="1.5" fill="url(#glass-lib)" />
  </IconWrapper>
);

export const UserMatrixIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="users">
    <circle cx="16" cy="10" r="8" fill="url(#brand-users)" filter="url(#depth-users)" />
    <path d="M4 27C4 21 9 18 16 18C23 18 28 21 28 27V28H4V27Z" fill="url(#brand-users)" />
    <circle cx="16" cy="10" r="6" fill="url(#glass-users)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const NeuralIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="neur">
    <circle cx="16" cy="16" r="12" stroke="url(#ai-neur)" strokeWidth="3" strokeDasharray="8 4" />
    <circle cx="16" cy="16" r="6" fill="url(#ai-neur)" filter="url(#glow-neur)" />
    <path d="M16 2V7M16 25V30M2 16H7M25 16H30" stroke="url(#ai-neur)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="16" r="10" fill="url(#glass-neur)" opacity="0.15" />
  </IconWrapper>
);

export const MicIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mic">
    <rect x="10" y="4" width="12" height="18" rx="6" fill="url(#brand-mic)" filter="url(#depth-mic)" />
    <path d="M6 15C6 20.5 10.5 25 16 25C21.5 25 26 20.5 26 15" stroke="url(#brand-mic)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M16 25V30M10 30H22" stroke="url(#brand-mic)" strokeWidth="3.5" strokeLinecap="round" />
    <rect x="12" y="6" width="8" height="14" rx="4" fill="url(#glass-mic)" opacity="0.3" />
  </IconWrapper>
);

export const BallotIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="ballot">
    <rect x="6" y="12" width="20" height="16" rx="4" fill="#4f46e5" filter="url(#depth-ballot)" />
    <rect x="11" y="4" width="10" height="11" rx="3" fill="#3730a3" />
    <path d="M13 18H19M13 23H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    <rect x="8" y="14" width="16" height="12" rx="2" fill="url(#glass-ballot)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const AnalyticsIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="anly">
    <path d="M4 28L12 14L18 24L28 6" stroke="url(#brand-anly)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-anly)" />
    <circle cx="28" cy="6" r="4.5" fill="#2563eb" filter="url(#depth-anly)" />
    <rect x="4" y="4" width="24" height="24" rx="6" stroke="white" strokeOpacity="0.15" strokeDasharray="4 4" />
  </IconWrapper>
);

export const ChatIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="chat">
    <path d="M4 6H28V24H18L12 30V24H4V6Z" fill="url(#brand-chat)" filter="url(#depth-chat)" />
    <path d="M6 8H26V22H17L13 26V22H6V8Z" fill="url(#glass-chat)" stroke="white" strokeOpacity="0.1" />
    <circle cx="10" cy="15" r="2.2" fill="white" fillOpacity="0.7" />
    <circle cx="16" cy="15" r="2.2" fill="white" fillOpacity="0.7" />
    <circle cx="22" cy="15" r="2.2" fill="white" fillOpacity="0.7" />
  </IconWrapper>
);

export const WalletIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="wallet">
    <rect x="4" y="8" width="24" height="18" rx="6" fill="url(#success-wallet)" filter="url(#depth-wallet)" />
    <rect x="18" y="14" width="12" height="8" rx="3" fill="#064e3b" />
    <circle cx="24" cy="18" r="3.5" fill="#fcd34d" filter="url(#glow-wallet)" />
    <rect x="6" y="10" width="20" height="14" rx="4" fill="url(#glass-wallet)" stroke="white" strokeOpacity="0.1" />
  </IconWrapper>
);

export const GearIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="gear">
    <circle cx="16" cy="16" r="12" stroke="#475569" strokeWidth="4.5" strokeDasharray="8 4" />
    <circle cx="16" cy="16" r="6" fill="url(#brand-gear)" filter="url(#glow-gear)" />
    <path d="M16 2V6M16 26V30M2 16H6M26 16H30" stroke="#475569" strokeWidth="4.5" strokeLinecap="round" />
    <circle cx="16" cy="16" r="13" stroke="url(#glass-gear)" strokeWidth="2.5" strokeOpacity="0.2" />
  </IconWrapper>
);

export const PulseIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="pulse">
    <rect x="4" y="6" width="24" height="22" rx="7" fill="#020617" />
    <path d="M6 17H10L12 8L16 26L18 17H26" stroke="url(#brand-pulse)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-pulse)" />
    <rect x="6" y="8" width="20" height="18" rx="5" fill="url(#glass-pulse)" stroke="white" strokeOpacity="0.08" />
  </IconWrapper>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="shield">
    <g filter="url(#depth-shield)">
      <path d="M16 4L5 8V17C5 24 16 30 16 30C16 30 27 24 27 17V8L16 4Z" fill="url(#success-shield)" />
      <path d="M16 6.5L25 9.5V17C25 22 16 27.5 16 27.5C16 27.5 7 22 7 17V9.5L16 6.5Z" fill="url(#glass-shield)" stroke="white" strokeOpacity="0.1" />
      <path d="M11 17L14 20L21 13" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-shield)" />
    </g>
  </IconWrapper>
);

export const InstitutionIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="inst">
    <path d="M16 4L4 13V28H28V13L16 4Z" fill="#334155" filter="url(#depth-inst)" />
    <path d="M16 7L26 14.5V26.5H16V7Z" fill="url(#glass-inst)" stroke="white" strokeOpacity="0.1" />
    <rect x="14" y="21" width="4" height="7" fill="#0f172a" />
    <path d="M8 17H12V21H8V17ZM20 17H24V21H20V17Z" fill="white" fillOpacity="0.3" />
  </IconWrapper>
);

export const FlyerIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flyer">
    <path d="M5 6H27V24L16 30L5 24V6Z" fill="url(#warning-flyer)" filter="url(#depth-flyer)" />
    <path d="M9 13H23M9 19H19" stroke="white" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
    <path d="M5 6H27V24L16 30L5 24V6Z" fill="url(#glass-flyer)" stroke="white" strokeOpacity="0.15" />
  </IconWrapper>
);

export const FlaskIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="flask">
    <path d="M11 4H21V12L29 26C30 28 28.5 30 26.5 30H5.5C3.5 30 2 28 3 26L11 12V4Z" fill="url(#success-flask)" fillOpacity="0.4" />
    <path d="M7 25L12 18L16 22L25 25" stroke="white" strokeOpacity="0.7" strokeWidth="3.5" />
    <path d="M11 4H21V12L29 26C30 28 28.5 30 26.5 30H5.5C3.5 30 2 28 3 26L11 12V4Z" stroke="url(#success-flask)" strokeWidth="4" />
    <circle cx="14" cy="22" r="2.5" fill="white" fillOpacity="0.8" className="animate-pulse" />
    <circle cx="20" cy="18" r="1.5" fill="white" fillOpacity="0.6" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
  </IconWrapper>
);

export const BrainIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="brain">
    <path d="M16 6C12 6 9 9 9 13.5C9 14.5 10 16 10 17C9 18 6.5 18 6.5 22C6.5 26 9 28 12.5 29L16 30" stroke="#c084fc" strokeWidth="4" filter="url(#depth-brain)" />
    <path d="M16 6C20 6 23 9 23 13.5C23 14.5 22 16 22 17C23 18 25.5 18 25.5 22C25.5 26 23 28 19.5 29L16 30" stroke="#c084fc" strokeWidth="4" filter="url(#depth-brain)" />
    <circle cx="16" cy="17" r="5" fill="#d8b4fe" filter="url(#glow-brain)" />
    <path d="M16 6V28" stroke="white" strokeOpacity="0.3" strokeWidth="2.5" />
  </IconWrapper>
);

export const HomeIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="home">
    <g filter="url(#depth-home)">
      <path d="M16 4L3 14V29H11V21H21V29H29V14L16 4Z" fill="url(#brand-home)" />
      <path d="M16 7L27 15.5V27.5H22V19.5H10V27.5H5V15.5L16 7Z" fill="url(#glass-home)" stroke="white" strokeOpacity="0.15" />
      <rect x="14" y="24" width="4" height="5" fill="#1e40af" />
    </g>
  </IconWrapper>
);

export const BellIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="bell">
    <g filter="url(#depth-bell)">
      <path d="M16 4C12.5 4 10 6.8 10 10.5V14L7.5 16V24H24.5V16L22 10.5C22 6.8 19.5 4 16 4Z" fill="url(#warning-bell)" />
      <path d="M12.5 24C12.5 26.5 14 28 16 28C18 28 19.5 26.5 19.5 24" fill="#b45309" />
      <path d="M16 6.5C13.5 6.5 11.5 8.5 11.5 11V15L9 17.5H23L20.5 15V11C20.5 8.5 18.5 6.5 16 6.5Z" fill="url(#glass-bell)" stroke="white" strokeOpacity="0.25" />
    </g>
  </IconWrapper>
);

export const ProfileIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="prof">
    <circle cx="16" cy="11" r="8" fill="url(#brand-prof)" filter="url(#depth-prof)" />
    <path d="M4 29C4 22 10 19 16 19C22 19 28 22 28 29" fill="url(#brand-prof)" />
    <circle cx="16" cy="11" r="6.5" fill="url(#glass-prof)" stroke="white" strokeOpacity="0.2" />
  </IconWrapper>
);

export const ScheduleIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="sched">
    <g filter="url(#depth-sched)">
      <rect x="4" y="6" width="24" height="22" rx="6" fill="url(#brand-sched)" />
      <path d="M4 13H28M10 6V4M22 6V4" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <rect x="6" y="8" width="20" height="18" rx="5" fill="url(#glass-sched)" stroke="white" strokeOpacity="0.15" />
    </g>
  </IconWrapper>
);

export const MegaphoneIcon: React.FC<IconProps> = (props) => (
  <IconWrapper {...props} id="mega">
    <g filter="url(#depth-mega)">
      <path d="M5 14L11 14L21 24V8L11 14H5V14Z" fill="url(#brand-mega)" />
      <path d="M25 11C27 13 27 19 25 21" stroke="url(#brand-mega)" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 8C31 12 31 20 28 24" stroke="url(#brand-mega)" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <rect x="7" y="16" width="20" height="8" rx="1.5" fill="url(#glass-mega)" />
    </g>
  </IconWrapper>
);
