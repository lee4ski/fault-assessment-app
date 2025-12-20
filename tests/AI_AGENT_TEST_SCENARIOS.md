# AI Agent Test Scenarios

## Purpose
Test if the AI agent can automatically analyze accident descriptions and guide users through the workflow steps (1-4).

---

## Test Scenario 1: Intersection Pedestrian Accident (Complex)

### Test Case ID: `TEST-001`

### Accident Description:
```
交差点で歩行者と車両の接触事故が発生した。歩行者は信号が変わる直前に横断を開始し、車両は信号に気づかず進入したとみられる。事故発生の正確な時刻は記録されていない。歩行者の過失は低いと考えられるが、詳細な割合は未確定である。車両の情報は一部確認済みだが、型式等の詳細は不足している。現時点では運転者の信号不注意が主な原因と推定される。追加資料に基づき判断を更新予定。
```

### Expected AI Analysis:

**Step 1 (認定基準の検索):**
- Accident type: 交差点 (Intersection)
- Parties: 歩行者 vs 車両 (Pedestrian vs Vehicle)
- Key factors: 信号変わる直前 (Signal changing), 車両信号不注意 (Vehicle signal neglect)
- Recommended criteria: 
  - "[2] 🟡 歩行者：黄信号で横断開始 / 🔴 車両：赤信号で進入"
  - Or "交差点での歩行者と直進車との事故"

**Step 2 (修正要素の適用):**
- Modification factors to consider:
  - 車両の信号無視 (+20% or similar)
  - 歩行者の信号変わる直前横断 (possibly -5% for pedestrian)

**Step 3 (車両情報検索):**
- Note: Vehicle details incomplete
- Need to gather: 型式 (model code), その他詳細

**Step 4 (AI報告書作成):**
- Generate comprehensive report
- Note uncertainties (時刻不明, 車両詳細不足)
- Recommend additional investigation

---

## Test Scenario 2: Simple Parking Lot Accident

### Test Case ID: `TEST-002`

### Accident Description:
```
駐車場で出庫しようとした車両Aが、走行中の車両Bに接触した。車両Aは後退中で、車両Bは通常速度で走行していた。双方にけが人はいない。車両Aはトヨタ・プリウス（2020年式）、車両Bはホンダ・フィット（2019年式）である。
```

### Expected AI Analysis:

**Step 1:** 
- Criteria: "駐車場での出庫車と走行車との事故"
- Base fault: 30% (出庫車)

**Step 2:**
- Factor: "出庫車が後退していた場合" (+10%)
- Final: 40%

**Step 3:**
- Vehicle A: Toyota Prius 2020
- Vehicle B: Honda Fit 2019

**Step 4:**
- Generate clean report with all details

---

## Test Scenario 3: Highway Lane Change

### Test Case ID: `TEST-003`

### Accident Description:
```
高速道路で車線変更中の車両が、後方から来た車両と接触しました。車線変更車は合図を出していましたが、確認が不十分だった可能性があります。速度は両車とも100km/h程度でした。
```

### Expected AI Analysis:

**Step 1:**
- Criteria: "高速道路での車線変更時の事故"
- Base fault: 30%

**Step 2:**
- Factor: "車線変更車が合図を出していた場合" (-5%)
- Factor: "車線変更車が確認不十分だった場合" (+10%)
- Final: 35%

**Step 3:**
- Details needed for both vehicles

**Step 4:**
- Generate report with highway specifics

---

## Test Scenario 4: Crosswalk with Child

### Test Case ID: `TEST-004`

### Accident Description:
```
横断歩道で幼児が車両と接触した。幼児は保護者と一緒に青信号で横断を開始したが、車両が右折時に接触した。車両の運転者は歩行者を見落としていた。幼児は軽傷。
```

### Expected AI Analysis:

**Step 1:**
- Criteria: "横断歩道での歩行者と車両との事故"
- Base fault: 0% (pedestrian on green)

**Step 2:**
- Factor: "歩行者が幼児の場合" (-10%)
- Final: 0% (cannot go below 0)

**Step 3:**
- Vehicle details needed

**Step 4:**
- Emphasize child protection
- Note severity (軽傷)

---

## Test Scenario 5: Ambiguous Multi-Vehicle

### Test Case ID: `TEST-005`

### Accident Description:
```
複数の車両が関係する事故。詳細は不明だが、雨天で視界不良だった。少なくとも3台の車両が関与している。警察の調査待ち。
```

### Expected AI Analysis:

**Step 1:**
- Multiple criteria possible
- Need more information
- AI should ask clarifying questions

**Step 2:**
- Cannot calculate without criteria
- AI should request details

**Step 3:**
- Need to identify all 3+ vehicles

**Step 4:**
- Generate preliminary report
- Note missing information
- Recommend investigation

---

## Test Scenario 6: English Language Test

### Test Case ID: `TEST-006`

### Accident Description:
```
A pedestrian was crossing at an intersection when a vehicle turning right collided with them. The pedestrian had the green light. The driver claims the sun was in their eyes. No serious injuries reported.
```

### Expected AI Analysis:

**Test multilingual support:**
- Can AI understand English description?
- Can it map to Japanese criteria?
- Can it generate bilingual report?

**Step 1:**
- Criteria: Intersection + pedestrian + green light
- Should find: "[1] 🟢 歩行者：青信号で横断開始..."

**Step 4:**
- Test if report can be generated in Japanese from English input

---

## Testing Instructions

### How to Use These Test Cases:

1. **Navigate to Step 4** in the application
2. **Open the chat window** (チャットを開く)
3. **Paste the accident description** from any test case above
4. **Observe AI behavior**:
   - Does it understand the accident?
   - Does it recommend appropriate criteria?
   - Does it suggest modification factors?
   - Does it fill in workflow steps automatically?
   - Does it generate accurate reports?

### Success Criteria:

✅ **Step 1 Understanding:**
- AI correctly identifies accident type
- Recommends relevant criteria
- Explains reasoning

✅ **Step 2 Guidance:**
- Suggests appropriate modification factors
- Explains impact on percentage
- Calculates correctly

✅ **Step 3 Assistance:**
- Identifies missing vehicle information
- Guides user to fill in gaps
- Validates completeness

✅ **Step 4 Generation:**
- Creates professional report
- Includes all relevant details
- Notes uncertainties
- Provides recommendations

---

## Test Results Template

### Test Case: [ID]
**Date**: [Date]
**Tester**: [Name]

**AI Performance:**
- [ ] Understood accident description
- [ ] Recommended correct criteria
- [ ] Suggested appropriate modifications
- [ ] Generated accurate report
- [ ] Handled missing information well
- [ ] Provided helpful guidance

**Issues Found:**
1. [Issue description]
2. [Issue description]

**Overall Rating:** ⭐⭐⭐⭐⭐ (1-5 stars)

**Notes:**
[Additional observations]

---

## Copy-Paste Ready Test Text

### Quick Test (Paste this into chat):
```
交差点で歩行者と車両の接触事故が発生した。歩行者は信号が変わる直前に横断を開始し、車両は信号に気づかず進入したとみられる。事故発生の正確な時刻は記録されていない。歩行者の過失は低いと考えられるが、詳細な割合は未確定である。車両の情報は一部確認済みだが、型式等の詳細は不足している。現時点では運転者の信号不注意が主な原因と推定される。追加資料に基づき判断を更新予定。
```

### Expected AI Response:
The AI should:
1. Identify this as an intersection accident with signal-related issues
2. Recommend criteria involving pedestrian crossing and vehicle signal violation
3. Suggest looking at modification factors for signal timing
4. Offer to help generate a comprehensive report
5. Note that additional details are needed (exact timing, vehicle specifics)

---

## Advanced Testing Scenarios

### Test 7: Incomplete Information
```
事故が発生した。詳細不明。
```
**Expected**: AI should ask many clarifying questions

### Test 8: Over-Detailed Report
```
[Paste a 500+ word detailed accident description with every possible detail]
```
**Expected**: AI should extract key facts and recommend criteria

### Test 9: Contradictory Information
```
歩行者が青信号で横断したが、車両も青信号で進入した。双方が青信号だったと主張している。
```
**Expected**: AI should note contradiction and ask for clarification

### Test 10: Multiple Accidents
```
同じ日に2件の事故がありました。1件目は交差点、2件目は駐車場です。
```
**Expected**: AI should ask which accident to process first

---

## Automated Testing Script (Future)

```javascript
// Pseudo-code for automated testing
const testCases = [
  { id: "TEST-001", description: "...", expected: {...} },
  { id: "TEST-002", description: "...", expected: {...} },
  // ...
];

for (const test of testCases) {
  const result = await testAIAgent(test.description);
  assert(result.criteria === test.expected.criteria);
  assert(result.faultPercentage === test.expected.faultPercentage);
}
```

---

## Notes for Testers

### What to Look For:

✅ **Accuracy** - Does AI recommend correct criteria?
✅ **Completeness** - Does AI consider all factors?
✅ **Clarity** - Are explanations clear?
✅ **Helpfulness** - Does AI guide users effectively?
✅ **Error Handling** - Does AI handle missing info well?

### Common Issues to Watch:

⚠️ **Language confusion** - Mixing Japanese/English
⚠️ **Missing context** - AI assumes details not provided
⚠️ **Over-confidence** - AI gives definite answers when uncertain
⚠️ **Ignoring uncertainties** - Doesn't note missing information

---

## Status

**Created**: 2024-12-01
**Status**: Ready for testing
**Primary Test Case**: TEST-001 (Complex intersection accident)

**Use this file to systematically test the AI agent's capabilities!** 🧪








