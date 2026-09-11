// Vehicle data structure and search functions
import { Vehicle } from "@/types";
import { Locale } from "@/lib/i18n-simple";

// The vehicle master data below (makers/models) is real-world Japanese
// automotive data, stored and matched by its Japanese name (searchByMakeAndModel,
// getModelsForMake, etc. all key off this exact string). These dictionaries
// provide an English display label for well-known brand/model names without
// changing the underlying value used for search/matching.
const MAKE_LABELS_EN: Record<string, string> = {
  "トヨタ": "Toyota",
  "ホンダ": "Honda",
  "日産": "Nissan",
};

const MODEL_LABELS_EN: Record<string, string> = {
  "カローラ": "Corolla",
  "シビック": "Civic",
  "セレナ": "Serena",
  "プリウス": "Prius",
  "ハリアー": "Harrier",
};

// Display label for a vehicle maker name, translated when locale is "en"
// (falls back to the original Japanese name if no translation is known).
export function getMakeLabel(make: string, locale: Locale = "ja"): string {
  if (locale === "en" && MAKE_LABELS_EN[make]) return MAKE_LABELS_EN[make];
  return make;
}

// Display label for a vehicle model name, translated when locale is "en"
// (falls back to the original Japanese name if no translation is known).
export function getModelLabel(model: string, locale: Locale = "ja"): string {
  if (locale === "en" && MODEL_LABELS_EN[model]) return MODEL_LABELS_EN[model];
  return model;
}

// Vehicle database with releases and model codes
interface VehicleRelease {
  year: number;
  month: number | null;
  型式コード: string[];
}

interface VehicleData {
  maker: string;
  model: string;
  releases: VehicleRelease[];
}

const vehicleDatabase: VehicleData[] = [
  {
    maker: "トヨタ",
    model: "カローラ",
    releases: [
      {
        year: 2000,
        month: 5,
        型式コード: ["TA-NZE120", "TA-NZE121", "TA-ZZE122"],
      },
      {
        year: 2001,
        month: 10,
        型式コード: ["TA-NZE124", "TA-ZZE124"],
      },
    ],
  },
  {
    maker: "ホンダ",
    model: "シビック",
    releases: [
      {
        year: 2000,
        month: 9,
        型式コード: ["LA-EU1"],
      },
      {
        year: 2005,
        month: 9,
        型式コード: ["DBA-FD2", "ABA-FD2"],
      },
    ],
  },
  {
    maker: "日産",
    model: "セレナ",
    releases: [
      {
        year: 2000,
        month: null,
        型式コード: ["CBA-C25", "CBA-NC25"],
      },
      {
        year: 2002,
        month: 5,
        型式コード: ["CBA-RC24", "UA-RC24"],
      },
    ],
  },
  {
    maker: "トヨタ",
    model: "プリウス",
    releases: [
      {
        year: 1997,
        month: 12,
        型式コード: ["NHW10"],
      },
      {
        year: 2000,
        month: 5,
        型式コード: ["NHW11"],
      },
      {
        year: 2003,
        month: 9,
        型式コード: ["DAA-NHW20"],
      },
      {
        year: 2009,
        month: 5,
        型式コード: ["DAA-ZVW30"],
      },
      {
        year: 2015,
        month: 12,
        型式コード: ["DAA-ZVW50", "DAA-ZVW51", "DAA-ZVW55"],
      },
      {
        year: 2023,
        month: 1,
        型式コード: ["6AA-MXWH60", "6AA-MXWH65"],
      },
    ],
  },
  {
    maker: "トヨタ",
    model: "ハリアー",
    releases: [
      {
        year: 1997,
        month: 12,
        型式コード: ["SXU10W", "SXU15W", "MCU10W", "MCU15W"],
      },
      {
        year: 2003,
        month: 2,
        型式コード: ["CBA-MCU30W", "CBA-MCU31W", "CBA-MCU35W"],
      },
      {
        year: 2013,
        month: 12,
        型式コード: ["DAA-ZSU60W", "DAA-ZSU65W"],
      },
      {
        year: 2020,
        month: 6,
        型式コード: ["6BA-MXUA80", "6BA-MXUA85", "6AA-AXUH80", "6AA-AXUH85"],
      },
    ],
  },
];

// Convert release to a Vehicle object
function releaseToVehicle(
  vehicleData: VehicleData,
  release: VehicleRelease,
  modelCode: string
): Vehicle {
  const monthStr = release.month ? `/${release.month}` : "";
  const releaseDateStr = release.month ? `${release.year}/${release.month}` : `${release.year}`;
  
  return {
    id: `${vehicleData.maker}-${vehicleData.model}-${release.year}-${modelCode}`,
    make: vehicleData.maker,
    model: vehicleData.model,
    year: release.year.toString(),
    modelCode: modelCode,
    releaseDate: releaseDateStr,
  };
}

// Get all vehicles (flattened)
export function getAllVehicles(): Vehicle[] {
  const vehicles: Vehicle[] = [];
  
  for (const vehicleData of vehicleDatabase) {
    for (const release of vehicleData.releases) {
      for (const modelCode of release.型式コード) {
        vehicles.push(releaseToVehicle(vehicleData, release, modelCode));
      }
    }
  }
  
  return vehicles;
}

// Search by model code
export function searchByModelCode(code: string): Vehicle[] {
  if (!code || code.trim() === "") {
    return [];
  }

  const searchTerm = code.trim().toUpperCase();
  const results: Vehicle[] = [];

  for (const vehicleData of vehicleDatabase) {
    for (const release of vehicleData.releases) {
      for (const modelCode of release.型式コード) {
        if (modelCode.toUpperCase().includes(searchTerm)) {
          results.push(releaseToVehicle(vehicleData, release, modelCode));
        }
      }
    }
  }

  return results;
}

// Search by make and model
export function searchByMakeAndModel(make: string, model: string): Vehicle[] {
  if ((!make || make.trim() === "") && (!model || model.trim() === "")) {
    return [];
  }

  const makeTerm = make ? make.trim().toLowerCase() : "";
  const modelTerm = model ? model.trim().toLowerCase() : "";
  const results: Vehicle[] = [];

  for (const vehicleData of vehicleDatabase) {
    const matchesMake = !makeTerm || vehicleData.maker.toLowerCase().includes(makeTerm);
    const matchesModel = !modelTerm || vehicleData.model.toLowerCase().includes(modelTerm);

    if (matchesMake && matchesModel) {
      for (const release of vehicleData.releases) {
        for (const modelCode of release.型式コード) {
          results.push(releaseToVehicle(vehicleData, release, modelCode));
        }
      }
    }
  }

  return results;
}

// Get unique makes
export function getUniqueMakes(): string[] {
  const makes = new Set<string>();
  for (const vehicleData of vehicleDatabase) {
    makes.add(vehicleData.maker);
  }
  return Array.from(makes).sort();
}

// Get models for a specific make
export function getModelsForMake(make: string): string[] {
  if (!make || make.trim() === "") {
    return [];
  }

  const models = new Set<string>();
  const makeTerm = make.trim().toLowerCase();

  for (const vehicleData of vehicleDatabase) {
    if (vehicleData.maker.toLowerCase() === makeTerm) {
      models.add(vehicleData.model);
    }
  }

  return Array.from(models).sort();
}

// Get years for a specific make and model
export function getYearsForMakeAndModel(make: string, model: string): number[] {
  if (!make || !model) {
    return [];
  }

  const years = new Set<number>();
  const makeTerm = make.trim().toLowerCase();
  const modelTerm = model.trim().toLowerCase();

  for (const vehicleData of vehicleDatabase) {
    if (
      vehicleData.maker.toLowerCase() === makeTerm &&
      vehicleData.model.toLowerCase() === modelTerm
    ) {
      for (const release of vehicleData.releases) {
        years.add(release.year);
      }
    }
  }

  return Array.from(years).sort((a, b) => b - a); // Most recent first
}

// Get model codes for specific make, model, and year
export function getModelCodesForVehicle(
  make: string,
  model: string,
  year?: number
): string[] {
  if (!make || !model) {
    return [];
  }

  const modelCodes: string[] = [];
  const makeTerm = make.trim().toLowerCase();
  const modelTerm = model.trim().toLowerCase();

  for (const vehicleData of vehicleDatabase) {
    if (
      vehicleData.maker.toLowerCase() === makeTerm &&
      vehicleData.model.toLowerCase() === modelTerm
    ) {
      for (const release of vehicleData.releases) {
        if (!year || release.year === year) {
          modelCodes.push(...release.型式コード);
        }
      }
    }
  }

  return modelCodes;
}

// Create a custom vehicle (for manual entry)
export function createCustomVehicle(
  make: string,
  model: string,
  year: string,
  modelCode?: string,
  locale: Locale = "ja"
): Vehicle {
  return {
    id: `custom-${Date.now()}`,
    make,
    model,
    year,
    modelCode: modelCode || (locale === "en" ? "Unknown" : "不明"),
  };
}
