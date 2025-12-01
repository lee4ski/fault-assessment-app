# Quick Start Guide for Cursor

## What's Been Done
✅ Type system extended (`types/index.ts`)
✅ Vehicle data library created (`lib/vehicleData.ts`)
✅ Implementation plan documented

## What You Need to Do Next

### Step 1: Create Main Wizard Container (30 min)
Create `components/AccidentReportWizard.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AccidentReportFull } from "@/types";
import WorkflowStepper from "./WorkflowStepper";
import Step1Search from "./Step1Search";
import Step2Calculate from "./Step2Calculate";
import ChatWindow from "./ChatWindow";

export default function AccidentReportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState<AccidentReportFull | null>(null);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: Wizard */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b p-4">
          <WorkflowStepper 
            currentStep={currentStep} 
            totalSteps={5}
            steps={[
              "認定基準の検索",
              "修正要素の適用",
              "車両情報検索",
              "AI推奨の確認",
              "報告書編集"
            ]}
          />
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {currentStep === 1 && <Step1Search onSelect={() => setCurrentStep(2)} />}
          {currentStep === 2 && <Step2Calculate onCalculate={() => setCurrentStep(3)} />}
          {currentStep === 3 && <div>Vehicle Lookup (TODO)</div>}
          {currentStep === 4 && <div>AI Recommend (TODO)</div>}
          {currentStep === 5 && <div>Report Editor (TODO)</div>}
        </div>
      </div>
      
      {/* Right: Chat */}
      <div className="w-[400px] border-l bg-white">
        <ChatWindow />
      </div>
    </div>
  );
}
```

### Step 2: Update Main Page (5 min)
Modify `app/page.tsx`:

```tsx
import AccidentReportWizard from "@/components/AccidentReportWizard";

export default function Home() {
  return <AccidentReportWizard />;
}
```

### Step 3: Update WorkflowStepper (10 min)
Modify `components/WorkflowStepper.tsx` to accept 5 steps and step labels.

### Step 4: Create Vehicle Lookup (1-2 hours)
Create `components/Step3VehicleLookup.tsx` - see IMPLEMENTATION_PROGRESS.md for details.

### Step 5: Test
Run `npm run dev` and navigate through the wizard.

## Full Details
See `project doc/IMPLEMENTATION_PROGRESS.md` for complete breakdown.
