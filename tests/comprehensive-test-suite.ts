/**
 * Comprehensive Test Suite for Accident Report System
 * Focus: Vehicle search functionality and core features
 */

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper function to log test results
function logTest(name: string, passed: boolean, error?: string, details?: any) {
  results.push({ testName: name, passed, error, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) console.log(`   Error: ${error}`);
  if (details) console.log(`   Details:`, JSON.stringify(details, null, 2));
}

// Test 1: Get All Vehicles
async function testGetAllVehicles() {
  try {
    const { getAllVehicles } = await import('../lib/vehicleData');
    const vehicles = getAllVehicles();
    
    if (!vehicles || !Array.isArray(vehicles)) {
      throw new Error('Vehicles is not an array');
    }
    
    if (vehicles.length === 0) {
      throw new Error('Vehicles array is empty');
    }
    
    // Check structure of first vehicle
    const firstVehicle = vehicles[0];
    const requiredFields = ['id', 'modelCode', 'make', 'model', 'year'];
    const missingFields = requiredFields.filter(field => !(field in firstVehicle));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }
    
    logTest('Get All Vehicles', true, undefined, {
      totalVehicles: vehicles.length,
      sampleVehicle: firstVehicle
    });
  } catch (error: any) {
    logTest('Get All Vehicles', false, error.message);
  }
}

// Test 2: Get Unique Makes
async function testGetUniqueMakes() {
  try {
    const { getUniqueMakes } = await import('../lib/vehicleData');
    const makes = getUniqueMakes();
    
    if (!Array.isArray(makes)) {
      throw new Error('Result is not an array');
    }
    
    if (makes.length === 0) {
      throw new Error('No makes found');
    }
    
    // Check if Honda and Toyota exist (Japanese names)
    const hasHonda = makes.includes('ホンダ');
    const hasToyota = makes.includes('トヨタ');
    
    logTest('Get Unique Makes', true, undefined, {
      totalMakes: makes.length,
      hasHonda,
      hasToyota,
      makes: makes
    });
  } catch (error: any) {
    logTest('Get Unique Makes', false, error.message);
  }
}

// Test 3: Get Models for Make - Honda
async function testGetModelsForMakeHonda() {
  try {
    const { getModelsForMake } = await import('../lib/vehicleData');
    const models = getModelsForMake('ホンダ');
    
    if (!Array.isArray(models)) {
      throw new Error('Result is not an array');
    }
    
    if (models.length === 0) {
      throw new Error('No Honda models found');
    }
    
    // Check if Civic exists (シビック)
    const hasCivic = models.includes('シビック');
    
    logTest('Get Models for Make - Honda', true, undefined, {
      totalModels: models.length,
      hasCivic,
      models: models
    });
  } catch (error: any) {
    logTest('Get Models for Make - Honda', false, error.message);
  }
}

// Test 4: Get Models for Make - Toyota
async function testGetModelsForMakeToyota() {
  try {
    const { getModelsForMake } = await import('../lib/vehicleData');
    const models = getModelsForMake('トヨタ');
    
    if (!Array.isArray(models)) {
      throw new Error('Result is not an array');
    }
    
    if (models.length === 0) {
      throw new Error('No Toyota models found');
    }
    
    // Check if Corolla exists (カローラ)
    const hasCorolla = models.includes('カローラ');
    
    logTest('Get Models for Make - Toyota', true, undefined, {
      totalModels: models.length,
      hasCorolla,
      models: models
    });
  } catch (error: any) {
    logTest('Get Models for Make - Toyota', false, error.message);
  }
}

// Test 5: Get Years for Make and Model
async function testGetYearsForMakeAndModel() {
  try {
    const { getYearsForMakeAndModel } = await import('../lib/vehicleData');
    const years = getYearsForMakeAndModel('ホンダ', 'シビック');
    
    if (!Array.isArray(years)) {
      throw new Error('Result is not an array');
    }
    
    if (years.length === 0) {
      throw new Error('No years found for Honda シビック');
    }
    
    // Check if years are numbers
    const allNumbers = years.every(y => typeof y === 'number');
    
    logTest('Get Years for Make and Model', true, undefined, {
      totalYears: years.length,
      allNumbers,
      years: years
    });
  } catch (error: any) {
    logTest('Get Years for Make and Model', false, error.message);
  }
}

// Test 6: Get Model Codes for Vehicle
async function testGetModelCodesForVehicle() {
  try {
    const { getModelCodesForVehicle } = await import('../lib/vehicleData');
    const modelCodes = getModelCodesForVehicle('ホンダ', 'シビック', 2020);
    
    if (!Array.isArray(modelCodes)) {
      throw new Error('Result is not an array');
    }
    
    // It's okay if no exact match for 2020, but should return array
    logTest('Get Model Codes for Vehicle', true, undefined, {
      totalModelCodes: modelCodes.length,
      modelCodes: modelCodes
    });
  } catch (error: any) {
    logTest('Get Model Codes for Vehicle', false, error.message);
  }
}

// Test 7: Search Vehicles by Make and Model
async function testSearchVehiclesByMakeAndModel() {
  try {
    const { searchByMakeAndModel } = await import('../lib/vehicleData');
    const results = searchByMakeAndModel('ホンダ', 'シビック');
    
    if (!Array.isArray(results)) {
      throw new Error('Result is not an array');
    }
    
    if (results.length === 0) {
      throw new Error('No vehicles found for Honda シビック');
    }
    
    // Verify all results match criteria
    const allMatch = results.every(v => v.make === 'ホンダ' && v.model === 'シビック');
    
    if (!allMatch) {
      throw new Error('Some results do not match search criteria');
    }
    
    logTest('Search Vehicles by Make and Model', true, undefined, {
      totalResults: results.length,
      sampleVehicles: results.slice(0, 3).map(v => ({
        modelCode: v.modelCode,
        make: v.make,
        model: v.model,
        year: v.year
      }))
    });
  } catch (error: any) {
    logTest('Search Vehicles by Make and Model', false, error.message);
  }
}

// Test 8: Search Vehicles by Model Code
async function testSearchVehiclesByModelCode() {
  try {
    const { searchByModelCode, getAllVehicles } = await import('../lib/vehicleData');
    
    // Get a valid model code from the data
    const vehicles = getAllVehicles();
    if (vehicles.length === 0) {
      throw new Error('No vehicles in database');
    }
    
    const sampleModelCode = vehicles[0].modelCode;
    const results = searchByModelCode(sampleModelCode);
    
    if (!Array.isArray(results)) {
      throw new Error('Result is not an array');
    }
    
    if (results.length === 0) {
      throw new Error(`No vehicles found for model code: ${sampleModelCode}`);
    }
    
    // Verify all results match the model code
    const allMatch = results.every(v => v.modelCode === sampleModelCode);
    
    if (!allMatch) {
      throw new Error('Some results do not match model code');
    }
    
    logTest('Search Vehicles by Model Code', true, undefined, {
      searchedModelCode: sampleModelCode,
      totalResults: results.length,
      sampleVehicle: results[0]
    });
  } catch (error: any) {
    logTest('Search Vehicles by Model Code', false, error.message);
  }
}

// Test 9: Search Vehicles - Partial Model Code Match
async function testSearchVehiclesPartialModelCode() {
  try {
    const { searchByModelCode } = await import('../lib/vehicleData');
    
    // Search for partial model code (e.g., "TA-" prefix)
    const results = searchByModelCode('TA-');
    
    if (!Array.isArray(results)) {
      throw new Error('Result is not an array');
    }
    
    // Should return vehicles with model codes starting with "TA-"
    logTest('Search Vehicles - Partial Model Code', true, undefined, {
      totalResults: results.length,
      sampleModelCodes: results.slice(0, 5).map(v => v.modelCode)
    });
  } catch (error: any) {
    logTest('Search Vehicles - Partial Model Code', false, error.message);
  }
}

// Test 10: Search Vehicles - Empty Make Returns All Models
async function testSearchVehiclesEmptyMake() {
  try {
    const { searchByMakeAndModel } = await import('../lib/vehicleData');
    const results = searchByMakeAndModel('', 'シビック');
    
    if (!Array.isArray(results)) {
      throw new Error('Result is not an array');
    }
    
    // Should return all Civic vehicles regardless of maker
    const allMatchModel = results.every(v => v.model === 'シビック');
    
    if (results.length > 0 && !allMatchModel) {
      throw new Error('Some results do not match model');
    }
    
    logTest('Search Vehicles - Empty Make', true, undefined, {
      totalResults: results.length,
      allMatchModel
    });
  } catch (error: any) {
    logTest('Search Vehicles - Empty Make', false, error.message);
  }
}

// Test 11: Calculator - Basic Calculation
async function testCalculatorBasicCalculation() {
  try {
    const { calculateFaultPercentage } = await import('../lib/calculator');
    
    const result = calculateFaultPercentage(
      50, // baseFault
      [{ factorId: 'test', factorDescription: 'Test modifier', adjustment: 10 }] // modifiers
    );
    
    if (typeof result !== 'number') {
      throw new Error('Result is not a number');
    }
    
    // 50 + 10 = 60
    if (result !== 60) {
      throw new Error(`Expected 60, got ${result}`);
    }
    
    logTest('Calculator - Basic Calculation', true, undefined, {
      baseFault: 50,
      modifier: 10,
      result: 60
    });
  } catch (error: any) {
    logTest('Calculator - Basic Calculation', false, error.message);
  }
}

// Test 12: Calculator - Multiple Modifiers
async function testCalculatorMultipleModifiers() {
  try {
    const { calculateFaultPercentage } = await import('../lib/calculator');
    
    const result = calculateFaultPercentage(
      50, // baseFault
      [
        { factorId: 'test1', factorDescription: 'Modifier 1', adjustment: 10 },
        { factorId: 'test2', factorDescription: 'Modifier 2', adjustment: -5 }
      ]
    );
    
    if (typeof result !== 'number') {
      throw new Error('Result is not a number');
    }
    
    // 50 + 10 - 5 = 55
    if (result !== 55) {
      throw new Error(`Expected 55, got ${result}`);
    }
    
    logTest('Calculator - Multiple Modifiers', true, undefined, {
      baseFault: 50,
      modifiers: [10, -5],
      result: 55
    });
  } catch (error: any) {
    logTest('Calculator - Multiple Modifiers', false, error.message);
  }
}

// Test 13: Calculator - Boundary Checking (Max 100)
async function testCalculatorBoundaryMax() {
  try {
    const { calculateFaultPercentage } = await import('../lib/calculator');
    
    const result = calculateFaultPercentage(
      80,
      [{ factorId: 'test', factorDescription: 'Large modifier', adjustment: 50 }]
    );
    
    if (typeof result !== 'number') {
      throw new Error('Result is not a number');
    }
    
    // 80 + 50 = 130, but should cap at 100
    if (result !== 100) {
      throw new Error(`Expected 100 (capped), got ${result}`);
    }
    
    logTest('Calculator - Boundary Max (100)', true, undefined, {
      baseFault: 80,
      modifier: 50,
      result: 100,
      note: 'Correctly capped at 100'
    });
  } catch (error: any) {
    logTest('Calculator - Boundary Max (100)', false, error.message);
  }
}

// Test 14: Calculator - Boundary Checking (Min 0)
async function testCalculatorBoundaryMin() {
  try {
    const { calculateFaultPercentage } = await import('../lib/calculator');
    
    const result = calculateFaultPercentage(
      20,
      [{ factorId: 'test', factorDescription: 'Large negative modifier', adjustment: -50 }]
    );
    
    if (typeof result !== 'number') {
      throw new Error('Result is not a number');
    }
    
    // 20 - 50 = -30, but should cap at 0
    if (result !== 0) {
      throw new Error(`Expected 0 (capped), got ${result}`);
    }
    
    logTest('Calculator - Boundary Min (0)', true, undefined, {
      baseFault: 20,
      modifier: -50,
      result: 0,
      note: 'Correctly capped at 0'
    });
  } catch (error: any) {
    logTest('Calculator - Boundary Min (0)', false, error.message);
  }
}

// Test 15: Sample Criteria Data Structure
async function testSampleCriteriaStructure() {
  try {
    const { sampleCriteria } = await import('../data/sampleCriteria');
    
    if (!Array.isArray(sampleCriteria)) {
      throw new Error('sampleCriteria is not an array');
    }
    
    if (sampleCriteria.length === 0) {
      throw new Error('sampleCriteria is empty');
    }
    
    // Check structure of first criteria
    const firstCriteria = sampleCriteria[0];
    const requiredFields = ['id', 'title', 'baseFaultPercentage'];
    const missingFields = requiredFields.filter(field => !(field in firstCriteria));
    
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`);
    }
    
    logTest('Sample Criteria Data Structure', true, undefined, {
      totalCriteria: sampleCriteria.length,
      sampleCriteria: {
        id: firstCriteria.id,
        title: firstCriteria.title.substring(0, 50) + '...',
        baseFaultPercentage: firstCriteria.baseFaultPercentage
      }
    });
  } catch (error: any) {
    logTest('Sample Criteria Data Structure', false, error.message);
  }
}

// Test 16: Vector Index Structure
async function testVectorIndexStructure() {
  try {
    const vectorIndex = await import('../data/vectorIndex.json');
    
    // vectorIndex.json is an array directly, not wrapped in an object
    const embeddings = vectorIndex.default || vectorIndex;
    
    if (!Array.isArray(embeddings)) {
      throw new Error('embeddings is not an array');
    }
    
    if (embeddings.length === 0) {
      throw new Error('embeddings array is empty');
    }
    
    // Check structure of first embedding
    const firstEmbedding = embeddings[0];
    if (!firstEmbedding.id || !firstEmbedding.embedding || !Array.isArray(firstEmbedding.embedding)) {
      throw new Error('Invalid embedding structure');
    }
    
    logTest('Vector Index Structure', true, undefined, {
      totalEmbeddings: embeddings.length,
      embeddingDimension: firstEmbedding.embedding.length,
      sampleId: firstEmbedding.id
    });
  } catch (error: any) {
    logTest('Vector Index Structure', false, error.message);
  }
}

// Test 17: AI Analyze Accident API
async function testAIAnalyzeAccidentAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/ai-analyze-accident', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accidentDescription: '交差点で歩行者が青信号で横断歩道を渡っていたところ、赤信号を無視して交差点に進入した乗用車と衝突した事故です。歩行者は横断歩道の中央付近で衝突し、車両は交差点に完全に進入していました。'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.step1 || !data.step1.recommendedCriteriaId) {
      throw new Error('No recommendedCriteriaId in response');
    }
    
    if (typeof data.step1.confidence !== 'number') {
      throw new Error('Confidence is not a number');
    }
    
    logTest('AI Analyze Accident API', true, undefined, {
      criteriaId: data.step1.recommendedCriteriaId,
      confidence: data.step1.confidence,
      reasoning: data.step1.reasoning?.substring(0, 100) + '...',
      summary: data.summary?.substring(0, 50) + '...'
    });
  } catch (error: any) {
    logTest('AI Analyze Accident API', false, error.message);
  }
}

// Test 18: Chat API - Text Message
async function testChatAPITextMessage() {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '交差点での事故について教えてください' }
        ]
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.message) {
      throw new Error('No message in response');
    }
    
    logTest('Chat API - Text Message', true, undefined, {
      responseLength: data.message.length,
      responsePreview: data.message.substring(0, 100) + '...'
    });
  } catch (error: any) {
    logTest('Chat API - Text Message', false, error.message);
  }
}

// Test 19: AI Report Generation API
async function testAIReportGenerationAPI() {
  try {
    const mockReportData = {
      selectedCriteria: {
        id: 'intersection-pedestrian-signal-no-change',
        title: '交差点で歩行者が青信号で横断中、車が赤信号で進入',
        baseFaultPercentage: 10
      },
      appliedModifications: [
        {
          factorId: 'elderly-pedestrian',
          factorDescription: '歩行者が高齢者の場合',
          adjustment: -5
        }
      ],
      finalFaultPercentage: 5,
      vehicles: [
        {
          id: 'v1',
          make: 'トヨタ',
          model: 'プリウス',
          year: '2020',
          modelCode: 'DAA-ZVW50'
        }
      ]
    };
    
    const response = await fetch('http://localhost:3000/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reportData: mockReportData
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.reportText) {
      throw new Error('No reportText in response');
    }
    
    if (data.reportText.length < 100) {
      throw new Error('Report text is too short');
    }
    
    // Check if report contains key sections
    const hasOverview = data.reportText.includes('事故') || data.reportText.includes('概要');
    const hasCriteria = data.reportText.includes('認定基準') || data.reportText.includes('基準');
    const hasFaultPercentage = data.reportText.includes('過失割合') || data.reportText.includes('%');
    
    if (!hasOverview && !hasCriteria && !hasFaultPercentage) {
      throw new Error('Report missing key sections');
    }
    
    logTest('AI Report Generation API', true, undefined, {
      reportLength: data.reportText.length,
      hasOverview,
      hasCriteria,
      hasFaultPercentage,
      reportPreview: data.reportText.substring(0, 150) + '...'
    });
  } catch (error: any) {
    logTest('AI Report Generation API', false, error.message);
  }
}

// Test 20: Vehicle Search Integration - Complete Flow
async function testVehicleSearchCompleteFlow() {
  try {
    const { getUniqueMakes, getModelsForMake, getYearsForMakeAndModel, getModelCodesForVehicle, searchByMakeAndModel } = await import('../lib/vehicleData');
    
    // Step 1: Get makes
    const makes = getUniqueMakes();
    if (makes.length === 0) throw new Error('No makes found');
    
    // Step 2: Select Honda
    const selectedMake = 'ホンダ';
    if (!makes.includes(selectedMake)) throw new Error('Honda not found in makes');
    
    // Step 3: Get models for Honda
    const models = getModelsForMake(selectedMake);
    if (models.length === 0) throw new Error('No models found for Honda');
    
    // Step 4: Select Civic
    const selectedModel = 'シビック';
    if (!models.includes(selectedModel)) throw new Error('Civic not found in Honda models');
    
    // Step 5: Get years for Honda Civic
    const years = getYearsForMakeAndModel(selectedMake, selectedModel);
    if (years.length === 0) throw new Error('No years found for Honda Civic');
    
    // Step 6: Select a year
    const selectedYear = years[0];
    
    // Step 7: Get model codes
    const modelCodes = getModelCodesForVehicle(selectedMake, selectedModel, selectedYear);
    // Model codes might be empty if no exact year match, that's okay
    
    // Step 8: Search vehicles
    const vehicles = searchByMakeAndModel(selectedMake, selectedModel);
    if (vehicles.length === 0) throw new Error('No vehicles found for Honda Civic');
    
    // Verify data integrity
    const allHondaCivic = vehicles.every(v => v.make === selectedMake && v.model === selectedModel);
    if (!allHondaCivic) throw new Error('Search results contain non-Honda Civic vehicles');
    
    logTest('Vehicle Search - Complete Flow', true, undefined, {
      flow: 'Make → Model → Year → ModelCode → Search',
      selectedMake,
      selectedModel,
      selectedYear,
      availableModels: models.length,
      availableYears: years.length,
      availableModelCodes: modelCodes.length,
      searchResults: vehicles.length,
      dataIntegrityCheck: 'PASS'
    });
  } catch (error: any) {
    logTest('Vehicle Search - Complete Flow', false, error.message);
  }
}

// Test 21: Vehicle Search - Toyota Prius Flow
async function testVehicleSearchToyotaPriusFlow() {
  try {
    const { getUniqueMakes, getModelsForMake, getYearsForMakeAndModel, searchByMakeAndModel } = await import('../lib/vehicleData');
    
    // Step 1: Get makes
    const makes = getUniqueMakes();
    const selectedMake = 'トヨタ';
    if (!makes.includes(selectedMake)) throw new Error('Toyota not found in makes');
    
    // Step 2: Get models for Toyota
    const models = getModelsForMake(selectedMake);
    if (models.length === 0) throw new Error('No models found for Toyota');
    
    // Step 3: Select Prius
    const selectedModel = 'プリウス';
    if (!models.includes(selectedModel)) throw new Error('Prius not found in Toyota models');
    
    // Step 4: Get years for Toyota Prius
    const years = getYearsForMakeAndModel(selectedMake, selectedModel);
    if (years.length === 0) throw new Error('No years found for Toyota Prius');
    
    // Step 5: Search vehicles
    const vehicles = searchByMakeAndModel(selectedMake, selectedModel);
    if (vehicles.length === 0) throw new Error('No vehicles found for Toyota Prius');
    
    logTest('Vehicle Search - Toyota Prius Flow', true, undefined, {
      selectedMake,
      selectedModel,
      availableModels: models.length,
      availableYears: years.length,
      searchResults: vehicles.length
    });
  } catch (error: any) {
    logTest('Vehicle Search - Toyota Prius Flow', false, error.message);
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🧪 Starting Comprehensive Test Suite...\n');
  console.log('=' .repeat(80));
  console.log('\n📦 UNIT TESTS - Vehicle Data & Calculator\n');
  console.log('=' .repeat(80));
  
  // Vehicle data tests
  await testGetAllVehicles();
  await testGetUniqueMakes();
  await testGetModelsForMakeHonda();
  await testGetModelsForMakeToyota();
  await testGetYearsForMakeAndModel();
  await testGetModelCodesForVehicle();
  await testSearchVehiclesByMakeAndModel();
  await testSearchVehiclesByModelCode();
  await testSearchVehiclesPartialModelCode();
  await testSearchVehiclesEmptyMake();
  
  // Calculator tests
  await testCalculatorBasicCalculation();
  await testCalculatorMultipleModifiers();
  await testCalculatorBoundaryMax();
  await testCalculatorBoundaryMin();
  
  // Data structure tests
  await testSampleCriteriaStructure();
  await testVectorIndexStructure();
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n🔄 INTEGRATION TESTS - Complete Workflows\n');
  console.log('=' .repeat(80));
  
  // Integration tests
  await testVehicleSearchCompleteFlow();
  await testVehicleSearchToyotaPriusFlow();
  
  console.log('\n' + '=' .repeat(80));
  console.log('\n🌐 API TESTS (requires server on port 3000)\n');
  console.log('=' .repeat(80));
  
  // API tests (require server)
  await testAIAnalyzeAccidentAPI();
  await testChatAPITextMessage();
  await testAIReportGenerationAPI();
  
  // Summary
  console.log('\n' + '=' .repeat(80));
  console.log('\n📊 TEST SUMMARY\n');
  console.log('=' .repeat(80));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const passRate = ((passed / total) * 100).toFixed(2);
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}`);
      console.log(`    Error: ${r.error}`);
    });
  } else {
    console.log('\n🎉 All tests passed!');
  }
  
  console.log('\n' + '=' .repeat(80));
  
  // Exit with error code if tests failed
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();
