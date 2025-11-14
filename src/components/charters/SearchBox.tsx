"use client";

import CalendarPicker from "@/components/shared/CalendarPicker";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoIosPin } from "react-icons/io";
import {
  IoAdd,
  IoChevronDown,
  IoChevronUp,
  IoPerson,
  IoRemove,
} from "react-icons/io5";

const SearchBox = ({ className = "" }: { className?: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Responsive: desktop stays open; mobile defaults collapsed
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)"); // lg breakpoint
    const apply = (match: boolean) => {
      setIsDesktop(match);
      setMobileOpen(match); // desktop => open; mobile => collapsed
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handler);
    } else {
      mq.addListener(handler);
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handler);
      } else {
        mq.removeListener(handler);
      }
    };
  }, []);

  useEffect(() => {
    if (isDesktop || !mobileOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && !el.contains(target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isDesktop, mobileOpen]);

  const showRest = isDesktop || mobileOpen;

  const spDestination = searchParams.get("destination") || "";
  const spDateStr = searchParams.get("date");
  const spStartDateStr = searchParams.get("startDate");
  const spDays = parseInt(searchParams.get("days") || "", 10);
  const spAdults = parseInt(searchParams.get("adults") || "", 10);
  const spChildren = parseInt(searchParams.get("children") || "", 10);

  // Fetch real charter data for destination suggestions
  type CharterSuggestion = {
    id: string;
    name: string;
    location: string;
    address: string;
  };
  const [charters, setCharters] = useState<CharterSuggestion[]>([]);

  useEffect(() => {
    async function fetchCharters() {
      try {
        const response = await fetch("/api/charters");
        if (response.ok) {
          const data = await response.json();
          setCharters(data);
        }
      } catch (error) {
        console.error("Failed to fetch charters for suggestions:", error);
      }
    }
    fetchCharters();
  }, []);

  // Destination (with basic suggestions from real charter data)
  const [destination, setDestination] = useState(spDestination);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const destinationSuggestions = useMemo(() => {
    // Build suggestions from real charter data: location, name, and address
    const raw: string[] = [];
    charters.forEach((c) => {
      if (c.location) raw.push(c.location);
      if (c.name) raw.push(c.name);
      if (c.address) raw.push(c.address);
    });
    // Dedupe and filter by query
    const seen = new Set<string>();
    const needle = destination.trim().toLowerCase();
    const out: string[] = [];
    for (const s of raw) {
      const v = String(s).trim();
      if (!v || seen.has(v)) continue;
      if (!needle || v.toLowerCase().includes(needle)) out.push(v);
      seen.add(v);
    }
    // Limit to top 8
    return out.slice(0, 8);
  }, [destination, charters]);

  // Date (custom popover) - support both single date and range
  const [selectedDate, setSelectedDate] = useState<string | undefined>(
    spDateStr || spStartDateStr || undefined
  );
  const [days, setDays] = useState<number>(
    Number.isFinite(spDays) && spDays > 0 ? spDays : 1
  );

  // Guests (dropdown counters)
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [adults, setAdults] = useState(
    Number.isFinite(spAdults) && spAdults > 0 ? spAdults : 1
  );
  const [children, setChildren] = useState(
    Number.isFinite(spChildren) && spChildren >= 0 ? spChildren : 0
  );
  const totalGuests = adults + children;
  const guestSummary =
    `${adults} Adult` +
    (adults > 1 ? "s" : "") +
    (children > 0
      ? ` | ${children} Child` + (children > 1 ? "ren" : "")
      : " | 0 Child");

  function replaceQuery(next: {
    destination?: string;
    dateStr?: string | undefined;
    daysCount?: number;
    adults?: number;
    children?: number;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    // destination
    const nd = next.destination ?? destination;
    if (nd && nd.trim()) params.set("destination", nd.trim());
    else params.delete("destination");

    // date (YYYY-MM-DD, LOCAL – avoid UTC shift)
    const dStr = next.dateStr !== undefined ? next.dateStr : selectedDate;
    if (dStr) params.set("date", dStr);
    else params.delete("date");

    // days (for multi-day bookings)
    const d = next.daysCount ?? days;
    if (Number.isFinite(d) && d > 1) params.set("days", String(d));
    else params.delete("days");

    // guests
    const a = next.adults ?? adults;
    const c = next.children ?? children;
    if (Number.isFinite(a) && a > 0) params.set("adults", String(a));
    else params.delete("adults");
    if (Number.isFinite(c) && c >= 0) params.set("children", String(c));
    else params.delete("children");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Keep URL query in sync after user changes inputs
  // - Debounced to avoid spamming router on keystrokes
  // - Skips the first render to avoid an unnecessary replace
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return; // skip first run
    }
    const t = setTimeout(() => {
      replaceQuery({});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, selectedDate, days, adults, children]);

  // Submit (for now, just log)
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (selectedDate) params.set("date", selectedDate);
    if (days > 1) params.set("days", String(days));
    if (adults) params.set("adults", String(adults));
    if (children) params.set("children", String(children));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div
      ref={rootRef}
      className={[
        "flex flex-col gap-3 w-full justify-center z-10",
        className,
      ].join(" ")}
    >
      <form
        onSubmit={onSubmit}
        autoComplete="off"
        className="w-full flex flex-col bg-white p-2 rounded-2xl gap-3 shadow-2xl ring-2 ring-[#ec2227]/60 hover:ring-[#ec2227] transition-all duration-300"
      >
        <div className="flex flex-col w-full lg:flex-row">
          {/* Destination */}
          <div className="flex w-full lg:flex-1">
            <div className="relative z-10 flex flex-col w-full px-3 pt-1 border-gray-300 lg:border-r hover:bg-gray-100/50">
              <label className="text-xs font-bold" htmlFor="destination">
                Destination
              </label>
              <div className="relative">
                {/* left icon */}
                <IoIosPin className="absolute text-gray-600 -translate-y-1/2 pointer-events-none left-3 top-1/2" />

                <input
                  id="destination"
                  name="search-destination" // non-standard name to avoid browser history/autofill
                  className="w-full px-8 py-2 text-sm bg-transparent outline-none"
                  type="text"
                  placeholder="Search Destination"
                  value={destination}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDestination(v);
                  }}
                  onFocus={() => {
                    setShowDestSuggestions(true);
                    if (!isDesktop) setMobileOpen(true);
                  }}
                  onClick={() => {
                    if (!isDesktop) setMobileOpen(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowDestSuggestions(false), 150)
                  }
                  aria-autocomplete="list"
                  role="combobox"
                  aria-expanded={showDestSuggestions}
                  aria-controls="destination-suggestions"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="search"
                />

                {/* right clear */}
                {destination && (
                  <button
                    type="button"
                    onClick={() => setDestination("")}
                    className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                    aria-label="Clear destination"
                  >
                    ×
                  </button>
                )}
              </div>
              {showDestSuggestions && destination.trim().length > 0 && (
                <ul
                  id="destination-suggestions"
                  className="absolute left-0 right-0 z-20 mt-2 overflow-hidden bg-white border border-gray-200 rounded-md shadow-lg top-full"
                >
                  {destinationSuggestions.map((s) => (
                    <li
                      key={s}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDestination(s);
                        setShowDestSuggestions(false);
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div
              className={`${
                showRest ? "hidden " : "flex lg:hidden "
              }  h-full items-center`}
            >
              <div className="flex justify-center items-center w-16 h-14 bg-gradient-to-r from-[#ec2227] to-[#d11f24] text-white rounded-xl hover:from-[#d11f24] hover:to-[#b01a1f] transition-all duration-300 font-bold shadow-lg hover:shadow-xl">
                <Search />
              </div>
            </div>
          </div>

          <div className={showRest ? "contents" : "hidden lg:contents"}>
            <hr className="flex my-3 border-t border-gray-300 lg:hidden" />
            {/* Date (custom popover) */}
            <div className="relative flex flex-col w-full px-3 pt-1 border-gray-300 lg:flex-1 lg:border-r hover:bg-gray-100/50">
              <label className="text-xs font-bold" htmlFor="date">
                Date{days > 1 ? " Range " : " "}
                {days > 1 && (
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    ({days} days selected)
                  </span>
                )}
              </label>
              <div className="relative">
                <CalendarPicker
                  value={selectedDate}
                  initialDays={days}
                  onChange={(v) => {
                    setSelectedDate(v);
                    if (days > 1) setDays(1); // Reset to single day
                  }}
                  onRangeChange={(range) => {
                    const calculatedDays = calculateDays(
                      range.startDate,
                      range.endDate
                    );
                    setSelectedDate(range.startDate);
                    setDays(calculatedDays);
                  }}
                  className="w-full"
                  buttonClassName="pr-3 text-left text-sm border-0 outline-none focus:ring-0 shadow-none bg-transparent w-full"
                  enableModeToggle={true}
                  mode="single"
                />

                {/* right chevron */}
                <IoChevronDown className="absolute text-gray-600 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
              </div>
            </div>

            <hr className="flex my-3 border-t border-gray-300 lg:hidden" />

            {/* Guests */}
            <div className="relative flex flex-col w-full px-3 pt-1 rounded lg:flex-1 hover:bg-gray-100/50">
              <span className="text-xs font-bold">No Of Guest</span>
              <div className="relative">
                {/* left icon */}
                <IoPerson className="absolute text-gray-600 -translate-y-1/2 pointer-events-none left-3 top-1/2" />

                <button
                  type="button"
                  className="w-full px-8 py-2 text-sm text-left bg-transparent"
                  onClick={() => setGuestsOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={guestsOpen}
                >
                  <span className={totalGuests > 0 ? "" : "text-gray-500"}>
                    {totalGuests > 0 ? guestSummary : "Select guests"}
                  </span>
                </button>

                {/* right chevron */}
                {guestsOpen ? (
                  <IoChevronUp className="absolute text-gray-600 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
                ) : (
                  <IoChevronDown className="absolute text-gray-600 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
                )}
              </div>

              {guestsOpen && (
                <div className="absolute left-0 z-20 p-3 mt-2 bg-white border border-gray-200 rounded-md shadow-lg top-full w-72">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Adults</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="grid border border-gray-300 rounded size-7 place-items-center hover:bg-gray-100"
                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                        aria-label="Decrease adults"
                      >
                        <IoRemove />
                      </button>
                      <span className="w-6 text-sm text-center">{adults}</span>
                      <button
                        type="button"
                        className="grid border border-gray-300 rounded size-7 place-items-center hover:bg-gray-100"
                        onClick={() => setAdults((a) => a + 1)}
                        aria-label="Increase adults"
                      >
                        <IoAdd />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm">Children</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="grid border border-gray-300 rounded size-7 place-items-center hover:bg-gray-100"
                        onClick={() => setChildren((c) => Math.max(0, c - 1))}
                        aria-label="Decrease children"
                      >
                        <IoRemove />
                      </button>
                      <span className="w-6 text-sm text-center">
                        {children}
                      </span>
                      <button
                        type="button"
                        className="grid border border-gray-300 rounded size-7 place-items-center hover:bg-gray-100"
                        onClick={() => setChildren((c) => c + 1)}
                        aria-label="Increase children"
                      >
                        <IoAdd />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end mt-3">
                    <button
                      type="button"
                      className="rounded-lg bg-gradient-to-r from-[#ec2227] to-[#d11f24] px-4 py-2 text-sm font-bold text-white hover:from-[#d11f24] hover:to-[#b01a1f] transition-all duration-200 shadow-md hover:shadow-lg"
                      onClick={() => setGuestsOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button className="flex mt-4 lg:mt-0 justify-center items-center w-full lg:w-14 py-3 gap-2 bg-gradient-to-r from-[#ec2227] to-[#d11f24] text-white rounded-xl hover:from-[#d11f24] hover:to-[#b01a1f] transition-all duration-300 font-bold shadow-lg hover:shadow-xl hover:scale-101">
              <Search />
              <span className="contents lg:hidden">Search</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBox;
