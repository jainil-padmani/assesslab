
import React from 'react';
import { type UploadStep } from '@/types/fileUpload';

interface StepIndicatorProps {
  steps: UploadStep[];
  currentStep: number;
}

export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border ${
              step.id === currentStep 
                ? 'bg-primary text-primary-foreground border-primary' 
                : step.id < currentStep 
                  ? 'bg-green-500 text-white border-green-500' 
                  : 'bg-background text-foreground border-muted'
            }`}
          >
            {step.id < currentStep ? '✓' : step.id}
          </div>
          <div className="ml-2 text-sm font-medium">{step.title}</div>
          {step.id < steps.length && (
            <div className="mx-2 h-0.5 w-8 bg-muted"></div>
          )}
        </div>
      ))}
    </div>
  );
};
