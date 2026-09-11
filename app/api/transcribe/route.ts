
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || "missing-openai-api-key",
  // A real empty string makes the SDK throw at module load (during `next build`
  // page-data collection, or if OPENAI_API_KEY is unset/misconfigured at runtime),
  // crashing the whole build/route instead of the graceful "not configured" JSON
  // error each handler below already returns. This placeholder just avoids that;
  // the actual env var (not this client) is what every handler checks.
});

type TranscribeLocale = "ja" | "en";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawLocale = formData.get("locale");
    const locale: TranscribeLocale = rawLocale === "en" ? "en" : "ja";

    if (!file) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "No audio file was uploaded."
              : "音声ファイルがアップロードされていません。",
        },
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
      language: locale, // "ja" or "en", based on the current UI language
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
