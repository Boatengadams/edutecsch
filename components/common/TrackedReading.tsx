import React from 'react';

interface TrackedReadingProps {
  htmlContent: string;
}

const TrackedReading: React.FC<TrackedReadingProps> = ({ htmlContent }) => {

  // Just render the HTML, no more complex parsing for highlighting
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default TrackedReading;