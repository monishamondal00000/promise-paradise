import React from 'react';

export default function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        // Only allow clicking on completed steps (previous steps)
        const canClick = onStepClick && index < currentStep;
        return (
          <div key={index} className="flex items-center">
            <div
              onClick={() => canClick && onStepClick(index)}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                canClick ? 'cursor-pointer hover:ring-2 hover:ring-gold/30' : ''
              } ${
                !canClick && index !== currentStep ? 'cursor-not-allowed' : ''
              } ${
                index < currentStep ? 'bg-gold text-white' :
                index === currentStep ? 'bg-gold text-white ring-4 ring-gold/20' :
                'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentStep ? '✓' : index + 1}
            </div>
            <span
              onClick={() => canClick && onStepClick(index)}
              className={`ml-2 text-sm hidden sm:inline ${
                canClick ? 'cursor-pointer' : ''
              } ${
                !canClick && index !== currentStep ? 'cursor-not-allowed' : ''
              } ${
                index <= currentStep ? 'text-dark font-medium' : 'text-gray-400'
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                index < currentStep ? 'bg-gold' : 'bg-gray-200'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
