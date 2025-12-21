"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Vehicle } from "@/types";
import {
  searchByModelCode,
  searchByMakeAndModel,
  getUniqueMakes,
  getModelsForMake,
  createCustomVehicle,
  getYearsForMakeAndModel,
  getModelCodesForVehicle,
} from "@/lib/vehicleData";

interface Step3VehicleLookupProps {
  onSelect: (vehicles: Vehicle[]) => void;
  selectedVehicles?: Vehicle[];
  aiExtractedVehicles?: Array<{ make?: string; model?: string; year?: string }>;
}

export default function Step3VehicleLookup({
  onSelect,
  selectedVehicles = [],
  aiExtractedVehicles = [],
}: Step3VehicleLookupProps) {
  // Auto-fill search fields with AI-extracted vehicle info if available
  const firstExtracted = aiExtractedVehicles[0];
  const initialMake = firstExtracted?.make || "";
  const initialModel = firstExtracted?.model || "";
  
  const [searchMode, setSearchMode] = useState<"modelCode" | "makeModel">(
    initialMake || initialModel ? "makeModel" : "modelCode"
  );
  const [modelCode, setModelCode] = useState("");
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [showModelCodeSuggestions, setShowModelCodeSuggestions] = useState(false);
  const [hasAutoSearched, setHasAutoSearched] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    modelCode: "",
  });
  
  // Auto-search when AI data is pre-filled
  useEffect(() => {
    if (!hasAutoSearched && (initialMake || initialModel)) {
      console.log("Auto-searching with AI-extracted data:", { make: initialMake, model: initialModel });
      const results = searchByMakeAndModel(initialMake, initialModel);
      setSearchResults(results);
      setHasAutoSearched(true);
    }
  }, [hasAutoSearched, initialMake, initialModel]);

  const modalMakes = useMemo(() => getUniqueMakes(), []);
  
  // Models for the manual entry modal (depends on newVehicle.make)
  const modalModels = useMemo(() => {
    if (!newVehicle.make) return [];
    return getModelsForMake(newVehicle.make);
  }, [newVehicle.make]);
  
  // Models for the search form (depends on make state)
  const searchModels = useMemo(() => {
    if (!make) return [];
    return getModelsForMake(make);
  }, [make]);

  const modalYears = useMemo(() => {
    if (!newVehicle.make || !newVehicle.model) return [];
    return getYearsForMakeAndModel(newVehicle.make, newVehicle.model);
  }, [newVehicle.make, newVehicle.model]);

  const modalModelCodes = useMemo(() => {
    if (!newVehicle.make || !newVehicle.model) return [];
    
    const yearInt = newVehicle.year ? parseInt(newVehicle.year) : undefined;
    console.log(`Searching codes for: ${newVehicle.make}, ${newVehicle.model}, Year: ${yearInt}`);
    
    // Try exact year match first
    let codes = getModelCodesForVehicle(
      newVehicle.make, 
      newVehicle.model, 
      !isNaN(yearInt || NaN) ? yearInt : undefined
    );
    
    // If no codes found with year (e.g. user entered reg year 2010, but release was 2009), 
    // fallback to showing all codes for this model
    if (codes.length === 0 && yearInt) {
      console.log("No exact year match, falling back to all codes for model");
      codes = getModelCodesForVehicle(newVehicle.make, newVehicle.model);
    }
    
    console.log(`Found codes:`, codes);
    return codes;
  }, [newVehicle.make, newVehicle.model, newVehicle.year]);

  const handleModelCodeSearch = () => {
    if (!modelCode.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchByModelCode(modelCode);
    setSearchResults(results);
  };

  const handleMakeModelSearch = () => {
    const results = searchByMakeAndModel(make, model);
    setSearchResults(results);
  };

  const handleApplyVehicle = (vehicle: Vehicle) => {
    const updated = [...selectedVehicles];
    if (!updated.find((v) => v.id === vehicle.id)) {
      updated.push(vehicle);
      onSelect(updated);
    }
  };

  const handleRemoveVehicle = (vehicleId: string) => {
    const updated = selectedVehicles.filter((v) => v.id !== vehicleId);
    onSelect(updated);
  };

  const handleCreateVehicle = () => {
    if (
      !newVehicle.modelCode ||
      !newVehicle.make ||
      !newVehicle.model ||
      !newVehicle.year
    ) {
      alert("必須項目を入力してください");
      return;
    }

    if (editingVehicleId) {
      // Update existing vehicle
      const updatedList = selectedVehicles.map(v => {
        if (v.id === editingVehicleId) {
          return {
            ...v,
            make: newVehicle.make,
            model: newVehicle.model,
            year: newVehicle.year,
            modelCode: newVehicle.modelCode,
            releaseDate: v.releaseDate // Preserve existing fields if any
          };
        }
        return v;
      });
      onSelect(updatedList);
      setEditingVehicleId(null);
    } else {
      // Create new vehicle
      const vehicle = createCustomVehicle(
        newVehicle.make,
        newVehicle.model,
        newVehicle.year,
        newVehicle.modelCode
      );
      handleApplyVehicle(vehicle);
    }

    setShowCreateModal(false);
    setNewVehicle({
      make: "",
      model: "",
      year: "",
      modelCode: "",
    });
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    console.log("[Edit] Editing vehicle:", vehicle);
    setNewVehicle({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      modelCode: vehicle.modelCode,
    });
    setEditingVehicleId(vehicle.id);
    setShowCreateModal(true);
    
    // Debug: Check what dropdowns will show
    setTimeout(() => {
      const models = getModelsForMake(vehicle.make);
      const years = getYearsForMakeAndModel(vehicle.make, vehicle.model);
      const codes = getModelCodesForVehicle(vehicle.make, vehicle.model, parseInt(vehicle.year));
      console.log("[Edit] Available options:", {
        make: vehicle.make,
        models: models.length,
        years: years.length,
        modelCodes: codes.length
      });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* AI Extracted Vehicle Info Banner */}
      {aiExtractedVehicles.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                AI が以下の車両情報を検出しました
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {aiExtractedVehicles.map((v, i) => (
                  <div key={i} className="mt-1">
                    <span className="font-semibold">車両{i + 1}:</span>{" "}
                    {v.make && <span className="bg-blue-100 px-2 py-0.5 rounded">{v.make}</span>}
                    {v.model && <span className="bg-blue-100 px-2 py-0.5 rounded ml-1">{v.model}</span>}
                    {v.year && <span className="bg-blue-100 px-2 py-0.5 rounded ml-1">{v.year}年</span>}
                    {!v.make && !v.model && <span className="text-gray-500">情報不足</span>}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-blue-600">
                💡 検索フィールドに自動入力しました。年式や型式コードを選択して確定してください。
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Search Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          車両検索
        </h3>
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setSearchMode("modelCode")}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              searchMode === "modelCode"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            型式コードで検索
          </button>
          <button
            onClick={() => setSearchMode("makeModel")}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              searchMode === "makeModel"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            メーカー・車名で検索
          </button>
        </div>

        {/* Model Code Search */}
        {searchMode === "modelCode" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                型式コード
              </label>
              <input
                type="text"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder="例: DAA-ZVW30, NHW20"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              />
            </div>
            <button
              onClick={handleModelCodeSearch}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              型式コードで検索
            </button>
          </div>
        )}

        {/* Make/Model Search */}
        {searchMode === "makeModel" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メーカー選択
              </label>
              <select
                value={make}
                onChange={(e) => {
                  setMake(e.target.value);
                  setModel("");
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
              >
                <option value="">メーカーを選択</option>
                {modalMakes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                車名選択
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900 bg-white"
              >
                <option value="">車種を選択</option>
                {searchModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleMakeModelSearch}
              disabled={!make && !model}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              メーカー・車名で検索
            </button>
          </div>
        )}
      </div>

      {/* No Results Message */}
      {hasAutoSearched && searchResults.length === 0 && aiExtractedVehicles.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                データベースに該当する車両が見つかりませんでした
              </h3>
              <p className="mt-2 text-sm text-yellow-700">
                AIが検出した情報: {initialMake} {initialModel}
              </p>
              <p className="mt-1 text-sm text-yellow-700">
                💡 手動で車両を登録するか、検索条件を変更してください。
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              検索結果 ({searchResults.length}件)
            </h3>
            {aiExtractedVehicles.length > 0 && hasAutoSearched && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                AI検索結果
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    型式コード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メーカー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    車名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    年式
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {vehicle.modelCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.make}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.year}年
                      {vehicle.releaseDate && vehicle.releaseDate.includes("/") 
                        ? ` (${vehicle.releaseDate})` 
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleApplyVehicle(vehicle)}
                        disabled={selectedVehicles.some((v) => v.id === vehicle.id)}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                      >
                        {selectedVehicles.some((v) => v.id === vehicle.id)
                          ? "適用済"
                          : "適用"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Vehicles */}
      {selectedVehicles.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            選択された車両 ({selectedVehicles.length}件)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    型式コード
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メーカー
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    車名
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    年式
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                      {vehicle.modelCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.make}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.model}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.year}年
                      {vehicle.releaseDate && vehicle.releaseDate.includes("/") 
                        ? ` (${vehicle.releaseDate})` 
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditVehicle(vehicle)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleRemoveVehicle(vehicle.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Custom Vehicle Button */}
      <button
        onClick={() => {
          setEditingVehicleId(null);
          setNewVehicle({
            make: "",
            model: "",
            year: "",
            modelCode: "",
          });
          setShowCreateModal(true);
        }}
        className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
      >
        + 手動で車両情報を入力
      </button>

      {/* Create Vehicle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingVehicleId ? "車両情報を編集" : "車両情報を手動入力"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  メーカー <span className="text-red-500">*</span>
                </label>
                <select
                  value={newVehicle.make}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, make: e.target.value, model: "", year: "", modelCode: "" })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                >
                  <option value="">選択してください</option>
                  {modalMakes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  車名 <span className="text-red-500">*</span>
                  {modalModels.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({modalModels.length}件)</span>
                  )}
                </label>
                <select
                  value={newVehicle.model}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, model: e.target.value, year: "", modelCode: "" })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                  disabled={!newVehicle.make}
                >
                  <option value="">選択してください</option>
                  {modalModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {!newVehicle.make && (
                  <p className="text-xs text-gray-500 mt-1">メーカーを選択してください</p>
                )}
                {newVehicle.make && modalModels.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">該当する車名が見つかりません</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  年式 <span className="text-red-500">*</span>
                  {modalYears.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({modalYears.length}件)</span>
                  )}
                </label>
                {modalYears.length > 0 ? (
                  <select
                    value={newVehicle.year}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, year: e.target.value, modelCode: "" })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    disabled={!newVehicle.model}
                  >
                    <option value="">選択してください</option>
                    {modalYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, year: e.target.value, modelCode: "" })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    placeholder="例: 2020"
                    min="1900"
                    max="2099"
                  />
                )}
                {modalYears.length === 0 && newVehicle.make && newVehicle.model && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ データベースにありません。手動で年式を入力してください
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  型式コード <span className="text-red-500">*</span>
                  {modalModelCodes.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">({modalModelCodes.length}件)</span>
                  )}
                </label>
                {modalModelCodes.length > 0 ? (
                  <select
                    value={newVehicle.modelCode}
                    onChange={(e) => setNewVehicle({ ...newVehicle, modelCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    disabled={!newVehicle.year}
                  >
                    <option value="">選択してください</option>
                    {modalModelCodes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newVehicle.modelCode}
                    onChange={(e) => setNewVehicle({ ...newVehicle, modelCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                    placeholder="例: TA-NZE120"
                    autoComplete="off"
                  />
                )}
                {modalModelCodes.length === 0 && newVehicle.make && newVehicle.model && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠️ データベースにありません。手動で型式コードを入力してください
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingVehicleId(null);
                  setNewVehicle({
                    make: "",
                    model: "",
                    year: "",
                    modelCode: "",
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateVehicle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingVehicleId ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
