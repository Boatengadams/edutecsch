import React, { useMemo } from 'react';

interface TrackedReadingProps {
  htmlContent: string;
  highlightRange: { start: number; end: number } | null;
}

const TrackedReading: React.FC<TrackedReadingProps> = ({ htmlContent, highlightRange }) => {

  const parsedContent = useMemo(() => {
    const segments: React.ReactNode[] = [];
    // Split by tags, keeping the tags in the array
    const parts = htmlContent.split(/(<[^>]+>)/g);
    let plainTextCharCount = 0;
    let keyIndex = 0;

    parts.forEach(part => {
      if (part.startsWith('<') && part.endsWith('>')) {
        // It's a tag, render it using dangerouslySetInnerHTML
        segments.push(<span key={`tag-${keyIndex++}`} dangerouslySetInnerHTML={{ __html: part }} />);
      } else {
        // It's a text node
        let currentText = part;
        const partStart = plainTextCharCount;
        const partEnd = partStart + currentText.length;

        if (highlightRange && highlightRange.start < partEnd && highlightRange.end > partStart) {
          // The highlight overlaps with this text part
          const highlightStartInPart = Math.max(0, highlightRange.start - partStart);
          const highlightEndInPart = Math.min(currentText.length, highlightRange.end - partStart);

          const before = currentText.substring(0, highlightStartInPart);
          const highlighted = currentText.substring(highlightStartInPart, highlightEndInPart);
          const after = currentText.substring(highlightEndInPart);
          
          if(before) segments.push(<span key={`text-before-${keyIndex++}`}>{before}</span>);
          if(highlighted) segments.push(<span key={`text-highlight-${keyIndex++}`} className="reading-highlight">{highlighted}</span>);
          if(after) segments.push(<span key={`text-after-${keyIndex++}`}>{after}</span>);

        } else {
          // No highlight in this part
          segments.push(<span key={`text-${keyIndex++}`}>{currentText}</span>);
        }
        plainTextCharCount += currentText.length;
      }
    });

    return segments;
  }, [htmlContent, highlightRange]);

  return <>{parsedContent}</>;
};

export default TrackedReading;
