
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
        className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 transition-opacity duration-300 no-print ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-800 z-40 transition-transform duration-300 ease-in-out flex flex-col no-print shadow-2xl
                  ${isExpanded ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{title}</h2>
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
        <nav className="flex-grow overflow-y-auto p-4 custom-scrollbar">
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
                      ? 'bg-blue-600/10 text-blue-400 font-semibold shadow-sm ring-1 ring-blue-500/20'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]"></div>}
                  </button>
                </li>
              )})}
            </ul>
        </nav>
        
        {/* Weather Widget */}
        <WeatherWidget />

        <div className="p-4 text-xs text-slate-600 text-center border-t border-slate-800/50">
            EduTec Platform v2.0
        </div>
      </div>
    </>
  );
};

export default Sidebar;
