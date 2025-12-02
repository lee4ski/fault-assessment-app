"use client";

import { useState } from "react";
import {
  AccidentReportFull,
  AssessmentCriteria,
  AccidentReport,
  Vehicle,
  AccidentAttributes,
} from "@/types";
import { StepValidation } from "@/types/workflow";
import { sampleCriteria } from "@/data/sampleCriteria";
import WorkflowStepper from "./WorkflowStepper";
import Step1Search from "./Step1Search";
import Step2Calculate from "./Step2Calculate";
import Step3VehicleLookup from "./Step3VehicleLookup";
import Step4AIReportEditor from "./Step4AIReportEditor";
import ChatWindow from "./ChatWindow";
import AISuggestionsPanel from "./AISuggestionsPanel";

export default function AccidentReportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState<AccidentReportFull | null>(null);
  const [selectedCriteria, setSelectedCriteria] = useState<
    AssessmentCriteria | undefined
  >();
  const [calculatedReport, setCalculatedReport] = useState<
    AccidentReport | undefined
  >();
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [stepValidations, setStepValidations] = useState<
    Record<number, StepValidation>
  >({});
  const [aiRecommendedModifications, setAiRecommendedModifications] = useState<
    string[] | null
  >(null);
  const [autoFilledAttributes, setAutoFilledAttributes] = useState<AccidentAttributes | undefined>();
  const [missingStructuredFields, setMissingStructuredFields] = useState<string[]>([]);
  const [aiRecommendation, setAiRecommendation] = useState<{ id: string; confidence: number } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiPanelSuggestions, setAiPanelSuggestions] = useState<string[]>([]);

  const handleSelectCriteria = (criteria: AssessmentCriteria) => {
    console.log("=== handleSelectCriteria ===");
    console.log("Received criteria:", criteria);
    console.log("Criteria ID:", criteria.id);
    console.log("Criteria modificationFactors:", criteria.modificationFactors);
    
    // ALWAYS look up the full criteria from sampleCriteria to ensure all properties are present
    // This is critical because the criteria object passed might not have all properties
    const fullCriteria = sampleCriteria.find(c => c.id === criteria.id);
    
    console.log("Lookup result:", fullCriteria ? "Found" : "Not found");
    
    if (!fullCriteria) {
      console.error("❌ CRITICAL ERROR: Criteria not found in sampleCriteria!");
      console.error("Looking for ID:", criteria.id);
      console.error("Available IDs:", sampleCriteria.map(c => c.id));
      // If not found, use the passed criteria but ensure modificationFactors is an array
      const criteriaWithMods = {
        ...criteria,
        modificationFactors: Array.isArray(criteria.modificationFactors) 
          ? criteria.modificationFactors 
          : []
      };
      console.error("Using passed criteria with mods (may be incomplete):", criteriaWithMods);
      setSelectedCriteria(criteriaWithMods);
    } else {
      // Found in sampleCriteria - ALWAYS use this, it has the complete data
      console.log("✓ Found criteria in sampleCriteria");
      console.log("Full criteria object:", JSON.stringify(fullCriteria, null, 2));
      console.log("Modification factors:", fullCriteria.modificationFactors);
      console.log("Modification factors count:", fullCriteria.modificationFactors?.length || 0);
      
      // CRITICAL: Ensure modificationFactors exists and is an array
      if (!fullCriteria.modificationFactors) {
        console.error("❌ ERROR: fullCriteria.modificationFactors is undefined!");
        fullCriteria.modificationFactors = [];
      } else if (!Array.isArray(fullCriteria.modificationFactors)) {
        console.error("❌ ERROR: fullCriteria.modificationFactors is not an array!", typeof fullCriteria.modificationFactors);
        fullCriteria.modificationFactors = [];
      }
      
      // Debug: Show alert if modificationFactors is missing or empty
      if (!fullCriteria.modificationFactors || fullCriteria.modificationFactors.length === 0) {
        console.error("⚠️ WARNING: Criteria found but has no modificationFactors!", fullCriteria);
      } else {
        console.log("✅ SUCCESS: Criteria has", fullCriteria.modificationFactors.length, "modification factors");
      }
      
      // ALWAYS set the full criteria from sampleCriteria
      setSelectedCriteria(fullCriteria);
    }
    
    // Criteria が変わったので、AI 推奨の修正要素は一旦リセット
    setAiRecommendedModifications(null);
    
    // Auto-advance to step 2 when criteria is selected
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleCalculate = (report: AccidentReport) => {
    setCalculatedReport(report);
    // Update reportData with step 1 and 2 data
    setReportData((prev) => ({
      ...prev,
      ...report,
      vehicles: prev?.vehicles || [],
      attachments: prev?.attachments || [],
      reportText: prev?.reportText || "",
      status: prev?.status || "draft",
      approvalHistory: prev?.approvalHistory || [],
      version: (prev?.version || 0) + 1,
    } as AccidentReportFull));
    // Auto-advance to step 3 when calculation is complete
    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleVehicleSelect = (vehicles: Vehicle[]) => {
    setSelectedVehicles(vehicles);
    // Update reportData with vehicles
    setReportData((prev) => ({
      ...prev,
      vehicles,
    } as AccidentReportFull));
    
    // Auto-advance to step 4 ONLY when vehicles are actually selected
    if (currentStep === 3 && vehicles.length > 0) {
      setCurrentStep(4);
    }
  };

  const handleStepChange = (step: number) => {
    // Allow going back to any step
    setCurrentStep(step);
  };

  const handleNext = () => {
    // AI Bidirectional Sync Logic
    if (currentStep === 2) {
      // Moving from Step 2 (Modifications) to Step 3 (Vehicles)
      const mods = calculatedReport?.appliedModifications || [];
      const hasElderly = mods.some(m => m.factorDescription.includes("高齢者") || m.factorDescription.includes("幼児"));
      const hasHeavy = mods.some(m => m.factorDescription.includes("大型") || m.factorDescription.includes("著しい"));
      
      if (hasElderly) {
        const msg = "高齢者・幼児に関する修正要素が適用されました。Step 3で、相手車両に「対歩行者安全装置」や「自動ブレーキ」が装備されているか確認することをお勧めします。";
        setAiSuggestion(`💡 **AI提案**: ${msg}`);
        setAiPanelSuggestions(prev => [...prev, msg]);
      } else if (hasHeavy) {
        const msg = "大型車や著しい過失に関する修正要素が適用されました。Step 3で、車両の具体的なサイズや積載量、整備状況を確認してください。";
        setAiSuggestion(`💡 **AI提案**: ${msg}`);
        setAiPanelSuggestions(prev => [...prev, msg]);
      } else {
        setAiSuggestion(null);
      }
    } else if (currentStep === 3) {
      // Moving from Step 3 (Vehicles) to Step 4 (Report)
      if (selectedVehicles.length === 0) {
        const msg = "車両情報が登録されていません。報告書の精度を上げるため、少なくともメーカーと車種名は特定しておくことをお勧めします。";
        setAiSuggestion(`⚠️ **AI注意**: ${msg}`);
        setAiPanelSuggestions(prev => [...prev, msg]);
      } else {
        setAiSuggestion(null);
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Determine if navigation is possible
  const canGoBack = currentStep > 1;
  const canGoForward = currentStep < 4;

  const handleReportUpdate = (report: AccidentReportFull) => {
    setReportData(report);
  };

  const getStepName = () => {
    switch (currentStep) {
      case 1:
        return "認定基準の検索";
      case 2:
        return "修正要素の適用";
      case 3:
        return "車両情報検索";
      case 4:
        return "AI報告書作成";
      default:
        return "";
    }
  };

  const handleAIAnalysis = (analysis: any) => {
    console.log("AI Analysis result:", analysis);
    
    // Update step validations
    const newValidations: Record<number, StepValidation> = {
      1: analysis.step1.validation,
      2: analysis.step2.validation,
      3: analysis.step3.validation,
    };
    setStepValidations(newValidations);

    // Auto-fill Step 1: Structured Search Attributes
    if (analysis.attributes) {
      setAutoFilledAttributes(analysis.attributes);
      console.log("✅ Auto-filled Step 1: Structured attributes", analysis.attributes);
    }
    
    if (analysis.missingStructuredFields) {
      setMissingStructuredFields(analysis.missingStructuredFields);
    } else {
      setMissingStructuredFields([]);
    }

    // Auto-fill Step 1: Select criteria
    if (analysis.step1.recommendedCriteriaId) {
      setAiRecommendation({
        id: analysis.step1.recommendedCriteriaId,
        confidence: analysis.step1.confidence || 0
      });

      const recommendedCriteria = sampleCriteria.find(
        (c) => c.id === analysis.step1.recommendedCriteriaId
      );
      if (recommendedCriteria) {
        setSelectedCriteria(recommendedCriteria);
        console.log("✅ Auto-filled Step 1: Criteria selected");
      }
    }

    // Auto-fill Step 2: store AI 推奨修正要素
    if (
      analysis.step2 &&
      Array.isArray(analysis.step2.recommendedModifications)
    ) {
      setAiRecommendedModifications(analysis.step2.recommendedModifications);
      console.log(
        "📝 Step 2 recommendations:",
        analysis.step2.recommendedModifications
      );
    }

    // Auto-fill Step 3: Extract vehicles
    if (analysis.step3.extractedVehicles && analysis.step3.extractedVehicles.length > 0) {
      const vehicles: Vehicle[] = analysis.step3.extractedVehicles.map((v: any, index: number) => ({
        id: `vehicle-${Date.now()}-${index}`,
        make: v.make || "",
        model: v.model || "",
        year: v.year ? parseInt(v.year) : new Date().getFullYear(),
        modelCode: v.modelCode || "",
        engineSize: "",
      }));
      setSelectedVehicles(vehicles);
      console.log("✅ Auto-filled Step 3: Vehicles extracted");
    }

    // Optionally jump to Step 1 if analysis successful
    if (analysis.step1.recommendedCriteriaId && currentStep !== 1) {
      setCurrentStep(1);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left: Wizard Steps */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b p-4">
          <WorkflowStepper
            currentStep={currentStep}
            onStepChange={handleStepChange}
            totalSteps={4}
            steps={[
              "認定基準の検索",
              "修正要素の適用",
              "車両情報検索",
              "AI報告書作成",
            ]}
            stepValidations={stepValidations}
          />
        </div>

        <div className="flex-1 overflow-auto p-6">
          {currentStep === 1 && (
            <Step1Search
              criteria={sampleCriteria}
              onSelect={handleSelectCriteria}
              selectedCriteria={selectedCriteria}
              autoFilledAttributes={autoFilledAttributes}
              missingFields={missingStructuredFields}
              aiRecommendation={aiRecommendation}
            />
          )}
          {currentStep === 2 && selectedCriteria ? (
            <Step2Calculate
              criteria={selectedCriteria}
              onCalculate={handleCalculate}
              initialSelectedModificationIds={
                aiRecommendedModifications || undefined
              }
            />
          ) : currentStep === 2 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              <p>ステップ1で認定基準を選択してください</p>
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ステップ1に戻る
              </button>
            </div>
          ) : null}
          {currentStep === 3 && (
            <Step3VehicleLookup
              onSelect={handleVehicleSelect}
              selectedVehicles={selectedVehicles}
            />
          )}
          {currentStep === 4 && (
            <Step4AIReportEditor
              reportData={reportData}
              onUpdate={handleReportUpdate}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="bg-white border-t p-4 flex justify-between items-center gap-4">
          <button
            onClick={handlePrevious}
            disabled={!canGoBack}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            前のステップに戻る
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            次のステップへ
          </button>
        </div>
      </div>

      {/* Right: Persistent Chat */}
      <ChatWindow 
        step={currentStep} 
        stepName={getStepName()}
        onAIAnalysis={handleAIAnalysis}
        externalMessage={aiSuggestion}
      />
      
      <AISuggestionsPanel 
        suggestions={aiPanelSuggestions}
        isVisible={aiPanelSuggestions.length > 0}
        onClose={() => setAiPanelSuggestions([])}
      />
    </div>
  );
}

