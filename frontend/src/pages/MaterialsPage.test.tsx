import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MaterialsPage from "./MaterialsPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MaterialsPage", () => {
  it("renders empty state", () => {
    render(<MaterialsPage materials={[]} streamLabel={(stream) => stream} />);
    expect(screen.getByText("emptyList")).toBeInTheDocument();
  });

  it("renders a material card", () => {
    render(
      <MaterialsPage
        materials={[
          {
            id: 1,
            title: "Intro text",
            stream: "bokmaal",
            level: "A1",
            material_type: "text",
            body: "Short body",
            url: "https://example.com",
            tags: [],
          },
        ]}
        streamLabel={(stream) => stream.toUpperCase()}
      />,
    );

    expect(screen.getByText("Intro text")).toBeInTheDocument();
    expect(screen.getByText("BOKMAAL")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
  });
});
