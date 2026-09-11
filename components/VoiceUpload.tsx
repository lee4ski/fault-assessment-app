
"use client";

import { useState, useRef } from "react";
import { useLocale } from "@/components/LocaleProvider";

interface VoiceUploadProps {
  onTranscriptionComplete: (text: string, audioData?: { name: string; url: string; type: string }) => void;
  disabled?: boolean;
}

export default function VoiceUpload({ onTranscriptionComplete, disabled = false }: VoiceUploadProps) {
  const { t, locale } = useLocale();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (audio/video)
    if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
      alert(t("voiceUpload.invalidFileType"));
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("locale", locale);

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      if (data.text) {
        // Create a blob URL for the audio file
        const audioUrl = URL.createObjectURL(file);
        const audioData = {
          name: file.name,
          url: audioUrl,
          type: file.type
        };
        onTranscriptionComplete(data.text, audioData);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(t("voiceUpload.transcriptionFailed"));
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative inline-block">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*,video/*"
        className="hidden"
        disabled={disabled || isUploading}
      />
      <button
        type="button"
        onClick={triggerUpload}
        disabled={disabled || isUploading}
        className={`p-2 rounded-full transition-colors flex items-center justify-center ${
          isUploading
            ? "text-gray-400 cursor-wait"
            : "text-gray-500 hover:bg-gray-100"
        }`}
        title={isUploading ? t("voiceUpload.converting") : t("voiceUpload.buttonTitle")}
        aria-label={isUploading ? t("voiceUpload.converting") : t("voiceUpload.buttonTitle")}
      >
        {isUploading ? (
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          // Microphone icon indicating voice-to-text
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" x2="12" y1="19" y2="22"/>
          </svg>
        )}
      </button>
    </div>
  );
}

