"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { FaFacebook, FaInstagram, FaTiktok } from "react-icons/fa6";

const socials = [
  {
    name: "Facebook",
    icon: <FaFacebook />,
    link: "https://www.facebook.com/profile.php?id=61580228252347",
  },
  {
    name: "Instagram",
    icon: <FaInstagram />,
    link: "https://www.instagram.com/fishon.my?utm_source=qr&igsh=ajltamRvZHI0ZzB4",
  },
  {
    name: "Tiktok",
    icon: <FaTiktok />,
    link: "https://www.tiktok.com/@fishon.my?_r=1&_t=ZS-91Au8zrjbLW",
  },
];

export interface FooterDestination {
  name: string;
  slug: string;
  charterCount: number;
}

interface FooterProps {
  destinations?: FooterDestination[];
}

const Footer = ({ destinations = [] }: FooterProps) => {
  const t = useTranslations("footer");
  const locale = useLocale();

  const abouts = [
    {
      key: "aboutUs",
      link: `/${locale}/about`,
    },
    {
      key: "blog",
      link: `/${locale}/blog`,
    },
    {
      key: "contactUs",
      link: `/${locale}/support/contact`,
    },
  ];

  const discover = [
    {
      key: "fishingTechnique",
      link: `/${locale}/categories/techniques`,
    },
    {
      key: "fishingType",
      link: `/${locale}/categories/types`,
    },
    {
      key: "fishSpecies",
      link: `/${locale}/categories/species`,
    },
  ];

  const captain = [
    {
      key: "listYourCharter",
      link: "https://captain.fishon.my/list-your-business",
    },
    {
      key: "manageYourCharter",
      link: "https://captain.fishon.my",
    },
  ];

  const support = [
    {
      key: "helpCenter",
      link: `/${locale}/support/help`,
    },
    {
      key: "termsOfService",
      link: `/${locale}/terms`,
    },
    {
      key: "privacyPolicy",
      link: `/${locale}/privacy`,
    },
    {
      key: "refundCancellation",
      link: `/${locale}/refund-policy`,
    },
  ];

  return (
    <footer className="w-full bg-[#ec2227] text-white">
      <div className="grid w-full grid-cols-1 gap-10 px-6 py-16 mx-auto max-w-7xl md:grid-cols-2 lg:grid-cols-5">
        {/* Brand Column */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="flex flex-col gap-2">
            <h2 className="text-4xl font-bold text-white">Fishon</h2>
            <p className="text-sm text-white/80">plan • book • fish</p>
          </div>
          <div className="flex gap-4">
            {socials.map((s) => (
              <Link
                key={s.name}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl transition-colors text-white/80 hover:text-white"
                aria-label={s.name}
              >
                {s.icon}
              </Link>
            ))}
          </div>
        </div>

        {/* Support & About */}
        <div className="flex flex-col gap-8 lg:border-l-2 lg:border-white/10 lg:pl-4">
          <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-white">{t("support")}</h3>
            <ul className="flex flex-col gap-3 text-sm text-white/80">
              {support.map((item) => (
                <li key={item.key}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="transition-colors hover:text-white"
                    >
                      {t(item.key as any)}
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed opacity-70">
                      {t(item.key as any)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4 ">
            <h3 className="font-semibold text-white">{t("aboutUs")}</h3>
            <ul className="flex flex-col gap-3 text-sm text-white/80">
              {abouts.map((item) => (
                <li key={item.key}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="transition-colors hover:text-white"
                    >
                      {t(item.key as any)}
                    </Link>
                  ) : (
                    <span className="cursor-not-allowed opacity-70">
                      {t(item.key as any)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Discover */}
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-white">{t("discover")}</h3>
          <ul className="flex flex-col gap-3 text-sm text-white/80">
            {discover.map((item) => (
              <li key={item.key}>
                {item.link ? (
                  <Link
                    href={item.link}
                    className="transition-colors hover:text-white"
                  >
                    {t(item.key as any)}
                  </Link>
                ) : (
                  <span className="cursor-not-allowed opacity-70">
                    {t(item.key as any)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Destinations */}
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-white">{t("destinations")}</h3>
          <ul className="flex flex-col gap-3 text-sm text-white/80">
            <li>
              <Link
                href={`/${locale}/categories/destinations`}
                className="transition-colors hover:text-white"
              >
                {t("allDestination")}
              </Link>
            </li>
            {destinations.length > 0
              ? destinations.map((state) => (
                  <li key={state.slug}>
                    <Link
                      href={`/${locale}/categories/destinations#${state.slug}`}
                      className="transition-colors hover:text-white"
                    >
                      {state.name}
                    </Link>
                  </li>
                ))
              : // Fallback when no destinations data
                null}
          </ul>
        </div>

        {/* Fishon Captain */}
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-white">{t("fishonCaptain")}</h3>
          <ul className="flex flex-col gap-3 text-sm text-white/80">
            {captain.map((item) => (
              <li key={item.key}>
                {item.link ? (
                  <Link
                    href={item.link}
                    className="transition-colors hover:text-white"
                  >
                    {t(item.key as any)}
                  </Link>
                ) : (
                  <span className="cursor-not-allowed opacity-70">
                    {t(item.key as any)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full border-t border-white/10 bg-[#c81e23]">
        <div className="flex flex-col items-center justify-between w-full gap-4 px-6 py-6 mx-auto max-w-7xl md:flex-row text-white/60">
          <p className="text-sm">© 2025 Fishon. {t("allRightsReserved")}.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
