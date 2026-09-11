import ja from "@/messages/ja.json";
import en from "@/messages/en.json";

// Per-component translation fragments. Each fragment file's top-level object
// becomes `messages[locale][namespace]`, so a component looks up its own
// strings as t("namespace.key"). Keeping each component's strings in its own
// fragment file lets components be translated independently without
// conflicting edits to a single shared messages file.
import chatWindowEn from "@/messages/fragments/chatWindow.en.json";
import chatWindowJa from "@/messages/fragments/chatWindow.ja.json";
import searchComparisonPageEn from "@/messages/fragments/searchComparisonPage.en.json";
import searchComparisonPageJa from "@/messages/fragments/searchComparisonPage.ja.json";
import step4AIReportEditorEn from "@/messages/fragments/step4AIReportEditor.en.json";
import step4AIReportEditorJa from "@/messages/fragments/step4AIReportEditor.ja.json";
import accidentAttributesFormEn from "@/messages/fragments/accidentAttributesForm.en.json";
import accidentAttributesFormJa from "@/messages/fragments/accidentAttributesForm.ja.json";
import step1SearchEn from "@/messages/fragments/step1Search.en.json";
import step1SearchJa from "@/messages/fragments/step1Search.ja.json";
import step3VehicleLookupEn from "@/messages/fragments/step3VehicleLookup.en.json";
import step3VehicleLookupJa from "@/messages/fragments/step3VehicleLookup.ja.json";
import step2CalculateEn from "@/messages/fragments/step2Calculate.en.json";
import step2CalculateJa from "@/messages/fragments/step2Calculate.ja.json";
import step3AIRecommendEn from "@/messages/fragments/step3AIRecommend.en.json";
import step3AIRecommendJa from "@/messages/fragments/step3AIRecommend.ja.json";
import createCriteriaModalEn from "@/messages/fragments/createCriteriaModal.en.json";
import createCriteriaModalJa from "@/messages/fragments/createCriteriaModal.ja.json";
import faultCalculatorEn from "@/messages/fragments/faultCalculator.en.json";
import faultCalculatorJa from "@/messages/fragments/faultCalculator.ja.json";
import voiceUploadEn from "@/messages/fragments/voiceUpload.en.json";
import voiceUploadJa from "@/messages/fragments/voiceUpload.ja.json";
import searchCriteriaEn from "@/messages/fragments/searchCriteria.en.json";
import searchCriteriaJa from "@/messages/fragments/searchCriteria.ja.json";
import aiSuggestionsPanelEn from "@/messages/fragments/aiSuggestionsPanel.en.json";
import aiSuggestionsPanelJa from "@/messages/fragments/aiSuggestionsPanel.ja.json";
import testResultsPageEn from "@/messages/fragments/testResultsPage.en.json";
import testResultsPageJa from "@/messages/fragments/testResultsPage.ja.json";
import accidentReportWizardEn from "@/messages/fragments/accidentReportWizard.en.json";
import accidentReportWizardJa from "@/messages/fragments/accidentReportWizard.ja.json";
import workflowStepperEn from "@/messages/fragments/workflowStepper.en.json";
import workflowStepperJa from "@/messages/fragments/workflowStepper.ja.json";

export type Locale = "ja" | "en";

export const locales: Locale[] = ["ja", "en"];
export const defaultLocale: Locale = "ja";

export const messages = {
  ja: {
    ...ja,
    chatWindow: chatWindowJa,
    searchComparisonPage: searchComparisonPageJa,
    step4AIReportEditor: step4AIReportEditorJa,
    accidentAttributesForm: accidentAttributesFormJa,
    step1Search: step1SearchJa,
    step3VehicleLookup: step3VehicleLookupJa,
    step2Calculate: step2CalculateJa,
    step3AIRecommend: step3AIRecommendJa,
    createCriteriaModal: createCriteriaModalJa,
    faultCalculator: faultCalculatorJa,
    voiceUpload: voiceUploadJa,
    searchCriteria: searchCriteriaJa,
    aiSuggestionsPanel: aiSuggestionsPanelJa,
    testResultsPage: testResultsPageJa,
    accidentReportWizard: accidentReportWizardJa,
    workflowStepper: workflowStepperJa,
  },
  en: {
    ...en,
    chatWindow: chatWindowEn,
    searchComparisonPage: searchComparisonPageEn,
    step4AIReportEditor: step4AIReportEditorEn,
    accidentAttributesForm: accidentAttributesFormEn,
    step1Search: step1SearchEn,
    step3VehicleLookup: step3VehicleLookupEn,
    step2Calculate: step2CalculateEn,
    step3AIRecommend: step3AIRecommendEn,
    createCriteriaModal: createCriteriaModalEn,
    faultCalculator: faultCalculatorEn,
    voiceUpload: voiceUploadEn,
    searchCriteria: searchCriteriaEn,
    aiSuggestionsPanel: aiSuggestionsPanelEn,
    testResultsPage: testResultsPageEn,
    accidentReportWizard: accidentReportWizardEn,
    workflowStepper: workflowStepperEn,
  },
};

export function getTranslations(locale: Locale = defaultLocale) {
  return (key: string, params?: Record<string, string | number>) => {
    const keys = key.split(".");
    let value: any = messages[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (typeof value !== "string") {
      // Fall back to Japanese, then to the raw key, so a missing EN string
      // never renders as blank.
      let fallback: any = messages[defaultLocale];
      for (const k of keys) {
        fallback = fallback?.[k];
      }
      return typeof fallback === "string" ? fallback : key;
    }

    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) =>
          str.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue)),
        value
      );
    }

    return value;
  };
}

/**
 * Pick the localized value of a bilingual data field (e.g. criteria titles
 * translated ahead of time into `titleEn`), falling back to the Japanese
 * source text when no translation exists yet.
 */
export function localize(
  locale: Locale,
  ja: string | undefined,
  en: string | undefined
): string {
  if (locale === "en" && en && en.trim().length > 0) return en;
  return ja ?? en ?? "";
}
