import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomeworkPage from "./HomeworkPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("HomeworkPage", () => {
  it("renders empty state with current stream and level labels", () => {
    render(
      <HomeworkPage
        homework={[]}
        stream="bokmaal"
        currentLevel="A1"
        streamLabel={(stream) => stream.toUpperCase()}
        levelLabel={(level) => `Level ${level}`}
      />,
    );

    expect(screen.getByText("nav.homework")).toBeInTheDocument();
    expect(screen.getByText("BOKMAAL · Level A1")).toBeInTheDocument();
    expect(screen.getByText("emptyList")).toBeInTheDocument();
  });

  it("renders published homework cards", () => {
    render(
      <HomeworkPage
        homework={[
          {
            id: 10,
            title: "Write about Oslo",
            stream: "bokmaal",
            level: "A2",
            due_date: "2026-04-01T00:00:00Z",
            instructions: "Use five sentences.",
            attachments: [],
            status: "published",
          },
        ]}
        stream="bokmaal"
        currentLevel="A1"
        streamLabel={(stream) => stream.toUpperCase()}
        levelLabel={(level) => `Level ${level}`}
      />,
    );

    expect(screen.getByText("Write about Oslo")).toBeInTheDocument();
    expect(screen.getByText(/status:\s*published/i)).toBeInTheDocument();
    expect(screen.getByText("Use five sentences.")).toBeInTheDocument();
    expect(screen.getByText("A2")).toBeInTheDocument();
  });
});
