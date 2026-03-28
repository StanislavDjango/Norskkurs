import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { useSectionRoute } from "./useSectionRoute";

const wrapper = ({
  children,
  initialEntries = ["/"],
}: {
  children: ReactNode;
  initialEntries?: string[];
}) => (
  <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
);

describe("useSectionRoute", () => {
  it("uses the hash route as the active section", async () => {
    const { result } = renderHook(() => useSectionRoute(), {
      wrapper: ({ children }) => wrapper({ children, initialEntries: ["/tests"] }),
    });

    await waitFor(() => {
      expect(result.current.activeSection).toBe("tests");
    });
  });

  it("navigates by updating the location hash", async () => {
    const { result } = renderHook(() => useSectionRoute(), {
      wrapper: ({ children }) => wrapper({ children }),
    });

    await act(async () => {
      result.current.navigateToSection("myWords");
    });

    await waitFor(() => {
      expect(result.current.activeSection).toBe("myWords");
    });
  });
});
