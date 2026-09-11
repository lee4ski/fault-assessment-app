import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "./test-utils";
import userEvent from "@testing-library/user-event";
import Step2Calculate from "../Step2Calculate";
import { AssessmentCriteria } from "@/types";

// Mock ChatWindow to avoid rendering issues in tests
vi.mock("../ChatWindow", () => ({
  default: () => <div data-testid="chat-window">Chat Window</div>,
}));

const mockCriteria: AssessmentCriteria = {
  id: "test-1",
  chapter: 1,
  chapterTitle: "交差点における事故",
  title: "交差点での歩行者と直進車との事故",
  description: "テスト説明",
  baseFaultPercentage: 10,
  modificationFactors: [
    {
      id: "mod-1",
      description: "歩行者が幼児の場合",
      adjustment: -5,
      category: "pedestrian",
    },
    {
      id: "mod-2",
      description: "車両が速度違反をしていた場合",
      adjustment: +10,
      category: "vehicle",
    },
  ],
};

describe("Step2Calculate", () => {
  it("renders base fault percentage", () => {
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);
    
    // Check for base percentage in the blue box (more specific)
    const basePercentageSection = screen.getByText("基本過失割合").closest("div");
    expect(basePercentageSection).toBeInTheDocument();
    expect(basePercentageSection).toHaveTextContent("10%");
  });

  it("displays all modification factors", () => {
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);
    
    expect(screen.getByText("歩行者が幼児の場合")).toBeInTheDocument();
    expect(screen.getByText("車両が速度違反をしていた場合")).toBeInTheDocument();
  });

  it("calculates final percentage when modifications are selected", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);

    // Modification factors are toggle-chip buttons, not checkboxes.
    const factor1 = screen.getByRole("button", { name: /歩行者が幼児の場合/ });
    await user.click(factor1);

    // Final should be 10 - 5 = 5%
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("updates calculation when multiple modifications are selected", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);

    // Select both modifications: 10 - 5 + 10 = 15%
    const factor1 = screen.getByRole("button", { name: /歩行者が幼児の場合/ });
    const factor2 = screen.getByRole("button", { name: /車両が速度違反をしていた場合/ });

    await user.click(factor1);
    await user.click(factor2);

    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("calls onCalculate when save button is clicked", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);

    const saveButton = screen.getByRole("button", { name: "計算結果を保存して次へ" });
    await user.click(saveButton);

    expect(onCalculate).toHaveBeenCalled();
    const callArgs = onCalculate.mock.calls[0][0];
    expect(callArgs.baseFaultPercentage).toBe(10);
    expect(callArgs.finalFaultPercentage).toBe(10);
  });

  it("shows selected modifications in the summary", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    render(<Step2Calculate criteria={mockCriteria} onCalculate={onCalculate} />);

    const factor = screen.getByRole("button", { name: /歩行者が幼児の場合/ });
    await user.click(factor);

    // Check that the modification appears in the summary section
    const summarySection = screen.getByText("最終過失割合:").closest("div");
    expect(summarySection).toBeInTheDocument();
    // The modification should be visible in the summary - use getAllByText since it appears multiple times
    const modificationTexts = screen.getAllByText("歩行者が幼児の場合");
    expect(modificationTexts.length).toBeGreaterThan(0);
    const adjustmentTexts = screen.getAllByText("-5%");
    expect(adjustmentTexts.length).toBeGreaterThan(0);
  });
});

