import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutSkeleton } from "../AboutSkeleton";
import { AvatarSkeleton } from "../AvatarSkeleton";
import { CardGridSkeleton } from "../CardGridSkeleton";
import { SectionSkeleton } from "../SectionSkeleton";

describe("Skeletons", () => {
  describe("SectionSkeleton", () => {
    it("renders with default props", () => {
      const { container } = render(<SectionSkeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
      // Default: 1 heading + 3 lines
      // Heading is a div with h-4
      // Lines are divs with h-3
      // We can check for the number of elements or specific classes
      const heading = container.querySelector(".h-4");
      expect(heading).toBeInTheDocument();
      const lines = container.querySelectorAll(".h-3");
      expect(lines).toHaveLength(3);
    });

    it("renders correct number of lines", () => {
      const { container } = render(<SectionSkeleton lines={5} />);
      const lines = container.querySelectorAll(".h-3");
      expect(lines).toHaveLength(5);
    });

    it("hides heading when prop is false", () => {
      const { container } = render(<SectionSkeleton heading={false} />);
      const heading = container.querySelector(".h-4");
      expect(heading).not.toBeInTheDocument();
    });
  });

  describe("AboutSkeleton", () => {
    it("renders 5 lines of text", () => {
      const { container } = render(<AboutSkeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
      const lines = container.querySelectorAll(".h-3");
      expect(lines).toHaveLength(5);
    });
  });

  describe("CardGridSkeleton", () => {
    it("renders correct number of cards", () => {
      const { container } = render(<CardGridSkeleton cardCount={4} />);
      // Each card has a border
      const cards = container.querySelectorAll(".border-gray-200");
      expect(cards).toHaveLength(4);
    });

    it("applies correct grid classes for columns", () => {
      const { container } = render(<CardGridSkeleton columnCount={3} />);
      expect(container.firstChild).toHaveClass("lg:grid-cols-3");
    });
  });

  describe("AvatarSkeleton", () => {
    it("renders avatar circle and text lines", () => {
      const { container } = render(<AvatarSkeleton />);
      expect(container.firstChild).toHaveClass("animate-pulse");
      const avatar = container.querySelector(".rounded-full");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass("h-12", "w-12");

      const textLines = container.querySelectorAll(".space-y-2 > div");
      expect(textLines).toHaveLength(2);
    });
  });
});
