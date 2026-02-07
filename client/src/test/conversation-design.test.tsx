/**
 * Conversation Design Framework Tests
 *
 * Ensures the turn-taking, auto-listen, and floor management
 * work correctly. These tests verify the conversation lifecycle:
 * Bilko speaks → mic opens → user talks → Bilko processes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useEffect } from "react";
import {
  ConversationDesignProvider,
  useConversationDesign,
  matchTurnEndKeyword,
  stripTurnEndKeyword,
  TURN_END_KEYWORDS,
} from "@/contexts/conversation-design-context";
import { VoiceProvider } from "@/contexts/voice-context";
import type { ReactNode } from "react";

// Mock speechSynthesis and SpeechRecognition for jsdom
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
};

beforeEach(() => {
  cleanup();
  Object.defineProperty(window, "speechSynthesis", {
    value: mockSpeechSynthesis,
    writable: true,
    configurable: true,
  });
});

// ── Wrapper ─────────────────────────────────────────────

function DesignWrapper({ children }: { children: ReactNode }) {
  return (
    <VoiceProvider>
      <ConversationDesignProvider>{children}</ConversationDesignProvider>
    </VoiceProvider>
  );
}

// ── Floor management tests ──────────────────────────────

describe("Conversation Design: floor management", () => {
  it("starts with idle floor", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });
    expect(result.current.floor).toBe("idle");
  });

  it("transitions to bilko floor when Bilko starts speaking", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    act(() => result.current.bilkoStartedSpeaking());
    expect(result.current.floor).toBe("bilko");
  });

  it("transitions to user floor when explicitly given", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    act(() => result.current.giveFloorToUser());
    expect(result.current.floor).toBe("user");
  });

  it("transitions back to idle when user turn is done", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    act(() => result.current.giveFloorToUser());
    expect(result.current.floor).toBe("user");

    act(() => result.current.userTurnDone());
    expect(result.current.floor).toBe("idle");
  });

  it("bilkoFinishedSpeaking transitions to user floor after delay", async () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    act(() => result.current.bilkoStartedSpeaking());
    expect(result.current.floor).toBe("bilko");

    act(() => result.current.bilkoFinishedSpeaking());
    // Floor should still be bilko during the delay
    // After timeout, it should transition to user
    await waitFor(() => {
      expect(result.current.floor).toBe("user");
    }, { timeout: 2000 });
  });
});

// ── Auto-listen derived from mic state ───────────────────
// Auto-listen is now derived from VoiceContext.isListening.
// There is no separate toggle — the mic button IS the toggle.

describe("Conversation Design: mic-driven conversation", () => {
  it("floor management works without separate auto-listen toggle", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });
    // Context should not expose autoListenEnabled or setAutoListen
    expect(result.current).not.toHaveProperty("autoListenEnabled");
    expect(result.current).not.toHaveProperty("setAutoListen");
  });
});

// ── User utterance callback tests ───────────────────────

describe("Conversation Design: user utterance callbacks", () => {
  it("registers and unregisters utterance callbacks", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    const cb = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.onUserUtterance(cb);
    });

    // Should be registered (no way to test dispatch without actual speech,
    // but we can verify the unsub works without error)
    act(() => unsub!());
  });
});

// ── Error boundary test ─────────────────────────────────

describe("Conversation Design: provider requirement", () => {
  it("useConversationDesign requires provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Wrap in VoiceProvider but NOT ConversationDesignProvider
    function BadComponent() {
      useConversationDesign();
      return null;
    }

    expect(() =>
      render(
        <VoiceProvider>
          <BadComponent />
        </VoiceProvider>,
      ),
    ).toThrow("useConversationDesign must be used within a ConversationDesignProvider");

    spy.mockRestore();
  });
});

// ── Turn-end keyword tests (pure functions) ─────────────

describe("Turn-end keywords: matchTurnEndKeyword", () => {
  it("matches 'go ahead' at the end of a sentence", () => {
    expect(matchTurnEndKeyword("I want to learn about AI go ahead")).toBe("go ahead");
  });

  it("matches 'bilko go' at the end", () => {
    expect(matchTurnEndKeyword("tell me about machine learning bilko go")).toBe("bilko go");
  });

  it("matches 'done' at the end", () => {
    expect(matchTurnEndKeyword("I think that covers it done")).toBe("done");
  });

  it("matches 'ok bilko' case-insensitively", () => {
    expect(matchTurnEndKeyword("Let's try video OK Bilko")).toBe("ok bilko");
  });

  it("matches 'i'm done'", () => {
    expect(matchTurnEndKeyword("that's my answer I'm done")).toBe("i'm done");
  });

  it("matches 'over to you bilko'", () => {
    expect(matchTurnEndKeyword("over to you bilko")).toBe("over to you bilko");
  });

  it("matches 'that's it'", () => {
    expect(matchTurnEndKeyword("yeah that's it")).toBe("that's it");
  });

  it("returns null when no keyword found", () => {
    expect(matchTurnEndKeyword("I want to learn about AI")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(matchTurnEndKeyword("")).toBeNull();
  });

  it("does not match keyword in the middle of text", () => {
    // "done" appears but not at the end
    expect(matchTurnEndKeyword("done with that, tell me more about React")).toBeNull();
  });

  it("TURN_END_KEYWORDS list is non-empty", () => {
    expect(TURN_END_KEYWORDS.length).toBeGreaterThan(0);
  });
});

describe("Turn-end keywords: stripTurnEndKeyword", () => {
  it("strips keyword from the end, returning the user's message", () => {
    expect(stripTurnEndKeyword("I want video go ahead", "go ahead")).toBe("I want video");
  });

  it("strips keyword and trims whitespace", () => {
    expect(stripTurnEndKeyword("  video please   done  ", "done")).toBe("video please");
  });

  it("returns empty string when the text IS the keyword", () => {
    expect(stripTurnEndKeyword("go ahead", "go ahead")).toBe("");
  });

  it("handles case-insensitive stripping", () => {
    expect(stripTurnEndKeyword("Tell me more OK Bilko", "ok bilko")).toBe("Tell me more");
  });

  it("returns original text when keyword not found", () => {
    expect(stripTurnEndKeyword("hello world", "not here")).toBe("hello world");
  });
});
