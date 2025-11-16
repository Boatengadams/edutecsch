import React, { useEffect, useRef } from 'react';

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
      // Store the element that had focus before the sidebar opened
      triggerRef.current = document.activeElement as HTMLElement;

      const focusableElements = sidebarRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements && focusableElements.length > 0) {
        // Focus the first focusable element (e.g., the close button on mobile)
        focusableElements[0].focus();
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
            return;
        }
        
        if (event.key === 'Tab' && focusableElements) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          const currentActiveElement = document.activeElement as HTMLElement;
          const currentIndex = Array.from(focusableElements).indexOf(currentActiveElement);

          if (event.shiftKey) { // Shift+Tab
            if (currentActiveElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            }
          } else { // Tab
            if (currentActiveElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        // Return focus to the element that opened the sidebar
        if (triggerRef.current) {
          triggerRef.current.focus();
        }
      };
    }
  }, [isExpanded, onClose]);


  return (
    <>
      {/* Overlay for all screen sizes when expanded */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-30 transition-opacity duration-300 no-print ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      ></div>

      {/* Main Sidebar Panel */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-64 bg-slate-800/90 backdrop-blur-sm border-r border-slate-700 z-40 transition-transform duration-300 ease-in-out flex flex-col no-print
                  ${isExpanded ? 'translate-x-0' : '-translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 h-[65px]">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-light leading-none lg:hidden"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-grow overflow-y-auto p-4">
            <ul className="flex flex-col space-y-2">
              {navItems.map(item => (
                <li key={item.key}>
                  <button
                    onClick={() => {
                      setActiveTab(item.key);
                      // On smaller screens, close the sidebar after selection
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500
                    ${activeTab === item.key
                      ? 'bg-sky-600 text-white font-semibold shadow-md'
                      : 'bg-transparent text-gray-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <div className="w-5 h-5 flex-shrink-0">{item.icon}</div>
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;