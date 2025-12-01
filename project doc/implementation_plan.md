# Implementation Plan: Complete Accident Report System

## Overview
Building a comprehensive accident report system integrating 4 user stories: Fault Assessment Calculator, AI Assistant, Vehicle Lookup, and Report Generation with approval workflow.

## User Review Required

> [!IMPORTANT]
> **Scope Confirmation**
> 
> This is a **major rebuild** of the current application. The existing fault calculator will be integrated into a larger wizard-based system with:
> - 5-step wizard (Search → Calculate → Vehicle → AI → Report)
> - Persistent chat panel on the right
> - Bidirectional updates between steps
> - File attachments and approval workflow
> 
> **Estimated effort**: 20-25 hours
> 
> **Question**: Should I proceed with the full implementation, or would you prefer a phased approach where I deliver working increments?

## Architecture Changes

### Current State
```
Simple 3-step wizard:
Step1Search → Step2Calculate → Step3AIRecommend
```

### Target State
```
Integrated 5-step wizard + Chat Panel:
┌─────────────────────────────────────────┬──────────────┐
│ Step1: Fault Search                     │              │
│ Step2: Modification Factors             │   Chat       │
│ Step3: Vehicle Lookup                   │   Panel      │
│ Step4: AI Recommendations               │   (Always    │
│ Step5: Report Editor + Approval         │   Visible)   │
└─────────────────────────────────────────┴──────────────┘
```

## Proposed Changes

---

### Phase 1: Core Infrastructure

#### [MODIFY] `types/index.ts`
Add comprehensive types for the complete system:
```typescript
// Vehicle types
interface Vehicle {
  modelCode: string;
  make: string;
  model: string;
  releaseDate: Date;
  newCost: number;
  // ... liability classes
}

// Report types
interface AccidentReportFull extends AccidentReport {
  vehicles: Vehicle[];
  attachments: Attachment[];
  reportText: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalHistory: ApprovalAction[];
}

// Attachment types
interface Attachment {
  id: string;
  filename: string;
  type: 'image' | 'video' | 'document';
  url: string;
  uploadedAt: Date;
}
```

#### [NEW] `components/AccidentReportWizard.tsx`
Main wizard container managing all 5 steps with persistent chat:
- Horizontal step indicator
- Step content area
- Persistent chat panel (right side, 400px width)
- Bidirectional data flow between steps
- Global state management

#### [MODIFY] `components/ChatWindow.tsx`
Enhance to support:
- AI recommendations with "Apply" buttons
- Shortcuts to jump between steps
- File upload for images/videos
- Context-aware suggestions based on current step

---

### Phase 2: User Story 1 - Fault Assessment (Enhanced)

#### [MODIFY] `components/Step1Search.tsx`
**Current**: Basic keyword search
**Add**:
- Structured search tab with chapter/section dropdowns
- Better visual hierarchy for search results
- Integration with chat for AI keyword suggestions

#### [MODIFY] `components/Step2Calculate.tsx`
**Current**: Has modification factors ✅
**Add**:
- Reverse update capability (when report edits fault %)
- History tracking of modifications
- Better visual summary of applied factors

---

### Phase 3: User Story 2 - AI Assistant

#### [MODIFY] `components/ChatWindow.tsx`
**Add**:
- Image/video upload button
- AI analysis of uploaded media
- TOP-3 recommendations as interactive cards
- "Apply to Step X" buttons
- Explainability ("Why this recommendation?")

#### [NEW] `lib/aiService.ts`
Simulated AI service for:
- Text analysis → accident type classification
- Image analysis → accident scene detection
- Recommendation generation with scores

---

### Phase 4: User Story 3 - Vehicle Lookup

#### [NEW] `components/Step3VehicleLookup.tsx`
Vehicle search and management:
- Model code search input
- Make/model search with type-ahead
- Registration date filter
- Search results table
- "Apply Vehicle" button
- "Create New Vehicle" modal

#### [NEW] `lib/vehicleData.ts`
Sample vehicle master data:
- Mock vehicle database (50-100 vehicles)
- Search functions (by code, by make/model)
- Filter by registration date
- CRUD for custom vehicles

#### [NEW] `types/vehicle.ts`
```typescript
interface VehicleSearchParams {
  modelCode?: string;
  make?: string;
  model?: string;
  registrationDate?: Date;
}
```

---

### Phase 5: User Story 4 - Report Generation

#### [NEW] `components/Step5ReportEditor.tsx`
Comprehensive report editor:
- Rich text editor (using `react-quill` or similar)
- Auto-generated sections from previous steps
- File attachment panel with thumbnails
- Status badge (draft/pending/approved)
- Action buttons: Save Draft, Request Approval, Export PDF

#### [NEW] `components/AttachmentPanel.tsx`
File management:
- Drag-drop upload
- Image/video preview
- File list with delete option
- AI-generated captions for images

#### [NEW] `components/ApprovalWorkflow.tsx`
Approval management:
- Request approval button
- Approval history timeline
- Approve/Reject buttons (for approvers)
- Comments on approval actions

#### [NEW] `lib/reportGenerator.ts`
Report generation logic:
- Combine data from all steps
- Generate structured report text
- PDF export using `jspdf`
- Template system for report sections

#### [NEW] `api/report/route.ts`
Report API endpoints:
- POST `/api/report` - Save draft
- PUT `/api/report/:id` - Update report
- POST `/api/report/:id/approve` - Approval action
- GET `/api/report/:id/pdf` - Export PDF

---

### Phase 6: Integration & Bidirectional Updates

#### [MODIFY] `components/AccidentReportWizard.tsx`
Implement bidirectional data flow:
- When report edits fault % → update Step2
- When report edits vehicle → update Step3
- Maintain edit history for audit trail

#### [NEW] `hooks/useWizardState.ts`
Custom hook for managing wizard state:
```typescript
const useWizardState = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState<AccidentReportFull>();
  
  const updateFromReport = (field, value) => {
    // Reverse update logic
  };
  
  return { currentStep, reportData, updateFromReport, ... };
};
```

---

## File Structure

```
app/
├── components/
│   ├── AccidentReportWizard.tsx (NEW - Main container)
│   ├── Step1Search.tsx (MODIFY - Enhanced)
│   ├── Step2Calculate.tsx (MODIFY - Reverse updates)
│   ├── Step3VehicleLookup.tsx (NEW)
│   ├── Step4AIRecommend.tsx (RENAME from Step3)
│   ├── Step5ReportEditor.tsx (NEW)
│   ├── ChatWindow.tsx (MODIFY - Enhanced)
│   ├── AttachmentPanel.tsx (NEW)
│   ├── ApprovalWorkflow.tsx (NEW)
│   └── WorkflowStepper.tsx (MODIFY - 5 steps)
├── lib/
│   ├── vehicleData.ts (NEW)
│   ├── aiService.ts (NEW)
│   └── reportGenerator.ts (NEW)
├── api/
│   ├── report/route.ts (NEW)
│   └── vehicle/route.ts (NEW)
└── types/
    ├── vehicle.ts (NEW)
    └── index.ts (MODIFY - Add new types)
```

---

## Verification Plan

### Automated Tests
- Unit tests for all new components
- Integration tests for wizard flow
- API endpoint tests

### Manual Verification
1. **Wizard Flow**: Navigate through all 5 steps
2. **Chat Integration**: Test AI recommendations and shortcuts
3. **Vehicle Lookup**: Search and apply vehicles
4. **Report Generation**: Create, edit, attach files, request approval
5. **Bidirectional Updates**: Edit report and verify step updates
6. **PDF Export**: Generate and download PDF report

---

## Phased Delivery Option

If you prefer incremental delivery:

### **Phase 1 (Week 1)**: Core Infrastructure + Vehicle Lookup
- Wizard framework
- Chat panel integration
- Vehicle lookup (Story 3)

### **Phase 2 (Week 2)**: Enhanced AI + Report Editor
- AI enhancements (Story 2)
- Report editor (Story 4)
- File attachments

### **Phase 3 (Week 3)**: Approval & Polish
- Approval workflow
- Bidirectional updates
- PDF export
- Testing & refinement

---

## Next Steps

Please confirm:
1. **Full implementation** (all at once) or **phased delivery**?
2. Any specific priorities or must-haves for the first delivery?
3. Should I proceed with implementation now?
