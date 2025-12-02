
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "音声ファイルがアップロードされていません。" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY && !process.env.OPEN_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Buffer to file for OpenAI API (it expects a file object or path)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a temporary file path
    const tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);

    // Transcribe using Whisper
    // Note: We are using the file path directly as OpenAI Node SDK supports fs.createReadStream logic internally
    // but we need to pass a file-like object.
    const transcription = await openai.audio.transcriptions.create({
      file: await import("fs").then((fs) => fs.createReadStream(tempFilePath)),
      model: "whisper-1",
      language: "ja", // Force Japanese for better accuracy
    });

    // Clean up temp file (optional, but good practice)
    // await unlink(tempFilePath); 

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error.message || "音声認識中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}

