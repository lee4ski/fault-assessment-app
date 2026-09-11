"use client";

import { useState, useMemo } from "react";
import { Vehicle } from "@/types";
import { useLocale } from "@/components/LocaleProvider";
import {
  searchByModelCode,
  searchByMakeAndModel,
  getUniqueMakes,
  getModelsForMake,
  createCustomVehicle,
  getYearsForMakeAndModel,
  getModelCodesForVehicle,
  getMakeLabel,
  getModelLabel,
} from "@/lib/vehicleData";

interface Step3VehicleLookupProps {
  onSelect: (vehicles: Vehicle[]) => void;
  selectedVehicles?: Vehicle[];
}

export default function Step3VehicleLookup({
  onSelect,
  selectedVehicles = [],
}: Step3VehicleLookupProps) {
  const { t, locale } = useLocale();
  const [searchMode, setSearchMode] = useState<"modelCode" | "makeModel">("modelCode");
  const [modelCode, setModelCode] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [showModelCodeSuggestions, setShowModelCodeSuggestions] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    make: "",
    model: "",
    year: "",
    modelCode: "",
  });

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
      alert(t("step3VehicleLookup.modal.requiredFieldsAlert"));
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
        newVehicle.modelCode,
        locale
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
    setNewVehicle({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      modelCode: vehicle.modelCode,
    });
    setEditingVehicleId(vehicle.id);
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Search Mode Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t("step3VehicleLookup.searchModeCard.heading")}
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
            {t("step3VehicleLookup.searchModeCard.modelCodeTab")}
          </button>
          <button
            onClick={() => setSearchMode("makeModel")}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              searchMode === "makeModel"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {t("step3VehicleLookup.searchModeCard.makeModelTab")}
          </button>
        </div>

        {/* Model Code Search */}
        {searchMode === "modelCode" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("step3VehicleLookup.modelCodeSearch.label")}
              </label>
              <input
                type="text"
                value={modelCode}
                onChange={(e) => setModelCode(e.target.value)}
                placeholder={t("step3VehicleLookup.modelCodeSearch.placeholder")}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
            <button
              onClick={handleModelCodeSearch}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              {t("step3VehicleLookup.modelCodeSearch.searchButton")}
            </button>
          </div>
        )}

        {/* Make/Model Search */}
        {searchMode === "makeModel" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("step3VehicleLookup.makeModelSearch.makeLabel")}
              </label>
              <select
                value={make}
                onChange={(e) => {
                  setMake(e.target.value);
                  setModel("");
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                <option value="">{t("step3VehicleLookup.makeModelSearch.makePlaceholder")}</option>
                {modalMakes.map((m) => (
                  <option key={m} value={m}>
                    {getMakeLabel(m, locale)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("step3VehicleLookup.makeModelSearch.modelLabel")}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={!make}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 text-gray-900 bg-white"
              >
                <option value="">{t("step3VehicleLookup.makeModelSearch.modelPlaceholder")}</option>
                {searchModels.map((m) => (
                  <option key={m} value={m}>
                    {getModelLabel(m, locale)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleMakeModelSearch}
              disabled={!make && !model}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t("step3VehicleLookup.makeModelSearch.searchButton")}
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("step3VehicleLookup.searchResults.heading", { count: searchResults.length })}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.modelCode")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.make")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.model")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.year")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.actions")}
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
                      {getMakeLabel(vehicle.make, locale)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getModelLabel(vehicle.model, locale)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.year}{t("step3VehicleLookup.table.yearSuffix")}
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
                          ? t("step3VehicleLookup.table.appliedButton")
                          : t("step3VehicleLookup.table.applyButton")}
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
            {t("step3VehicleLookup.selectedVehicles.heading", { count: selectedVehicles.length })}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.modelCode")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.make")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.model")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.year")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("step3VehicleLookup.table.actions")}
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
                      {getMakeLabel(vehicle.make, locale)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getModelLabel(vehicle.model, locale)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {vehicle.year}{t("step3VehicleLookup.table.yearSuffix")}
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
                          {t("step3VehicleLookup.selectedVehicles.editButton")}
                        </button>
                        <button
                          onClick={() => handleRemoveVehicle(vehicle.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          {t("step3VehicleLookup.selectedVehicles.deleteButton")}
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
        {t("step3VehicleLookup.manualEntryButton")}
      </button>

      {/* Create Vehicle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingVehicleId ? t("step3VehicleLookup.modal.editHeading") : t("step3VehicleLookup.modal.createHeading")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("step3VehicleLookup.modal.makeLabel")} <span className="text-red-500">{t("step3VehicleLookup.modal.requiredMark")}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newVehicle.make}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, make: e.target.value, model: "", year: "", modelCode: "" })
                    }
                    list="modal-makes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder={t("step3VehicleLookup.modal.makePlaceholder")}
                  />
                  <datalist id="modal-makes">
                    {modalMakes.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("step3VehicleLookup.modal.modelLabel")} <span className="text-red-500">{t("step3VehicleLookup.modal.requiredMark")}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newVehicle.model}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, model: e.target.value, year: "", modelCode: "" })
                    }
                    list="modal-models"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder={t("step3VehicleLookup.modal.modelPlaceholder")}
                    disabled={!newVehicle.make}
                  />
                  <datalist id="modal-models">
                    {modalModels.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("step3VehicleLookup.modal.yearLabel")} <span className="text-red-500">{t("step3VehicleLookup.modal.requiredMark")}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newVehicle.year}
                    onChange={(e) =>
                      setNewVehicle({ ...newVehicle, year: e.target.value, modelCode: "" })
                    }
                    list="modal-years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder={t("step3VehicleLookup.modal.yearPlaceholder")}
                    min="1900"
                    max="2099"
                  />
                  <datalist id="modal-years">
                    {modalYears.map((y) => (
                      <option key={y} value={y} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("step3VehicleLookup.modal.modelCodeLabel")} <span className="text-red-500">{t("step3VehicleLookup.modal.requiredMark")}</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newVehicle.modelCode}
                    onChange={(e) => {
                      setNewVehicle({ ...newVehicle, modelCode: e.target.value });
                      setShowModelCodeSuggestions(true);
                    }}
                    onFocus={() => setShowModelCodeSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowModelCodeSuggestions(false), 200)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder={t("step3VehicleLookup.modal.modelCodePlaceholder")}
                    autoComplete="off"
                  />
                  {showModelCodeSuggestions && modalModelCodes.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                      {modalModelCodes.map((c) => (
                        <li
                          key={c}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900"
                          onClick={() => {
                            setNewVehicle({ ...newVehicle, modelCode: c });
                            setShowModelCodeSuggestions(false);
                          }}
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {modalModelCodes.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t("step3VehicleLookup.modal.modelCodeHint")}
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
                {t("step3VehicleLookup.modal.cancelButton")}
              </button>
              <button
                onClick={handleCreateVehicle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingVehicleId ? t("step3VehicleLookup.modal.updateButton") : t("step3VehicleLookup.modal.addButton")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
