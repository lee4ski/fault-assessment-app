"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/workflow";
import { sampleCriteria } from "@/data/sampleCriteria";
import { MessageSquare, Sparkles, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import VoiceUpload from "./VoiceUpload";

type DetailKey = "location" | "signal" | "pedestrian" | "vehicles" | "extra";

const detailQuestions: { id: DetailKey; text: string }[] = [
  {
    id: "location",
    text: "Q1: 事故の場所を教えてください。（例：信号付き交差点、市街地の駐車場、高速道路本線 など）",
  },
  {
    id: "signal",
    text: "Q2: 信号の状況を教えてください。（歩行者と車両それぞれの信号の色と、信号が変わったかどうか）",
  },
  {
    id: "pedestrian",
    text: "Q3: 歩行者や運転者に、幼児・高齢者・身体障害者・飲酒など、過失割合に影響しそうな属性はありますか？",
  },
  {
    id: "vehicles",
    text: "Q4: 関係する車両の台数と種類、わかっている範囲の情報（メーカー・車種・年式など）を教えてください。",
  },
  {
    id: "extra",
    text: "Q5: その他、過失割合に影響しそうな事情（速度超過、見通し不良、夜間など）があれば教えてください。",
  },
];

interface ChatWindowProps {
  step: number;
  stepName: string;
  onAIAnalysis?: (analysis: any) => void;
  externalMessage?: string | null;
  onNavigateToStep1?: () => void;
}

export default function ChatWindow({
  step,
  stepName,
  onAIAnalysis,
  externalMessage,
  onNavigateToStep1,
}: ChatWindowProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `こんにちは！${stepName}ステップのアシスタントです。何かお手伝いできることはありますか？\n\n💡 **ヒント**: 事故の詳細を記述すると、AIが自動的にステップを埋めます！`,
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
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Dynamic textarea height adjustment (like Slack)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height based on scrollHeight
      const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  // Ensure context menu works on textarea (works on both desktop and mobile)
  // Note: Textareas should allow context menu by default, but we ensure it's not blocked
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Remove any existing handlers that might block context menu
      // Then add our handler that explicitly allows it
      const handleContextMenu = (e: MouseEvent) => {
        // CRITICAL: Do NOT prevent default - we want native menu!
        // Only stop propagation to prevent parent handlers from interfering
        e.stopPropagation();
        
        // Ensure textarea allows text operations
        textarea.style.userSelect = 'text';
        textarea.style.webkitUserSelect = 'text';
      };
      
      // Use capture phase to handle BEFORE any parent handlers
      // This ensures our handler runs first
      textarea.addEventListener('contextmenu', handleContextMenu, { capture: true, passive: false });
      
      // Also ensure keyboard shortcuts work (Ctrl+C, Ctrl+V, etc.)
      const handleKeyDown = (e: KeyboardEvent) => {
        // Allow all standard text editing shortcuts
        if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a'].includes(e.key.toLowerCase())) {
          // Don't prevent default - allow native behavior
          e.stopPropagation();
        }
      };
      
      textarea.addEventListener('keydown', handleKeyDown, { capture: true });
      
      return () => {
        textarea.removeEventListener('contextmenu', handleContextMenu, { capture: true } as EventListenerOptions);
        textarea.removeEventListener('keydown', handleKeyDown, { capture: true } as EventListenerOptions);
      };
    }
  }, []);

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

  const handleJumpToStep1 = () => {
    // Re-apply the last analysis to ensure steps are filled
    if (lastAnalysis && onAIAnalysis) {
      onAIAnalysis(lastAnalysis);
    }
    // Navigate to step 1
    if (onNavigateToStep1) {
      onNavigateToStep1();
    }
    // Collapse chat on mobile after navigation
    setIsCollapsed(true);
  };

  const handleYesButton = async (messageContent: string, messageId: string) => {
    // Extract the accident description from the conversation history
    // The confirmation message should contain bullet points with accident details
    const lines = messageContent.split('\n');
    let accidentDescription = '';
    
    // First, try to extract bullet points from the current message
    const bulletPoints = lines
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('-') && 
               !trimmed.includes('✅') && 
               !trimmed.includes('❌') &&
               !trimmed.includes('この内容で') &&
               !trimmed.includes('以下の理解で');
      })
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0);
    
    if (bulletPoints.length > 0) {
      accidentDescription = bulletPoints.join('\n');
    } else {
      // Fallback: build from conversation history
      // Get all user messages (excluding the confirmation message we just added)
      const userMessages = messages
        .filter(msg => msg.role === 'user' && msg.id !== `yes-${Date.now()}`)
        .map(msg => msg.content)
        .filter(content => content.trim().length > 10 && !content.includes('はい、分析を開始'));
      
      // Also get assistant messages that might contain accident details
      const assistantMessages = messages
        .filter(msg => msg.role === 'assistant' && msg.id !== messageId)
        .map(msg => msg.content)
        .filter(content => {
          // Exclude confirmation questions and analysis completion messages
          return !content.includes('この内容で過失割合の分析を開始') &&
                 !content.includes('AI分析が完了') &&
                 !content.includes('✅ はい、分析を開始') &&
                 !content.includes('❌ いいえ、修正や追加情報があります');
        });
      
      // Combine user and relevant assistant messages
      const conversationHistory = [...userMessages, ...assistantMessages].join('\n');
      
      if (conversationHistory.trim().length > 20) {
        accidentDescription = conversationHistory;
      } else {
        // Last resort: use the message content minus the question part
        accidentDescription = messageContent
          .replace(/✅.*/g, '')
          .replace(/❌.*/g, '')
          .replace(/この内容で.*/g, '')
          .replace(/以下の理解で.*/g, '')
          .replace(/この内容で過失割合の分析を開始.*/g, '')
          .trim();
      }
    }
    
    // Add user confirmation message
    const userMessage: ChatMessage = {
      id: `yes-${Date.now()}`,
      role: "user",
      content: "はい、分析を開始",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Trigger analysis
    try {
      setIsAnalyzing(true);
      
      const analyzingMessage: ChatMessage = {
        id: `analyzing-${Date.now()}`,
        role: "assistant",
        content: "✨ 収集した情報を基に事故を分析し、ステップを自動入力しています...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, analyzingMessage]);
      
      const analysisResponse = await fetch("/api/ai-analyze-accident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accidentDescription }),
      });
      
      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        setLastAnalysis(analysis);
        
        if (onAIAnalysis) {
          onAIAnalysis(analysis);
        }
        
        // Replace analyzing message with completion message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === analyzingMessage.id
              ? {
                  ...msg,
                  content: "✅ **AI分析が完了しました！**\n\n左側のステップを確認してください。ステップ1に移動して結果を確認できます。",
                }
              : msg
          )
        );
        
        // Navigate to step 1
        if (onNavigateToStep1) {
          setTimeout(() => {
            onNavigateToStep1();
          }, 500);
        }
      } else {
        throw new Error("分析に失敗しました");
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === analyzingMessage.id
            ? { ...msg, content: "❌ 分析中にエラーが発生しました。もう一度お試しください。" }
            : msg
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNoButton = async () => {
    // Add user response
    const userMessage: ChatMessage = {
      id: `no-${Date.now()}`,
      role: "user",
      content: "いいえ、修正や追加情報があります",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to chat API to ask more questions
    try {
      setIsLoading(true);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
            image: msg.image,
          })),
          step,
        }),
      });
      
      const data = await response.json();
      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render message content with interactive buttons
  const renderMessageContent = (content: string, messageId: string) => {
    // Check if message contains the confirmation question
    const hasConfirmationQuestion = content.includes('この内容で過失割合の分析を開始') || 
                                    content.includes('✅ はい、分析を開始') ||
                                    content.includes('❌ いいえ、修正や追加情報があります');
    
    if (!hasConfirmationQuestion) {
      return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }
    
    // Split content into parts before and after the buttons
    const parts = content.split(/(✅.*|❌.*)/);
    const beforeButtons = parts[0];
    const buttonSection = parts.slice(1).join('\n');
    
    return (
      <div>
        <p className="text-sm whitespace-pre-wrap mb-3">{beforeButtons}</p>
        <div className="flex flex-col gap-2 mt-3">
          <button
            onClick={() => handleYesButton(content, messageId)}
            disabled={isAnalyzing || isLoading}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 active:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            はい、分析を開始
          </button>
          <button
            onClick={handleNoButton}
            disabled={isAnalyzing || isLoading}
            className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:bg-red-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 touch-manipulation text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            いいえ、修正や追加情報があります
          </button>
        </div>
      </div>
    );
  };

  const handleCaseSelect = async (caseId: string, caseTitle: string) => {
    // Add user selection message
    const selectionMessage: ChatMessage = {
      id: `select-${Date.now()}`,
      role: "user",
      content: `「${caseTitle}」を選択しました`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, selectionMessage]);

    // Trigger AI analysis with full chat history
    setIsAnalyzing(true);
    const analyzingMessage: ChatMessage = {
      id: `analyzing-${Date.now()}`,
      role: "assistant",
      content: "✨ 選択された認定基準に基づいて分析しています...",
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
          preferredCriteriaId: caseId // Hint to AI
        }),
      });

      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();

        if (onAIAnalysis) {
          onAIAnalysis(analysis);
          setLastAnalysis(analysis);
        }

        const matchedCriteria = sampleCriteria.find(c => c.id === caseId);
        let responseText = "✅ **認定基準が選択され、ステップが自動入力されました！**\n\n";
        
        if (matchedCriteria) {
          responseText += `📍 **ステップ1（認定基準）**: ${matchedCriteria.title}\n`;
          responseText += `- 基本過失割合: ${matchedCriteria.baseFaultPercentage}%\n\n`;
        }

        if (analysis.step2?.recommendedModifications?.length > 0) {
          responseText += "✅ **ステップ2（修正要素）**: 修正要素が適用されました\n\n";
        }

        if (analysis.step3?.extractedVehicles?.length > 0) {
          responseText += "✅ **ステップ3（車両情報）**: 車両情報が抽出されました\n\n";
        }

        responseText += "左側のステップで内容を確認し、必要に応じて修正してください。";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === analyzingMessage.id
              ? { ...msg, content: responseText }
              : msg
          )
        );
      } else {
        throw new Error("分析に失敗しました");
      }
    } catch (error: any) {
      console.error("Case selection analysis error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === analyzingMessage.id
            ? { ...msg, content: `❌ エラーが発生しました: ${error.message}` }
            : msg
        )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter sends the message
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Enter adds a new line (default behavior)
  };

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
    
    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
    
    setIsLoading(true);

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
          pieces.push(`【場所】${updatedDetails.location.trim()}`);
        }
        if (updatedDetails.signal) {
          pieces.push(`【信号】${updatedDetails.signal.trim()}`);
        }
        if (updatedDetails.pedestrian) {
          pieces.push(`【歩行者・運転者属性】${updatedDetails.pedestrian.trim()}`);
        }
        if (updatedDetails.vehicles) {
          pieces.push(`【車両情報】${updatedDetails.vehicles.trim()}`);
        }
        if (updatedDetails.extra) {
          pieces.push(`【その他事情】${updatedDetails.extra.trim()}`);
        }

        const enrichedDescription = pieces.join("\n");

        setIsAnalyzing(true);
        const analyzingMessage: ChatMessage = {
          id: `analyzing-${Date.now()}`,
          role: "assistant",
          content: "✨ いただいた追加情報を含めて再分析しています...",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analyzingMessage]);

        try {
          const analysisResponse = await fetch("/api/ai-analyze-accident", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accidentDescription: enrichedDescription }),
          });

          if (analysisResponse.ok) {
            const analysis = await analysisResponse.json();

            if (onAIAnalysis) {
              onAIAnalysis(analysis);
              setLastAnalysis(analysis);
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

            let responseText = "✅ **AI分析が完了しました！**\n\n";
            if (analysis.summary) {
              responseText += `**概要**: ${analysis.summary}\n\n`;
            }

            if (matchedCriteria) {
              responseText +=
                "📍 **ステップ1（認定基準）**: 次の基準が最も適切と考えられます：\n";
              responseText += `- ${matchedCriteria.title} （基本過失割合: ${matchedCriteria.baseFaultPercentage}%）\n`;
            } else if (hasCriteria) {
              responseText +=
                "📍 **ステップ1（認定基準）**: ある程度候補はありますが、特定には追加情報が必要です。\n";
            } else {
              responseText +=
                "⚠️ **ステップ1（認定基準）**: 該当する認定基準が見つかりません。\n" +
                "💡 **提案**: このケースはデータベースに登録されていない可能性があります。新規に認定基準を作成（カスタム入力）することをお勧めします。\n";
            }

            const step2Status = analysis.step2?.validation?.status;
            if (step2Status === "valid-empty") {
              responseText +=
                "\n✅ **ステップ2（修正要素）**: このケースでは、追加の修正要素は適用不要と判断されました。\n";
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

              responseText +=
                "\n✅ **ステップ2（修正要素）**: 次の修正要素を適用する候補があります：\n";
              described.forEach((d: string) => {
                responseText += `- ${d}\n`;
              });
              if (analysis.step2.validation?.reason) {
                responseText += `理由: ${analysis.step2.validation.reason}\n`;
              }
            } else if (analysis.step2?.validation) {
              responseText += `\n${
                analysis.step2.validation.status === "complete" ? "✅" : "⚠️"
              } **ステップ2（修正要素）**: ${
                analysis.step2.validation.reason
              }\n`;
            }

            if (analysis.step3?.validation) {
              responseText += `\n${
                analysis.step3.validation.color === "green" ? "✅" : "⚠️"
              } **ステップ3（車両情報）**: ${
                analysis.step3.validation.reason
              }\n`;
            }

            responseText +=
              "\n左側のステップを自動入力した内容を確認し、必要に応じて手動で修正してください。";

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === analyzingMessage.id
                  ? { ...msg, content: responseText }
                  : msg
              )
            );
          } else {
            throw new Error("分析に失敗しました");
          }
        } catch (error: any) {
          console.error("AI analysis error (detail flow):", error);
          setMessages((prev) =>
            prev.filter((msg) => !msg.content.includes("再分析しています"))
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
        content: currentImage ? "🖼️ 画像を分析して状況を推論しています..." : "✨ 事故情報を分析しています...",
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
            body: JSON.stringify({ accidentDescription: currentInput }),
          });
          
          if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();

          // Pass analysis to parent component
          if (onAIAnalysis) {
            onAIAnalysis(analysis);
            setLastAnalysis(analysis);
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
            const responseText =
              "⚠️ **現在の説明だけでは、具体的な認定基準や修正要素を特定するには情報が足りません。**\n\n" +
              "いくつか質問をさせてください。順番にお答えいただくと、AI が自動的にステップを埋めます。\n\n" +
              firstQuestion;

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === analyzingMessage.id
                  ? { ...msg, content: responseText }
                  : msg
              )
            );
          } else {
            let responseText = "✅ **AI分析が完了しました！**\n\n";
            if (analysis.summary) {
              responseText += `**概要**: ${analysis.summary}\n\n`;
            }

            // Step 1 – criteria suggestion
            if (matchedCriteria) {
              responseText +=
                "📍 **ステップ1（認定基準）**: 次の基準が最も適切と考えられます：\n";
              responseText += `- ${matchedCriteria.title} （基本過失割合: ${matchedCriteria.baseFaultPercentage}%）\n`;
            } else if (hasCriteria) {
              responseText +=
                "📍 **ステップ1（認定基準）**: ある程度候補はありますが、特定には追加情報が必要です。\n";
            } else {
              responseText +=
                "⚠️ **ステップ1（認定基準）**: 該当する認定基準が見つかりません。\n" +
                "💡 **提案**: このケースはデータベースに登録されていない可能性があります。新規に認定基準を作成（カスタム入力）することをお勧めします。\n";
            }

            // Step 2 – modification factors
            const step2Status = analysis.step2?.validation?.status;
            if (step2Status === "valid-empty") {
              responseText +=
                "\n✅ **ステップ2（修正要素）**: このケースでは、追加の修正要素は適用不要と判断されました。\n";
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

              responseText +=
                "\n✅ **ステップ2（修正要素）**: 次の修正要素を適用する候補があります：\n";
              described.forEach((d: string) => {
                responseText += `- ${d}\n`;
              });
              if (analysis.step2.validation?.reason) {
                responseText += `理由: ${analysis.step2.validation.reason}\n`;
              }
            } else if (analysis.step2?.validation) {
              responseText += `\n${
                analysis.step2.validation.status === "complete" ? "✅" : "⚠️"
              } **ステップ2（修正要素）**: ${
                analysis.step2.validation.reason
              }\n`;
            }

            // Step 3 – vehicles
            if (analysis.step3?.validation) {
              responseText += `\n${
                analysis.step3.validation.color === "green" ? "✅" : "⚠️"
              } **ステップ3（車両情報）**: ${
                analysis.step3.validation.reason
              }\n`;
            }

            responseText +=
              "\n左側のステップを自動入力した内容を確認し、必要に応じて手動で修正してください。";

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
          throw new Error("分析に失敗しました");
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
                  msg.content.includes("🖼️ 画像を分析して状況を推論しています")
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
            if (data.message.includes("【事故分析完了】") && data.message.includes("【分析終了】")) {
                // Extract the accident description
                const match = data.message.match(/【事故分析完了】\s*([\s\S]*?)\s*【分析終了】/);
                if (match && match[1]) {
                  const accidentDescription = match[1].trim();
                  
                  // Trigger automatic analysis to fill in the steps
                  setTimeout(async () => {
                    try {
                      setIsAnalyzing(true);
                      
                      // Add analyzing message
                      const autoAnalyzingMsg: ChatMessage = {
                        id: `auto-analyzing-${Date.now()}`,
                        role: "assistant",
                        content: "✨ 収集した情報を基に事故を分析し、ステップを自動入力しています...",
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, autoAnalyzingMsg]);
                      
                      const analysisResponse = await fetch("/api/ai-analyze-accident", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ accidentDescription }),
                      });
                      
                      if (analysisResponse.ok) {
                        const analysis = await analysisResponse.json();
                        
                        // Pass analysis to parent to fill in steps
                        if (onAIAnalysis) {
                          onAIAnalysis(analysis);
                          setLastAnalysis(analysis);
                        }
                        
                        // Update the analyzing message with success
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === autoAnalyzingMsg.id
                              ? { ...msg, content: "✅ 分析完了！左側のステップが自動入力されました。内容を確認してください。" }
                              : msg
                          )
                        );
                      } else {
                        throw new Error("分析に失敗しました");
                      }
                    } catch (error: any) {
                      console.error("Auto-analysis error:", error);
                      setMessages((prev) =>
                        prev.filter((msg) => !msg.content.includes("収集した情報を基に"))
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
            content: `申し訳ございません。エラーが発生しました: ${error.message}`,
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
      {/* Mobile-responsive floating button */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed right-4 bottom-4 md:right-6 md:top-[120px] md:bottom-auto z-50 px-4 py-3 md:px-4 md:py-3 bg-blue-600 text-white rounded-full md:rounded-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-all flex items-center justify-center gap-2 touch-manipulation min-w-[56px] min-h-[56px] md:min-w-0 md:min-h-0"
          title="チャットを開く"
        >
          <MessageSquare className="w-6 h-6 md:w-5 md:h-5" />
          <span className="font-medium hidden md:inline">チャット</span>
        </button>
      )}

      {/* Mobile-responsive chat window - full screen on mobile, sidebar on desktop */}
      {!isCollapsed && (
        <div
          data-testid="chat-window"
          className="fixed inset-0 md:relative md:h-full bg-white border-l border-gray-200 shadow-2xl md:w-[400px] flex-shrink-0 z-50 md:z-auto"
        >
        <div className="flex flex-col h-full">
          {/* Mobile-friendly header with larger touch target */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-4 md:p-4 border-b border-gray-200 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors flex items-center justify-between touch-manipulation"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 md:w-5 md:h-5 text-blue-600" />
              <div className="text-left">
                <h3 className="font-semibold text-base md:text-base text-gray-900">アシスタントチャット</h3>
                <p className="text-sm text-gray-600">{stepName}</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 md:w-5 md:h-5 text-gray-600" />
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
                  
                  {renderMessageContent(message.content, message.id)}
                  
                  {/* Show "Jump to Step 1" button after AI analysis completion */}
                  {message.role === "assistant" && 
                   message.content.includes("AI分析が完了") && 
                   lastAnalysis && 
                   onNavigateToStep1 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <button
                        onClick={handleJumpToStep1}
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 touch-manipulation text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                          <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>
                        ステップ1に移動して結果を確認
                      </button>
                    </div>
                  )}
                  
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
                                  基本過失割合: {rec.baseFaultPercentage}%
                                </span>
                                {rec.confidence > 0 && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    一致度: {rec.confidence}%
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
                    {isAnalyzing ? "AI分析中..." : "考えています..."}
                  </p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile-optimized input area */}
          <div className="p-3 md:p-4 border-t border-gray-200 safe-area-bottom">
            {selectedImage && (
              <div className="relative inline-block mb-2">
                <img src={selectedImage} alt="Selected" className="h-32 md:h-24 w-auto rounded-lg border border-gray-300 shadow-sm object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1.5 md:p-1 hover:bg-gray-700 active:bg-gray-600 shadow-md touch-manipulation"
                >
                  <X className="w-4 h-4 md:w-3 md:h-3" />
                </button>
              </div>
            )}
            {selectedAudio && (
              <div className="relative mb-2 p-3 bg-gray-50 rounded-lg border border-gray-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <audio controls className="flex-1" style={{ height: '40px' }}>
                    <source src={selectedAudio.url} type={selectedAudio.type} />
                  </audio>
                  <span className="text-xs text-gray-600 hidden sm:inline">{selectedAudio.name}</span>
                </div>
                <button
                  onClick={() => setSelectedAudio(null)}
                  className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1.5 md:p-1 hover:bg-gray-700 active:bg-gray-600 shadow-md touch-manipulation"
                >
                  <X className="w-4 h-4 md:w-3 md:h-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2 items-end">
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
                className={`p-3 md:p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors touch-manipulation ${selectedImage ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-100' : ''}`}
                title="画像をアップロード"
                disabled={isLoading}
              >
                <ImageIcon className="w-6 h-6 md:w-5 md:h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize on input change
                  const textarea = e.target;
                  textarea.style.height = 'auto';
                  const newHeight = Math.min(Math.max(textarea.scrollHeight, 48), 200);
                  textarea.style.height = `${newHeight}px`;
                }}
                onKeyDown={handleKeyDown}
                onPaste={(e) => {
                  // Explicitly allow paste
                  e.stopPropagation();
                }}
                onCut={(e) => {
                  // Explicitly allow cut
                  e.stopPropagation();
                }}
                onCopy={(e) => {
                  // Explicitly allow copy
                  e.stopPropagation();
                }}
                placeholder="質問を入力... (Shift+Enter送信)"
                className="flex-1 px-4 py-3 md:py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto transition-all duration-150"
                style={{
                  minHeight: "48px",
                  maxHeight: "200px",
                  height: "48px",
                  userSelect: "text",
                  WebkitUserSelect: "text",
                  MozUserSelect: "text",
                  msUserSelect: "text",
                  touchAction: "manipulation" // Allow touch but don't block text operations
                }}
                disabled={isLoading}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="px-5 py-3 md:px-6 md:py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex-shrink-0 touch-manipulation"
              >
                送信
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1 hidden md:block">
              💡 <span className="font-medium">Shift+Enter</span>で送信、<span className="font-medium">Enter</span>で改行
            </p>
          </div>
        </div>
      </div>
      )}
    </>
  );
}

