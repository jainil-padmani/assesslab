
import React from 'react';
import { OCRButton } from './OCRButton';
import { EditButton } from './EditButton';
import { DocumentLink } from './DocumentLink';

interface DocumentSectionProps {
  url: string;
  type: 'question' | 'answer' | 'handwritten';
  label?: string;
  hasOcrText: boolean;
  isLoadingOcr: boolean;
  onShowOcr: () => void;
  onStartEdit: () => void;
  onProcessOcr: () => void;
  className?: string;
}

export function DocumentSection({
  url,
  type,
  label,
  hasOcrText,
  isLoadingOcr,
  onShowOcr,
  onStartEdit,
  onProcessOcr,
  className = ''
}: DocumentSectionProps) {
  if (!url) return null;

  const isHandwritten = type === 'handwritten';

  return (
    <div className={`flex flex-col p-3 border rounded-md hover:bg-muted/50 transition-colors h-full ${className}`}>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center flex-wrap">
          <DocumentLink url={url} type={type} label={label} />
        </div>
        
        {!isHandwritten && (
          <div className="flex flex-wrap gap-2 mt-1">
            {hasOcrText ? (
              <>
                <OCRButton 
                  hasOcrText={true} 
                  isLoading={false} 
                  onClick={onShowOcr} 
                />
                <EditButton onClick={onStartEdit} />
              </>
            ) : (
              <>
                <OCRButton 
                  hasOcrText={false} 
                  isLoading={isLoadingOcr} 
                  onClick={onProcessOcr} 
                />
                <EditButton onClick={onStartEdit} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
