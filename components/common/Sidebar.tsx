import React, { useEffect, useRef } from 'react';
import WeatherWidget from './WeatherWidget';

interface SidebarProps {
  isExpanded: boolean;
  navItems: { key: string; label: React.ReactNode; icon?: React.ReactNode }[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onClose: () => void;
  title: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, navItems, activeTab, setActiveTab, onClose, title }) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isExpanded) {
      triggerRef.current = document.activeElement as HTMLElement;
      const focusableElements = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
            return;
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] transition-opacity duration-300 no-print lg:hidden ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed lg:static top-0 left-0 h-full w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 z-[70] transition-transform duration-300 ease-in-out flex flex-col no-print shadow-2xl overflow-hidden
                  ${isExpanded ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-800/50 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 truncate">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors lg:hidden p-2 rounded-full hover:bg-slate-800"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar">
            <ul className="flex flex-col space-y-1">
              {navItems.map(item => {
                const isActive = activeTab === item.key;
                return (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      setActiveTab(item.key);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`group w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-left transition-all duration-200 outline-none
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] text-white font-bold shadow-lg shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {item.icon}
                    </div>
                    <span className="truncate text-sm md:text-base">{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
                  </button>
                </li>
              )})}
            </ul>
        </nav>
        
        {/* Weather Widget */}
        <div className="flex-shrink-0">
          <WeatherWidget />
        </div>

        <div className="p-4 text-[10px] md:text-xs text-slate-600 text-center border-t border-slate-800/50 flex-shrink-0">
            EduTec Platform v2.5
        </div>
      </div>
    </>
  );
};

export default Sidebar;