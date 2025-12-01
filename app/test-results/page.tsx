"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TestResult {
  timestamp: string;
  serverAccessible: boolean;
  brokenLinks: {
    total: number;
    broken: number;
  };
  requiredElements: {
    allPresent: boolean;
    missing: string[];
  };
  visualIssues: {
    hasIssues: boolean;
    issues: string[];
  };
  errors: string[];
}

export default function TestResultsPage() {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const loadTestResults = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/test-results");
      if (response.ok) {
        const data = await response.json();
        setTestResult(data);
        setError(null);
      } else {
        setError("テスト結果が見つかりませんでした");
      }
    } catch (err) {
      setError("テスト結果の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const runTests = async () => {
    try {
      setRunning(true);
      setError(null);
      const response = await fetch("/api/run-tests", {
        method: "POST",
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "テストの実行に失敗しました");
      }
    } catch (err) {
      setError("テストの実行に失敗しました");
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    loadTestResults();
  }, []);

  if (loading && !testResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">テスト結果を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-semibold"
              >
                ← ホームに戻る
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">MCP テスト結果</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadTestResults}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                再読み込み
              </button>
              <button
                onClick={runTests}
                disabled={running}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {running ? "実行中..." : "テストを実行"}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {testResult ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">テストサマリー</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {testResult.serverAccessible ? "✅" : "❌"}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">サーバーアクセス</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {testResult.requiredElements.allPresent ? "✅" : "⚠️"}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">必須要素</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {testResult.brokenLinks.total}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">リンク数</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {testResult.visualIssues.hasIssues ? "⚠️" : "✅"}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">視覚的問題</div>
                  </div>
                </div>
                {testResult.timestamp && (
                  <div className="mt-4 text-sm text-gray-500">
                    最終更新: {new Date(testResult.timestamp).toLocaleString("ja-JP")}
                  </div>
                )}
              </div>

              {/* Server Accessibility */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {testResult.serverAccessible ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                  サーバーアクセシビリティ
                </h3>
                <p className="text-gray-600">
                  {testResult.serverAccessible
                    ? "サーバーは正常にアクセス可能です"
                    : "サーバーにアクセスできません"}
                </p>
              </div>

              {/* Required Elements */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {testResult.requiredElements.allPresent ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-yellow-600">⚠️</span>
                  )}
                  必須要素
                </h3>
                {testResult.requiredElements.allPresent ? (
                  <p className="text-green-700">すべての必須要素が存在します</p>
                ) : (
                  <div>
                    <p className="text-yellow-700 mb-2">以下の要素が見つかりませんでした:</p>
                    <ul className="list-disc list-inside text-gray-600">
                      {testResult.requiredElements.missing.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Broken Links */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {testResult.brokenLinks.broken === 0 ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                  リンクチェック
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {testResult.brokenLinks.total}
                    </div>
                    <div className="text-sm text-gray-600">総リンク数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {testResult.brokenLinks.broken}
                    </div>
                    <div className="text-sm text-gray-600">リンク切れ</div>
                  </div>
                </div>
                {testResult.brokenLinks.broken === 0 && (
                  <p className="mt-4 text-green-700">✅ すべてのリンクが正常です</p>
                )}
              </div>

              {/* Visual Issues */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {!testResult.visualIssues.hasIssues ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-yellow-600">⚠️</span>
                  )}
                  視覚的な問題
                </h3>
                {!testResult.visualIssues.hasIssues ? (
                  <p className="text-green-700">視覚的な問題は検出されませんでした</p>
                ) : (
                  <div>
                    <p className="text-yellow-700 mb-2">以下の問題が検出されました:</p>
                    <ul className="list-disc list-inside text-gray-600">
                      {testResult.visualIssues.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Errors */}
              {testResult.errors.length > 0 && (
                <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                  <h3 className="text-lg font-semibold mb-3 text-red-800">エラー</h3>
                  <ul className="list-disc list-inside text-red-700">
                    {testResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Overall Status */}
              <div
                className={`rounded-lg p-6 ${
                  testResult.errors.length === 0 &&
                  testResult.serverAccessible &&
                  testResult.requiredElements.allPresent
                    ? "bg-green-50 border border-green-200"
                    : "bg-yellow-50 border border-yellow-200"
                }`}
              >
                <h3 className="text-lg font-semibold mb-2">
                  {testResult.errors.length === 0 &&
                  testResult.serverAccessible &&
                  testResult.requiredElements.allPresent
                    ? "✅ すべてのテストが通過しました"
                    : "⚠️ 一部のテストが失敗しました"}
                </h3>
                <p className="text-gray-600">
                  {testResult.errors.length === 0 &&
                  testResult.serverAccessible &&
                  testResult.requiredElements.allPresent
                    ? "アプリケーションは正常に動作しています。デプロイ可能です。"
                    : "問題を修正してからデプロイしてください。"}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">テスト結果がありません</p>
              <button
                onClick={runTests}
                disabled={running}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {running ? "実行中..." : "テストを実行"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

