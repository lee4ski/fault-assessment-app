"use client";

import { useState } from "react";
import {
  AssessmentCriteria,
  AppliedModification,
  AccidentReport,
} from "@/types";
import { calculateFaultPercentage } from "@/lib/calculator";
import { useLocale } from "@/components/LocaleProvider";
import { localize } from "@/lib/i18n-simple";

interface FaultCalculatorProps {
  criteria: AssessmentCriteria;
  onCalculate: (report: AccidentReport) => void;
}

export default function FaultCalculator({
  criteria,
  onCalculate,
}: FaultCalculatorProps) {
  const { t, locale } = useLocale();
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
      factorDescription: localize(locale, factor.description, factor.descriptionEn),
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
      <h2 className="text-2xl font-bold mb-4">{t("faultCalculator.heading")}</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">{t("faultCalculator.selectedCriteriaHeading")}</h3>
        <p className="text-gray-700 mb-2">{localize(locale, criteria.title, criteria.titleEn)}</p>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t("faultCalculator.baseFaultPercentage")}</p>
          <p className="text-3xl font-bold text-blue-600">
            {criteria.baseFaultPercentage}%
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">{t("faultCalculator.selectModificationsHeading")}</h3>
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
                  <span className="font-medium">{localize(locale, factor.description, factor.descriptionEn)}</span>
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
          <span className="text-gray-600">{t("faultCalculator.baseFaultShort")}</span>
          <span className="font-semibold">{criteria.baseFaultPercentage}%</span>
        </div>
        {appliedMods.length > 0 && (
          <div className="mb-2">
            <span className="text-gray-600">{t("faultCalculator.modificationsShort")}</span>
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
            {t("faultCalculator.finalFaultPercentage")}
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
        {t("faultCalculator.saveResult")}
      </button>
    </div>
  );
}

