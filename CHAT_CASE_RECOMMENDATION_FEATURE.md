# Chat Window Case Recommendation Feature

## Overview
The Chat Window now intelligently searches for existing cases and recommends them to the user before falling back to conversational AI.

## User Flow

1.  **User types accident description** in the chat (e.g., "歩行者が青で車が赤の信号")
2.  **System searches existing cases** using improved keyword matching (particle-stripping logic)
3.  **If matches found**:
    *   Display up to 3 recommendations as clickable cards
    *   Show title, description, base fault percentage, and confidence score
4.  **User selects a case**:
    *   System calls AI analysis with full chat history
    *   Auto-populates Step 1 (Structured Search)
    *   Auto-populates Step 2 (Modifications) if applicable
    *   Auto-populates Step 3 (Vehicles) if mentioned
5.  **User can edit** any step manually
6.  **User proceeds to Step 4** to generate the final report

## Technical Implementation

### Files Modified

#### 1. `/app/api/chat/route.ts`
*   **Added**: Import `sampleCriteria` and `searchCriteria` from `lib/calculator`
*   **Logic**: Before calling OpenAI, search for matching cases using the last user message
*   **Response**: If matches found, return `{ type: "case_recommendation", recommendations: [...] }`
*   **Fallback**: If no matches, proceed with conversational AI as before

#### 2. `components/ChatWindow.tsx`
*   **Added**: `handleCaseSelect(caseId, caseTitle)` function
    *   Calls `/api/ai-analyze-accident` with chat history
    *   Triggers `onAIAnalysis` to populate steps
    *   Displays success message
*   **Updated**: Message rendering to display recommendations as clickable cards
*   **Updated**: `/api/chat` response handling to check for `case_recommendation` type

#### 3. `types/workflow.ts`
*   **Added**: `recommendations` field to `ChatMessage` interface
    *   Array of case objects with `id`, `title`, `description`, `baseFaultPercentage`, `confidence`, `matchType`

#### 4. `lib/calculator.ts`
*   **Enhanced**: Particle-stripping logic in `searchCriteria`
    *   Splits by common particles: `で`, `の`, `が`, `は`, `に`, `を`, `と`, `における`, `での`, `・`
    *   Performs AND search on all tokens
    *   Example: "歩行者が青で車が赤の信号" → ["歩行者", "青", "車", "赤", "信号"]

#### 5. `components/Step1Search.tsx`
*   **Enhanced**: "No results" message now includes a prominent "AI Search" button
    *   Only shown when keyword search yields no results
    *   Guides user to structured search as requested

## Benefits

1.  **Faster workflow**: Users can select a case directly from chat instead of navigating to Step 1
2.  **Better UX**: Recommendations are contextual and ranked by relevance
3.  **Reduced errors**: AI pre-fills all steps based on the selected case
4.  **Flexibility**: Users can still edit any step manually

## Example Usage

**User Input**:
```
歩行者が青信号で横断中、赤信号の車に衝突された
```

**System Response**:
```
以下の認定基準が見つかりました。該当するものを選択してください：

[Card 1]
🟢 歩行者：青信号で横断開始 / 🔴 車両：赤信号で進入（信号変更なし）
基本過失割合: 0%
一致度: 95%

[Card 2]
交差点での歩行者と直進車との事故
基本過失割合: 10%
一致度: 75%
```

**User Action**: Clicks Card 1

**System Response**:
```
✅ 認定基準が選択され、ステップが自動入力されました！

📍 ステップ1（認定基準）: 🟢 歩行者：青信号で横断開始 / 🔴 車両：赤信号で進入
- 基本過失割合: 0%

✅ ステップ2（修正要素）: 修正要素は不要です（標準的なケース）

左側のステップで内容を確認し、必要に応じて修正してください。
```

## Future Enhancements

*   Add confidence threshold filtering (only show recommendations above 70%)
*   Allow user to request "more cases" if top 3 don't match
*   Integrate with Phase 9 (Smart Create New Record) if no cases found

