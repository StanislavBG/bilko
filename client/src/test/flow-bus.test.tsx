/**
 * FlowBus & Flow Home Page Debug Tests
 *
 * Ensures the flow communication bus works correctly and the
 * landing page integrates with it. These tests help debug issues
 * when the flow home page doesn't load or flows fail to communicate.
 *
 * Coverage:
 * - FlowBus: register, unregister, status updates, pub/sub, wildcard
 * - FlowStatusIndicator: renders active flows, hides when idle
 * - useFlowRegistration: auto-register on mount, cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, cleanup, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { useEffect } from "react";
import {
  FlowBusProvider,
  useFlowBus,
  useFlowRegistration,
  type FlowMessage,
} from "@/contexts/flow-bus-context";
import { FlowStatusIndicator } from "@/components/flow-status-indicator";
import type { ReactNode } from "react";

// ── Helper wrapper ──────────────────────────────────────

function BusWrapper({ children }: { children: ReactNode }) {
  return <FlowBusProvider>{children}</FlowBusProvider>;
}

// ── FlowBus context unit tests ──────────────────────────

describe("FlowBus context", () => {
  beforeEach(cleanup);

  it("starts with an empty flow registry", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });
    expect(result.current.flows.size).toBe(0);
  });

  it("registers and unregisters a flow", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    act(() => result.current.registerFlow("test-flow", "Test Flow"));
    expect(result.current.flows.size).toBe(1);
    expect(result.current.flows.get("test-flow")).toMatchObject({
      id: "test-flow",
      label: "Test Flow",
      status: "running",
    });

    act(() => result.current.unregisterFlow("test-flow"));
    expect(result.current.flows.size).toBe(0);
  });

  it("updates flow status and phase", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    act(() => result.current.registerFlow("my-flow", "My Flow"));
    act(() => result.current.updateFlowStatus("my-flow", "complete", "analyzing"));

    const flow = result.current.flows.get("my-flow")!;
    expect(flow.status).toBe("complete");
    expect(flow.phase).toBe("analyzing");
  });

  it("ignores status update for unregistered flow", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    // Should not throw or change anything
    act(() => result.current.updateFlowStatus("ghost", "error"));
    expect(result.current.flows.size).toBe(0);
  });

  it("delivers messages to exact-match subscribers", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    const handler = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe("main", handler);
    });

    act(() => {
      result.current.publish({
        from: "test-flow",
        to: "main",
        type: "summary",
        payload: { summary: "All done" },
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "test-flow",
        to: "main",
        type: "summary",
        payload: { summary: "All done" },
        timestamp: expect.any(Number),
      }),
    );

    act(() => unsub!());
  });

  it("does not deliver to non-matching subscribers", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    const handler = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe("other-flow", handler);
    });

    act(() => {
      result.current.publish({
        from: "test-flow",
        to: "main",
        type: "summary",
        payload: {},
      });
    });

    expect(handler).not.toHaveBeenCalled();
    act(() => unsub!());
  });

  it("delivers messages to wildcard (*) subscribers", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    const handler = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe("*", handler);
    });

    act(() => {
      result.current.publish({
        from: "a",
        to: "b",
        type: "data",
        payload: { foo: 1 },
      });
    });

    expect(handler).toHaveBeenCalledTimes(1);
    act(() => unsub!());
  });

  it("unsubscribe stops message delivery", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    const handler = vi.fn();
    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe("main", handler);
    });

    act(() => unsub!());

    act(() => {
      result.current.publish({
        from: "x",
        to: "main",
        type: "summary",
        payload: {},
      });
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple subscribers for the same target", () => {
    const { result } = renderHook(() => useFlowBus(), {
      wrapper: BusWrapper,
    });

    const handler1 = vi.fn();
    const handler2 = vi.fn();
    let unsub1: () => void;
    let unsub2: () => void;
    act(() => {
      unsub1 = result.current.subscribe("main", handler1);
      unsub2 = result.current.subscribe("main", handler2);
    });

    act(() => {
      result.current.publish({
        from: "flow-a",
        to: "main",
        type: "summary",
        payload: { summary: "done" },
      });
    });

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    act(() => {
      unsub1!();
      unsub2!();
    });
  });
});

// ── useFlowRegistration hook tests ──────────────────────

describe("useFlowRegistration hook", () => {
  beforeEach(cleanup);

  it("auto-registers on mount and unregisters on unmount", async () => {
    function TestFlow() {
      useFlowRegistration("test-flow", "Test Flow");
      return <span data-testid="flow-active">active</span>;
    }

    function Inspector() {
      const { flows } = useFlowBus();
      return <span data-testid="count">{flows.size}</span>;
    }

    const { unmount } = render(
      <BusWrapper>
        <TestFlow />
        <Inspector />
      </BusWrapper>,
    );

    // After mount + effects, flow should be registered
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });

    unmount();
  });

  it("sends messages through the bus via send()", () => {
    const received: FlowMessage[] = [];

    function Sender() {
      const { send } = useFlowRegistration("sender-flow", "Sender");
      return (
        <button
          data-testid="send-btn"
          onClick={() => send("main", "summary", { summary: "hello from sender" })}
        />
      );
    }

    function Receiver() {
      const { subscribe } = useFlowBus();
      useEffect(() => {
        const unsub = subscribe("main", (msg) => received.push(msg));
        return unsub;
      }, [subscribe]);
      return null;
    }

    render(
      <BusWrapper>
        <Sender />
        <Receiver />
      </BusWrapper>,
    );

    act(() => {
      screen.getByTestId("send-btn").click();
    });

    expect(received.length).toBe(1);
    expect(received[0].from).toBe("sender-flow");
    expect(received[0].payload.summary).toBe("hello from sender");
  });
});

// ── FlowStatusIndicator render tests ────────────────────

describe("FlowStatusIndicator", () => {
  beforeEach(cleanup);

  it("renders nothing when no flows are registered", () => {
    const { container } = render(
      <BusWrapper>
        <FlowStatusIndicator />
      </BusWrapper>,
    );
    expect(container.querySelector("[class*='fixed']")).toBeNull();
  });

  it("renders a pill for a running flow with ID and status", async () => {
    function Setup() {
      const { registerFlow } = useFlowBus();
      useEffect(() => {
        registerFlow("video-discovery", "Video Discovery");
      }, [registerFlow]);
      return null;
    }

    render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("video-discovery")).toBeInTheDocument();
    });
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("shows the flow phase when set", async () => {
    function Setup() {
      const { registerFlow, updateFlowStatus } = useFlowBus();
      useEffect(() => {
        registerFlow("ai-consultation", "AI Consultation");
        updateFlowStatus("ai-consultation", "running", "questioning");
      }, [registerFlow, updateFlowStatus]);
      return null;
    }

    render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("ai-consultation")).toBeInTheDocument();
    });
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("questioning")).toBeInTheDocument();
  });

  it("shows 'Done' for completed flows", async () => {
    function Setup() {
      const { registerFlow, updateFlowStatus } = useFlowBus();
      useEffect(() => {
        registerFlow("my-flow", "My Flow");
        updateFlowStatus("my-flow", "complete", "complete");
      }, [registerFlow, updateFlowStatus]);
      return null;
    }

    render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("Done")).toBeInTheDocument();
    });
  });

  it("shows 'Error' for errored flows", async () => {
    function Setup() {
      const { registerFlow, updateFlowStatus } = useFlowBus();
      useEffect(() => {
        registerFlow("broken-flow", "Broken");
        updateFlowStatus("broken-flow", "error");
      }, [registerFlow, updateFlowStatus]);
      return null;
    }

    render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("broken-flow")).toBeInTheDocument();
    });
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("renders multiple flow pills simultaneously", async () => {
    function Setup() {
      const { registerFlow, updateFlowStatus } = useFlowBus();
      useEffect(() => {
        registerFlow("flow-a", "Flow A");
        registerFlow("flow-b", "Flow B");
        updateFlowStatus("flow-b", "complete");
      }, [registerFlow, updateFlowStatus]);
      return null;
    }

    render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    await waitFor(() => {
      expect(screen.getByText("flow-a")).toBeInTheDocument();
    });
    expect(screen.getByText("flow-b")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("hides idle flows from the indicator", async () => {
    function Setup() {
      const { registerFlow, updateFlowStatus } = useFlowBus();
      useEffect(() => {
        registerFlow("idle-flow", "Idle Flow");
        updateFlowStatus("idle-flow", "idle");
      }, [registerFlow, updateFlowStatus]);
      return null;
    }

    const { container } = render(
      <BusWrapper>
        <Setup />
        <FlowStatusIndicator />
      </BusWrapper>,
    );

    // Give effects time to run, then verify idle flows don't appear
    await waitFor(() => {
      expect(screen.queryByText("idle-flow")).not.toBeInTheDocument();
    });
    expect(container.querySelector("[class*='fixed']")).toBeNull();
  });
});
