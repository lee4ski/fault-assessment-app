# AI Enhancement Implementation Plan

## Overview

This document outlines the comprehensive plan to enhance AI usage throughout the Fault Assessment Application while preserving all existing features including modification factor adjustments based on 認定基準.

---

## 📋 Implementation Phases

### Phase 1: AI-Powered Structured Search Auto-Fill (構造化検索 AI連携)
**Priority: HIGH | Effort: Medium | Impact: High**

#### Goal
When the user types in chat or provides accident description, AI automatically populates the structured search fields.

#### Files to Modify
- `components/AccidentAttributesForm.tsx` - Add AI auto-fill props
- `components/Step1Search.tsx` - Connect AI analysis to structured search
- `components/AccidentReportWizard.tsx` - Pass AI-extracted attributes
- `app/api/ai-analyze-accident/route.ts` - Extract structured attributes

#### New Features
```
User input: "交差点で歩行者が青信号で横断中、赤信号の車に衝突された"
↓ AI extracts:
{
  accidentType: "歩行者×四輪",
  location: "交差点",
  partyTypes: ["歩行者", "四輪車"],
  hasSignal: true,
  pedestrianSignal: "青",
  vehicleSignal: "赤"
}
↓ Auto-fills 構造化検索 form
```

#### Preserved Features
- Manual structured search still works
- Keyword search remains functional
- Modification factors still adjust based on selected criteria

---

### Phase 2: Smart Record Creation Suggestions
**Priority: HIGH | Effort: Medium | Impact: Medium**

#### Goal
When AI cannot find a matching criteria, suggest creating a new record with pre-filled data.

#### Files to Create
- `components/CreateCriteriaModal.tsx` - Modal for creating new criteria
- `app/api/criteria/route.ts` - API for CRUD operations on criteria

#### Files to Modify
- `components/Step1Search.tsx` - Add "Create New" suggestion
- `components/ChatWindow.tsx` - Suggest creation via chat
- `data/sampleCriteria.ts` - Make it dynamic (localStorage or API)

#### New Features
```
AI: "入力された事故パターンに完全に一致する認定基準が見つかりません。
     
     🆕 新しい認定基準を作成しますか？
     [新規作成] [類似基準を使用]"
```

---

### Phase 3: Contextual AI Suggestions Panel
**Priority: MEDIUM | Effort: High | Impact: High**

#### Goal
Add a floating AI suggestions panel that updates in real-time based on user actions.

#### Files to Create
- `components/AISuggestionsPanel.tsx` - Floating suggestions panel
- `hooks/useAISuggestions.ts` - Hook for managing AI suggestions state

#### Files to Modify
- `components/AccidentReportWizard.tsx` - Integrate suggestions panel
- `app/api/ai-suggest/route.ts` - New API for contextual suggestions

#### New Features
```
┌─────────────────────────────────────┐
│ 🤖 AI Suggestions                   │
├─────────────────────────────────────┤
│ ⚡ 推奨修正要素:                    │
│   • 夜間 (+5%)                      │
│   • 高齢者歩行者 (-10%)             │
│                                     │
│ 📊 類似判例: 判例タイムズ38号 p.67  │
│                                     │
│ ⚠️ 不足情報: 車両の速度             │
└─────────────────────────────────────┘
```

---

### Phase 4: AI-Enhanced Natural Language Search
**Priority: MEDIUM | Effort: Medium | Impact: Medium**

#### Goal
Allow natural language queries that AI converts to structured search parameters.

#### Files to Modify
- `components/Step1Search.tsx` - Add NL search mode
- `app/api/ai-search/route.ts` - New API for NL to structured conversion

#### New Features
```
User: "去年の駐車場での事故で、高齢者が関わったケース"
↓ AI converts to:
{
  location: "駐車場",
  partyTypes: ["高齢者"],
  keywords: ["高齢者", "駐車場"]
}
```

---

### Phase 5: Missing Information Highlighter
**Priority: HIGH | Effort: Low | Impact: High**

#### Goal
Visually highlight missing/required fields based on AI analysis.

#### Files to Modify
- `components/AccidentAttributesForm.tsx` - Add highlight states
- `components/Step1Search.tsx` - Pass missing info from AI
- `types/index.ts` - Add MissingInfoHighlight type

#### New Features
```
構造化検索
┌─────────────────────────────────────┐
│ 事故類型: 歩行者×四輪 ✓             │
│ 場所: [選択してください] ⚠️ 必須    │
│                                     │
│ 💡 AIヒント: 場所を選択すると       │
│    より正確な基準が表示されます     │
└─────────────────────────────────────┘
```

---

### Phase 6: Bidirectional AI Sync between Steps
**Priority: MEDIUM | Effort: Medium | Impact: High**

#### Goal
Changes in any step trigger AI to suggest updates to other steps.

#### Files to Create
- `hooks/useBidirectionalSync.ts` - Hook for cross-step sync

#### Files to Modify
- `components/AccidentReportWizard.tsx` - Implement sync logic
- `components/Step2Calculate.tsx` - Listen for sync events
- `components/Step3VehicleLookup.tsx` - Listen for sync events

#### New Features
```
Step 2で「高齢者歩行者」を選択
↓ AI suggests:
"Step 3の車両情報に、高齢者対応の安全装置
（自動ブレーキなど）の有無を確認しますか？"
```

---

### Phase 7: AI Confidence Indicators
**Priority: LOW | Effort: Low | Impact: Medium**

#### Goal
Show AI confidence levels for each suggestion.

#### Files to Modify
- `components/Step1Search.tsx` - Add confidence badges
- `components/Step2Calculate.tsx` - Add confidence for modifications
- `app/api/ai-analyze-accident/route.ts` - Return confidence scores

#### New Features
```
認定基準候補:
┌─────────────────────────────────────┐
│ 1. 交差点での歩行者と直進車との事故 │
│    信頼度: ████████░░ 85%           │
│    理由: 信号状態が明確             │
└─────────────────────────────────────┘
```

---

### Phase 8: Voice File Upload & AI Report Generation
**Priority: LOW | Effort: High | Impact: Medium**

#### Goal
Allow users to upload voice recordings that AI transcribes and uses to generate reports.

#### Files to Create
- `components/VoiceUpload.tsx` - Voice file upload component
- `app/api/transcribe/route.ts` - API for voice transcription (Whisper)

#### Files to Modify
- `components/ChatWindow.tsx` - Add voice upload button
- `components/Step4AIReportEditor.tsx` - Accept voice-generated content

#### New Features
```
🎤 [音声ファイルをアップロード]
↓ AI transcribes using Whisper
↓ Extracts accident details
↓ Auto-fills all steps
↓ Generates report
```

---

### Phase 9: Smart "Create New Record" Flow
**Priority: MEDIUM | Effort: Medium | Impact: Medium**

#### Goal
AI-guided new record creation when no matching criteria exists.

#### Files to Create
- `components/AIGuidedRecordCreator.tsx` - Step-by-step AI-guided creation

#### Files to Modify
- `components/CreateCriteriaModal.tsx` - Integrate AI suggestions
- `data/sampleCriteria.ts` - Support dynamic criteria addition

#### New Features
```
AI: "新しい基準を作成します：
     
     📍 事故類型: [AI提案: 歩行者×四輪]
     📍 基本過失割合: [AI提案: 10%]
     📍 参照判例: [AI提案: 判例タイムズ38号]
     
     [AIの提案を採用] [手動入力]"
```

---

## 🗂️ New File Structure

```
app/
├── api/
│   ├── ai-analyze-accident/route.ts  (MODIFY - add structured attributes)
│   ├── ai-suggest/route.ts           (NEW - contextual suggestions)
│   ├── ai-search/route.ts            (NEW - NL to structured)
│   ├── criteria/route.ts             (NEW - CRUD for criteria)
│   └── transcribe/route.ts           (NEW - voice transcription)
├── components/
│   ├── AccidentAttributesForm.tsx    (MODIFY - AI auto-fill, highlights)
│   ├── AccidentReportWizard.tsx      (MODIFY - integrate all features)
│   ├── AISuggestionsPanel.tsx        (NEW - floating suggestions)
│   ├── AIGuidedRecordCreator.tsx     (NEW - guided creation)
│   ├── CreateCriteriaModal.tsx       (NEW - create criteria modal)
│   ├── ConfidenceIndicator.tsx       (NEW - confidence display)
│   ├── VoiceUpload.tsx               (NEW - voice upload)
│   └── MissingInfoHighlight.tsx      (NEW - highlight component)
├── hooks/
│   ├── useAISuggestions.ts           (NEW - suggestions state)
│   └── useBidirectionalSync.ts       (NEW - cross-step sync)
└── types/
    └── index.ts                       (MODIFY - new types)
```

---

## 🔒 Preserved Features

The following existing features will be maintained:

1. **Modification Factor Adjustment**
   - Based on selected 認定基準
   - Green/Red/Yellow signal cases handled correctly
   - Empty modification factors for certain cases (e.g., 青信号歩行者/赤信号車両)

2. **Keyword Search**
   - Debounced search (150ms)
   - AI keyword suggestions
   - Chapter filtering

3. **Structured Search**
   - Manual form input
   - All existing fields preserved
   - Search by attributes

4. **Chat Q&A Flow**
   - Interactive questioning for incomplete info
   - Step-by-step detail collection

5. **Step Validation**
   - Green/Red/Yellow status indicators
   - Validation reasons
   - Auto-fill from AI analysis

---

## 📅 Implementation Order

1. **Phase 1**: AI-Powered Structured Search Auto-Fill
2. **Phase 5**: Missing Information Highlighter
3. **Phase 7**: AI Confidence Indicators
4. **Phase 2**: Smart Record Creation Suggestions
5. **Phase 4**: AI-Enhanced Natural Language Search
6. **Phase 6**: Bidirectional AI Sync
7. **Phase 3**: Contextual AI Suggestions Panel
8. **Phase 9**: Smart Create New Record Flow
9. **Phase 8**: Voice File Upload & AI Report Generation

---

## 🚀 Ready to Start?

Confirm this plan, and I will begin implementing Phase 1: AI-Powered Structured Search Auto-Fill.




