import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WordCollapse2Game from "./WordCollapse2Game";
import WordCollapseGame from "./WordCollapseGame";

const baseSpy = vi.fn();

vi.mock("./WordCollapseBaseGame", () => ({
  default: (props: Record<string, unknown>) => {
    baseSpy(props);
    return (
      <div data-testid="word-collapse-base">
        {String(props.titleKey)}|{String(props.storagePrefix)}|
        {String(props.allowClickWhileFalling)}
      </div>
    );
  },
}));

const baseProps = {
  stream: "bokmaal" as const,
  currentLevel: "A1" as const,
  playableTerms: [],
  verbEntries: [],
};

describe("WordCollapse variants", () => {
  it("configures the original game with falling clicks disabled", () => {
    render(<WordCollapseGame {...baseProps} />);

    expect(screen.getByTestId("word-collapse-base")).toHaveTextContent(
      "games.tabWordCollapse|wordcollapse|false",
    );
  });

  it("configures WordCollapse2 with falling clicks enabled", () => {
    render(<WordCollapse2Game {...baseProps} />);

    expect(screen.getByTestId("word-collapse-base")).toHaveTextContent(
      "games.tabWordCollapse2|wordcollapse2|true",
    );
  });
});
