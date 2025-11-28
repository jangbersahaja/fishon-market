"use client";

import { useTranslations } from "next-intl";

export interface AboutSectionProps {
  description: string;
  title?: string;
}

export default function AboutSection({
  description,
  title,
}: AboutSectionProps) {
  const t = useTranslations("charter.about");

  return (
    <section className="p-5 bg-white shadow-lg rounded-2xl">
      <h3 className="pb-2 text-base font-semibold border-b border-gray-200 sm:text-lg">
        {title || t("title")}
      </h3>
      <div className="mt-2 text-sm leading-6 prose-sm prose text-gray-700 max-w-none">
        {(description || "").split(/\n{2,}/).map((p, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {p
              .trim()
              .split(/\n/)
              .map((line, j, arr) =>
                j < arr.length - 1 ? (
                  <span key={j}>
                    {line}
                    <br />
                    <br />
                  </span>
                ) : (
                  line
                )
              )}
          </p>
        ))}
      </div>
    </section>
  );
}
