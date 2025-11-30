"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export default function BrandSection() {
  const t = useTranslations("home");

  return (
    <section className="w-full bg-[#ec2227] py-16 md:py-24">
      <div className="w-full px-4 mx-auto max-w-7xl md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Brand Explainer */}
          <div className="flex flex-col justify-center space-y-6">
            <div className="relative w-32 h-16 md:h-20 md:w-40">
              <Image
                src="/images/logos/fishon-logo-white.png"
                alt="Fishon brand logo"
                fill
                className="object-contain object-left brightness-0 invert"
                priority
              />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("brandTitle")}
              </h2>
              <p className="text-lg leading-relaxed text-white/90">
                {t("brandDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#ec2227]">
                <span className="h-2 w-2 rounded-full bg-[#ec2227]" />
                Plan
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#ec2227]">
                <span className="h-2 w-2 rounded-full bg-[#ec2227]" />
                Book
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#ec2227]">
                <span className="h-2 w-2 rounded-full bg-[#ec2227]" />
                Fish
              </div>
            </div>
          </div>

          {/* Captain CTA Card */}
          <div className="relative p-8 overflow-hidden text-gray-900 bg-white shadow-2xl rounded-3xl md:p-12">
            {/* Decorative background pattern */}
            <div className="absolute w-64 h-64 rounded-full opacity-50 -right-20 -top-20 bg-red-50 blur-3xl" />

            <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-lg bg-red-50 px-3 py-1 text-sm font-medium text-[#ec2227]">
                  {t("captainBadge")}
                </div>
                <h3 className="text-2xl font-bold md:text-3xl">
                  {t("listYourBusiness")}
                </h3>
                <p className="text-gray-600 md:text-lg">{t("findCustomers")}</p>
                <ul className="space-y-3 text-sm text-gray-600 md:text-base">
                  <li className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-[#ec2227]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("captainBenefit1")}
                  </li>
                  <li className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-[#ec2227]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("captainBenefit2")}
                  </li>
                  <li className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-[#ec2227]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {t("captainBenefit3")}
                  </li>
                </ul>
              </div>

              <Link
                target="_blank"
                rel="noopener noreferrer"
                href="https://fishon-captain.vercel.app/ms/list-your-business"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ec2227] px-6 py-4 text-base font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-900/20 sm:w-auto"
              >
                {t("listWithUs")}
                <svg
                  className="w-5 h-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
