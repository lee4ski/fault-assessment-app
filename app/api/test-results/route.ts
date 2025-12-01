import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const resultsPath = path.join(process.cwd(), "tests", "mcp-comprehensive-results.json");
    
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: "テスト結果が見つかりません" },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(resultsPath, "utf-8");
    const testResults = JSON.parse(fileContent);

    return NextResponse.json(testResults);
  } catch (error: any) {
    console.error("Error reading test results:", error);
    return NextResponse.json(
      { error: "テスト結果の読み込みに失敗しました" },
      { status: 500 }
    );
  }
}

