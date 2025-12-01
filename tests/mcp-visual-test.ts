/**
 * MCP Visual Test Suite
 * 
 * This file contains test scenarios for visual verification using MCP browser tools.
 * Run these tests to verify the application works correctly in the browser.
 */

export const visualTestScenarios = {
  // Test 1: Homepage loads correctly
  homepageLoads: {
    name: "Homepage loads correctly",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 3,
        description: "Wait for page to load"
      },
      {
        action: "snapshot",
        description: "Take snapshot to verify page loaded"
      },
      {
        action: "verify",
        check: "title",
        expected: "過失割合計算機",
        description: "Verify page title is correct"
      },
      {
        action: "verify",
        check: "element",
        selector: "h1",
        expected: "過失割合計算機",
        description: "Verify main heading exists"
      }
    ]
  },

  // Test 2: Workflow stepper is visible
  workflowStepperVisible: {
    name: "Workflow stepper is visible",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 3,
        description: "Wait for page to load"
      },
      {
        action: "verify",
        check: "text",
        expected: "認定基準の検索",
        description: "Verify Step 1 text is visible"
      },
      {
        action: "verify",
        check: "text",
        expected: "修正要素の適用",
        description: "Verify Step 2 text is visible"
      },
      {
        action: "verify",
        check: "text",
        expected: "AI推奨の確認",
        description: "Verify Step 3 text is visible"
      }
    ]
  },

  // Test 3: Step 1 - Search functionality
  step1Search: {
    name: "Step 1 - Search functionality works",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 3,
        description: "Wait for page to load"
      },
      {
        action: "verify",
        check: "element",
        selector: "input[placeholder*='交差点']",
        description: "Verify search input exists"
      },
      {
        action: "type",
        element: "search input",
        text: "交差点",
        description: "Type search term"
      },
      {
        action: "wait",
        time: 1,
        description: "Wait for search results"
      },
      {
        action: "verify",
        check: "text",
        expected: "交差点での歩行者と直進車との事故",
        description: "Verify search results appear"
      }
    ]
  },

  // Test 4: Chat window is collapsible
  chatWindowCollapsible: {
    name: "Chat window is collapsible",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 3,
        description: "Wait for page to load"
      },
      {
        action: "verify",
        check: "text",
        expected: "アシスタントチャット",
        description: "Verify chat window header exists"
      },
      {
        action: "click",
        element: "chat window header",
        description: "Click to collapse chat window"
      },
      {
        action: "wait",
        time: 1,
        description: "Wait for collapse animation"
      },
      {
        action: "verify",
        check: "not_visible",
        element: "chat input",
        description: "Verify chat input is hidden when collapsed"
      },
      {
        action: "click",
        element: "chat window header",
        description: "Click to expand chat window"
      },
      {
        action: "wait",
        time: 1,
        description: "Wait for expand animation"
      },
      {
        action: "verify",
        check: "visible",
        element: "chat input",
        description: "Verify chat input is visible when expanded"
      }
    ]
  },

  // Test 5: Step navigation works
  stepNavigation: {
    name: "Step navigation works",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 3,
        description: "Wait for page to load"
      },
      {
        action: "click",
        element: "step 2 button",
        description: "Click on Step 2"
      },
      {
        action: "wait",
        time: 1,
        description: "Wait for step change"
      },
      {
        action: "verify",
        check: "text",
        expected: "ステップ2: 修正要素の適用と計算",
        description: "Verify Step 2 content is displayed"
      },
      {
        action: "click",
        element: "step 3 button",
        description: "Click on Step 3"
      },
      {
        action: "wait",
        time: 1,
        description: "Wait for step change"
      },
      {
        action: "verify",
        check: "text",
        expected: "ステップ3: AI推奨基準の確認",
        description: "Verify Step 3 content is displayed"
      }
    ]
  },

  // Test 6: No console errors
  noConsoleErrors: {
    name: "No console errors",
    steps: [
      {
        action: "navigate",
        url: "http://localhost:3000",
        description: "Navigate to homepage"
      },
      {
        action: "wait",
        time: 5,
        description: "Wait for page to fully load"
      },
      {
        action: "check_console",
        description: "Check for console errors"
      },
      {
        action: "verify",
        check: "no_errors",
        description: "Verify no critical errors in console"
      }
    ]
  }
};

export type TestAction = 
  | { action: "navigate"; url: string; description: string }
  | { action: "wait"; time: number; description: string }
  | { action: "snapshot"; description: string }
  | { action: "verify"; check: string; expected?: string; selector?: string; element?: string; description: string }
  | { action: "type"; element: string; text: string; description: string }
  | { action: "click"; element: string; description: string }
  | { action: "check_console"; description: string };

