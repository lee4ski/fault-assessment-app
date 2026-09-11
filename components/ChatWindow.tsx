"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/workflow";
import { sampleCriteria } from "@/data/sampleCriteria";
import { MessageSquare, Sparkles, ChevronRight, Image as ImageIcon, X, ArrowUp, Loader2 } from "lucide-react";
import VoiceUpload from "./VoiceUpload";
import { useLocale } from "@/components/LocaleProvider";

type DetailKey = "location" | "signal" | "pedestrian" | "vehicles" | "extra";

interface ChatWindowProps {
  step: number;
  stepName: string;
  onAIAnalysis?: (analysis: any) => void;
  externalMessage?: string | null;
}

export default function ChatWindow({
  step,
  stepName,
  onAIAnalysis,
  externalMessage,
}: ChatWindowProps) {
  const { t, locale } = useLocale();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: t("chatWindow.greeting", { stepName }),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCollectingDetails, setIsCollectingDetails] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [collectedDetails, setCollectedDetails] = useState<
    Partial<Record<DetailKey, string>>
  >({});
  const [initialAccidentText, setInitialAccidentText] = useState<string | null>(
    null
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<{ name: string; url: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const detailQuestions: { id: DetailKey; text: string }[] = [
    { id: "location", text: t("chatWindow.questions.location") },
    { id: "signal", text: t("chatWindow.questions.signal") },
    { id: "pedestrian", text: t("chatWindow.questions.pedestrian") },
    { id: "vehicles", text: t("chatWindow.questions.vehicles") },
    { id: "extra", text: t("chatWindow.questions.extra") },
  ];

  useEffect(() => {
    if (externalMessage) {
      const newMessage: ChatMessage = {
        id: `ext-${Date.now()}`,
        role: "assistant",
        content: externalMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setIsCollapsed(false); // Auto-open chat on suggestion
    }
  }, [externalMessage]);

  const scrollToBottom = () => {
    if (messagesEndRef.current && !isCollapsed) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        // Silently handle scroll errors (element might not be mounted yet)
        console.debug("Scroll error:", error);
      }
    }
  };

  const handleCaseSelect = async (caseId: string, caseTitle: string) => {
    // Add user selection message
    const selectionMessage: ChatMessage = {
      id: `select-${Date.now()}`,
      role: "user",
      content: t("chatWindow.caseSelected", { caseTitle }),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, selectionMessage]);

    // Trigger AI analysis with full chat history
    setIsAnalyzing(true);
    const analyzingMessage: ChatMessage = {
      id: `analyzing-${Date.now()}`,
      role: "assistant",
      content: t("chatWindow.analyzingSelectedCriteria"),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, analyzingMessage]);

    try {
      // Build chat history for context
      const chatHistory = messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join("\n");

      const analysisResponse = await fetch("/api/ai-analyze-accident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accidentDescription: chatHistory,
          preferredCriteriaId: caseId, // Hint to AI
          locale
        }),
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();

        if (onAIAnalysis) {
          onAIAnalysis(analysis);
        }

        const matchedCriteria = sampleCriteria.find(c => c.id === caseId);
        let responseText = t("chatWindow.caseSelectionComplete");

        if (matchedCriteria) {
          responseText += t("chatWindow.step1CriteriaLine", { title: matchedCriteria.title });
          responseText += t("chatWindow.baseFaultPercentageLine", { percentage: matchedCriteria.baseFaultPercentage });
        }

        if (analysis.step2?.recommendedModifications?.length > 0) {
          responseText += t("chatWindow.step2ModificationsApplied");
        }

        if (analysis.step3?.extractedVehicles?.length > 0) {
          responseText += t("chatWindow.step3VehicleInfoExtracted");
        }

        responseText += t("chatWindow.reviewStepsPrompt");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === analyzingMessage.id
              ? { ...msg, content: responseText }
              : msg
          )
        );
      } else {
        throw new Error(t("chatWindow.analysisFailed"));
      }
    } catch (error: any) {
      console.error("Case selection analysis error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === analyzingMessage.id
            ? { ...msg, content: t("chatWindow.errorOccurred", { message: error.message }) }
            : msg
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends the message; Shift+Enter inserts a new line.
    // Skip while an IME composition is in progress (e.g. converting kanji),
    // so pressing Enter to confirm a candidate doesn't send the message early.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
    // Shift+Enter falls through to the textarea's default behavior (new line).
  };

  // Auto-resize the composer as the user types, up to a max height (then it scrolls).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Keep focus in the composer: when the panel opens, and again after a
  // response finishes loading, so the user can keep typing without reaching
  // for the mouse.
  useEffect(() => {
    if (!isCollapsed && !isLoading) {
      textareaRef.current?.focus();
    }
  }, [isCollapsed, isLoading]);

  useEffect(() => {
    if (!isCollapsed) {
      // Use setTimeout to ensure DOM is ready
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isCollapsed]);

  const handleTranscription = (text: string, audioData?: { name: string; url: string; type: string }) => {
    setInput((prev) => (prev ? prev + "\n" + text : text));
    if (audioData) {
      setSelectedAudio(audioData);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image to reduce API payload and prevent Vercel timeouts
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 800px width while maintaining aspect ratio
          const maxWidth = 800;
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Compress to JPEG with 0.8 quality (reduces size by 70-90%)
            const compressedImage = canvas.toDataURL('image/jpeg', 0.8);
            setSelectedImage(compressedImage);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isAccidentDescription = (text: string): boolean => {
    // Detect if the message looks like an accident description
    const accidentKeywords = ["事故", "衝突", "接触", "横断", "信号", "交差点", "歩行者", "車両", "駐車場", "高速"];
    const hasKeyword = accidentKeywords.some(keyword => text.includes(keyword));
    const isLongEnough = text.length > 10; // At least 10 characters (reduced from 30)
    return hasKeyword && isLongEnough;
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      image: selectedImage || undefined,
      audio: selectedAudio || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;

    setInput("");
    setSelectedImage(null);
    setSelectedAudio(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setIsLoading(true);

    // Captured once so the "analyzing" placeholder text set below and the later
    // content-matching checks stay in sync regardless of the active locale.
    const imageAnalyzingText = t("chatWindow.analyzingImage");
    const accidentAnalyzingText = t("chatWindow.analyzingText");

    // すでに詳細質問フロー中であれば、AI解析ではなく Q&A の続きを行う
    if (isCollectingDetails) {
      const currentQuestion = detailQuestions[currentQuestionIndex];
      const updatedDetails: Partial<Record<DetailKey, string>> = {
        ...collectedDetails,
        [currentQuestion.id]: currentInput,
      };
      setCollectedDetails(updatedDetails);

      const nextIndex = currentQuestionIndex + 1;

      if (nextIndex < detailQuestions.length) {
        // 次の質問へ
        setCurrentQuestionIndex(nextIndex);
        const nextQuestion = detailQuestions[nextIndex].text;
        const assistantMessage: ChatMessage = {
          id: `question-${Date.now()}`,
          role: "assistant",
          content: nextQuestion,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      } else {
        // 全ての質問が終わったので、集めた情報で改めてAI解析を行う
        setIsCollectingDetails(false);

        const pieces: string[] = [];
        if (initialAccidentText) {
          pieces.push(initialAccidentText.trim());
        }
        if (updatedDetails.location) {
          pieces.push(`${t("chatWindow.labels.location")}${updatedDetails.location.trim()}`);
        }
        if (updatedDetails.signal) {
          pieces.push(`${t("chatWindow.labels.signal")}${updatedDetails.signal.trim()}`);
        }
        if (updatedDetails.pedestrian) {
          pieces.push(`${t("chatWindow.labels.pedestrian")}${updatedDetails.pedestrian.trim()}`);
        }
        if (updatedDetails.vehicles) {
          pieces.push(`${t("chatWindow.labels.vehicles")}${updatedDetails.vehicles.trim()}`);
        }
        if (updatedDetails.extra) {
          pieces.push(`${t("chatWindow.labels.extra")}${updatedDetails.extra.trim()}`);
        }

        const enrichedDescription = pieces.join("\n");

        setIsAnalyzing(true);
        const reanalyzingText = t("chatWindow.reanalyzing");
        const analyzingMessage: ChatMessage = {
          id: `analyzing-${Date.now()}`,
          role: "assistant",
          content: reanalyzingText,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analyzingMessage]);

        try {
          const analysisResponse = await fetch("/api/ai-analyze-accident", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accidentDescription: enrichedDescription, locale }),
          });

          if (analysisResponse.ok) {
            const analysis = await analysisResponse.json();

            if (onAIAnalysis) {
              onAIAnalysis(analysis);
            }

            const hasCriteria =
              !!analysis.step1?.recommendedCriteriaId &&
              typeof analysis.step1.recommendedCriteriaId === "string";
            const hasModsSuggestion =
              Array.isArray(analysis.step2?.recommendedModifications) &&
              analysis.step2.recommendedModifications.length > 0;
            const hasVehicleSuggestion =
              Array.isArray(analysis.step3?.extractedVehicles) &&
              analysis.step3.extractedVehicles.length > 0;

            const matchedCriteria =
              hasCriteria &&
              sampleCriteria.find(
                (c) => c.id === analysis.step1.recommendedCriteriaId
              );

            let responseText = t("chatWindow.analysisComplete");
            if (analysis.summary) {
              responseText += t("chatWindow.summaryLine", { summary: analysis.summary });
            }

            if (matchedCriteria) {
              responseText += t("chatWindow.step1Recommended");
              responseText += t("chatWindow.step1RecommendedItem", {
                title: matchedCriteria.title,
                percentage: matchedCriteria.baseFaultPercentage,
              });
            } else if (hasCriteria) {
              responseText += t("chatWindow.step1CandidatesNeedMoreInfo");
            } else {
              responseText += t("chatWindow.step1NoMatch");
            }

            const step2Status = analysis.step2?.validation?.status;
            if (step2Status === "valid-empty") {
              responseText += t("chatWindow.step2NoModsNeeded");
            } else if (hasModsSuggestion && matchedCriteria) {
              const mfMap = new Map(
                (matchedCriteria.modificationFactors || []).map((m: any) => [
                  m.id,
                  m,
                ])
              );
              const described = analysis.step2.recommendedModifications
                .map((id: string) => mfMap.get(id)?.description || id)
                .filter(Boolean);

              responseText += t("chatWindow.step2Candidates");
              described.forEach((d: string) => {
                responseText += `- ${d}\n`;
              });
              if (analysis.step2.validation?.reason) {
                responseText += t("chatWindow.step2Reason", { reason: analysis.step2.validation.reason });
              }
            } else if (analysis.step2?.validation) {
              responseText += t("chatWindow.step2StatusLine", {
                icon: analysis.step2.validation.status === "complete" ? "✅" : "⚠️",
                reason: analysis.step2.validation.reason,
              });
            }

            if (analysis.step3?.validation) {
              responseText += t("chatWindow.step3StatusLine", {
                icon: analysis.step3.validation.color === "green" ? "✅" : "⚠️",
                reason: analysis.step3.validation.reason,
              });
            }

            responseText += t("chatWindow.reviewAutoFilledSteps");

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === analyzingMessage.id
                  ? { ...msg, content: responseText }
                  : msg
              )
            );
          } else {
            throw new Error(t("chatWindow.analysisFailed"));
          }
        } catch (error: any) {
          console.error("AI analysis error (detail flow):", error);
          setMessages((prev) =>
            prev.filter((msg) => !msg.content.includes(reanalyzingText))
          );
        } finally {
          setIsAnalyzing(false);
          setIsLoading(false);
        }

        return;
      }
    }

    // Check if this looks like an accident description
    // If image is present, we definitely want to analyze
    const shouldAnalyze = isAccidentDescription(currentInput) || !!currentImage;

    if (shouldAnalyze && onAIAnalysis) {
      setIsAnalyzing(true);

      // Add analyzing message
      const analyzingMessage: ChatMessage = {
        id: `analyzing-${Date.now()}`,
        role: "assistant",
        content: currentImage ? imageAnalyzingText : accidentAnalyzingText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, analyzingMessage]);

      try {
        // If image is present, we use the chat API with vision instead of the specialized accident analysis API for now
        if (currentImage) {
           // Skip the specific ai-analyze-accident API for images, let the general chat API handle it
           // Keep the analyzing message visible and proceed to chat API call below
           // The analyzing message will be replaced by the actual response when it arrives
        } else {
          // Text-only analysis (existing logic)
          // Call AI analysis API
          const analysisResponse = await fetch("/api/ai-analyze-accident", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accidentDescription: currentInput, locale }),
          });

          if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();

          // Pass analysis to parent component
          if (onAIAnalysis) {
            onAIAnalysis(analysis);
          }

          const hasCriteria =
            !!analysis.step1?.recommendedCriteriaId &&
            typeof analysis.step1.recommendedCriteriaId === "string";
          const hasModsSuggestion =
            Array.isArray(analysis.step2?.recommendedModifications) &&
            analysis.step2.recommendedModifications.length > 0;
          const hasVehicleSuggestion =
            Array.isArray(analysis.step3?.extractedVehicles) &&
            analysis.step3.extractedVehicles.length > 0;

          const tooSimple =
            !hasCriteria && !hasModsSuggestion && !hasVehicleSuggestion;

          // Try to resolve the selected criteria for nicer messages
          const matchedCriteria =
            hasCriteria &&
            sampleCriteria.find(
              (c) => c.id === analysis.step1.recommendedCriteriaId
            );

          // 情報不足の場合は、ステップ入力ではなくチャットで一問ずつ確認するモードに入る
          if (tooSimple) {
            setIsCollectingDetails(true);
            setCurrentQuestionIndex(0);
            setCollectedDetails({});
            setInitialAccidentText(currentInput);

            const firstQuestion = detailQuestions[0].text;
            const responseText = t("chatWindow.insufficientInfoIntro") + firstQuestion;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === analyzingMessage.id
                  ? { ...msg, content: responseText }
                  : msg
              )
            );
          } else {
            let responseText = t("chatWindow.analysisComplete");
            if (analysis.summary) {
              responseText += t("chatWindow.summaryLine", { summary: analysis.summary });
            }

            // Step 1 – criteria suggestion
            if (matchedCriteria) {
              responseText += t("chatWindow.step1Recommended");
              responseText += t("chatWindow.step1RecommendedItem", {
                title: matchedCriteria.title,
                percentage: matchedCriteria.baseFaultPercentage,
              });
            } else if (hasCriteria) {
              responseText += t("chatWindow.step1CandidatesNeedMoreInfo");
            } else {
              responseText += t("chatWindow.step1NoMatch");
            }

            // Step 2 – modification factors
            const step2Status = analysis.step2?.validation?.status;
            if (step2Status === "valid-empty") {
              responseText += t("chatWindow.step2NoModsNeeded");
            } else if (hasModsSuggestion && matchedCriteria) {
              const mfMap = new Map(
                (matchedCriteria.modificationFactors || []).map((m: any) => [
                  m.id,
                  m,
                ])
              );
              const described = analysis.step2.recommendedModifications
                .map((id: string) => mfMap.get(id)?.description || id)
                .filter(Boolean);

              responseText += t("chatWindow.step2Candidates");
              described.forEach((d: string) => {
                responseText += `- ${d}\n`;
              });
              if (analysis.step2.validation?.reason) {
                responseText += t("chatWindow.step2Reason", { reason: analysis.step2.validation.reason });
              }
            } else if (analysis.step2?.validation) {
              responseText += t("chatWindow.step2StatusLine", {
                icon: analysis.step2.validation.status === "complete" ? "✅" : "⚠️",
                reason: analysis.step2.validation.reason,
              });
            }

            // Step 3 – vehicles
            if (analysis.step3?.validation) {
              responseText += t("chatWindow.step3StatusLine", {
                icon: analysis.step3.validation.color === "green" ? "✅" : "⚠️",
                reason: analysis.step3.validation.reason,
              });
            }

            responseText += t("chatWindow.reviewAutoFilledSteps");

            // Replace analyzing message with result
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === analyzingMessage.id
                  ? { ...msg, content: responseText }
                  : msg
              )
            );
          }
        } else {
          throw new Error(t("chatWindow.analysisFailed"));
        }
      }
    } catch (error: any) {
      console.error("AI analysis error:", error);

      // Fall back to regular chat
      setMessages((prev) => prev.filter(msg => msg.id !== analyzingMessage.id));
    } finally {
      // For images, we keep isAnalyzing true so the Chat API block below can handle the state and replace the analyzing message
      if (!currentImage) {
        setIsAnalyzing(false);
      }
    }
  }

    // Always get chat response（ただし詳細質問フロー中、または自動分析済みの場合はスキップ）
    // If we already analyzed with shouldAnalyze, skip the chat API call to avoid duplicate responses
    // EXCEPTION: If it's an image query, we MUST call /api/chat because /api/ai-analyze-accident doesn't handle images
    if (!isCollectingDetails && (!shouldAnalyze || !!currentImage)) {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((msg) => ({
              role: msg.role,
              content: msg.content,
              image: msg.image,
            })),
            step,
            locale,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          // Check if response contains case recommendations
          // BUT don't show recommendations if we already did auto-analysis
          if (data.type === "case_recommendation" && data.recommendations && !shouldAnalyze) {
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
              recommendations: data.recommendations, // Store recommendations in message
            };
            setMessages((prev) => [...prev, assistantMessage]);
          } else if (!shouldAnalyze || currentImage) {
            // Regular chat response (if we didn't analyze OR if it's an image-based query)
            if (currentImage && isAnalyzing) {
              // Replace the analyzing message with the actual response for image queries
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.content.includes(imageAnalyzingText)
                    ? { ...msg, content: data.message }
                    : msg
                )
              );
              setIsAnalyzing(false);
            } else {
              const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, assistantMessage]);
            }

            // Check if AI has finished reasoning and provided a complete accident description (works for both image and text conversations)
            if (data.message.includes("[ANALYSIS_COMPLETE]") && data.message.includes("[ANALYSIS_END]")) {
                // Extract the accident description
                const match = data.message.match(/\[ANALYSIS_COMPLETE\]\s*([\s\S]*?)\s*\[ANALYSIS_END\]/);
                if (match && match[1]) {
                  const accidentDescription = match[1].trim();

                  // Trigger automatic analysis to fill in the steps
                  setTimeout(async () => {
                    // Declared outside the try block so the catch block below can also
                    // reference it (a `const` inside `try {}` isn't visible in `catch {}`).
                    const autoAnalyzingText = t("chatWindow.autoAnalyzing");
                    try {
                      setIsAnalyzing(true);

                      // Add analyzing message
                      const autoAnalyzingMsg: ChatMessage = {
                        id: `auto-analyzing-${Date.now()}`,
                        role: "assistant",
                        content: autoAnalyzingText,
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, autoAnalyzingMsg]);

                      const analysisResponse = await fetch("/api/ai-analyze-accident", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accidentDescription, locale }),
                      });

                      if (analysisResponse.ok) {
                        const analysis = await analysisResponse.json();

                        // Pass analysis to parent to fill in steps
                        if (onAIAnalysis) {
                          onAIAnalysis(analysis);
                        }

                        // Update the analyzing message with success
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === autoAnalyzingMsg.id
                              ? { ...msg, content: t("chatWindow.autoAnalysisComplete") }
                              : msg
                          )
                        );
                      } else {
                        throw new Error(t("chatWindow.analysisFailed"));
                      }
                    } catch (error: any) {
                      console.error("Auto-analysis error:", error);
                      setMessages((prev) =>
                        prev.filter((msg) => !msg.content.includes(autoAnalyzingText))
                      );
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }, 500);
                }
              }
          }
        }
      } catch (error: any) {
        if (!shouldAnalyze || currentImage) {
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: t("chatWindow.errorFallback", { message: error.message }),
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Collapsed button on the right */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed right-6 top-[140px] z-50 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 md:top-[120px]"
          title={t("chatWindow.openChat")}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium hidden sm:inline">{t("chatWindow.chatLabel")}</span>
        </button>
      )}

      {/* Sliding chat window */}
      {!isCollapsed && (
        <div
          data-testid="chat-window"
          className="h-full bg-white border-l border-gray-200 shadow-2xl w-[400px] flex-shrink-0"
        >
        <div className="flex flex-col h-full">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-4 border-b border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">{t("chatWindow.assistantChatTitle")}</h3>
                <p className="text-sm text-gray-600">{stepName}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                  }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                    }`}
                >
                  {/* Render image attachment if present */}
                  {message.image && (
                    <div className="mb-2">
                      <img
                        src={message.image}
                        alt="Uploaded"
                        className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(message.image, '_blank')}
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}

                  {/* Render audio attachment if present */}
                  {message.audio && (
                    <div className="mb-2 p-2 bg-white bg-opacity-20 rounded flex items-center gap-2">
                      <audio
                        controls
                        className="w-full"
                        style={{ height: '32px' }}
                      >
                        <source src={message.audio.url} type={message.audio.type} />
                        Your browser does not support the audio element.
                      </audio>
                      <span className="text-xs opacity-75 whitespace-nowrap">{message.audio.name}</span>
                    </div>
                  )}

                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Render case recommendations if present */}
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.recommendations.map((rec) => (
                        <button
                          key={rec.id}
                          onClick={() => handleCaseSelect(rec.id, rec.title)}
                          className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                                {rec.title}
                              </h4>
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {rec.description}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                  {t("chatWindow.baseFaultPercentageBadge", { percentage: rec.baseFaultPercentage })}
                                </span>
                                {rec.confidence > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    {t("chatWindow.confidenceBadge", { confidence: rec.confidence })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(isLoading || isAnalyzing) && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                  {isAnalyzing && <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />}
                  <p className="text-sm text-gray-600">
                    {isAnalyzing ? t("chatWindow.analyzingStatus") : t("chatWindow.thinkingStatus")}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-200">
            {selectedImage && (
              <div className="relative inline-block mb-2">
                <img src={selectedImage} alt="Selected" className="h-24 w-auto rounded-lg border border-gray-300 shadow-sm object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700 shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedAudio && (
              <div className="relative mb-2 p-3 bg-gray-50 rounded-lg border border-gray-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <audio controls className="flex-1" style={{ height: '32px' }}>
                    <source src={selectedAudio.url} type={selectedAudio.type} />
                  </audio>
                  <span className="text-xs text-gray-600">{selectedAudio.name}</span>
                </div>
                <button
                  onClick={() => setSelectedAudio(null)}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700 shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div
              className={`rounded-2xl border bg-white transition-colors ${
                isLoading
                  ? "border-gray-200"
                  : "border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chatWindow.inputPlaceholder")}
                className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed"
                style={{ minHeight: "24px", maxHeight: "200px" }}
                disabled={isLoading}
                rows={1}
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-0.5">
                  <VoiceUpload onTranscriptionComplete={handleTranscription} disabled={isLoading} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors ${selectedImage ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-100' : ''}`}
                    title={t("chatWindow.uploadImage")}
                    disabled={isLoading}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  title={t("chatWindow.sendButton")}
                  aria-label={t("chatWindow.sendButton")}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 px-1">
              <span className="font-medium text-gray-500">{t("chatWindow.enterToSend")}</span>
              {" · "}
              <span className="font-medium text-gray-500">{t("chatWindow.shiftEnterNewline")}</span>
            </p>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
