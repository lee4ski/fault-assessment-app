import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "./test-utils";
import userEvent from "@testing-library/user-event";
import Step1Search from "../Step1Search";
import { AssessmentCriteria } from "@/types";

// Mock ChatWindow to avoid rendering issues in tests
vi.mock("../ChatWindow", () => ({
  default: () => <div data-testid="chat-window">Chat Window</div>,
}));

// Step1Search calls useRouter(); mock it since tests don't run inside an app router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

const mockCriteria: AssessmentCriteria[] = [
  {
    id: "test-1",
    chapter: 1,
    chapterTitle: "交差点における事故",
    title: "交差点での歩行者と直進車との事故",
    description: "テスト説明1",
    baseFaultPercentage: 10,
    modificationFactors: [],
  },
  {
    id: "test-2",
    chapter: 2,
    chapterTitle: "駐車場における事故",
    title: "駐車場での出庫車と走行車との事故",
    description: "テスト説明2",
    baseFaultPercentage: 30,
    modificationFactors: [],
  },
];

describe("Step1Search", () => {
  it("renders search input and criteria list", () => {
    const onSelect = vi.fn();
    render(<Step1Search criteria={mockCriteria} onSelect={onSelect} />);
    
    expect(screen.getByPlaceholderText(/例: 交差点、歩行者、駐車場など/)).toBeInTheDocument();
    expect(screen.getByText("交差点での歩行者と直進車との事故")).toBeInTheDocument();
    expect(screen.getByText("駐車場での出庫車と走行車との事故")).toBeInTheDocument();
  });

  it("filters criteria when searching", async () => {
    const onSelect = vi.fn();
    render(<Step1Search criteria={mockCriteria} onSelect={onSelect} />);
    
    const searchInput = screen.getByPlaceholderText(/例: 交差点、歩行者、駐車場など/);
    fireEvent.change(searchInput, { target: { value: "交差点" } });
    
    // Wait for debounce (150ms) plus a small buffer
    await waitFor(
      () => {
        expect(screen.getByText("交差点での歩行者と直進車との事故")).toBeInTheDocument();
        expect(screen.queryByText("駐車場での出庫車と走行車との事故")).not.toBeInTheDocument();
      },
      { timeout: 300 }
    );
  });

  it("calls onSelect when criteria is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Step1Search criteria={mockCriteria} onSelect={onSelect} />);
    
    const criteriaItem = screen.getByText("交差点での歩行者と直進車との事故");
    await user.click(criteriaItem);
    
    expect(onSelect).toHaveBeenCalledWith(mockCriteria[0]);
  });

  it("highlights selected criteria", () => {
    const onSelect = vi.fn();
    render(
      <Step1Search
        criteria={mockCriteria}
        onSelect={onSelect}
        selectedCriteria={mockCriteria[0]}
      />
    );
    
    const selectedItem = screen.getByText("交差点での歩行者と直進車との事故").closest("li");
    expect(selectedItem).toHaveClass("bg-blue-50");
  });

  it("shows no results message when search returns empty", async () => {
    const onSelect = vi.fn();
    render(<Step1Search criteria={mockCriteria} onSelect={onSelect} />);
    
    const searchInput = screen.getByPlaceholderText(/例: 交差点、歩行者、駐車場など/);
    fireEvent.change(searchInput, { target: { value: "存在しないキーワード" } });
    
    // Wait for debounce (150ms) plus a small buffer
    await waitFor(
      () => {
        expect(screen.getByText("検索結果が見つかりませんでした")).toBeInTheDocument();
        expect(screen.getByText("フィルタを解除")).toBeInTheDocument();
      },
      { timeout: 300 }
    );
  });
});

