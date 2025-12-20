# Version 2.0.0 - Major Update

**Release Date:** December 20, 2025

## 🎯 Major Features

### 1. Fixed AI Search Accuracy
- **Signal State Matching**: Improved criteria selection with regex-based signal pattern matching
- **Keyword Boosting**: Added boost for exact signal combinations (e.g., 歩行者=青, 車=赤)
- **Penalty System**: Penalizes wrong signal patterns (e.g., 車=青, 歩行者=黄 when query is opposite)
- **Increased Candidates**: Raised from 2 to 5 candidates for better accuracy
- **Result**: Now correctly selects `[1] 歩行者：青信号 / 車両：赤信号` with 100% confidence

### 2. Fixed Confidence Display
- **Bug Fix**: Removed incorrect `* 100` multiplication that caused 8000% display
- **Now Shows**: Correct confidence percentages (e.g., 80% instead of 8000%)

### 3. Image Analysis Timeout Fix
- **Increased Timeout**: 10s → 30s for image requests
- **Better Model**: Use `gpt-4o` for images (better vision capability)
- **More Tokens**: 300 → 600 max tokens for detailed image analysis
- **Result**: Image uploads no longer timeout with "Failed to fetch" errors

### 4. Vehicle Edit Modal - Dropdown Conversion
- **SELECT Dropdowns**: Converted from hard-to-use `<datalist>` to proper `<select>` dropdowns
- **Mobile-Friendly**: Native iOS/Android picker wheels
- **Cascading Fields**: Maker → Model → Year → Model Code
- **Helper Text**: Shows option counts (e.g., "車名 (1件)")
- **Fallback**: Switches to text input when data not in database
- **Result**: Easy to see and select vehicle information on all devices

### 5. Chat Window Stability
- **Safety Timeout**: Auto-reset after 45s if analysis gets stuck
- **Reset Button**: Manual "リセット" button when analyzing
- **Debug Logging**: Enhanced console logging for troubleshooting
- **Result**: No more permanent spinning wheel issues

## 🐛 Bug Fixes

1. **Syntax Errors**: Fixed broken brace structure in ChatWindow.tsx
2. **Build Errors**: Resolved all TypeScript compilation errors
3. **Linter Errors**: Zero linter errors in production build
4. **Browser Cache**: Added instructions for hard refresh to prevent stale code

## 📱 Mobile Improvements

1. **SELECT Dropdowns**: All vehicle fields use native mobile dropdowns
2. **Touch Targets**: Full-width, touch-friendly interface
3. **Responsive Layout**: Optimized for 375x812px (iPhone size)
4. **Native Pickers**: iOS/Android wheel pickers for better UX

## 🔧 Technical Improvements

### API Routes
- `ai-analyze-accident/route.ts`:
  - Improved vector search with keyword boosting
  - Better signal state pattern matching
  - 5 candidates instead of 2

- `chat/route.ts`:
  - Extended timeout for images (30s)
  - Use gpt-4o for better vision
  - Increased max tokens (600)

### Components
- `ChatWindow.tsx`:
  - Added safety timeout (45s)
  - Added reset button
  - Enhanced error handling
  - Debug logging

- `Step1Search.tsx`:
  - Fixed confidence display (removed * 100)
  - Shows correct percentages

- `Step3VehicleLookup.tsx`:
  - Converted to SELECT dropdowns
  - Added cascading field logic
  - Enhanced mobile support
  - Helper text with counts

## 📊 Database

**Vehicle Database (lib/vehicleData.ts):**
- 3 makes: トヨタ, ホンダ, 日産
- 5 models total
- Multiple years and model codes per vehicle

## 🚀 Deployment Notes

- **Version**: 2.0.0 (major version bump)
- **Branch**: mobile
- **Build**: Successful with zero errors
- **Vercel**: Ready for production deployment

## ✅ Testing

- ✓ Build passes with no errors
- ✓ All TypeScript types correct
- ✓ Linter validation passes
- ✓ Mobile view tested (375x812px)
- ✓ API endpoints functional
- ✓ Dropdown conversion verified

## 📝 Breaking Changes

None. This release maintains backward compatibility while adding new features.

## 🎉 Summary

Version 2.0.0 represents a major stability and usability update with:
- ✅ Fixed AI search accuracy (signal matching)
- ✅ Fixed image analysis timeouts
- ✅ Converted to mobile-friendly dropdowns
- ✅ Enhanced error handling and recovery
- ✅ Better debugging and logging

This release is production-ready and significantly improves the user experience on both desktop and mobile devices.
