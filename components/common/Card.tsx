import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, fullHeight = false, ...props }, ref) => {
    return (
      <div 
        {...props} 
        ref={ref} 
        className={`
          relative group rounded-2xl 
          bg-slate-800/50 dark:bg-slate-800/50 
          light:bg-white backdrop-blur-md 
          border border-slate-700/50 dark:border-slate-700/50 light:border-black/5
          shadow-lg hover:shadow-xl hover:border-slate-600/50 dark:hover:border-slate-600/50
          transition-all duration-300 ease-in-out
          ${fullHeight ? 'h-full' : ''} 
          ${className}
        `}
      >
        <div className={`relative p-4 sm:p-6 h-full flex flex-col z-10`}>
            {children}
        </div>
      </div>
    );
  }
);
Card.displayName = 'Card';

export default Card;