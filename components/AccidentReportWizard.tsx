"use client";

import { useState } from "react";
import { useLocale } from "./LocaleProvider";
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
import Step1Search, { Step1SearchState } from "./Step1Search";
import Step2Calculate from "./Step2Calculate";
import Step3VehicleLookup from "./Step3VehicleLookup";
import Step4AIReportEditor from "./Step4AIReportEditor";
import ChatWindow from "./ChatWindow";
import AISuggestionsPanel from "./AISuggestionsPanel";

export default function AccidentReportWizard() {
  const { t } = useLocale();
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
  const [step1SearchState, setStep1SearchState] = useState<Step1SearchState | null>(null);
  const [aiExpectedVehicles, setAiExpectedVehicles] = useState<Array<{make: string, model: string}>>([]);

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
      
      // Debug: Log modification factors count (empty is valid for some criteria)
      if (!fullCriteria.modificationFactors || fullCriteria.modificationFactors.length === 0) {
        console.log("ℹ️ INFO: Criteria has no modification factors (this is valid for some cases)");
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
    
    // Update validation status for Step 3 based on selection with AI awareness
    if (vehicles.length > 0) {
      let status: "complete" | "incomplete" | "valid-empty" = "complete";
      let color: "green" | "red" | "yellow" = "green";
      const missingItems: string[] = [];
      let reason = t("accidentReportWizard.vehicleReason.selected", { count: vehicles.length });

      // Check 1: Count mismatch (if AI expected something)
      if (aiExpectedVehicles.length > 0 && vehicles.length !== aiExpectedVehicles.length) {
        status = "incomplete";
        color = "red";
        reason = t("accidentReportWizard.vehicleReason.countMismatch", {
          expected: aiExpectedVehicles.length,
          selected: vehicles.length,
        });
        missingItems.push(t("accidentReportWizard.missingItems.vehicleCountMismatch"));
      }
      // Check 2: Maker mismatch
      else if (aiExpectedVehicles.length > 0) {
        const issues: string[] = [];
        
        aiExpectedVehicles.forEach(expected => {
          if (!expected.make) return; // Skip if AI didn't find a maker
          
          // Try to find a match in selected vehicles (loose string matching)
          const match = vehicles.find(v => 
            (v.make && expected.make && (
              v.make.toLowerCase().includes(expected.make.toLowerCase()) || 
              expected.make.toLowerCase().includes(v.make.toLowerCase())
            )) ||
            (v.model && expected.model && (
              v.model.toLowerCase().includes(expected.model.toLowerCase()) ||
              expected.model.toLowerCase().includes(v.model.toLowerCase())
            ))
          );
          
          if (!match) {
            issues.push(expected.make + (expected.model ? ` ${expected.model}` : ""));
          }
        });
        
        if (issues.length > 0) {
          status = "incomplete";
          color = "red";
          reason = t("accidentReportWizard.vehicleReason.makeMismatch", { issues: issues.join(", ") });
          missingItems.push(t("accidentReportWizard.missingItems.vehicleInfoMismatch"));
        }
      }

      setStepValidations(prev => ({
        ...prev,
        3: {
          stepNumber: 3,
          status,
          color,
          missingItems,
          reason
        }
      }));
    } else {
      setStepValidations(prev => ({
        ...prev,
        3: {
          stepNumber: 3,
          status: "incomplete",
          color: "red",
          missingItems: [t("accidentReportWizard.missingItems.vehicleInfo")],
          reason: t("accidentReportWizard.vehicleReason.notRegistered")
        }
      }));
    }
    
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
        const msg = t("accidentReportWizard.aiSuggestion.elderlyChild");
        setAiSuggestion(`${t("accidentReportWizard.aiSuggestionPrefix")}${msg}`);
        setAiPanelSuggestions(prev => [...prev, msg]);
      } else if (hasHeavy) {
        const msg = t("accidentReportWizard.aiSuggestion.heavyOrSevere");
        setAiSuggestion(`${t("accidentReportWizard.aiSuggestionPrefix")}${msg}`);
        setAiPanelSuggestions(prev => [...prev, msg]);
      } else {
        setAiSuggestion(null);
      }
    } else if (currentStep === 3) {
      // Moving from Step 3 (Vehicles) to Step 4 (Report)
      if (selectedVehicles.length === 0) {
        const msg = t("accidentReportWizard.aiSuggestion.noVehicleInfo");
        setAiSuggestion(`${t("accidentReportWizard.aiWarningPrefix")}${msg}`);
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
        return t("accidentReportWizard.steps.search");
      case 2:
        return t("accidentReportWizard.steps.modify");
      case 3:
        return t("accidentReportWizard.steps.vehicle");
      case 4:
        return t("accidentReportWizard.steps.report");
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
      // Store expectations for validation
      const expectations = analysis.step3.extractedVehicles.map((v: any) => ({
        make: v.make || "",
        model: v.model || ""
      })).filter((v: any) => v.make || v.model);
      setAiExpectedVehicles(expectations);

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
              t("accidentReportWizard.steps.search"),
              t("accidentReportWizard.steps.modify"),
              t("accidentReportWizard.steps.vehicle"),
              t("accidentReportWizard.steps.report"),
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
              preservedState={step1SearchState}
              onStateChange={setStep1SearchState}
            />
          )}
          {currentStep === 2 && selectedCriteria ? (
            <Step2Calculate
              criteria={selectedCriteria}
              onCalculate={handleCalculate}
              initialSelectedModificationIds={
                aiRecommendedModifications || undefined
              }
              previouslyAppliedModificationIds={
                calculatedReport?.appliedModifications?.map(m => m.factorId) || undefined
              }
            />
          ) : currentStep === 2 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
              <p>{t("accidentReportWizard.selectCriteriaFirst")}</p>
              <button
                onClick={() => setCurrentStep(1)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t("accidentReportWizard.backToStep1")}
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
            {t("accidentReportWizard.previousStep")}
          </button>
          <div className="flex-1"></div>
          <button
            onClick={handleNext}
            disabled={!canGoForward}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {t("accidentReportWizard.nextStep")}
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

