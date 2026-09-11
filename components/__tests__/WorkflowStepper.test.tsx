import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "./test-utils";
import userEvent from "@testing-library/user-event";
import WorkflowStepper from "../WorkflowStepper";

describe("WorkflowStepper", () => {
  it("renders all four steps", () => {
    const onStepChange = vi.fn();
    render(<WorkflowStepper currentStep={1} onStepChange={onStepChange} />);

    // Matches WorkflowStepper's current default `steps` prop (the wizard is
    // a 4-step flow: search → modify → vehicle lookup → AI report).
    expect(screen.getByText("認定基準の検索")).toBeInTheDocument();
    expect(screen.getByText("修正要素の適用")).toBeInTheDocument();
    expect(screen.getByText("車両情報検索")).toBeInTheDocument();
    expect(screen.getByText("AI報告書作成")).toBeInTheDocument();
  });

  it("highlights current step", () => {
    const onStepChange = vi.fn();
    render(<WorkflowStepper currentStep={2} onStepChange={onStepChange} />);
    
    const step2Button = screen.getByRole("button", { name: "2" });
    expect(step2Button).toHaveClass("bg-blue-600");
  });

  it("marks completed steps as green", () => {
    const onStepChange = vi.fn();
    render(<WorkflowStepper currentStep={3} onStepChange={onStepChange} />);

    // Completed (already-visited) steps render a checkmark instead of their
    // number, so query by position rather than by accessible name.
    const buttons = screen.getAllByRole("button");
    const [step1Button, step2Button] = buttons;

    expect(step1Button).toHaveClass("bg-green-500");
    expect(step2Button).toHaveClass("bg-green-500");
  });

  it("calls onStepChange when step is clicked", async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<WorkflowStepper currentStep={1} onStepChange={onStepChange} />);
    
    const step3Button = screen.getByRole("button", { name: "3" });
    await user.click(step3Button);
    
    expect(onStepChange).toHaveBeenCalledWith(3);
  });
});

