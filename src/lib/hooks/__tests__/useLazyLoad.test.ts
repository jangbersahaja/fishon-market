// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLazyLoad } from "../useLazyLoad";

describe("useLazyLoad", () => {
  let observeMock: any;
  let disconnectMock: any;
  let triggerIntersect: (entries: any[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    global.IntersectionObserver = vi.fn().mockImplementation((callback) => {
      triggerIntersect = callback;
      return {
        observe: observeMock,
        disconnect: disconnectMock,
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with isLoaded = false", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useLazyLoad(ref));

    expect(result.current.isLoaded).toBe(false);
    expect(result.current.isVisible).toBe(false);
    expect(observeMock).toHaveBeenCalledWith(ref.current);
  });

  it("sets isLoaded = true when element becomes visible", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useLazyLoad(ref));

    act(() => {
      triggerIntersect([{ isIntersecting: true }]);
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isVisible).toBe(true);
  });

  it("does not reset isLoaded when element becomes invisible", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useLazyLoad(ref));

    act(() => {
      triggerIntersect([{ isIntersecting: true }]);
    });

    expect(result.current.isLoaded).toBe(true);

    act(() => {
      triggerIntersect([{ isIntersecting: false }]);
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isVisible).toBe(false);
  });

  it("cleans up observer on unmount", () => {
    const ref = { current: document.createElement("div") };
    const { unmount } = renderHook(() => useLazyLoad(ref));

    unmount();
    expect(disconnectMock).toHaveBeenCalled();
  });
});
