/**
 * MCP Test Checker
 * 
 * This script performs automated checks that can be run in CI/CD:
 * - Checks if server is running
 * - Validates page structure
 * - Checks for common issues
 */

const http = require('http');
const { spawn } = require('child_process');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TIMEOUT = 10000;

/**
 * Check if server is accessible
 */
function checkServerAccessible() {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: '/',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Check for key elements in HTML
          const hasTitle = data.includes('過失割合計算機');
          const hasMainContent = data.includes('認定基準の検索') || data.includes('Step');
          
          if (hasTitle && hasMainContent) {
            resolve({ 
              accessible: true, 
              statusCode: res.statusCode,
              hasRequiredElements: true
            });
          } else {
            resolve({ 
              accessible: true, 
              statusCode: res.statusCode,
              hasRequiredElements: false,
              warning: 'Page loaded but missing required elements'
            });
          }
        } else {
          reject(new Error(`Server returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Run all checks
 */
async function runChecks() {
  const results = {
    serverAccessible: false,
    pageStructure: false,
    errors: []
  };

  console.log('🔍 Running MCP deployment checks...\n');

  // Check 1: Server accessibility
  try {
    console.log('1. Checking server accessibility...');
    const serverCheck = await checkServerAccessible();
    results.serverAccessible = serverCheck.accessible;
    results.pageStructure = serverCheck.hasRequiredElements;
    
    if (serverCheck.accessible) {
      console.log('   ✅ Server is accessible');
      if (serverCheck.hasRequiredElements) {
        console.log('   ✅ Page structure is correct');
      } else {
        console.log('   ⚠️  Page loaded but missing some elements');
        results.errors.push(serverCheck.warning);
      }
    }
  } catch (error) {
    console.log(`   ❌ Server check failed: ${error.message}`);
    results.errors.push(`Server not accessible: ${error.message}`);
  }

  // Check 2: Validate environment
  console.log('\n2. Checking environment...');
  if (process.env.OPENAI_API_KEY) {
    console.log('   ✅ OPENAI_API_KEY is set');
  } else {
    console.log('   ⚠️  OPENAI_API_KEY is not set (chat may not work)');
    results.errors.push('OPENAI_API_KEY not configured');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Check Summary');
  console.log('='.repeat(60));
  console.log(`Server Accessible: ${results.serverAccessible ? '✅' : '❌'}`);
  console.log(`Page Structure: ${results.pageStructure ? '✅' : '❌'}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Warnings/Errors:');
    results.errors.forEach(err => console.log(`   - ${err}`));
  }

  // For deployment, we want server to be accessible
  // Page structure warnings are acceptable but should be noted
  if (!results.serverAccessible) {
    console.log('\n❌ Deployment check failed: Server not accessible');
    process.exit(1);
  }

  console.log('\n✅ Basic deployment checks passed');
  console.log('⚠️  Note: Full visual tests require MCP browser tools');
  console.log('   Run manual tests using: npm run test:mcp');
  
  return results;
}

// Run checks
runChecks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

