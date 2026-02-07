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

// ── Auto-listen preference tests ────────────────────────

describe("Conversation Design: auto-listen preference", () => {
  it("auto-listen is enabled by default", () => {
    localStorage.removeItem("bilko-auto-listen");
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });
    expect(result.current.autoListenEnabled).toBe(true);
  });

  it("persists auto-listen preference to localStorage", () => {
    const { result } = renderHook(() => useConversationDesign(), {
      wrapper: DesignWrapper,
    });

    act(() => result.current.setAutoListen(false));
    expect(result.current.autoListenEnabled).toBe(false);
    expect(localStorage.getItem("bilko-auto-listen")).toBe("false");

    act(() => result.current.setAutoListen(true));
    expect(result.current.autoListenEnabled).toBe(true);
    expect(localStorage.getItem("bilko-auto-listen")).toBe("true");
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
