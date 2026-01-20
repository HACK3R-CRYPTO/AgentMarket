/**
 * Basic unit tests for validation functions
 * Run with: npm test or tsx src/__tests__/validation.test.ts
 */

import { validateAgentInput, validateAgentCreation, sanitizeString } from "../middleware/validation";

// Simple test runner
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error);
  }
}

function expect(actual: any) {
  return {
    toBe: (expected: any) => {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual: (expected: any) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy: () => {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy: () => {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
  };
}

// Tests
console.log("Running validation tests...\n");

test("sanitizeString removes null bytes", () => {
  const input = "test\x00string";
  const result = sanitizeString(input);
  expect(result).toBe("teststring");
});

test("sanitizeString limits length", () => {
  const input = "a".repeat(20000);
  const result = sanitizeString(input, 100);
  expect(result.length).toBe(100);
});

test("validateAgentInput accepts valid input", () => {
  const result = validateAgentInput("This is a valid input");
  expect(result.valid).toBeTruthy();
});

test("validateAgentInput rejects empty input", () => {
  const result = validateAgentInput("");
  expect(result.valid).toBeFalsy();
});

test("validateAgentInput rejects input with script tags", () => {
  const result = validateAgentInput("<script>alert('xss')</script>");
  expect(result.valid).toBeFalsy();
});

test("validateAgentInput rejects overly long input", () => {
  const input = "a".repeat(10001);
  const result = validateAgentInput(input);
  expect(result.valid).toBeFalsy();
});

test("validateAgentCreation accepts valid data", () => {
  const result = validateAgentCreation({
    name: "Test Agent",
    description: "This is a test agent description",
    price: 0.10,
  });
  expect(result.valid).toBeTruthy();
});

test("validateAgentCreation rejects short name", () => {
  const result = validateAgentCreation({
    name: "AB",
    description: "Valid description here",
    price: 0.10,
  });
  expect(result.valid).toBeFalsy();
});

test("validateAgentCreation rejects negative price", () => {
  const result = validateAgentCreation({
    name: "Test Agent",
    description: "Valid description here",
    price: -1,
  });
  expect(result.valid).toBeFalsy();
});

test("validateAgentCreation rejects price over limit", () => {
  const result = validateAgentCreation({
    name: "Test Agent",
    description: "Valid description here",
    price: 2000,
  });
  expect(result.valid).toBeFalsy();
});

console.log("\n✅ All tests completed!");
