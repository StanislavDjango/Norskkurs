import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AuthFields from "./AuthFields";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("AuthFields", () => {
  it("renders logged-in state", () => {
    render(
      <AuthFields
        auth={{
          is_authenticated: true,
          is_teacher: false,
          username: "student@example.com",
          display_name: "Student",
        }}
        authMode="login"
        profileAuthForm={{ name: "", email: "", password: "" }}
        setProfileAuthForm={vi.fn()}
        profileAuthLoading={false}
        profileAuthError={null}
        supportMessage={null}
        onSubmit={vi.fn()}
        onToggleMode={vi.fn()}
        onForgotPassword={vi.fn()}
      />,
    );

    expect(screen.getByText("Student")).toBeInTheDocument();
  });

  it("submits login mode and toggles mode", () => {
    const onSubmit = vi.fn();
    const onToggleMode = vi.fn();

    render(
      <AuthFields
        auth={null}
        authMode="login"
        profileAuthForm={{ name: "", email: "demo@example.com", password: "secret" }}
        setProfileAuthForm={vi.fn()}
        profileAuthLoading={false}
        profileAuthError={null}
        supportMessage={null}
        onSubmit={onSubmit}
        onToggleMode={onToggleMode}
        onForgotPassword={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "auth.login" }));
    fireEvent.click(screen.getByRole("button", { name: "auth.toRegister" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onToggleMode).toHaveBeenCalledTimes(1);
  });
});
