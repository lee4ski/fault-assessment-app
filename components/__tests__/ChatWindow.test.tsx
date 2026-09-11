import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "./test-utils";
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
  Sparkles: () => <div data-testid="sparkles">✨</div>,
  Image: () => <div data-testid="image-icon">🖼️</div>,
  X: () => <div data-testid="x-icon">✕</div>,
  ArrowUp: () => <div data-testid="arrow-up">↑</div>,
  Loader2: () => <div data-testid="loader">⟳</div>,
}));

// The chat panel starts collapsed (just a floating "Open chat" button), so
// every test below opens it first before interacting with the composer.
const openChat = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTitle("チャットを開く"));
};

describe("ChatWindow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat window with initial message", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    await openChat(user);

    expect(screen.getByText("アシスタントチャット")).toBeInTheDocument();
    expect(screen.getByText("認定基準の検索")).toBeInTheDocument();
    expect(screen.getByText(/こんにちは！認定基準の検索ステップのアシスタントです/)).toBeInTheDocument();
  });

  it("can be collapsed and expanded", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);

    // Starts collapsed: only the floating open button exists, no panel yet.
    expect(screen.queryByTestId("chat-window")).not.toBeInTheDocument();

    // Expand
    await openChat(user);
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("質問を入力してください...")).toBeInTheDocument();

    // Collapse again via the panel header
    const collapseButton = screen.getByRole("button", { name: /アシスタントチャット/i });
    await user.click(collapseButton);
    expect(screen.queryByTestId("chat-window")).not.toBeInTheDocument();
    expect(screen.getByTitle("チャットを開く")).toBeInTheDocument();
  });

  it("allows user to type in input field", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);
    await openChat(user);

    const input = screen.getByPlaceholderText("質問を入力してください...") as HTMLTextAreaElement;

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
    await openChat(user);

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
    await openChat(user);

    const input = screen.getByPlaceholderText("質問を入力してください...");

    // Enter sends the message (Shift+Enter inserts a newline instead).
    await user.type(input, "Enterキーテスト{Enter}");

    await waitFor(() => {
      expect(screen.getByText("Enterキーテスト")).toBeInTheDocument();
    });
  });

  it("disables send button when input is empty", async () => {
    const user = userEvent.setup();
    render(<ChatWindow step={1} stepName="認定基準の検索" />);
    await openChat(user);

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
    await openChat(user);

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
    await openChat(user);

    const input = screen.getByPlaceholderText("質問を入力してください...");
    const sendButton = screen.getByRole("button", { name: "送信" });

    await user.type(input, "エラーテスト");
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/エラーが発生しました/)).toBeInTheDocument();
    });
  });
});
