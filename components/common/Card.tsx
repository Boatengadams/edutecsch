import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

// FIX: Wrapped component in React.forwardRef to allow refs to be passed down.
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, fullHeight = true, ...props }, ref) => {
    return (
      // The outer div is the animated gradient border
      <div {...props} ref={ref} className={`p-[1px] rounded-lg shadow-lg animated-glow-border-bg ${className}`}>
          {/* The inner div provides the solid background color */}
          <div className={`bg-slate-800/80 backdrop-blur-sm rounded-[7px] p-4 sm:p-6 w-full flex flex-col ${fullHeight ? 'h-full' : ''}`}>
              {children}
          </div>
      </div>
    );
  }
);
Card.displayName = 'Card';


export default Card;
