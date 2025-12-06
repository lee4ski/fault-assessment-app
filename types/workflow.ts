export type WorkflowStep = 1 | 2 | 3 | 4;

export type StepStatus = "complete" | "incomplete" | "valid-empty" | "not-started";
export type StepColor = "green" | "red" | "yellow" | "gray";

export interface StepValidation {
  stepNumber: number;
  status: StepStatus;
  color: StepColor;
  missingItems: string[];
  reason: string;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  step1Data?: {
    selectedCriteria?: any;
    searchTerm?: string;
  };
  step2Data?: {
    basePercentage?: number;
    selectedModifications?: string[];
  };
  step3Data?: {
    accidentReport?: string;
    aiRecommendations?: any[];
  };
  stepValidations?: Record<number, StepValidation>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string; // Base64 image data
  audio?: {
    name: string;
    url: string; // Data URL or blob URL
    type: string;
  };
  recommendations?: Array<{
    id: string;
    title: string;
    description: string;
    baseFaultPercentage: number;
    confidence: number;
    matchType: string;
  }>;
}

