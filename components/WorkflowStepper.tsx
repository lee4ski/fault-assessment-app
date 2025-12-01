"use client";

import { StepValidation } from "@/types/workflow";

interface WorkflowStepperProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  totalSteps?: number;
  steps?: string[];
  stepValidations?: Record<number, StepValidation>;
}

export default function WorkflowStepper({
  currentStep,
  onStepChange,
  totalSteps = 4,
  steps = [
    "認定基準の検索",
    "修正要素の適用",
    "車両情報検索",
    "AI報告書作成",
  ],
  stepValidations = {},
}: WorkflowStepperProps) {
  const getStepColor = (stepNumber: number): string => {
    const validation = stepValidations[stepNumber];
    
    // Current step
    if (currentStep === stepNumber) {
      return "bg-blue-600 text-white shadow-lg ring-4 ring-blue-100";
    }
    
    // Not yet visited
    if (currentStep < stepNumber && !validation) {
      return "bg-gray-300 text-gray-600 hover:bg-gray-400";
    }
    
    // Has validation status
    if (validation) {
      switch (validation.color) {
        case "green":
          return "bg-green-500 text-white shadow-md hover:shadow-lg";
        case "red":
          return "bg-red-500 text-white shadow-md hover:shadow-lg";
        case "yellow":
          return "bg-yellow-500 text-white shadow-md hover:shadow-lg";
        default:
          return "bg-gray-300 text-gray-600 hover:bg-gray-400";
      }
    }
    
    // Visited but no validation
    if (currentStep > stepNumber) {
      return "bg-green-500 text-white shadow-md hover:shadow-lg";
    }
    
    return "bg-gray-300 text-gray-600 hover:bg-gray-400";
  };

  const getStepIcon = (stepNumber: number): string => {
    const validation = stepValidations[stepNumber];
    
    // Current step shows number
    if (currentStep === stepNumber) {
      return stepNumber.toString();
    }
    
    // Has validation
    if (validation) {
      if (validation.status === "complete" || validation.status === "valid-empty") {
        return "✓";
      } else if (validation.status === "incomplete") {
        return "!";
      }
    }
    
    // Default: checkmark for visited, number for not visited
    return currentStep > stepNumber ? "✓" : stepNumber.toString();
  };

  const getStepTextColor = (stepNumber: number): string => {
    const validation = stepValidations[stepNumber];
    
    if (currentStep === stepNumber) {
      return "text-blue-600";
    }
    
    if (validation) {
      switch (validation.color) {
        case "green":
          return "text-green-600";
        case "red":
          return "text-red-600";
        case "yellow":
          return "text-yellow-600";
        default:
          return "text-gray-500";
      }
    }
    
    return currentStep > stepNumber ? "text-green-600" : "text-gray-500";
  };

  const getConnectorColor = (stepNumber: number): string => {
    const validation = stepValidations[stepNumber];
    
    if (validation) {
      switch (validation.color) {
        case "green":
          return "bg-green-500";
        case "red":
          return "bg-red-500";
        case "yellow":
          return "bg-yellow-500";
        default:
          return "bg-gray-300";
      }
    }
    
    return currentStep > stepNumber ? "bg-green-500" : "bg-gray-300";
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((stepNumber, index) => {
          const validation = stepValidations[stepNumber];
          
          return (
            <div key={stepNumber} className="flex items-center flex-1">
              {/* Step Circle and Label */}
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => onStepChange(stepNumber)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all transform hover:scale-110 ${getStepColor(stepNumber)}`}
                  title={validation?.reason || ""}
                >
                  {getStepIcon(stepNumber)}
                </button>
                <div className="mt-2 text-center px-2">
                  <p
                    className={`text-xs font-semibold whitespace-nowrap ${getStepTextColor(stepNumber)}`}
                  >
                    {steps[stepNumber - 1] || `ステップ${stepNumber}`}
                  </p>
                  {validation && validation.status === "incomplete" && (
                    <p className="text-[10px] text-red-500 mt-0.5">不完全</p>
                  )}
                  {validation && validation.status === "valid-empty" && (
                    <p className="text-[10px] text-green-500 mt-0.5">適用なし</p>
                  )}
                </div>
              </div>
              
              {/* Connector Line */}
              {index < totalSteps - 1 && (
                <div className={`h-0.5 flex-1 mx-3 transition-colors ${getConnectorColor(stepNumber)}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

