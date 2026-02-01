/**
 * Przykładowy test komponentu React
 * Lokalizacja: src/components/__tests__/example-component.test.tsx
 */

import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithQueryClient } from "@/test-utils/test-helpers";

// Prosty przykładowy komponent (należy zastąpić rzeczywistym komponentem)
function WelcomeMessage({ name }: { name: string }) {
  return (
    <div>
      <h1>Welcome, {name}!</h1>
      <p>This is a test component</p>
    </div>
  );
}

describe("WelcomeMessage Component", () => {
  it("should render welcome message with name", () => {
    renderWithQueryClient(<WelcomeMessage name="John" />);

    expect(screen.getByText("Welcome, John!")).toBeInTheDocument();
    expect(screen.getByText("This is a test component")).toBeInTheDocument();
  });

  it("should render with different name", () => {
    renderWithQueryClient(<WelcomeMessage name="Alice" />);

    expect(screen.getByText("Welcome, Alice!")).toBeInTheDocument();
  });

  it("should have heading element", () => {
    renderWithQueryClient(<WelcomeMessage name="Bob" />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Welcome, Bob!");
  });
});
