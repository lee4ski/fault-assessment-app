"use client";

import { useState } from "react";
import { AccidentAttributes } from "@/types";

interface AccidentAttributesFormProps {
  onSearch: (attributes: AccidentAttributes) => void;
  initialAttributes?: AccidentAttributes;
}

export default function AccidentAttributesForm({
  onSearch,
  initialAttributes,
}: AccidentAttributesFormProps) {
  const [attributes, setAttributes] = useState<AccidentAttributes>(
    initialAttributes || {}
  );

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

  const partyTypes = [
    "歩行者",
    "四輪車",
    "二輪車",
    "自転車",
    "その他",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(attributes);
  };

  const handleReset = () => {
    setAttributes({});
    onSearch({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 事故類型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            事故類型
          </label>
          <select
            value={attributes.accidentType || ""}
            onChange={(e) =>
              setAttributes({ ...attributes, accidentType: e.target.value || undefined })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            場所
          </label>
          <select
            value={attributes.location || ""}
            onChange={(e) =>
              setAttributes({ ...attributes, location: e.target.value || undefined })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">選択してください</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        {/* 当事者種別 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            当事者種別（複数選択可）
          </label>
          <div className="space-y-2">
            {partyTypes.map((type) => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={attributes.partyTypes?.includes(type) || false}
                  onChange={(e) => {
                    const current = attributes.partyTypes || [];
                    const updated = e.target.checked
                      ? [...current, type]
                      : current.filter((t) => t !== type);
                    setAttributes({
                      ...attributes,
                      partyTypes: updated.length > 0 ? updated : undefined,
                    });
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{type}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 信号有無 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            信号有無
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="hasSignal"
                checked={attributes.hasSignal === true}
                onChange={() =>
                  setAttributes({ ...attributes, hasSignal: true })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">信号あり</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="hasSignal"
                checked={attributes.hasSignal === false}
                onChange={() =>
                  setAttributes({ ...attributes, hasSignal: false })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">信号なし</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="hasSignal"
                checked={attributes.hasSignal === undefined}
                onChange={() =>
                  setAttributes({ ...attributes, hasSignal: undefined })
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">指定なし</span>
            </label>
          </div>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          検索
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

