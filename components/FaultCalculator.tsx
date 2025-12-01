"use client";

import { useState } from "react";
import {
  AssessmentCriteria,
  AppliedModification,
  AccidentReport,
} from "@/types";
import { calculateFaultPercentage } from "@/lib/calculator";

interface FaultCalculatorProps {
  criteria: AssessmentCriteria;
  onCalculate: (report: AccidentReport) => void;
}

export default function FaultCalculator({
  criteria,
  onCalculate,
}: FaultCalculatorProps) {
  const [selectedModifications, setSelectedModifications] = useState<
    Set<string>
  >(new Set());

  const toggleModification = (factorId: string) => {
    const newSet = new Set(selectedModifications);
    if (newSet.has(factorId)) {
      newSet.delete(factorId);
    } else {
      newSet.add(factorId);
    }
    setSelectedModifications(newSet);
  };

  const appliedMods: AppliedModification[] = criteria.modificationFactors
    .filter((factor) => selectedModifications.has(factor.id))
    .map((factor) => ({
      factorId: factor.id,
      factorDescription: factor.description,
      adjustment: factor.adjustment,
    }));

  const finalPercentage = calculateFaultPercentage(
    criteria.baseFaultPercentage,
    appliedMods
  );

  const handleCalculate = () => {
    const report: AccidentReport = {
      selectedCriteria: criteria,
      baseFaultPercentage: criteria.baseFaultPercentage,
      appliedModifications: appliedMods,
      finalFaultPercentage: finalPercentage,
      accidentType: criteria.title,
      description: criteria.description,
      createdAt: new Date(),
    };

    onCalculate(report);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">過失割合計算</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">選択された認定基準</h3>
        <p className="text-gray-700 mb-2">{criteria.title}</p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">基本過失割合</p>
          <p className="text-3xl font-bold text-blue-600">
            {criteria.baseFaultPercentage}%
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">修正要素を選択</h3>
        <div className="space-y-2">
          {criteria.modificationFactors.map((factor) => {
            const isSelected = selectedModifications.has(factor.id);
            const adjustmentColor =
              factor.adjustment > 0 ? "text-red-600" : "text-green-600";

            return (
              <label
                key={factor.id}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleModification(factor.id)}
                  className="mr-3 w-5 h-5 text-blue-600"
                />
                <div className="flex-1">
                  <span className="font-medium">{factor.description}</span>
                  <span className={`ml-2 font-semibold ${adjustmentColor}`}>
                    {factor.adjustment > 0 ? "+" : ""}
                    {factor.adjustment}%
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">基本過失割合:</span>
          <span className="font-semibold">{criteria.baseFaultPercentage}%</span>
        </div>
        {appliedMods.length > 0 && (
          <div className="mb-2">
            <span className="text-gray-600">修正要素:</span>
            <div className="mt-1 space-y-1">
              {appliedMods.map((mod) => (
                <div
                  key={mod.factorId}
                  className="flex justify-between text-sm"
                >
                  <span className="text-gray-700">{mod.factorDescription}</span>
                  <span
                    className={
                      mod.adjustment > 0 ? "text-red-600" : "text-green-600"
                    }
                  >
                    {mod.adjustment > 0 ? "+" : ""}
                    {mod.adjustment}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">
            最終過失割合:
          </span>
          <span className="text-3xl font-bold text-blue-600">
            {finalPercentage}%
          </span>
        </div>
      </div>

      <button
        onClick={handleCalculate}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        計算結果を保存
      </button>
    </div>
  );
}

