import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export async function POST() {
  try {
    // Run the comprehensive test
    const testScript = path.join(process.cwd(), "tests", "mcp-comprehensive-test.js");
    
    if (!fs.existsSync(testScript)) {
      return NextResponse.json(
        { error: "テストスクリプトが見つかりません" },
        { status: 404 }
      );
    }

    // Check if server is running
    const { stdout, stderr } = await execAsync(`node ${testScript}`, {
      cwd: process.cwd(),
      timeout: 30000, // 30 seconds timeout
    });

    // Read the results file
    const resultsPath = path.join(process.cwd(), "tests", "mcp-comprehensive-results.json");
    
    if (!fs.existsSync(resultsPath)) {
      return NextResponse.json(
        { error: "テスト結果ファイルが生成されませんでした" },
        { status: 500 }
      );
    }

    const fileContent = fs.readFileSync(resultsPath, "utf-8");
    const testResults = JSON.parse(fileContent);

    return NextResponse.json(testResults);
  } catch (error: any) {
    console.error("Error running tests:", error);
    
    // Try to read existing results even if test failed
    try {
      const resultsPath = path.join(process.cwd(), "tests", "mcp-comprehensive-results.json");
      if (fs.existsSync(resultsPath)) {
        const fileContent = fs.readFileSync(resultsPath, "utf-8");
        const testResults = JSON.parse(fileContent);
        return NextResponse.json(testResults);
      }
    } catch (readError) {
      // Ignore read error
    }

    return NextResponse.json(
      { error: error.message || "テストの実行に失敗しました" },
      { status: 500 }
    );
  }
}

