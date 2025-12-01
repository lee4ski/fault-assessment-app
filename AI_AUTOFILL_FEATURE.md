# AI Auto-Fill Feature - Real-Time Workflow Automation

## Overview

The AI Auto-Fill feature uses OpenAI GPT-4o-mini to automatically analyze accident descriptions and intelligently fill in workflow steps with smart validation.

## Key Features

### ✨ **Real-Time AI Analysis**
- Detects accident descriptions in chat messages
- Automatically analyzes and extracts key information
- Fills in Steps 1-3 with AI-suggested data
- Shows analysis progress with visual feedback

### 🎨 **Smart Step Validation (Color Coding)**

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 **Green** | Complete / Valid-Empty | Step is correctly filled OR intentionally empty (e.g., no modifications needed) |
| 🔴 **Red** | Incomplete | Step has missing or partial information |
| 🔵 **Blue** | Current | User is currently on this step |
| ⚪ **Gray** | Not Started | Step hasn't been visited yet |

### 🧠 **Intelligent Detection**

The system understands:
- **Valid-Empty Steps**: When no modifications are needed (e.g., pedestrian green light + car red light case)
- **Partial Information**: When vehicle details are incomplete (型式等が不足)
- **Missing Data**: When critical information isn't available

### 📝 **Report Generation with Missing Data Markers**

Reports are generated even with incomplete data:
- ⚠️ Missing information is marked
- ❌ Empty fields are highlighted
- User can manually fill in gaps

---

## How It Works

### 1. **User Pastes Accident Description in Chat**

Example:
```
交差点で歩行者と車両の接触事故が発生した。歩行者は信号が変わる直前に横断を開始し、
車両は信号に気づかず進入したとみられる。事故発生の正確な時刻は記録されていない。
歩行者の過失は低いと考えられるが、詳細な割合は未確定である。車両の情報は一部確認済みだが、
型式等の詳細は不足している。現時点では運転者の信号不注意が主な原因と推定される。
```

### 2. **AI Analyzes the Description**

The system:
- Detects this is an accident description (keywords: 事故, 衝突, 横断, 信号, etc.)
- Calls `/api/ai-analyze-accident` endpoint
- Uses OpenAI to extract:
  - Which criteria applies (Step 1)
  - What modifications are needed (Step 2)
  - Vehicle information (Step 3)
  - What's missing

### 3. **Auto-Fills Workflow Steps**

**Step 1 - 認定基準の検索**:
- ✅ Selects matching criteria automatically
- 🟢 Marks green if found
- 🔴 Marks red if ambiguous/not found

**Step 2 - 修正要素の適用**:
- ✅ Suggests applicable modifications
- 🟢 Marks green even if NO modifications needed (valid-empty)
- 🔴 Marks red if unclear what modifications apply

**Step 3 - 車両情報検索**:
- ✅ Extracts vehicle make, model, year
- 🟢 Marks green if complete
- 🔴 Marks red if partial (型式 missing, etc.)

### 4. **Updates Step Indicators**

The workflow stepper shows:
- ✓ Checkmark for complete steps (green)
- ! Exclamation for incomplete steps (red)
- Small text: "不完全" or "適用なし"

---

## API Endpoints

### `/api/ai-analyze-accident`

**Purpose**: Analyzes accident descriptions and returns structured data

**Request**:
```json
{
  "accidentDescription": "交差点で..."
}
```

**Response**:
```json
{
  "step1": {
    "recommendedCriteriaId": "intersection-pedestrian-straight-1",
    "confidence": 85,
    "reasoning": "交差点での歩行者と車両の事故です",
    "validation": {
      "stepNumber": 1,
      "status": "complete",
      "color": "green",
      "missingItems": [],
      "reason": "認定基準が特定されました"
    }
  },
  "step2": {
    "recommendedModifications": ["driver-signal-violation"],
    "reasoning": "車両の信号不注意が言及されています",
    "validation": {
      "stepNumber": 2,
      "status": "complete",
      "color": "green",
      "missingItems": [],
      "reason": "1個の修正要素が適用されます"
    }
  },
  "step3": {
    "extractedVehicles": [
      {
        "make": "",
        "model": "",
        "year": "",
        "partial": true
      }
    ],
    "reasoning": "車両情報は一部のみ記載されています",
    "validation": {
      "stepNumber": 3,
      "status": "incomplete",
      "color": "red",
      "missingItems": ["型式", "メーカー", "車種"],
      "reason": "1台の車両情報が不完全です（型式等の詳細が不足）"
    }
  },
  "summary": "事故情報を分析しました。ステップ3の車両情報が不完全です。"
}
```

---

## Component Updates

### 1. **WorkflowStepper.tsx**

**New Props**:
```typescript
interface WorkflowStepperProps {
  stepValidations?: Record<number, StepValidation>;
  // ...existing props
}
```

**Visual Changes**:
- Displays colored circles based on validation status
- Shows "!" icon for incomplete steps
- Displays "不完全" or "適用なし" labels
- Tooltips show validation reasons

### 2. **ChatWindow.tsx**

**New Props**:
```typescript
interface ChatWindowProps {
  onAIAnalysis?: (analysis: any) => void;
  // ...existing props
}
```

**Behavior**:
- Detects accident descriptions (30+ chars + keywords)
- Shows "✨ 事故情報を分析しています..." message
- Calls AI analysis API
- Displays results in chat
- Triggers parent callback to update workflow

### 3. **AccidentReportWizard.tsx**

**New State**:
```typescript
const [stepValidations, setStepValidations] = useState<Record<number, StepValidation>>({});
```

**New Handler**:
```typescript
const handleAIAnalysis = (analysis: any) => {
  // Updates stepValidations
  // Auto-fills selectedCriteria
  // Extracts vehicles
  // Jumps to Step 1
};
```

---

## Special Cases

### Case 1: Pedestrian Green Light + Car Red Light

**Scenario**: No modifications needed because it's a clear-cut case

**AI Response**:
```json
{
  "step2": {
    "recommendedModifications": [],
    "reasoning": "歩行者は青信号、車両は赤信号のため、修正要素は不要です",
    "validation": {
      "status": "valid-empty",
      "color": "green",
      "reason": "修正要素は不要です（標準的なケース）"
    }
  }
}
```

**Display**:
- 🟢 Green circle
- ✓ Checkmark
- Label: "適用なし"

### Case 2: Partial Vehicle Information

**Scenario**: Make/model known, but 型式 (model code) missing

**AI Response**:
```json
{
  "step3": {
    "extractedVehicles": [{
      "make": "トヨタ",
      "model": "プリウス",
      "year": "2020",
      "modelCode": "",
      "partial": true
    }],
    "validation": {
      "status": "incomplete",
      "color": "red",
      "missingItems": ["型式コード"],
      "reason": "1台の車両情報が不完全です（型式等の詳細が不足）"
    }
  }
}
```

**Display**:
- 🔴 Red circle
- ! Exclamation
- Label: "不完全"

---

## Report Generation with Missing Data

When generating reports with incomplete data:

```markdown
## 交通事故報告書

> ⚠️ **不足情報**: 車両情報が不足しています。追加情報を入力してください。

---

## 5. 関係車両情報

### 車両 1

> ⚠️ **この車両の情報は不完全です**。詳細を追加してください。

- **メーカー**: トヨタ
- **車種**: プリウス
- **年式**: 2020年
- **型式**: ❌ *未入力*
```

---

## Testing

### Test Scenario (User Provided)

```
交差点で歩行者と車両の接触事故が発生した。歩行者は信号が変わる直前に横断を開始し、
車両は信号に気づかず進入したとみられる。事故発生の正確な時刻は記録されていない。
歩行者の過失は低いと考えられるが、詳細な割合は未確定である。車両の情報は一部確認済みだが、
型式等の詳細は不足している。現時点では運転者の信号不注意が主な原因と推定される。
追加資料に基づき判断を更新予定。
```

**Expected Results**:
1. ✅ Step 1: Green (criteria identified)
2. ✅ Step 2: Green or Yellow (modifications suggested)
3. ❌ Step 3: Red (vehicle info partial)
4. Step 4: Report generated with warnings

### How to Test

1. Open the application
2. Open chat window
3. Paste the test scenario
4. Click "送信"
5. Watch AI analysis happen
6. Check step colors in workflow stepper
7. Navigate through steps to verify auto-filled data
8. Generate report in Step 4
9. Verify missing data is marked

---

## Files Modified

### New Files:
- `/app/api/ai-analyze-accident/route.ts` - AI analysis endpoint

### Modified Files:
- `/types/workflow.ts` - Added StepValidation types
- `/components/WorkflowStepper.tsx` - Color-coded validation
- `/components/ChatWindow.tsx` - AI analysis integration
- `/components/AccidentReportWizard.tsx` - AI analysis handler
- `/app/api/generate-report/route.ts` - Missing data markers

---

## Benefits

✅ **Faster Workflow**: Automatically fills in most information
✅ **Smart Validation**: Knows when "empty" is valid vs incomplete
✅ **Clear Feedback**: Visual indicators show what needs attention
✅ **Flexible**: Users can still manually edit everything
✅ **Robust**: Generates reports even with missing data
✅ **User-Friendly**: Clear warnings about what's missing

---

## Future Enhancements

- 🔄 **Continuous Learning**: Improve AI accuracy over time
- 📊 **Confidence Scores**: Show how confident AI is about each field
- 🎯 **Suggestions Panel**: Show alternative criteria/modifications
- 🔍 **Smart Search**: Auto-search for missing vehicle details
- 💬 **Interactive Clarification**: AI asks questions when unclear

---

## Status

**Implementation**: ✅ Complete
**Testing**: 🔄 In Progress
**Documentation**: ✅ Complete

**Created**: 2024-12-01

