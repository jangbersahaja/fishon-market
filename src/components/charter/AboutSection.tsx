"use client";

import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export interface AboutSectionProps {
  description: string;
  /** Malay version of description for locale support */
  descriptionMy?: string | null;
  title?: string;
  /** Number of lines to show before collapse (mobile only) */
  collapsedLines?: number;
}

/**
 * Parse markdown-style content with headers (**Title:**) and bullet points (• item)
 */
function parseDescription(text: string): React.ReactNode[] {
  const sections = text.split(/\n{2,}/);
  const elements: React.ReactNode[] = [];

  sections.forEach((section, sectionIndex) => {
    const lines = section.trim().split("\n");

    // Check if this section starts with a header (e.g., **Trip Highlights:**)
    const headerMatch = lines[0]?.match(/^\*\*(.+?):\*\*$/);

    if (headerMatch) {
      // It's a header section with bullet points
      const headerTitle = headerMatch[1];
      const bulletItems = lines
        .slice(1)
        .filter((line) => line.startsWith("•"))
        .map((line) => line.replace(/^•\s*/, "").trim());

      elements.push(
        <div key={`section-${sectionIndex}`} className="mb-4 last:mb-0">
          <h4 className="mb-2 text-sm font-semibold text-gray-900">
            {headerTitle}
          </h4>
          {bulletItems.length > 0 && (
            <ul className="space-y-1.5 ml-1">
              {bulletItems.map((item, itemIndex) => (
                <li
                  key={`item-${sectionIndex}-${itemIndex}`}
                  className="flex items-start gap-2 text-sm text-gray-600"
                >
                  <span className="inline-block w-1.5 h-1.5 mt-1.5 rounded-full bg-[#ec2227] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    } else {
      // Regular paragraph
      const paragraphText = lines.join(" ").trim();
      if (paragraphText) {
        // Check if paragraph contains [[placeholder]] - remove them
        const cleanText = paragraphText.replace(/\[\[[^\]]+\]\]/g, "").trim();
        if (cleanText) {
          elements.push(
            <p
              key={`para-${sectionIndex}`}
              className="mb-4 text-sm leading-relaxed text-gray-700 last:mb-0"
            >
              {cleanText}
            </p>
          );
        }
      }
    }
  });

  return elements;
}

export default function AboutSection({
  description,
  descriptionMy,
  title,
  collapsedLines = 4,
}: AboutSectionProps) {
  const t = useTranslations("charter.about");
  const locale = useLocale();
  const [isExpanded, setIsExpanded] = useState(false);

  // Use Malay description if available and locale is ms, otherwise fallback to English
  const displayDescription =
    locale === "ms" && descriptionMy ? descriptionMy : description;

  // Count actual sections/paragraphs for more accurate collapse detection
  const sectionCount = (displayDescription || "").split(/\n{2,}/).length;
  // Show "See More" if there are more than 3 sections or content is long
  const shouldCollapse =
    sectionCount > 3 || (displayDescription || "").length > 400;

  const parsedContent = parseDescription(displayDescription || "");

  // For collapsed state, only show first 2 sections
  const displayContent =
    !isExpanded && shouldCollapse ? parsedContent.slice(0, 2) : parsedContent;
  const hiddenSections = shouldCollapse ? parsedContent.length - 2 : 0;

  return (
    <section className="overflow-hidden bg-white border border-gray-200 rounded-2xl">
      {/* Header */}
      <div className="relative px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ec2227]/10">
            <FileText className="w-4 h-4 text-[#ec2227]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
            {title || t("title")}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="transition-all duration-300">{displayContent}</div>

        {/* See More / See Less button */}
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 mt-3 text-sm font-medium text-[#ec2227] hover:text-[#ec2227]/80"
          >
            {isExpanded ? (
              <>
                {t("readLess")}
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                {t("readMore")}{" "}
                {hiddenSections > 0 && `(${hiddenSections} more sections)`}
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
