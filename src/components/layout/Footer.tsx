"use client";

import { useTranslations } from "next-intl";
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

const Footer = () => {
  const t = useTranslations("footer");

  const abouts = [
    {
      key: "aboutUs",
      link: "/about",
    },
    {
      key: "blog",
      link: "/blog",
    },
    {
      key: "affiliateProgram",
      link: "",
    },
    {
      key: "contactUs",
      link: "support/contact",
    },
  ];

  const discover = [
    {
      key: "fishingTechnique",
      link: "/categories/techniques",
    },
    {
      key: "fishingType",
      link: "/categories/types",
    },
    {
      key: "fishSpecies",
      link: "",
    },
    {
      key: "fishNearMe",
      link: "",
    },
  ];

  const support = [
    {
      key: "helpCenter",
      link: "/support/help",
    },
    {
      key: "termsOfService",
      link: "/terms",
    },
    {
      key: "privacyPolicy",
      link: "/privacy",
    },
    {
      key: "refundCancellation",
      link: "/refund-policy",
    },
  ];

  return (
    <main className="flex flex-col w-full bg-gray-100">
      <section className="grid w-full grid-cols-1 px-5 py-10 mx-auto max-w-7xl md:grid-cols-3 lg:grid-cols-5 gap-7">
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-bold">{t("aboutFishon")}</span>
          <ul className="flex flex-col gap-2">
            {abouts.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.link}
                  className={
                    a.link != ""
                      ? ""
                      : "disabled cursor-not-allowed text-slate-500"
                  }
                >
                  {t(a.key as any)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-bold">{t("discover")}</span>
          <ul className="flex flex-col gap-2">
            {discover.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.link}
                  className={
                    a.link != ""
                      ? ""
                      : "disabled cursor-not-allowed text-slate-500"
                  }
                >
                  {t(a.key as any)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-bold">{t("siteMap")}</span>
          <ul className="flex flex-col gap-2">
            <li>{t("allDestination")}</li>
            <li>Selangor</li>
            <li>Perak</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-bold">{t("support")}</span>
          <ul className="flex flex-col gap-2">
            {support.map((a) => (
              <li key={a.key}>
                <Link
                  href={a.link}
                  className={
                    a.link != ""
                      ? ""
                      : "disabled cursor-not-allowed text-slate-500"
                  }
                >
                  {t(a.key as any)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <span className="font-bold">{t("becomeCaptain")}</span>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="https://fishon-captain.vercel.app/list-your-business">
                {t("listYourBoat")}
              </Link>
            </li>
          </ul>
        </div>
      </section>
      <section className="w-full bg-[#ec2227] ">
        <div className="flex flex-wrap items-center justify-between w-full h-24 gap-3 px-5 py-3 mx-auto max-w-7xl text-white/90">
          <h3 className="font-bold">© 2025 Fishon. {t("allRightsReserved")}.</h3>
          <nav aria-label="Social links">
            <ul className="flex items-center gap-4 text-xl">
              {/* Add more links as they go live */}
              {socials.map((s) => (
                <li key={s.name}>
                  <Link
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    {s.icon}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>
    </main>
  );
};

export default Footer;
