// @vitest-environment jsdom
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoGallery } from "../PhotoGallery";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, className, fill, sizes, priority }: any) => (
    <img
      src={src}
      alt={alt}
      className={className}
      data-fill={fill}
      data-sizes={sizes}
      data-priority={priority}
    />
  ),
}));

// Mock analytics
vi.mock("@/lib/analytics-tracking", () => ({
  trackEvent: vi.fn(),
}));

describe("PhotoGallery", () => {
  const defaultProps = {
    title: "Test Charter",
    images: [
      { src: "/img1.jpg", alt: "Image 1" },
      { src: "/img2.jpg", alt: "Image 2" },
      { src: "/img3.jpg", alt: "Image 3" },
      { src: "/img4.jpg", alt: "Image 4" },
      { src: "/img5.jpg", alt: "Image 5" },
    ],
  };

  it("renders main image with object-contain to support portrait orientation", () => {
    render(<PhotoGallery {...defaultProps} />);

    // Get the main image (first one in the DOM usually, or we can be more specific)
    // The main image is inside the button with aria-label "Open gallery"
    const mainButton = screen.getByLabelText("Open gallery");
    const mainImage = mainButton.querySelector("img");

    // This is expected to fail initially as it is currently object-cover
    expect(mainImage).toHaveClass("object-contain");
    expect(mainImage).not.toHaveClass("object-cover");
  });

  it("renders without fixed height constraints on main container", () => {
    render(<PhotoGallery {...defaultProps} />);

    const mainButton = screen.getByLabelText("Open gallery");
    // These classes should be removed/changed
    expect(mainButton).not.toHaveClass("sm:min-h-[500px]");
    expect(mainButton).toHaveClass("sm:h-auto");
  });

  it("renders grid with flexible rows instead of fixed row span", () => {
    render(<PhotoGallery {...defaultProps} />);

    const mainButton = screen.getByLabelText("Open gallery");
    // Should not have row-span-2 which forces height matching
    expect(mainButton).not.toHaveClass("sm:row-span-2");
  });

  it("renders mobile horizontal scroller", () => {
    render(<PhotoGallery {...defaultProps} />);

    // Check for the mobile container
    // The mobile container is the parent of the first mobile thumbnail
    // Mobile thumbnails have aria-label "Open item X" and are in a container with overflow-x-auto
    const mobileThumbnails = screen.getAllByLabelText("Open item 1");
    // Find the one that is in the mobile container (overflow-x-auto)
    const mobileThumbnail = mobileThumbnails.find((el) =>
      el.parentElement?.classList.contains("overflow-x-auto")
    );

    expect(mobileThumbnail).toBeInTheDocument();
    const mobileContainer = mobileThumbnail?.parentElement;

    expect(mobileContainer).toHaveClass("overflow-x-auto");
    expect(mobileContainer).toHaveClass("sm:hidden");
  });

  it("renders correct number of desktop thumbnails", () => {
    render(<PhotoGallery {...defaultProps} />);

    // The desktop thumbnails are in a div with hidden sm:grid
    // We can look for the container that has these classes
    const desktopContainer = screen
      .getByText("Test Charter")
      .closest(".grid")
      ?.querySelector(".sm\\:grid");
    expect(desktopContainer).toBeInTheDocument();

    // Should have 4 buttons inside
    expect(desktopContainer?.querySelectorAll("button")).toHaveLength(4);
  });
});
