# Version 1.0 - Initial Release

## Release Date
December 2, 2025

## Overview
First production release of the Guidewire Fault Assessment Calculator with AI-powered features.

## Key Features

### 1. 4-Step Workflow
- **Step 1**: 認定基準の検索 (Criteria Search)
  - Keyword search with Japanese text normalization
  - Structured search with accident attributes
  - AI-powered natural language search
  - Smart particle-based matching for complex queries
- **Step 2**: 修正要素の適用 (Apply Modification Factors)
  - Dynamic modification factors based on selected criteria
  - Real-time fault percentage calculation
- **Step 3**: 車両情報検索 (Vehicle Information Search)
  - Vehicle registration lookup
  - Manual vehicle information entry
- **Step 4**: AI報告書作成 (AI Report Generation)
  - AI-generated accident reports in Markdown format
  - Preview/Edit mode toggle
  - PDF export functionality
  - Draft save and approval request

### 2. AI-Powered Features
- **Natural Language Search**: Convert natural language queries to structured search criteria
- **Smart Case Recommendation**: AI analyzes accident descriptions and recommends relevant cases
- **Auto-Fill Workflow**: AI extracts structured data from chat input and auto-fills steps
- **Interactive Q&A**: AI asks for missing information one by one
- **Report Generation**: GPT-4o-mini powered report generation with fallback to template
- **Contextual Suggestions**: Floating AI suggestions panel with insights

### 3. Search Enhancements
- **Particle-Based Matching**: Intelligent Japanese particle stripping for better natural language matching
  - Splits queries by common particles (が、は、の、で、て、した、etc.)
  - Uses ratio-based matching (60% threshold for 4+ keywords)
  - Handles complex queries like "歩行者が青信号で横断して直進した車が事故"
- **Signal-Specific Categories**: Detailed signal state categories for Party A and Party B
- **Multi-Field Search**: Searches across title, description, chapter title, and modification factors
- **Chapter Faceting**: Filter results by accident type chapters

### 4. Data
- **7 Sample Criteria** covering:
  - Intersection accidents (pedestrian/straight car, right turn/straight car)
  - Parking lot accidents
  - Highway accidents (lane change)
  - Crosswalk accidents
  - Signal-based pedestrian accidents (green/red, yellow/red)
- **Hanrei Times Integration**: Based on 別冊判例タイムズ 第38号 p.66-67

### 5. UI/UX Improvements
- **Cleaner Workflow Stepper**: Compact design with checkmarks for completed steps
- **Responsive Chat Window**: Slack-style keyboard shortcuts (Enter for newline, Shift+Enter to send)
- **Markdown Rendering**: Clean report display with proper formatting
- **Step Validation**: Visual indicators (green/red/yellow) for step completion status
- **Missing Field Highlighting**: Auto-highlights fields that AI identified as missing

## Technical Stack
- **Framework**: Next.js 16.0.5 with Turbopack
- **AI**: OpenAI GPT-4o-mini (with Gemini 3 Pro as alternative)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Search Logic Improvements
### Particle-Based Matching Algorithm
The search now intelligently handles Japanese natural language queries by:
1. Splitting the query by common particles and verb endings
2. Normalizing text (hiragana/katakana, full-width/half-width)
3. Matching individual keywords across multiple fields
4. Using a flexible ratio threshold (60% for 4+ keywords, 75% for 2-3 keywords)
5. Scoring results based on match quality and field importance

### Example
Query: "歩行者が青信号で横断して直進した車が事故"
- Splits into: ["歩行者", "青信号", "横断", "直進", "事故"]
- Matches 4/5 keywords (80%) in the pedestrian/green light case
- Successfully finds the relevant case even with complex phrasing

## Known Limitations
- Limited to 7 sample criteria (full dataset has 300+)
- AI features require OpenAI API key
- Japanese language only (no English UI)

## Future Enhancements (Planned)
- **Phase 8**: Voice File Upload & AI Report Generation
- **Phase 9**: Smart Create New Record Flow
- Expand criteria database to full 300+ cases
- Multi-language support

## Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env.local` with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_key_here
   ```
4. Run development server: `npm run dev`
5. Open http://localhost:3000

## Contributors
- Development: AI Assistant (Claude Sonnet 4.5)
- Project Owner: lee4ski@gmail.com

## License
Proprietary - All rights reserved

