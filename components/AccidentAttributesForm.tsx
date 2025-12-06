"use client";

import { useState, useEffect } from "react";
import { AccidentAttributes } from "@/types";

interface AccidentAttributesFormProps {
  onSearch: (attributes: AccidentAttributes) => void;
  initialAttributes?: AccidentAttributes;
  missingFields?: string[];
  onAiSearch?: (attributes: AccidentAttributes) => Promise<void>; // AI search callback with structured attributes
}

export default function AccidentAttributesForm({
  onSearch,
  initialAttributes,
  missingFields = [],
  onAiSearch,
}: AccidentAttributesFormProps) {
  const [attributes, setAttributes] = useState<AccidentAttributes>(
    initialAttributes || {}
  );
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Update state when initialAttributes changes (e.g. from AI auto-fill)
  useEffect(() => {
    if (initialAttributes) {
      setAttributes(initialAttributes);
    }
  }, [initialAttributes]);

  const accidentTypes = [
    "歩行者×四輪",
    "歩行者×二輪",
    "四輪×四輪",
    "四輪×二輪",
    "二輪×二輪",
    "その他",
  ];

  const locations = [
    "交差点",
    "駐車場",
    "高速道路",
    "一般道路",
    "横断歩道",
    "その他",
  ];

  const partyOptions = [
    "歩行者",
    "四輪車",
    "二輪車",
    "自転車",
    "その他",
  ];

  // Determine Parties from attributes.partyTypes array
  const partyA = attributes.partyTypes?.[0] || "";
  const partyB = attributes.partyTypes?.[1] || "";

  const handlePartyChange = (index: number, value: string) => {
    const currentTypes = [...(attributes.partyTypes || [])];
    // Ensure array has at least index+1 elements
    while (currentTypes.length <= index) currentTypes.push("");
    
    currentTypes[index] = value;
    
    // Filter out empty strings and duplicates for the search logic (optional, but cleaner)
    const cleanTypes = currentTypes.filter(t => t);
    
    setAttributes({
      ...attributes,
      partyTypes: cleanTypes.length > 0 ? cleanTypes : undefined
    });
  };

  const signalStates = [
    { value: "signal_green", label: "青" },
    { value: "signal_yellow", label: "黄" },
    { value: "signal_red", label: "赤" },
    { value: "signal_right", label: "右折" },
    { value: "signal_none", label: "なし" },
    { value: "signal_blinking", label: "点滅" },
  ];

  const actionOptions = [
    { value: "action_straight", label: "直進" },
    { value: "action_turning_right", label: "右折" },
    { value: "action_turning_left", label: "左折" },
    { value: "action_crossing", label: "横断" },
    { value: "action_stopping", label: "停止/駐車" },
    { value: "action_backing", label: "後退" },
    { value: "action_u_turn", label: "転回" },
    { value: "action_lane_change", label: "進路変更" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(attributes);
  };

  const handleReset = () => {
    setAttributes({});
    onSearch({});
  };

  const handleAiSearch = async () => {
    // Check if we have enough attributes to search
    const hasMinimalAttributes = attributes.location || 
      (attributes.partyTypes && attributes.partyTypes.length > 0);
    
    if (!hasMinimalAttributes || isAiSearching) {
      alert("AI検索を行うには、場所または当事者の情報が必要です。");
      return;
    }
    
    if (onAiSearch) {
      // Use parent's AI search handler if provided
      setIsAiSearching(true);
      try {
        await onAiSearch(attributes);
      } finally {
        setIsAiSearching(false);
      }
    }
  };

  const isMissing = (field: string) => missingFields.includes(field);

  const getFieldClass = (field: string) => 
    `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      isMissing(field) && !attributes[field as keyof AccidentAttributes]
        ? "border-red-500 bg-red-50" 
        : "border-gray-300"
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                不足している情報があります。ハイライトされた項目を入力してください。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 事故類型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            事故類型
            {isMissing("accidentType") && <span className="text-xs text-red-500 font-bold">⚠️ 必須</span>}
          </label>
          <select
            value={attributes.accidentType || ""}
            onChange={(e) =>
              setAttributes({ ...attributes, accidentType: e.target.value || undefined })
            }
            className={getFieldClass("accidentType")}
          >
            <option value="">選択してください</option>
            {accidentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* 場所 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            場所
            {isMissing("location") && <span className="text-xs text-red-500 font-bold">⚠️ 必須</span>}
          </label>
          <select
            value={attributes.location || ""}
            onChange={(e) =>
              setAttributes({ ...attributes, location: e.target.value || undefined })
            }
            className={getFieldClass("location")}
          >
            <option value="">選択してください</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* 当事者種別 (Party A & B) & 信号 */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            当事者と信号
            {isMissing("partyTypes") && <span className="text-xs text-red-500 font-bold">⚠️ 必須</span>}
          </label>
          <div className={`grid grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50 ${isMissing("partyTypes") && (!attributes.partyTypes || attributes.partyTypes.length === 0) ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
            
            {/* Party A Group */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">当事者 A</label>
              <select
                value={partyA}
                onChange={(e) => handlePartyChange(0, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">種別を選択...</option>
                {partyOptions.map((type) => (
                  <option key={`a-${type}`} value={type}>{type}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 w-10">信号:</span>
                <select
                  value={attributes.signalA || ""}
                  onChange={(e) => setAttributes({ ...attributes, signalA: e.target.value || undefined })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                  disabled={!partyA}
                >
                  <option value="">不明 / 指定なし</option>
                  {signalStates.map((s) => (
                    <option key={`a-${s.value}`} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 w-10">行動:</span>
                <select
                  value={attributes.actionA || ""}
                  onChange={(e) => setAttributes({ ...attributes, actionA: e.target.value || undefined })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                  disabled={!partyA}
                >
                  <option value="">指定なし</option>
                  {actionOptions.map((a) => (
                    <option key={`a-${a.value}`} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Party B Group */}
            <div className="space-y-2 border-l pl-4 border-gray-300">
              <label className="block text-sm font-bold text-gray-700">当事者 B</label>
              <select
                value={partyB}
                onChange={(e) => handlePartyChange(1, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">種別を選択...</option>
                {partyOptions.map((type) => (
                  <option key={`b-${type}`} value={type}>{type}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 w-10">信号:</span>
                <select
                  value={attributes.signalB || ""}
                  onChange={(e) => setAttributes({ ...attributes, signalB: e.target.value || undefined })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                  disabled={!partyB}
                >
                  <option value="">不明 / 指定なし</option>
                  {signalStates.map((s) => (
                    <option key={`b-${s.value}`} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500 w-10">行動:</span>
                <select
                  value={attributes.actionB || ""}
                  onChange={(e) => setAttributes({ ...attributes, actionB: e.target.value || undefined })}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                  disabled={!partyB}
                >
                  <option value="">指定なし</option>
                  {actionOptions.map((a) => (
                    <option key={`b-${a.value}`} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-1 text-right">
             <button type="button" className="text-xs text-blue-600 hover:underline" onClick={() => alert("3者以上の事故の場合は、主な衝突ごとに分けて検索するか、AI検索を利用してください。")}>
               3者以上の事故ですか？
             </button>
          </div>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-2 flex-wrap">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          検索
        </button>
        <button
          type="button"
          onClick={handleAiSearch}
          disabled={isAiSearching || (!attributes.location && (!attributes.partyTypes || attributes.partyTypes.length === 0))}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          title="設定した条件を基にAIで確率検索を実行します"
        >
          {isAiSearching ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              検索中...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              </svg>
              AI検索
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
        >
          リセット
        </button>
      </div>
    </form>
  );
}

