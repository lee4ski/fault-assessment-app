"use client";

import { useState, useMemo } from "react";
import { Vehicle } from "@/types";
import {
  searchByModelCode,
  searchByMakeAndModel,
  getUniqueMakes,
  getModelsForMake,
  createCustomVehicle,
} from "@/lib/vehicleData";

interface Step3VehicleLookupProps {
  onSelect: (vehicles: Vehicle[]) => void;
  selectedVehicles?: Vehicle[];
}

export default function Step3VehicleLookup({
  onSelect,
  selectedVehicles = [],
}: Step3VehicleLookupProps) {
  const [searchMode, setSearchMode] = useState<"modelCode" | "makeModel">("modelCode");
  const [modelCode, setModelCode] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    modelCode: "",
  });

  const makes = useMemo(() => getUniqueMakes(), []);
  const models = useMemo(() => {
    if (!make) return [];
    return getModelsForMake(make);
  }, [make]);

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

    const vehicle = createCustomVehicle(
      newVehicle.make,
      newVehicle.model,
      newVehicle.year,
      newVehicle.modelCode
    );

    handleApplyVehicle(vehicle);
    setShowCreateModal(false);
    setNewVehicle({
      make: "",
      model: "",
      year: "",
      modelCode: "",
    });
  };

  return (
    <div className="space-y-6">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">メーカーを選択</option>
                {makes.map((m) => (
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
                {models.map((m) => (
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

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            検索結果 ({searchResults.length}件)
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
                      <button
                        onClick={() => handleRemoveVehicle(vehicle.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                      >
                        削除
                      </button>
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
        onClick={() => setShowCreateModal(true)}
        className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors font-medium"
      >
        + 手動で車両情報を入力
      </button>

      {/* Create Vehicle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              車両情報を手動入力
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メーカー <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVehicle.make}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, make: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="例: トヨタ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  車名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVehicle.model}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, model: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="例: カローラ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  年式 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={newVehicle.year}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, year: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="例: 2020"
                  min="1900"
                  max="2099"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  型式コード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newVehicle.modelCode}
                  onChange={(e) =>
                    setNewVehicle({ ...newVehicle, modelCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="例: TA-NZE120"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
                追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
