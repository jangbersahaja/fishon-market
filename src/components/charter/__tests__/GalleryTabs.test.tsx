import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GalleryTabs } from "../GalleryTabs";

// Mock child components to simplify testing
vi.mock("../PhotoGallery", () => ({
  PhotoGallery: ({ images }: { images: any[] }) => (
    <div data-testid="photo-gallery">Photo Gallery ({images?.length})</div>
  ),
}));

vi.mock("../VideoGallery", () => ({
  VideoGallery: ({ videos }: { videos: any[] }) => (
    <div data-testid="video-gallery">Video Gallery ({videos?.length})</div>
  ),
}));

describe("GalleryTabs", () => {
  const mockPhotos = ["photo1.jpg", "photo2.jpg"];
  const mockVideos = [
    { url: "video1.mp4", thumbnailUrl: "thumb1.jpg" },
    { url: "video2.mp4", thumbnailUrl: "thumb2.jpg" },
  ];
  const defaultProps = {
    title: "Test Charter",
    charterId: "charter-123",
    ownerId: "owner-123",
    userId: "user-123",
  };

  it("renders only PhotoGallery when no videos are present", () => {
    render(<GalleryTabs {...defaultProps} photos={mockPhotos} videos={[]} />);

    expect(screen.getByTestId("photo-gallery")).toBeInTheDocument();
    expect(screen.queryByText(/Photos \(/)).not.toBeInTheDocument(); // No tabs
    expect(screen.queryByTestId("video-gallery")).not.toBeInTheDocument();
  });

  it("renders only VideoGallery when no photos are present", () => {
    render(<GalleryTabs {...defaultProps} photos={[]} videos={mockVideos} />);

    expect(screen.getByTestId("video-gallery")).toBeInTheDocument();
    expect(screen.queryByText(/Videos \(/)).not.toBeInTheDocument(); // No tabs
    expect(screen.queryByTestId("photo-gallery")).not.toBeInTheDocument();
  });

  it("renders tabs when both photos and videos are present", () => {
    render(
      <GalleryTabs {...defaultProps} photos={mockPhotos} videos={mockVideos} />
    );

    expect(
      screen.getByText(`Photos (${mockPhotos.length})`)
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Videos (${mockVideos.length})`)
    ).toBeInTheDocument();
  });

  it("defaults to Photos tab", () => {
    render(
      <GalleryTabs {...defaultProps} photos={mockPhotos} videos={mockVideos} />
    );

    expect(screen.getByTestId("photo-gallery")).toBeInTheDocument();
    expect(screen.queryByTestId("video-gallery")).not.toBeInTheDocument();
  });

  it("switches content when tabs are clicked", () => {
    render(
      <GalleryTabs {...defaultProps} photos={mockPhotos} videos={mockVideos} />
    );

    // Initial state: Photos
    expect(screen.getByTestId("photo-gallery")).toBeInTheDocument();

    // Click Videos tab
    fireEvent.click(screen.getByText(`Videos (${mockVideos.length})`));
    expect(screen.getByTestId("video-gallery")).toBeInTheDocument();
    expect(screen.queryByTestId("photo-gallery")).not.toBeInTheDocument();

    // Click Photos tab
    fireEvent.click(screen.getByText(`Photos (${mockPhotos.length})`));
    expect(screen.getByTestId("photo-gallery")).toBeInTheDocument();
    expect(screen.queryByTestId("video-gallery")).not.toBeInTheDocument();
  });

  it("renders nothing when no media is present", () => {
    const { container } = render(
      <GalleryTabs {...defaultProps} photos={[]} videos={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
