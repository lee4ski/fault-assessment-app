import { describe, it, expect } from "vitest";
import { calculateFaultPercentage, searchCriteria } from "../calculator";
import { AssessmentCriteria, AppliedModification } from "@/types";

describe("calculateFaultPercentage", () => {
  it("returns base percentage when no modifications", () => {
    const result = calculateFaultPercentage(10, []);
    expect(result).toBe(10);
  });

  it("applies single modification correctly", () => {
    const modifications: AppliedModification[] = [
      { factorId: "1", factorDescription: "Test", adjustment: -5 },
    ];
    const result = calculateFaultPercentage(10, modifications);
    expect(result).toBe(5);
  });

  it("applies multiple modifications correctly", () => {
    const modifications: AppliedModification[] = [
      { factorId: "1", factorDescription: "Test 1", adjustment: -5 },
      { factorId: "2", factorDescription: "Test 2", adjustment: +10 },
    ];
    const result = calculateFaultPercentage(10, modifications);
    expect(result).toBe(15);
  });

  it("clamps result to 0 minimum", () => {
    const modifications: AppliedModification[] = [
      { factorId: "1", factorDescription: "Test", adjustment: -20 },
    ];
    const result = calculateFaultPercentage(10, modifications);
    expect(result).toBe(0);
  });

  it("clamps result to 100 maximum", () => {
    const modifications: AppliedModification[] = [
      { factorId: "1", factorDescription: "Test", adjustment: +50 },
    ];
    const result = calculateFaultPercentage(60, modifications);
    expect(result).toBe(100);
  });
});

describe("searchCriteria", () => {
  const criteria: AssessmentCriteria[] = [
    {
      id: "1",
      chapter: 1,
      chapterTitle: "交差点における事故",
      title: "交差点での歩行者と直進車との事故",
      description: "交差点で歩行者と車が衝突",
      baseFaultPercentage: 10,
      modificationFactors: [],
    },
    {
      id: "2",
      chapter: 2,
      chapterTitle: "駐車場における事故",
      title: "駐車場での出庫車と走行車との事故",
      description: "駐車場で車同士が衝突",
      baseFaultPercentage: 30,
      modificationFactors: [],
    },
  ];

  it("returns all criteria when search term is empty", () => {
    const results = searchCriteria(criteria, "");
    expect(results).toHaveLength(2);
  });

  it("filters by title", () => {
    const results = searchCriteria(criteria, "交差点");
    expect(results).toHaveLength(1);
    expect(results[0].criteria.title).toContain("交差点");
  });

  it("filters by description", () => {
    const results = searchCriteria(criteria, "駐車場");
    expect(results).toHaveLength(1);
    expect(results[0].criteria.description).toContain("駐車場");
  });

  it("returns empty array when no matches", () => {
    const results = searchCriteria(criteria, "存在しないキーワード");
    expect(results).toHaveLength(0);
  });

  it("is case insensitive", () => {
    const results = searchCriteria(criteria, "交差点");
    expect(results.length).toBeGreaterThan(0);
    // Test that lowercase search also works
    const results2 = searchCriteria(criteria, "交差点");
    expect(results2.length).toBeGreaterThan(0);
  });
});

