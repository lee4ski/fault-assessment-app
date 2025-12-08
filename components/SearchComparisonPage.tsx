"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sampleCriteria } from "@/data/sampleCriteria";
import { searchCriteria } from "@/lib/calculator";
import { AssessmentCriteria } from "@/types";

interface SearchMetrics {
  duration: number;
  resultCount: number;
  status: 'idle' | 'searching' | 'complete' | 'error';
}

interface AISearchResult {
  id: string;
  title: string;
  probability: number;
  description: string;
  baseFaultPercentage: number;
}

export default function SearchComparisonPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Helper function to format duration
  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}秒`;
    }
    return `${ms.toFixed(0)}ms`;
  };
  
  const [keywordMetrics, setKeywordMetrics] = useState<SearchMetrics>({
    duration: 0,
    resultCount: 0,
    status: 'idle'
  });
  const [aiMetrics, setAiMetrics] = useState<SearchMetrics>({
    duration: 0,
    resultCount: 0,
    status: 'idle'
  });
  
  const [keywordResults, setKeywordResults] = useState<AssessmentCriteria[]>([]);
  const [aiResults, setAiResults] = useState<AISearchResult[]>([]);

  const handleComparisonSearch = async () => {
    if (query.trim().length < 5) {
      alert("検索キーワードを5文字以上入力してください");
      return;
    }

    setIsSearching(true);
    setKeywordMetrics({ duration: 0, resultCount: 0, status: 'searching' });
    setAiMetrics({ duration: 0, resultCount: 0, status: 'searching' });

    // Run both searches in parallel
    const [keywordResult, aiResult] = await Promise.all([
      // 1. Keyword Search (fast)
      (async () => {
        const startTime = performance.now();
        try {
          const results = searchCriteria(sampleCriteria, query);
          const duration = performance.now() - startTime;
          
          setKeywordMetrics({
            duration,
            resultCount: results.length,
            status: 'complete'
          });
          setKeywordResults(results.slice(0, 10).map(r => r.criteria));
          
          return { success: true, duration, count: results.length };
        } catch (error) {
          setKeywordMetrics({ duration: 0, resultCount: 0, status: 'error' });
          return { success: false, duration: 0, count: 0 };
        }
      })(),
      
      // 2. AI Search (slower)
      (async () => {
        const startTime = performance.now();
        try {
          const response = await fetch("/api/ai-analyze-accident", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accidentDescription: query }),
          });

          const duration = performance.now() - startTime;

          if (response.ok) {
            const result = await response.json();
            const candidates = result.candidates || [];
            
            setAiMetrics({
              duration,
              resultCount: candidates.length,
              status: 'complete'
            });
            
            setAiResults(candidates.slice(0, 10));
            
            return { success: true, duration, count: candidates.length };
          } else {
            setAiMetrics({ duration, resultCount: 0, status: 'error' });
            return { success: false, duration, count: 0 };
          }
        } catch (error) {
          const duration = performance.now() - startTime;
          setAiMetrics({ duration, resultCount: 0, status: 'error' });
          return { success: false, duration, count: 0 };
        }
      })(),
    ]);

    setIsSearching(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with return button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Step 1に戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">検索方法の比較デモ</h1>
          <div className="w-32"></div>
        </div>

        {/* Search input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            事故状況を入力してください
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例：交差点で歩行者と車が衝突、信号機のある横断歩道"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isSearching) {
                  handleComparisonSearch();
                }
              }}
            />
            <button
              onClick={handleComparisonSearch}
              disabled={isSearching || query.trim().length < 5}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isSearching ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  検索中...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                  比較検索を実行
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI適合度 explanation */}
        <div className="bg-blue-50 rounded-lg shadow-md p-6 mb-6 border border-blue-200">
          <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
            </svg>
            AI適合度とは？
          </h2>
          
          <div className="space-y-4 text-gray-800">
            <p className="text-sm leading-relaxed">
              <strong>AI適合度</strong>は、あなたの検索内容と各ケースの<strong>「意味的な近さ」</strong>を示す数値です（0-100%）。
            </p>

            <div className="grid md:grid-cols-2 gap-4 my-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🔍</span>
                  <h3 className="font-bold text-gray-900">キーワード検索</h3>
                </div>
                <p className="text-sm text-gray-700">
                  単純な<strong>単語の一致</strong>を確認します
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  例：「交差点」という文字が含まれるか？
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-green-600 font-bold">⚡</span>
                  <span className="text-xs font-medium">速い（数十ミリ秒）</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🤖</span>
                  <h3 className="font-bold text-gray-900">AI検索</h3>
                </div>
                <p className="text-sm text-gray-700">
                  <strong>意味を理解</strong>して検索します
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  例：「横断歩道」と「交差点の横断」は似た意味
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-blue-600 font-bold">🧠</span>
                  <span className="text-xs font-medium">遅い（数秒）が賢い</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-300">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                AI適合度の計算方法（ステップバイステップ）
              </h3>
              
              {/* First explain "意味のベクトル" with examples */}
              <div className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border-2 border-orange-200">
                <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📖</span>
                  まず「意味のベクトル」って何？
                </h4>
                
                <div className="space-y-3 text-sm">
                  <p className="text-gray-800 font-medium">
                    言葉を数字のリストに変換したものです：
                  </p>
                  
                  <div className="bg-white p-3 rounded border border-orange-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍎</span>
                      <span className="font-bold text-red-600">「りんご」</span>
                      <span className="text-gray-400">→</span>
                      <code className="text-xs bg-red-50 px-2 py-1 rounded border border-red-200 text-red-700">[0.3, 1.2, -0.8, ...]</code>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🍊</span>
                      <span className="font-bold text-orange-600">「みかん」</span>
                      <span className="text-gray-400">→</span>
                      <code className="text-xs bg-orange-50 px-2 py-1 rounded border border-orange-200 text-orange-700">[0.28, 1.1, -0.75, ...]</code>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🚗</span>
                      <span className="font-bold text-blue-600">「自動車」</span>
                      <span className="text-gray-400">→</span>
                      <code className="text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 text-blue-700">[-1.0, 0.4, 2.3, ...]</code>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded border border-orange-200">
                    <p className="text-gray-800 font-medium mb-2">
                      ⚠️ この数字はデタラメではありません！
                    </p>
                    
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3 rounded-lg border border-indigo-200 mb-3">
                      <p className="text-sm text-gray-800 mb-2">
                        <span className="text-lg mr-1">🧠</span>
                        <strong className="text-indigo-900">AIが数えきれない学習から「意味の地図」を自分で作る</strong>
                      </p>
                      <ul className="text-xs text-gray-700 space-y-1 ml-6">
                        <li className="list-disc">AIは何億もの文章を読んで学習</li>
                        <li className="list-disc">「りんご」と「みかん」が一緒に使われることが多い → <strong className="text-purple-700">近くに配置</strong></li>
                        <li className="list-disc">「りんご」と「自動車」が一緒に使われることは少ない → <strong className="text-purple-700">遠くに配置</strong></li>
                        <li className="list-disc">人間が教えなくても、<strong className="text-indigo-700">AIが自動的に「意味の地図」を作り上げる</strong></li>
                      </ul>
                    </div>
                    
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold flex-shrink-0">✓</span>
                        <span>
                          <span className="font-bold text-red-600">りんご</span> と 
                          <span className="font-bold text-orange-600 ml-1">みかん</span> 
                          → 意味が近いので<strong className="text-green-600">数字も似ている</strong>
                          <br />
                          <span className="text-xs text-gray-500">（0.3 ≈ 0.28、1.2 ≈ 1.1、-0.8 ≈ -0.75）</span>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 font-bold flex-shrink-0">✗</span>
                        <span>
                          <span className="font-bold text-red-600">りんご</span> と 
                          <span className="font-bold text-blue-600 ml-1">自動車</span> 
                          → 意味が遠いので<strong className="text-orange-600">数字もぜんぜん違う</strong>
                          <br />
                          <span className="text-xs text-gray-500">（0.3 vs -1.0、1.2 vs 0.4、-0.8 vs 2.3）</span>
                        </span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-lg border-2 border-purple-300">
                    <p className="text-center text-gray-900 font-bold">
                      <span className="text-purple-600 text-lg">💡</span>
                      "意味が似ているほど数字も似るように作られたデータ"
                    </p>
                    <p className="text-center text-purple-900 font-bold text-lg mt-1">
                      これが「意味のベクトル」です。
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">あなたの質問を「意味のベクトル」に変換</h4>
                    <p className="text-sm text-gray-700">
                      「交差点で衝突」→ <span className="font-mono text-xs bg-white px-2 py-1 rounded border">[0.8, 0.3, 0.9, ...]</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      ※ 実際は1536次元の数値リスト
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-1">各ケースも「意味のベクトル」として事前に保存</h4>
                    <p className="text-sm text-gray-700">
                      データベース内の1000件すべてがベクトル化済み
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      💾 ケース[1]: <span className="font-mono text-xs bg-white px-2 py-1 rounded border">[0.7, 0.4, 0.8, ...]</span>
                    </p>
                  </div>
                </div>

                {/* Step 3 - Visual Diagram */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-2">ベクトル同士の角度を測定</h4>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <div className="flex items-center justify-center mb-2">
                        <svg width="200" height="120" viewBox="0 0 200 120" className="mx-auto">
                          {/* Origin point */}
                          <circle cx="20" cy="100" r="3" fill="#1e40af" />
                          
                          {/* Vector 1 (Your question) - Blue */}
                          <line x1="20" y1="100" x2="120" y2="30" stroke="#2563eb" strokeWidth="3" markerEnd="url(#arrowblue)" />
                          <text x="125" y="25" fill="#2563eb" fontSize="12" fontWeight="bold">あなたの質問</text>
                          
                          {/* Vector 2 (Case 1 - close) - Green */}
                          <line x1="20" y1="100" x2="110" y2="40" stroke="#16a34a" strokeWidth="3" markerEnd="url(#arrowgreen)" />
                          <text x="115" y="50" fill="#16a34a" fontSize="12" fontWeight="bold">ケース1 (近い)</text>
                          
                          {/* Vector 3 (Case 2 - far) - Orange */}
                          <line x1="20" y1="100" x2="60" y2="95" stroke="#ea580c" strokeWidth="3" markerEnd="url(#arroworange)" />
                          <text x="20" y="85" fill="#ea580c" fontSize="12" fontWeight="bold">ケース2 (遠い)</text>
                          
                          {/* Angle arc for close case */}
                          <path d="M 40 100 Q 45 95 50 85" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2,2" />
                          <text x="48" y="95" fill="#16a34a" fontSize="10">15°</text>
                          
                          {/* Angle arc for far case */}
                          <path d="M 40 100 Q 35 100 32 98" fill="none" stroke="#ea580c" strokeWidth="1" strokeDasharray="2,2" />
                          <text x="32" y="105" fill="#ea580c" fontSize="10">65°</text>
                          
                          {/* Arrow markers */}
                          <defs>
                            <marker id="arrowblue" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="#2563eb" />
                            </marker>
                            <marker id="arrowgreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="#16a34a" />
                            </marker>
                            <marker id="arroworange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="#ea580c" />
                            </marker>
                          </defs>
                        </svg>
                      </div>
                      <p className="text-xs text-gray-700 text-center">
                        <span className="text-green-600 font-bold">角度が小さい = 意味が近い</span> ／ 
                        <span className="text-orange-600 font-bold ml-2">角度が大きい = 意味が遠い</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 mb-2">類似度を0-100%で表示</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-700 w-24">ケース1:</div>
                        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 flex items-center justify-end pr-2" style={{width: '92%'}}>
                            <span className="text-xs font-bold text-white">92%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-700 w-24">ケース2:</div>
                        <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500 flex items-center justify-end pr-2" style={{width: '45%'}}>
                            <span className="text-xs font-bold text-white">45%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-300">
                <p className="text-sm text-gray-900">
                  <span className="text-xl mr-2">💡</span>
                  <strong className="text-blue-900">つまり：</strong>
                  あなたの質問と各ケースの「意味の方向」がどれだけ一致しているかを数値化したものが<strong className="text-purple-700">AI適合度</strong>です。
                  言葉が違っても、意味が似ていれば高いスコアになります！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Keyword Search Results */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  キーワード検索
                </h2>
                {keywordMetrics.status === 'complete' && (
                  <div className="text-sm text-gray-600">
                    ⚡ {formatDuration(keywordMetrics.duration)}
                  </div>
                )}
              </div>
              {keywordMetrics.status === 'complete' && (
                <div className="mt-2 text-sm text-gray-700">
                  📊 結果: <strong>{keywordMetrics.resultCount}件</strong>
                </div>
              )}
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {keywordMetrics.status === 'idle' && (
                <p className="text-center text-gray-500 py-8">検索を実行してください</p>
              )}
              {keywordMetrics.status === 'searching' && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">検索中...</p>
                </div>
              )}
              {keywordMetrics.status === 'complete' && keywordResults.length === 0 && (
                <p className="text-center text-gray-500 py-8">該当する結果が見つかりませんでした</p>
              )}
              {keywordMetrics.status === 'complete' && keywordResults.length > 0 && (
                <ul className="space-y-3">
                  {keywordResults.map((item, index) => (
                    <li key={item.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                            <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.summary || item.description}</p>
                          <div className="flex gap-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              基本過失割合: {item.baseFaultPercentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* AI Search Results */}
          <div className="bg-white rounded-lg shadow-md">
            <div className="bg-purple-100 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  AI検索
                </h2>
                {aiMetrics.status === 'complete' && (
                  <div className="text-sm text-gray-600">
                    🧠 {formatDuration(aiMetrics.duration)}
                  </div>
                )}
              </div>
              {aiMetrics.status === 'complete' && (
                <div className="mt-2 text-sm text-gray-700">
                  📊 結果: <strong>{aiMetrics.resultCount}件</strong>
                </div>
              )}
            </div>
            
            <div className="p-4 max-h-[600px] overflow-y-auto">
              {aiMetrics.status === 'idle' && (
                <p className="text-center text-gray-500 py-8">検索を実行してください</p>
              )}
              {aiMetrics.status === 'searching' && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-gray-600">AI分析中...</p>
                </div>
              )}
              {aiMetrics.status === 'complete' && aiResults.length === 0 && (
                <p className="text-center text-gray-500 py-8">該当する結果が見つかりませんでした</p>
              )}
              {aiMetrics.status === 'complete' && aiResults.length > 0 && (
                <ul className="space-y-3">
                  {aiResults.map((item, index) => (
                    <li key={item.id} className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-500">#{index + 1}</span>
                            <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              基本過失割合: {item.baseFaultPercentage}%
                            </span>
                            <span className={`text-xs px-2 py-1 rounded font-bold ${
                              item.probability >= 80 
                                ? "bg-green-100 text-green-700 border border-green-300" 
                                : item.probability >= 50
                                ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                : "bg-orange-100 text-orange-700 border border-orange-300"
                            }`}>
                              🎯 AI適合度: {item.probability}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Performance comparison summary */}
        {keywordMetrics.status === 'complete' && aiMetrics.status === 'complete' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">パフォーマンス比較</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {(aiMetrics.duration / keywordMetrics.duration).toFixed(1)}x
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  AIはキーワードより<br />遅いが精度が高い
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatDuration(keywordMetrics.duration)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  キーワード検索<br />実行時間
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatDuration(aiMetrics.duration)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  AI検索<br />実行時間
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

