import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export default async function Home() {
  const t = await getTranslations("home");
  const tFooter = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <main className="min-h-dvh bg-[#ec2227] flex items-center justify-center p-6">
      <section className="w-full max-w-3xl mx-auto">
        <div className="p-8 bg-white border shadow-2xl rounded-3xl border-black/5 md:p-12">
          <header className="flex items-center gap-4">
            <Image
              src="/Fishon-logo.png"
              width={72}
              height={72}
              sizes="(max-width: 768px) 48px, 72px"
              alt="Fishon logo"
              className="w-auto h-12 rounded-full md:h-16"
              priority
            />
            <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
              Fishon
              <span className="sr-only">
                {" "}
                — Malaysia&apos;s fishing & charter booking
              </span>
              .my
            </h1>
          </header>

          <p className="mt-5 text-lg md:text-xl/relaxed text-black/80">
            {t("subtitle")}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6 text-sm">
            <span
              aria-label={`Status: ${t("marketplaceStatus")}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#ec2227]/20 bg-[#ec2227] px-3 py-1 text-white"
            >
              <span className="size-2 rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,.6)]" />
              {t("marketplaceStatus")}
            </span>
            <span className="opacity-80 text-black/70">{t("tagline")}</span>
          </div>

          <div className="p-5 mt-6 border rounded-2xl border-black/10 bg-gray-50">
            <h2 className="text-base font-semibold text-black md:text-lg">
              {t("captainTitle")}
            </h2>
            <p className="mt-2 text-sm md:text-base text-black/80">
              {t("captainDescription")}{" "}
              <Link
                href="https://fishon-captain.vercel.app/my/list-your-business"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#ec2227] underline decoration-[#ec2227]/40 underline-offset-4 hover:decoration-[#ec2227]"
              >
                Fishon Captain App
              </Link>
            </p>
            <p className="mt-2 text-xs md:text-sm text-black/60">
              {t("captainCta")}
            </p>
          </div>

          <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/90 bg-[#ec2227] border border-white/10 rounded-xl px-4 py-3">
            <div>© {year} Fishon. {tFooter("allRightsReserved")}.</div>
            <nav aria-label="Social links">
              <ul className="flex items-center gap-4">
                {/* Add more links as they go live */}
                <li>
                  <Link
                    href="https://www.facebook.com/profile.php?id=61580228252347"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
                  >
                    Facebook
                  </Link>
                </li>
              </ul>
            </nav>
          </footer>
        </div>
      </section>
    </main>
  );
}
