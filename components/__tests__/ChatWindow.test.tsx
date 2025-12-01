import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatWindow from "../ChatWindow";

// Mock fetch
global.fetch = vi.fn();

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-down">▼</div>,
  ChevronUp: () => <div data-testid="chevron-up">▲</div>,
  MessageSquare: () => <div data-testid="message-square">💬</div>,
  ChevronRight: () => <div data-testid="chevron-right">▶</div>,
}));

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat window with initial message", () => {
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    expect(screen.getByText("アシスタントチャット")).toBeInTheDocument();
    expect(screen.getByText("認定基準の検索")).toBeInTheDocument();
    expect(screen.getByText(/こんにちは！認定基準の検索ステップのアシスタントです/)).toBeInTheDocument();
  });

  it("can be collapsed and expanded", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const collapseButton = screen.getByRole("button", { name: /アシスタントチャット/i });

    // Initially visible
    expect(screen.getByPlaceholderText("質問を入力してください...")).toBeInTheDocument();

    // Collapse
    await user.click(collapseButton);
    const chatWindow = screen.getByTestId("chat-window");
    expect(chatWindow).toHaveClass("w-0");
    expect(chatWindow).toHaveClass("overflow-hidden");

    // Expand
    const expandButton = screen.getByTitle("チャットを開く");
    await user.click(expandButton);
    expect(chatWindow).not.toHaveClass("w-0");
    expect(chatWindow).toHaveClass("w-[400px]");
    expect(screen.getByPlaceholderText("質問を入力してください...")).toBeInTheDocument();
  });

  it("allows user to type in input field", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const input = screen.getByPlaceholderText("質問を入力してください...") as HTMLInputElement;

    await user.type(input, "テストメッセージ");
    expect(input.value).toBe("テストメッセージ");
  });

  it("sends message when send button is clicked", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "テスト回答" }),
    });

    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const input = screen.getByPlaceholderText("質問を入力してください...");
    const sendButton = screen.getByRole("button", { name: "送信" });

    await user.type(input, "テスト質問");
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText("テスト質問")).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("テスト回答")).toBeInTheDocument();
    });
  });

  it("sends message when Enter key is pressed", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Enterキーで送信" }),
    });

    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const input = screen.getByPlaceholderText("質問を入力してください...");

    await user.type(input, "Enterキーテスト{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Enterキーテスト")).toBeInTheDocument();
    });
  });

  it("disables send button when input is empty", () => {
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const sendButton = screen.getByRole("button", { name: "送信" });
    expect(sendButton).toBeDisabled();
  });

  it("shows loading state when sending message", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ message: "回答" }),
      }), 100))
    );

    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const input = screen.getByPlaceholderText("質問を入力してください...");
    const sendButton = screen.getByRole("button", { name: "送信" });

    await user.type(input, "テスト");
    await user.click(sendButton);

    expect(screen.getByText("考えています...")).toBeInTheDocument();
    expect(sendButton).toBeDisabled();
  });

  it("handles API errors gracefully", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    const input = screen.getByPlaceholderText("質問を入力してください...");
    const sendButton = screen.getByRole("button", { name: "送信" });

    await user.type(input, "エラーテスト");
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });
});

