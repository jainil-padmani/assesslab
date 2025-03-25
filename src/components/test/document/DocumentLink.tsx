
import React from 'react';
import { FilePlus, FileCheck, FileUp } from "lucide-react";

interface DocumentLinkProps {
  url: string;
  type: 'question' | 'answer' | 'handwritten';
  label?: string;
  description?: string;
}

export function DocumentLink({ url, type, label, description }: DocumentLinkProps) {
  const getIcon = () => {
    switch (type) {
      case 'question':
        return <FilePlus className="h-5 w-5 mr-2 text-primary" />;
      case 'answer':
        return <FileCheck className="h-5 w-5 mr-2 text-primary" />;
      case 'handwritten':
        return <FileUp className="h-5 w-5 mr-2 text-primary" />;
      default:
        return <FilePlus className="h-5 w-5 mr-2 text-primary" />;
    }
  };

  const getLabel = () => {
    if (label) return label;
    switch (type) {
      case 'question':
        return 'Question Paper';
      case 'answer':
        return 'Answer Key';
      case 'handwritten':
        return 'Handwritten Paper';
      default:
        return 'Document';
    }
  };

  const getDescription = () => {
    if (description) return description;
    return 'View document';
  };

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="flex items-center flex-1"
    >
      {getIcon()}
      <div>
        <div className="text-sm font-medium">{getLabel()}</div>
        <div className="text-xs text-muted-foreground">{getDescription()}</div>
      </div>
    </a>
  );
}
