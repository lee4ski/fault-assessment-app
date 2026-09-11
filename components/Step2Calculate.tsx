"use client";

import { useState, useEffect } from "react";
import {
  AssessmentCriteria,
  AppliedModification,
  AccidentReport,
} from "@/types";
import { calculateFaultPercentage } from "@/lib/calculator";
import { useLocale } from "@/components/LocaleProvider";
import { localize } from "@/lib/i18n-simple";

interface Step2CalculateProps {
  criteria: AssessmentCriteria;
  onCalculate: (report: AccidentReport) => void;
  /** AI などで事前に推奨された修正要素ID（初期選択用） */
  initialSelectedModificationIds?: string[];
  /** 以前に選択された修正要素ID（戻った時の復元用） */
  previouslyAppliedModificationIds?: string[];
}

export default function Step2Calculate({
  criteria,
  onCalculate,
  initialSelectedModificationIds,
  previouslyAppliedModificationIds,
}: Step2CalculateProps) {
  const { t, locale } = useLocale();

  // Ensure modificationFactors is always an array
  // CRITICAL: Get factors directly from criteria, don't use useMemo which might cache incorrectly
  // Use criteria.modificationFactors directly if it exists and is an array, otherwise empty array
  // FIXED: More defensive check to ensure we get the factors
  let modificationFactors: typeof criteria.modificationFactors = [];
  
  if (criteria) {
    if (criteria.modificationFactors) {
      if (Array.isArray(criteria.modificationFactors)) {
        modificationFactors = criteria.modificationFactors;
      } else {
        console.error("❌ criteria.modificationFactors is not an array:", typeof criteria.modificationFactors);
      }
    } else {
      console.error("❌ criteria.modificationFactors is undefined/null");
    }
  } else {
    console.error("❌ criteria is undefined");
  }
  
  // Debug logging
  console.log("Step2Calculate - criteria:", criteria);
  console.log("Step2Calculate - criteria?.modificationFactors:", criteria?.modificationFactors);
  console.log("Step2Calculate - modificationFactors (local):", modificationFactors);
  console.log("Step2Calculate - modificationFactors.length:", modificationFactors.length);
  console.log("Step2Calculate - Are they equal?", criteria?.modificationFactors === modificationFactors);

  // Debug logging
  console.log("Step2Calculate - criteria:", criteria);
  console.log("Step2Calculate - criteria.modificationFactors:", criteria?.modificationFactors);
  console.log("Step2Calculate - modificationFactors:", modificationFactors);
  console.log("Step2Calculate - modificationFactors.length:", modificationFactors.length);

  // Use previously applied modifications if available (when returning to step), otherwise use AI recommendations
  const defaultModificationIds = previouslyAppliedModificationIds || initialSelectedModificationIds || [];
  
  const [selectedModifications, setSelectedModifications] = useState<
    Set<string>
  >(() => new Set(defaultModificationIds));

  // Update when criteria changes OR when previously applied modifications are provided (restoring state)
  useEffect(() => {
    if (previouslyAppliedModificationIds && previouslyAppliedModificationIds.length > 0) {
      // Restore previously applied modifications when returning to this step
      setSelectedModifications(new Set(previouslyAppliedModificationIds));
    } else if (initialSelectedModificationIds && initialSelectedModificationIds.length > 0) {
      // Use AI recommendations if no previous modifications
      setSelectedModifications(new Set(initialSelectedModificationIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria?.id]);

  const toggleModification = (factorId: string) => {
    const newSet = new Set(selectedModifications);
    if (newSet.has(factorId)) {
      newSet.delete(factorId);
    } else {
      newSet.add(factorId);
    }
    setSelectedModifications(newSet);
  };

  const appliedMods: AppliedModification[] = modificationFactors
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

  const handleCalculate = async () => {
    const report: AccidentReport = {
      selectedCriteria: criteria,
      baseFaultPercentage: criteria.baseFaultPercentage,
      appliedModifications: appliedMods,
      finalFaultPercentage: finalPercentage,
      accidentType: criteria.title,
      description: criteria.description,
      createdAt: new Date(),
    };

    // Log calculation action
    try {
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate",
          selectedCriteria: criteria,
          inputConditions: {
            baseFaultPercentage: criteria.baseFaultPercentage,
            appliedModifications: appliedMods,
            finalFaultPercentage: finalPercentage,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to log calculation:", error);
    }

    onCalculate(report);
    alert(
      t("step2Calculate.calculationCompleteAlert", {
        percentage: report.finalFaultPercentage ?? 0,
      })
    );
  };

  // AI-generated explanation based on criteria
  const generateExplanation = (criteria: AssessmentCriteria): string => {
    const chapter = localize(locale, criteria.chapterTitle, criteria.chapterTitleEn);
    const basePercentage = criteria.baseFaultPercentage;
    const modCount = modificationFactors.length;

    let explanation = t("step2Calculate.explanationIntro", { chapter });

    if (basePercentage === 0) {
      explanation += t("step2Calculate.explanationBaseZero");
    } else if (basePercentage <= 20) {
      explanation += t("step2Calculate.explanationBaseLow");
    } else if (basePercentage <= 50) {
      explanation += t("step2Calculate.explanationBaseMid");
    } else if (basePercentage <= 80) {
      explanation += t("step2Calculate.explanationBaseHigh");
    } else {
      explanation += t("step2Calculate.explanationBaseSevere");
    }

    if (modCount > 0) {
      explanation += " " + t("step2Calculate.explanationModsAvailable", { count: modCount });
    } else {
      explanation += " " + t("step2Calculate.explanationNoMods");
    }

    if (criteria.description) {
      explanation += " " + localize(locale, criteria.description, criteria.descriptionEn);
    }

    return explanation;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("step2Calculate.heading")}</h2>
        <p className="text-gray-600">
          {t("step2Calculate.subheading")}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-1">{t("step2Calculate.selectedCriteriaLabel")}</p>
        <p className="font-semibold text-gray-900 mb-2">
          {(criteria && localize(locale, criteria.title, criteria.titleEn)) || t("step2Calculate.noTitle")}
        </p>
        <p className="text-sm text-gray-600 mb-1">{t("step2Calculate.baseFaultPercentageLabel")}</p>
        <p className="text-3xl font-bold text-blue-600">
          {criteria?.baseFaultPercentage || 0}%
        </p>
      </div>

      {/* AI-Generated Explanation */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-purple-900 mb-2">{t("step2Calculate.aiExplanationHeading")}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {generateExplanation(criteria)}
            </p>
          </div>
        </div>
      </div>

      {/* MODIFICATION FACTORS SECTION - Always visible */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-4">

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{t("step2Calculate.selectModificationFactors")}</h3>
            {modificationFactors.length > 0 && (
              <button
                onClick={() => {
                  if (selectedModifications.size === modificationFactors.length) {
                    setSelectedModifications(new Set());
                  } else {
                    setSelectedModifications(
                      new Set(modificationFactors.map((f) => f.id))
                    );
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedModifications.size === modificationFactors.length
                  ? t("step2Calculate.deselectAll")
                  : t("step2Calculate.selectAll")}
              </button>
            )}
          </div>

          {/* FIXED: Use criteria.modificationFactors directly to avoid stale closure */}
          {!criteria?.modificationFactors || !Array.isArray(criteria.modificationFactors) || criteria.modificationFactors.length === 0 ? (
            <div className="p-6 bg-blue-50 border-2 border-blue-300 rounded-lg text-center">
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold mb-2 text-lg text-gray-900">{t("step2Calculate.noModificationFactorsTitle")}</p>
              <p className="text-sm text-gray-600">
                {t("step2Calculate.noModFactorsBefore")} <span className="font-bold text-blue-600">{criteria?.baseFaultPercentage || 0}%</span> {t("step2Calculate.noModFactorsAfter")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Group by category */}
              {modificationFactors.length > 0 ? (
                Array.from(
                  new Set(modificationFactors.map((f) => f.category))
                ).map((category, index) => {
                const factorsInCategory = modificationFactors.filter(
                  (f) => f.category === category
                );
                return (
                  <div key={category || `category-${index}`} className="mb-3">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      {category === "pedestrian"
                        ? t("step2Calculate.categoryPedestrian")
                        : category === "vehicle"
                          ? t("step2Calculate.categoryVehicle")
                          : category === "road"
                            ? t("step2Calculate.categoryRoad")
                            : category === "signal-green"
                              ? t("step2Calculate.categorySignalGreen")
                              : category === "signal-yellow"
                                ? t("step2Calculate.categorySignalYellow")
                                : category}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {factorsInCategory.map((factor) => {
                        const isSelected = selectedModifications.has(factor.id);
                        
                        // Category-specific colors for better demo visibility
                        let adjustmentColor = "";
                        let selectedColor = "";
                        
                        if (category === "signal-green") {
                          adjustmentColor = "bg-green-100 border-green-400 text-green-800";
                          selectedColor = "bg-green-600 text-white border-green-600";
                        } else if (category === "signal-yellow") {
                          adjustmentColor = "bg-yellow-100 border-yellow-400 text-yellow-800";
                          selectedColor = "bg-yellow-600 text-white border-yellow-600";
                        } else {
                          adjustmentColor = factor.adjustment > 0 ? "bg-red-50 border-red-300 text-red-700" : "bg-green-50 border-green-300 text-green-700";
                          selectedColor = factor.adjustment > 0 ? "bg-red-500 text-white border-red-500" : "bg-green-500 text-white border-green-500";
                        }

                        return (
                          <button
                            key={factor.id}
                            onClick={() => toggleModification(factor.id)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              isSelected
                                ? selectedColor
                                : `${adjustmentColor} hover:shadow-sm`
                            }`}
                          >
                            <span className="mr-1">{localize(locale, factor.description, factor.descriptionEn)}</span>
                            <span className="font-bold">
                              {factor.adjustment > 0 ? "+" : ""}
                              {factor.adjustment}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })) : (
                <div className="p-4 bg-red-100 border-2 border-red-400 rounded text-sm">
                  <p className="font-bold text-red-900">❌ ERROR: modificationFactors.length is 0 but we are in the else branch!</p>
                  <p>modificationFactors.length = {modificationFactors.length}</p>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Calculation Summary */}
      <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">{t("step2Calculate.baseFaultPercentageColon")}</span>
              <span className="text-xl font-bold text-gray-900">
                {criteria.baseFaultPercentage}%
              </span>
            </div>

            {appliedMods.length > 0 ? (
              <>
                <div className="border-t border-gray-300 pt-3">
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    {t("step2Calculate.appliedModificationsCount", { count: appliedMods.length })}
                  </div>
                  <div className="space-y-2">
                    {appliedMods.map((mod) => (
                      <div
                        key={mod.factorId}
                        className="flex justify-between items-center p-2 bg-white rounded border border-gray-200"
                      >
                        <span className="text-sm text-gray-700">
                          {mod.factorDescription}
                        </span>
                        <span
                          className={`text-sm font-bold ${mod.adjustment > 0 ? "text-red-600" : "text-green-600"
                            }`}
                        >
                          {mod.adjustment > 0 ? "+" : ""}
                          {mod.adjustment}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t-2 border-gray-400 pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {t("step2Calculate.finalFaultPercentageLabel")}
                  </span>
                  <span className="text-4xl font-bold text-blue-600">
                    {finalPercentage}%
                  </span>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  {finalPercentage !== criteria.baseFaultPercentage && (
                    <span>
                      {finalPercentage > criteria.baseFaultPercentage
                        ? `+${finalPercentage - criteria.baseFaultPercentage}%`
                        : `${finalPercentage - criteria.baseFaultPercentage}%`}{" "}
                      {t("step2Calculate.adjustmentSuffix")}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="border-t border-gray-300 pt-3">
                <div className="text-center text-gray-500 text-sm py-2">
                  {t("step2Calculate.noModificationsSelectedHint")}
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">
                    {t("step2Calculate.finalFaultPercentageLabel")}
                  </span>
                  <span className="text-4xl font-bold text-blue-600">
                    {finalPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCalculate}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          {t("step2Calculate.saveAndContinueButton")}
        </button>
      </div>
    </div>
  );
}

