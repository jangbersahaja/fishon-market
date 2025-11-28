"use client";

import type { MapItem } from "@/utils/mapItems";
import { ArrowUpDown, List, Map, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// Sort options matching CompactFiltersBar
const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price_low_high", label: "Price: Low → High" },
  { value: "price_high_low", label: "Price: High → Low" },
  { value: "rating_desc", label: "Highest Rated" },
] as const;

export default function ResultsMap({
  idBase = "search",
  items,
  initialCenter,
  showDesktopInlineMap = true,
  onOpenFilters,
  activeFiltersCount = 0,
}: {
  idBase?: string;
  items: MapItem[];
  initialCenter: { lat: number; lng: number };
  sectionTitle?: string;
  showDesktopInlineMap?: boolean;
  /** Callback to open the main filters modal */
  onOpenFilters?: () => void;
  /** Number of active filters to show badge */
  activeFiltersCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const mapInitRan = useRef(false); // prevents double init on Fast Refresh
  const fsInitRan = useRef(false);
  const isOverlayOpen = useRef(false);

  // Refs for fullscreen map so we can update markers when items change
  const fsMapRef = useRef<google.maps.Map | null>(null);
  const fsInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const fsClustererRef = useRef<any>(null);
  const fsMarkersRef = useRef<google.maps.Marker[]>([]);
  const latestItemsRef = useRef(items); // For initial render callback

  // Keep latestItemsRef updated
  latestItemsRef.current = items;

  // Use refs for initial render to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false);
  const [showListPanel, setShowListPanel] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Get current sort from URL
  const currentSort = searchParams?.get("orderby") || "recommended";

  const mapId = `${idBase}-gmap`;
  const mapFsId = `${idBase}-gmap-fullscreen`;
  const overlayId = `${idBase}-map-overlay`;
  const recenterId = `${idBase}-recenter`;
  const openBtnId = `${idBase}-open-map`;
  const closeBtnId = `${idBase}-close-map`;
  const listToggleId = `${idBase}-list-toggle`;

  // Mark as mounted after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      params.set("orderby", value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      setShowSortMenu(false);
    },
    [router, pathname, searchParams]
  );

  // ---- Lock/unlock body scroll ----
  const lockBodyScroll = useCallback(() => {
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    isOverlayOpen.current = true;
  }, []);

  const unlockBodyScroll = useCallback(() => {
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
    isOverlayOpen.current = false;
    setShowListPanel(false); // Reset list panel when closing
    setShowSortMenu(false); // Reset sort menu when closing
  }, []);

  // ---- styles for InfoWindow & controls (unchanged from your version) ----
  // (kept exactly to preserve your look & feel)
  // ------------------------------------------------------------------------

  // Inject InfoWindow styles on mount (client-only to avoid hydration mismatch)
  useEffect(() => {
    const styleId = "fishon-map-infowindow-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Reset all Google Maps InfoWindow padding/margins */
      .gm-style .gm-style-iw-c {
        padding: 0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15) !important;
        max-width: none !important;
      }
      .gm-style .gm-style-iw-c > div:first-child {
        padding: 0 !important;
        margin: 0 !important;
      }
      .gm-style .gm-style-iw-tc {
        display: none !important;
      }
      .gm-style .gm-style-iw-t::after {
        display: none !important;
      }
      .gm-style .gm-ui-hover-effect {
        display: none !important;
      }
      .gm-style .gm-style-iw-d {
        overflow: hidden !important;
        padding: 0 !important;
        max-height: none !important;
      }
      .gm-style .gm-style-iw {
        padding: 0 !important;
      }
      .gm-style-iw-chr {
        display: none !important;
      }
      /* Airbnb-style InfoWindow */
      .fo-iw {
        position: relative;
        width: 280px;
        max-width: 90vw;
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      .fo-iw-close {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
        font-size: 14px;
        font-weight: 400;
        color: #222;
        cursor: pointer;
        z-index: 2;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .fo-iw-close:hover {
        transform: scale(1.05);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
      }
      .fo-iw-img-wrap {
        position: relative;
        width: 100%;
        height: 160px;
        overflow: hidden;
      }
      .fo-iw-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .fo-iw-price-tag {
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: #fff;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #222;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
      }
      .fo-iw-body {
        padding: 12px;
      }
      .fo-iw-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
      }
      .fo-iw-title {
        font-size: 15px;
        font-weight: 600;
        color: #222;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        flex: 1;
      }
      .fo-iw-rating {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 13px;
        font-weight: 500;
        color: #222;
        flex-shrink: 0;
      }
      .fo-iw-star {
        font-size: 11px;
        line-height: 1;
      }
      .fo-iw-reviews {
        font-size: 13px;
        color: #717171;
        margin-bottom: 8px;
      }
      .fo-iw-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        font-weight: 500;
        color: #222;
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      .fo-iw-link:hover {
        color: #000;
      }
      .fo-iw-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fo-iw-pill {
        display: none;
      }
      .fo-iw-meta {
        display: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // Don't remove on unmount as other instances may need it
    };
  }, []);

  // Helper funcs ported from your inline <Script>
  function kmBetween(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
  ) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * y;
  }

  function jitterDuplicates(list: MapItem[]) {
    const byKey: Record<string, MapItem[]> = {};
    list.forEach((it) => {
      const key = `${it.lat.toFixed(5)},${it.lng.toFixed(5)}`;
      byKey[key] = byKey[key] || [];
      byKey[key].push(it);
    });
    const out: MapItem[] = [];
    Object.keys(byKey).forEach((k) => {
      const arr = byKey[k];
      if (arr.length === 1) {
        out.push(arr[0]);
        return;
      }
      const base = arr[0];
      for (let i = 0; i < arr.length; i++) {
        const angle = (i / arr.length) * 2 * Math.PI;
        const d = 0.00025;
        out.push({
          ...arr[i],
          lat: base.lat + d * Math.cos(angle),
          lng: base.lng + d * Math.sin(angle),
        });
      }
    });
    return out;
  }

  // replace your current makePriceIcon with this:
  function makePriceIcon(price?: number) {
    const label = price ? `RM${price}` : "RM–";
    const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="32">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        <rect x="1" y="1" rx="16" ry="16" width="94" height="30" fill="#ec2227"/>
        <text x="48" y="22" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="13" font-weight="500" fill="#ffffff">${label}</text>
      </g>
    </svg>`;
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      size: new google.maps.Size(96, 32),
      anchor: new google.maps.Point(48, 16),
      scaledSize: new google.maps.Size(96, 32),
    } as google.maps.Icon;
  }

  function waitForGoogle(): Promise<void> {
    return new Promise((resolve) => {
      const poll = () => {
        if (window.__gmapReady && window.google && google.maps) {
          resolve();
        } else {
          setTimeout(poll, 50);
        }
      };
      poll();
    });
  }

  // Clear fullscreen markers helper (uses refs)
  const clearFsMarkers = useCallback(() => {
    // Clear clusterer
    if (fsClustererRef.current) {
      try {
        fsClustererRef.current.clearMarkers();
        fsClustererRef.current.setMap(null);
      } catch {}
      fsClustererRef.current = null;
    }
    // Clear individual markers
    fsMarkersRef.current.forEach((m) => {
      try {
        m.setMap(null);
      } catch {}
    });
    fsMarkersRef.current = [];
  }, []);

  // Render fullscreen markers helper (uses refs)
  const renderFsMarkers = useCallback(
    (itemsToRender: MapItem[], fitOnFirst = false) => {
      const fsMap = fsMapRef.current;
      const fsInfoWindow = fsInfoWindowRef.current;
      if (!fsMap || !fsInfoWindow) return;

      // Clear existing markers first
      clearFsMarkers();

      const center = fsMap.getCenter();
      const bounds = fsMap.getBounds();
      if (!center || !bounds) return;

      // Use passed items directly
      const renderList = jitterDuplicates(itemsToRender);

      const newMarkers: google.maps.Marker[] = [];
      const fitBounds = new google.maps.LatLngBounds();

      renderList.forEach((it) => {
        const marker = new google.maps.Marker({
          position: { lat: it.lat, lng: it.lng },
          icon: makePriceIcon(it.price),
          title: it.name,
          map: fsMap,
        });
        marker.addListener("click", () => {
          fsInfoWindow.setContent(`
          <div class="fo-iw">
            <button type="button" class="fo-iw-close" aria-label="Close">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 2l8 8M10 2l-8 8"/>
              </svg>
            </button>
            ${
              it.image
                ? `<div class="fo-iw-img-wrap">
                <img src="${it.image}" alt="${it.name}" class="fo-iw-img">
                <div class="fo-iw-price-tag">From RM${it.price.toLocaleString()}</div>
              </div>`
                : ""
            }
            <div class="fo-iw-body">
              <div class="fo-iw-header">
                <div class="fo-iw-title">${it.name}</div>
                <div class="fo-iw-rating">
                  <span class="fo-iw-star">★</span>
                  <span>${it.ratingAvg ? it.ratingAvg.toFixed(1) : "New"}</span>
                </div>
              </div>
              <div class="fo-iw-reviews">${it.ratingCount ? `${it.ratingCount} review${it.ratingCount === 1 ? "" : "s"}` : "No reviews yet"}</div>
              <a href="${it.href}" target="_blank" rel="noopener" class="fo-iw-link">
                View charter
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          </div>
        `);
          fsInfoWindow.open({ map: fsMap, anchor: marker });
          setTimeout(() => {
            const btn = document.querySelector(
              ".fo-iw-close"
            ) as HTMLButtonElement | null;
            if (btn)
              btn.addEventListener("click", () => fsInfoWindow.close(), {
                once: true,
              });
          }, 0);
        });
        newMarkers.push(marker);
        fitBounds.extend(marker.getPosition()!);
      });

      fsMarkersRef.current = newMarkers;

      // Use clusterer if available
      if (window.markerClusterer && window.markerClusterer.MarkerClusterer) {
        // Remove markers from map first (clusterer will manage them)
        newMarkers.forEach((m) => m.setMap(null));

        const BrandRenderer = {
          render: ({
            count,
            position,
          }: {
            count: number;
            position: google.maps.LatLng | google.maps.LatLngLiteral;
          }) => {
            const size = count < 10 ? 40 : count < 100 ? 48 : 56;
            const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
              <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/></filter></defs>
              <g filter="url(#s)">
                <rect x="1" y="1" rx="${size / 2}" ry="${size / 2}" width="${size - 2}" height="${size - 2}" fill="#ec2227"/>
                <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="${size / 2.5}" font-weight="600" fill="#ffffff">${count}</text>
              </g>
            </svg>`;
            return new google.maps.Marker({
              position,
              icon: {
                url:
                  "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
                size: new google.maps.Size(size, size),
                anchor: new google.maps.Point(size / 2, size / 2),
                scaledSize: new google.maps.Size(size, size),
              },
              zIndex: google.maps.Marker.MAX_ZINDEX + count,
            });
          },
        };
        fsClustererRef.current = new window.markerClusterer.MarkerClusterer({
          map: fsMap,
          markers: newMarkers,
          renderer: BrandRenderer,
        });
      }

      if (fitOnFirst && renderList.length > 0) {
        fsMap.fitBounds(fitBounds, 40);
      }
    },
    [clearFsMarkers]
  );

  // Set up click handlers for open/close buttons immediately (don't wait for Google Maps)
  // Also handle fullscreen map initialization when Google Maps becomes ready
  useEffect(() => {
    let pendingInit = false; // Track if we're waiting to init

    function mountFsMap(center: { lat: number; lng: number }) {
      const el = document.getElementById(mapFsId);
      if (!el) return null;

      return new google.maps.Map(el, {
        center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
      });
    }

    function initFullscreenMap() {
      if (fsInitRan.current) return;
      if (!window.__gmapReady || !window.google || !google.maps) {
        // Google Maps not ready yet, mark as pending and wait
        pendingInit = true;
        waitForGoogle().then(() => {
          if (pendingInit) {
            initFullscreenMap();
          }
        });
        return;
      }

      pendingInit = false;
      fsInitRan.current = true;
      const fsMap = mountFsMap(initialCenter);
      if (fsMap) {
        // Store in refs for external access
        fsMapRef.current = fsMap;
        fsInfoWindowRef.current = new google.maps.InfoWindow({
          pixelOffset: new google.maps.Size(0, -8),
        });
        // Initial render after map is ready
        google.maps.event.addListenerOnce(fsMap, "idle", () => {
          // Hide loading indicator when map is ready
          const loadingEl = document.getElementById(`${overlayId}-loading`);
          if (loadingEl) loadingEl.classList.add("hidden");
          // Use latestItemsRef to get current items at render time
          renderFsMarkers(latestItemsRef.current, true);
        });
      }
    }

    // Open overlay function
    function openOverlay() {
      const overlay = document.getElementById(overlayId);
      if (overlay) {
        overlay.classList.remove("hidden");
        lockBodyScroll();
        // Try to init fullscreen map (will only work if Google Maps is ready)
        initFullscreenMap();
        // If map already initialized, refresh markers with latest items
        if (fsInitRan.current && fsMapRef.current) {
          renderFsMarkers(latestItemsRef.current, false);
        }
      }
    }

    // Close overlay function
    function closeOverlay() {
      const overlay = document.getElementById(overlayId);
      if (overlay) {
        overlay.classList.add("hidden");
        unlockBodyScroll();
      }
    }

    const handleClick = (e: MouseEvent) => {
      const tgt = e.target as HTMLElement;
      const openBtn = tgt.closest(`#${openBtnId}`);
      const closeBtn = tgt.closest(`#${closeBtnId}`);
      const recenterBtn = tgt.closest(`#${recenterId}`);

      if (openBtn) {
        openOverlay();
      }

      if (closeBtn) {
        closeOverlay();
      }

      if (recenterBtn && fsMapRef.current) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              fsMapRef.current?.setCenter({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
              fsMapRef.current?.setZoom(10);
            },
            () => {
              fsMapRef.current?.setCenter(initialCenter);
              fsMapRef.current?.setZoom(10);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          fsMapRef.current.setCenter(initialCenter);
          fsMapRef.current.setZoom(10);
        }
      }
    };

    // Handle ESC key to close overlay
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOverlayOpen.current) {
        closeOverlay();
      }
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
      // Ensure body scroll is unlocked on cleanup
      unlockBodyScroll();
      clearFsMarkers();
      try {
        if (fsMapRef.current)
          google.maps.event.clearInstanceListeners(fsMapRef.current);
      } catch {}
    };
  }, [
    openBtnId,
    closeBtnId,
    overlayId,
    recenterId,
    mapFsId,
    initialCenter,
    lockBodyScroll,
    unlockBodyScroll,
    clearFsMarkers,
    renderFsMarkers,
  ]);

  // Re-render markers when items change (separate from map initialization)
  useEffect(() => {
    // Only re-render if map is already initialized and overlay is open
    if (fsMapRef.current && isOverlayOpen.current) {
      renderFsMarkers(items, false); // Don't fit bounds, just refresh markers
    }
  }, [items, renderFsMarkers]);

  // Desktop inline map initialization (only when showDesktopInlineMap is true)
  useEffect(() => {
    if (!showDesktopInlineMap) return;

    let map: google.maps.Map | null = null;
    let clusterer: any = null;
    let infoWindow: google.maps.InfoWindow | null = null;

    function clearMarkers(cluster: any) {
      if (!cluster) return;
      try {
        cluster.clearMarkers();
      } catch {}
      try {
        cluster.setMap(null);
      } catch {}
    }

    function mountMap(targetId: string, center: { lat: number; lng: number }) {
      const el: HTMLElement | null = document.getElementById(targetId);
      if (!el) return null;

      const m = new google.maps.Map(el, {
        center,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
      });
      return m;
    }

    function render(
      m: google.maps.Map,
      iw: google.maps.InfoWindow,
      setCluster: (c: unknown) => void,
      fitOnFirst = false
    ) {
      const center = m.getCenter();
      const bounds = m.getBounds();
      if (!center || !bounds) return;

      const ne = bounds.getNorthEast();
      const radiusKm = kmBetween(
        { lat: center.lat(), lng: center.lng() },
        { lat: ne.lat(), lng: ne.lng() }
      );

      const nearby = items.filter(
        (it) =>
          kmBetween(
            { lat: center.lat(), lng: center.lng() },
            { lat: it.lat, lng: it.lng }
          ) <= radiusKm
      );
      const renderList = jitterDuplicates(
        nearby.length ? nearby : items.slice(0, 12)
      );

      const markers: google.maps.Marker[] = [];
      const fitBounds = new google.maps.LatLngBounds();

      renderList.forEach((it) => {
        const marker = new google.maps.Marker({
          position: { lat: it.lat, lng: it.lng },
          icon: makePriceIcon(it.price),
          title: it.name,
        });
        marker.addListener("click", () => {
          iw.setContent(`
            <div class="fo-iw">
              <button type="button" class="fo-iw-close" aria-label="Close">&times;</button>
              <div class="fo-iw-body">
                ${it.image ? `<img src="${it.image}" alt="${it.name}" class="fo-iw-img">` : ""}
                <div class="fo-iw-meta">
                  <div class="fo-iw-title">${it.name}</div>
                  <div class="fo-iw-rating">
                    <span class="fo-iw-star">★</span>
                    <span>${it.ratingAvg ? it.ratingAvg.toFixed(1) : "—"} (${it.ratingCount || 0} reviews)</span>
                  </div>
                  <div class="fo-iw-row">
                    <a href="${it.href}" target="_blank" rel="noopener" class="fo-iw-link">View details →</a>
                  </div>
                </div>
              </div>
            </div>
          `);
          iw.open({ map: m, anchor: marker });
          setTimeout(() => {
            const btn = document.querySelector(
              ".fo-iw-close"
            ) as HTMLButtonElement | null;
            if (btn)
              btn.addEventListener("click", () => iw.close(), { once: true });
          }, 0);
        });
        markers.push(marker);
        fitBounds.extend(marker.getPosition()!);
      });

      if (window.markerClusterer && window.markerClusterer.MarkerClusterer) {
        const BrandRenderer = {
          render: ({
            count,
            position,
          }: {
            count: number;
            position: google.maps.LatLng | google.maps.LatLngLiteral;
          }) => {
            const size = count < 10 ? 40 : count < 100 ? 48 : 56;
            const svg = `
              <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
                <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)"/></filter></defs>
                <g filter="url(#s)">
                  <rect x="1" y="1" rx="${size / 2}" ry="${size / 2}" width="${size - 2}" height="${size - 2}" fill="#ec2227"/>
                  <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto" font-size="${size / 2.5}" font-weight="600" fill="#ffffff">${count}</text>
                </g>
              </svg>`;
            return new google.maps.Marker({
              position,
              icon: {
                url:
                  "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
                size: new google.maps.Size(size, size),
                anchor: new google.maps.Point(size / 2, size / 2),
                scaledSize: new google.maps.Size(size, size),
              },
              zIndex: google.maps.Marker.MAX_ZINDEX + count,
            });
          },
        };
        const cluster = new window.markerClusterer.MarkerClusterer({
          map: m,
          markers,
          renderer: BrandRenderer,
        });
        setCluster(cluster);
      } else {
        markers.forEach((mk) => mk.setMap(m));
      }

      if (fitOnFirst) {
        if (renderList.length) m.fitBounds(fitBounds, 40);
        else {
          m.setCenter(initialCenter);
          m.setZoom(10);
        }
      }
    }

    function boot() {
      if (!mapInitRan.current) {
        mapInitRan.current = true;

        map = mountMap(mapId, initialCenter);
        if (map) {
          infoWindow = new google.maps.InfoWindow({
            pixelOffset: new google.maps.Size(0, -8),
          });
          google.maps.event.addListenerOnce(map, "idle", () =>
            render(map!, infoWindow!, (c) => (clusterer = c), true)
          );
          google.maps.event.addListener(map, "dragend", () =>
            render(map!, infoWindow!, (c) => (clusterer = c))
          );
          google.maps.event.addListener(map, "zoom_changed", () => {
            google.maps.event.addListenerOnce(map!, "idle", () =>
              render(map!, infoWindow!, (c) => (clusterer = c))
            );
          });
        }
      }

      // Recenter for desktop inline map
      const onDocClick = (e: MouseEvent) => {
        const tgt = e.target as HTMLElement;
        const recenterBtn = tgt.closest(`#${recenterId}`);

        if (recenterBtn && map) {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                map?.setCenter({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                });
                map?.setZoom(10);
              },
              () => {
                map?.setCenter(initialCenter);
                map?.setZoom(10);
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
          } else {
            map.setCenter(initialCenter);
            map.setZoom(10);
          }
        }
      };

      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }

    let removeDelegates: (() => void) | undefined;

    waitForGoogle().then(() => {
      removeDelegates = boot();
    });

    return () => {
      try {
        clearMarkers(clusterer);
        if (map) google.maps.event.clearInstanceListeners(map);
      } catch {}
      removeDelegates?.();
    };
  }, [showDesktopInlineMap, mapId, initialCenter, items, recenterId]);

  return (
    <>
      {/* Mobile FAB - View on Map button */}
      <div className="fixed left-0 right-0 z-30 flex justify-center w-full mx-auto pointer-events-none bottom-6 lg:hidden pb-safe">
        <button
          id={openBtnId}
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#ec2227] text-white px-5 py-3 text-sm font-semibold shadow-xl hover:bg-[#d11f24] active:scale-95 transition-all ring-4 ring-white/30"
        >
          <Map className="w-5 h-5" />
          <span>Map</span>
          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white/20">
            {items.length}
          </span>
        </button>
      </div>

      {/* Desktop inline map (optional) */}
      {showDesktopInlineMap && (
        <div className="hidden lg:block">
          <div className="relative mb-8">
            <div
              id={mapId}
              className="h-80 w-full overflow-hidden md:h-80 lg:h-[32rem]"
              aria-label="Map of nearby charters"
            />
            {/* Recenter control */}
            <button
              id={recenterId}
              type="button"
              className="absolute right-2.5 bottom-5.5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-gray-900 shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
              aria-label="Recenter to my location"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M16.3 7.7l2.1-2.1M5.6 18.4l2.1-2.1"></path>
              </svg>
              <span className="text-sm font-semibold">Recenter</span>
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      <div
        id={overlayId}
        className="fixed inset-0 z-50 hidden bg-white"
        role="dialog"
        aria-modal="true"
      >
        {/* Loading indicator (shown while map loads) */}
        <div
          id={`${overlayId}-loading`}
          className="absolute inset-0 flex items-center justify-center z-5 bg-slate-100"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#ec2227] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-600">
              Loading map...
            </span>
          </div>
        </div>

        {/* Top Controls Row */}
        <div className="absolute z-10 flex items-center justify-between gap-2 top-4 left-4 right-4">
          {/* Left side: Results count + Sort + Filters */}
          <div className="flex items-center gap-2">
            {/* Results count badge */}
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-lg ring-1 ring-black/10">
              <div className="w-2 h-2 bg-[#ec2227] rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-900">
                {items.length}
              </span>
            </div>

            {/* Sort dropdown */}
            {isMounted && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-gray-900 bg-white rounded-full shadow-lg ring-1 ring-black/10 hover:bg-gray-50"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  <span className="hidden text-sm font-medium sm:inline">
                    {SORT_OPTIONS.find((o) => o.value === currentSort)?.label ||
                      "Sort"}
                  </span>
                </button>

                {/* Sort dropdown menu */}
                {showSortMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute left-0 z-20 w-48 mt-2 overflow-hidden bg-white rounded-lg shadow-xl top-full ring-1 ring-black/10">
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleSortChange(option.value)}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                            currentSort === option.value
                              ? "bg-[#ec2227]/10 text-[#ec2227] font-semibold"
                              : "text-gray-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Filters button */}
            {onOpenFilters && isMounted && (
              <button
                type="button"
                onClick={() => {
                  // Close overlay first, then open filters
                  const overlay = document.getElementById(overlayId);
                  if (overlay) {
                    overlay.classList.add("hidden");
                    unlockBodyScroll();
                  }
                  onOpenFilters();
                }}
                className="relative inline-flex items-center gap-2 px-3 py-2 text-gray-900 bg-white rounded-full shadow-lg ring-1 ring-black/10 hover:bg-gray-50"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden text-sm font-medium sm:inline">
                  Filters
                </span>
                {activeFiltersCount > 0 && (
                  <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-[#ec2227] rounded-full -top-1.5 -right-1.5">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            id={closeBtnId}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-3 text-gray-900 bg-white rounded-full shadow-lg ring-1 ring-black/10 hover:bg-gray-50"
            aria-label="Close map"
          >
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Close</span>
          </button>
        </div>

        {/* Bottom Controls Row */}
        <div className="absolute z-10 flex items-end justify-between bottom-5 left-4 right-4">
          {/* List toggle button */}
          <button
            id={listToggleId}
            type="button"
            onClick={() => setShowListPanel(!showListPanel)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-3 shadow-lg ring-1 ring-black/10 transition-colors ${
              showListPanel
                ? "bg-[#ec2227] text-white ring-[#ec2227]"
                : "bg-white text-gray-900 hover:bg-gray-50"
            }`}
            aria-label={showListPanel ? "Show map" : "Show list"}
          >
            {showListPanel ? (
              <>
                <Map className="w-4 h-4" />
                <span className="text-sm font-semibold">Map</span>
              </>
            ) : (
              <>
                <List className="w-4 h-4" />
                <span className="text-sm font-semibold">List</span>
              </>
            )}
          </button>

          {/* Recenter button */}
          <button
            id={recenterId}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-3 text-gray-900 bg-white rounded-full shadow-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10"
            aria-label="Recenter to my location"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M16.3 7.7l2.1-2.1M5.6 18.4l2.1-2.1"></path>
            </svg>
            <span className="text-sm font-semibold">Recenter</span>
          </button>
        </div>

        {/* Map container */}
        <div id={mapFsId} className="absolute inset-0" />

        {/* List Panel - Desktop: left sidebar below top controls, Mobile: bottom sheet */}
        <div
          className={`absolute bg-white shadow-2xl transition-transform duration-300 ease-out ${
            showListPanel
              ? "translate-y-0 lg:translate-x-0"
              : "translate-y-full lg:-translate-x-full"
          } inset-x-0 bottom-0 max-h-[70vh] lg:max-h-none lg:top-16 lg:bottom-0 lg:left-0 lg:right-auto lg:w-96`}
          style={{ zIndex: 15 }} // Below top controls (z-10) but above map
        >
          {/* Panel Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              {items.length} {items.length === 1 ? "Charter" : "Charters"} Found
            </h3>
            <button
              type="button"
              onClick={() => setShowListPanel(false)}
              className="p-2 rounded-full hover:bg-gray-100"
              aria-label="Close list"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Scrollable List */}
          <div
            className="overflow-y-auto lg:h-[calc(100%-56px)]"
            style={{ maxHeight: "calc(70vh - 56px)" }}
          >
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="flex gap-3 p-4 transition-colors hover:bg-gray-50"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0 w-20 h-20 overflow-hidden bg-gray-100 rounded-lg">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-400">
                        <Map className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                      <span className="text-amber-500">★</span>
                      <span>
                        {item.ratingAvg ? item.ratingAvg.toFixed(1) : "—"}
                      </span>
                      <span className="text-gray-400">
                        ({item.ratingCount || 0})
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-semibold text-white bg-[#ec2227] rounded-full">
                        {item.price ? `RM${item.price}` : "RM–"}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
