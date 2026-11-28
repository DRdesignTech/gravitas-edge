'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Opportunity } from '@/lib/types';
import {
  WORLD_MAP_PATHS,
  NUM2CC,
  MARKERS,
  REGIONS,
  COUNTRY_FLAGS,
  COUNTRY_NAME_TO_CC,
} from './worldMapData';
import Eyebrow from './Eyebrow';
import ScrollReveal from './ScrollReveal';
import {
  HiMapPin,
  HiArrowUpRight,
  HiArrowRight,
  HiChevronDown,
  HiChevronUp,
} from 'react-icons/hi2';

export interface CountryInfo {
  name: string;
  cc: string;
  count: number;
  cities: Set<string>;
  cityCounts: Record<string, number>;
  inds: Set<string>;
}

interface MarkerCluster {
  x: number;
  y: number;
  n: number;
  m: { cc: string; n: number; x: number; y: number }[];
}

const MAPW = 960;
const MAPH = 470;

// Sample fallback countries (Reflecting ~10 London opportunities and priority UAE corridors)
const FALLBACK_COUNTRIES: { name: string; cc: string; count: number; cities: string[]; inds: string[] }[] = [
  { name: 'United Kingdom', cc: 'GB', count: 10, cities: ['London', 'Canary Wharf', 'Mayfair', 'Manchester'], inds: ['Technology', 'Investment Banking', 'Private Equity', 'Legal', 'Consulting'] },
  { name: 'United Arab Emirates', cc: 'AE', count: 12, cities: ['Dubai', 'Abu Dhabi', 'DIFC', 'ADGM'], inds: ['Finance & Wealth', 'Energy & Utilities', 'Digital & Cloud', 'Logistics', 'Real Estate'] },
  { name: 'Saudi Arabia', cc: 'SA', count: 6, cities: ['Riyadh', 'Jeddah', 'NEOM'], inds: ['Construction & Infrastructure', 'Human Resources', 'Logistics', 'Tech'] },
  { name: 'Singapore', cc: 'SG', count: 5, cities: ['Singapore'], inds: ['Fintech', 'Technology', 'Banking & Asset Management'] },
  { name: 'Germany', cc: 'DE', count: 4, cities: ['Berlin', 'Munich', 'Frankfurt'], inds: ['Technology', 'Manufacturing', 'Automotive'] },
  { name: 'Qatar', cc: 'QA', count: 3, cities: ['Doha'], inds: ['Finance', 'Hospitality', 'Energy'] },
  { name: 'Kenya', cc: 'KE', count: 3, cities: ['Nairobi'], inds: ['Finance', 'Development Sector', 'AgriTech'] },
  { name: 'Canada', cc: 'CA', count: 3, cities: ['Toronto', 'Vancouver'], inds: ['Banking', 'AI & Technology'] },
  { name: 'United States', cc: 'US', count: 4, cities: ['New York', 'Austin', 'San Francisco'], inds: ['Technology', 'Financial Services'] },
  { name: 'Oman', cc: 'OM', count: 2, cities: ['Muscat'], inds: ['Logistics', 'Maritime'] },
  { name: 'India', cc: 'IN', count: 15, cities: ['Bengaluru', 'Mumbai', 'Pune', 'Gurugram', 'Hyderabad', 'Chennai'], inds: ['Marketing', 'Finance', 'Manufacturing', 'Technology', 'Consulting', 'Sales'] },
];

export default function CountryDirectory({
  opportunities = [],
}: {
  opportunities?: Opportunity[];
}) {
  // Aggregate countries from live opportunities if available, or fallback to prototype sample data
  const countries = useMemo<CountryInfo[]>(() => {
    const buildFallback = () =>
      FALLBACK_COUNTRIES.map((c) => ({
        name: c.name,
        cc: c.cc,
        count: c.count,
        cities: new Set(c.cities),
        cityCounts: Object.fromEntries(c.cities.map((city) => [city, 1])),
        inds: new Set(c.inds),
      }));

    if (!opportunities || opportunities.length === 0) {
      return buildFallback();
    }

    const byCountry: Record<string, CountryInfo> = {};
    opportunities.forEach((o) => {
      const cName = o.country?.trim();
      if (!cName) return;
      const lower = cName.toLowerCase();
      const cc = COUNTRY_NAME_TO_CC[lower] || o.country || '🌐';

      if (!byCountry[cName]) {
        byCountry[cName] = {
          name: cName,
          cc,
          count: 0,
          cities: new Set<string>(),
          cityCounts: {},
          inds: new Set<string>(),
        };
      }
      byCountry[cName].count += 1;
      const loc = o.location?.trim();
      if (loc) {
        byCountry[cName].cities.add(loc);
        byCountry[cName].cityCounts[loc] = (byCountry[cName].cityCounts[loc] || 0) + 1;
      }
      if (o.industry?.trim()) {
        byCountry[cName].inds.add(o.industry.trim());
      }
    });

    const list = Object.values(byCountry);
    if (list.length === 0) {
      return buildFallback();
    }
    return list;
  }, [opportunities]);

  // Derived lists
  const byCC = useMemo(() => {
    return Object.fromEntries(countries.map((c) => [c.cc, c]));
  }, [countries]);

  const intlCountries = useMemo(() => countries.filter((c) => c.cc !== 'IN'), [countries]);
  const indiaCountry = useMemo(() => countries.find((c) => c.cc === 'IN'), [countries]);
  const sortedTiles = useMemo(() => {
    // Sort countries by active opportunity count descending so top opportunity hubs appear first
    return [...countries].sort((a, b) => b.count - a.count);
  }, [countries]);

  const [showAll, setShowAll] = useState(false);
  const [openLocationCC, setOpenLocationCC] = useState<string | null>(null);
  const visibleTiles = useMemo(() => {
    return showAll ? sortedTiles : sortedTiles.slice(0, 6);
  }, [showAll, sortedTiles]);

  useEffect(() => {
    if (!openLocationCC) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-country-location-dropdown]')) {
        setOpenLocationCC(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openLocationCC]);

  const totalLiveRoles = useMemo(() => countries.reduce((s, c) => s + c.count, 0), [countries]);
  const totalCities = useMemo(() => countries.reduce((s, c) => s + c.cities.size, 0), [countries]);
  const maxCount = useMemo(() => Math.max(1, ...countries.map((c) => c.count)), [countries]);

  // Map state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAPW, h: MAPH });
  const [mapRegion, setMapRegion] = useState('World');
  const [highlightedCC, setHighlightedCC] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [popup, setPopup] = useState<{
    cc: string;
    name: string;
    count: number;
    cities: string[];
    inds: string[];
    x: number;
    y: number;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ isDown: boolean; x: number; y: number; vx: number; vy: number; moved: boolean }>({
    isDown: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    moved: false,
  });
  const animRef = useRef<number | null>(null);

  // Region tabs with counts
  const availableRegions = useMemo(() => {
    const list: [string, string[]][] = [['World', countries.map((c) => c.cc)]];
    REGIONS.forEach(([n, ccs]) => {
      const activeInReg = ccs.filter((cc) => byCC[cc]);
      if (activeInReg.length > 0) {
        list.push([n, activeInReg]);
      }
    });
    return list;
  }, [countries, byCC]);

  // Marker clustering
  const markerClusters = useMemo<MarkerCluster[]>(() => {
    const sw0 = svgRef.current?.clientWidth || 900;
    const k = Math.min(2.4, Math.max(1, 760 / sw0));
    const z = MAPW / viewBox.w / k;
    const thr = 24 / z;

    const pts = countries
      .filter((c) => MARKERS[c.cc])
      .map((c) => ({
        cc: c.cc,
        n: c.count,
        x: MARKERS[c.cc][0],
        y: MARKERS[c.cc][1],
      }))
      .sort((a, b) => b.n - a.n);

    const clusters: MarkerCluster[] = [];
    for (const p of pts) {
      const hit = clusters.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < thr);
      if (hit) {
        hit.m.push(p);
        hit.n += p.n;
      } else {
        clusters.push({ x: p.x, y: p.y, n: p.n, m: [p] });
      }
    }
    return clusters;
  }, [countries, viewBox.w]);

  // ViewBox animation
  const animateViewBox = useCallback((target: { x: number; y: number; w: number; h: number }, done?: () => void) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = { ...viewBox };
    const startTime = performance.now();
    const duration = 650;

    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // ease-in-out cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const current = {
        x: start.x + (target.x - start.x) * ease,
        y: start.y + (target.y - start.y) * ease,
        w: start.w + (target.w - start.w) * ease,
        h: start.h + (target.h - start.h) * ease,
      };
      setViewBox(current);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else if (done) {
        done();
      }
    };
    animRef.current = requestAnimationFrame(step);
  }, [viewBox]);

  const clampViewBox = useCallback((t: { x: number; y: number; w: number; h: number }) => {
    const w = Math.min(MAPW, Math.max(90, t.w));
    const h = (w * MAPH) / MAPW;
    const x = Math.min(MAPW - w, Math.max(0, t.x));
    const y = Math.min(MAPH - h, Math.max(0, t.y));
    return { x, y, w, h };
  }, []);

  const zoomToCountries = useCallback((ccs: string[], done?: () => void) => {
    const pts = ccs.map((cc) => MARKERS[cc]).filter(Boolean);
    if (!pts.length) return;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const pad = 45;
    let w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, 150);
    let h = (w * MAPH) / MAPW;
    const hNeed = Math.max(...ys) - Math.min(...ys) + pad * 2;
    if (h < hNeed) {
      h = hNeed;
      w = (h * MAPW) / MAPH;
    }
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    animateViewBox(clampViewBox({ x: cx - w / 2, y: cy - h / 2, w, h }), done);
  }, [animateViewBox, clampViewBox]);

  const zoomBy = useCallback((factor: number) => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    const w = viewBox.w / factor;
    animateViewBox(clampViewBox({ x: cx - w / 2, y: cy - (w * MAPH) / MAPW / 2, w, h: (w * MAPH) / MAPW }));
  }, [viewBox, animateViewBox, clampViewBox]);

  const resetMap = useCallback(() => {
    setMapRegion('World');
    setPopup(null);
    setHighlightedCC(null);
    animateViewBox({ x: 0, y: 0, w: MAPW, h: MAPH });
  }, [animateViewBox]);

  const handleRegionClick = (regionName: string, ccs: string[]) => {
    setPopup(null);
    setMapRegion(regionName);
    if (regionName === 'World') {
      animateViewBox({ x: 0, y: 0, w: MAPW, h: MAPH });
    } else {
      zoomToCountries(ccs);
    }
  };

  const showPopupForCountry = useCallback((cc: string, clientX: number, clientY: number) => {
    const c = byCC[cc];
    if (!c || !stageRef.current) return;
    setHighlightedCC(cc);
    const stageRect = stageRef.current.getBoundingClientRect();
    let x = clientX - stageRect.left + 14;
    let y = clientY - stageRect.top - 30;
    if (x + 260 > stageRect.width) {
      x = clientX - stageRect.left - 264;
    }
    y = Math.min(Math.max(y, 8), stageRect.height - 250);

    setPopup({
      cc,
      name: c.name,
      count: c.count,
      cities: Array.from(c.cities),
      inds: Array.from(c.inds).slice(0, 4),
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  }, [byCC]);

  const focusCountry = useCallback((cc: string) => {
    setMapRegion('');
    zoomToCountries([cc], () => {
      if (MARKERS[cc] && svgRef.current && stageRef.current) {
        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = MARKERS[cc][0];
        pt.y = MARKERS[cc][1];
        const screenPt = pt.matrixTransform(svg.getScreenCTM() || undefined);
        showPopupForCountry(cc, screenPt.x, screenPt.y);
      }
    });
  }, [zoomToCountries, showPopupForCountry]);

  // Pointer drag for panning
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.mappop, .mzoom')) return;
    dragRef.current = {
      isDown: true,
      x: e.clientX,
      y: e.clientY,
      vx: viewBox.x,
      vy: viewBox.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (drag.isDown) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) {
        drag.moved = true;
      }
      if (drag.moved && viewBox.w < MAPW && svgRef.current) {
        const k = viewBox.w / svgRef.current.getBoundingClientRect().width;
        setViewBox(clampViewBox({
          x: drag.vx - dx * k,
          y: drag.vy - dy * k,
          w: viewBox.w,
          h: viewBox.h,
        }));
      }
    }
  };

  const handlePointerUp = () => {
    dragRef.current.isDown = false;
  };

  return (
    <section id="countries" className="relative py-[72px] bg-white dark:bg-[#0C1E38] scroll-mt-20">
      <div className="mx-auto max-w-[1180px] px-5">
        {/* Section Header (.center) */}
        <ScrollReveal className="text-center">
          <Eyebrow>
            Explore opportunities by country
          </Eyebrow>
          <h2 className="font-['Poppins',system-ui,sans-serif] font-bold text-[clamp(1.7rem,3.4vw,2.5rem)] text-[#061B36] dark:text-white leading-[1.15] tracking-[-0.02em] mb-2">
            Where the opportunities are right now
          </h2>
          <p className="text-[#5B6479] dark:text-[#AEB9D6] max-w-[640px] text-[1.05rem] leading-[1.55] mx-auto">
            This list updates itself. A country appears when its first active opportunity is published and disappears when its last one expires or is archived.
          </p>
        </ScrollReveal>

        {/* Global Opportunity Map Box (.gmap#mapBox) */}
        <ScrollReveal direction="scale" delay={80}>
        <div
          className="mt-[30px] rounded-[24px] overflow-hidden max-w-full text-white border border-[#F0C27B]/20 shadow-[0_30px_60px_-30px_rgba(6,27,54,0.6)]"
          style={{
            background:
              'radial-gradient(900px 420px at 30% 0%, #123862 0%, rgba(18,56,98,0) 60%), linear-gradient(160deg, #061B36 0%, #0A2645 100%)',
          }}
          id="mapBox"
        >
          {/* Header (.gmap-head) */}
          <div className="flex justify-between items-center gap-3.5 flex-wrap pt-5 px-[22px] pb-1.5 max-[640px]:pt-4 max-[640px]:px-3.5 max-[640px]:pb-1">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-[#22C55E]/15 text-[#86EFAC] text-[0.72rem] font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Live
              </span>
              <div>
                <b className="text-[1.05rem] font-bold block text-white leading-tight">Global Opportunity Map</b>
                <small className="text-[#9FB0CC] text-[0.78rem] block mt-0.5">
                  Updates automatically as roles are published or expire
                </small>
              </div>
            </div>

            {/* Region Filter Pills (.mregions) */}
            <div className="flex gap-1.5 flex-wrap" id="mapRegions">
              {availableRegions.map(([name, ccs]) => {
                const count = ccs.reduce((acc, cc) => acc + (byCC[cc]?.count || 0), 0);
                const isActive = mapRegion === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleRegionClick(name, ccs)}
                    className={`rounded-full px-3 py-1.5 text-[0.76rem] font-semibold transition-colors flex items-center cursor-pointer ${
                      isActive
                        ? 'bg-[#D6952F] text-[#061B36] font-bold border border-[#D6952F]'
                        : 'bg-white/[0.06] border border-white/[0.14] text-[#DCE5F5] hover:bg-white/[0.12]'
                    }`}
                  >
                    <span>{name}</span>
                    <em className="not-italic opacity-70 ml-1">{count}</em>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map Body (.gmap-body) */}
          <div className="grid grid-cols-1 min-[961px]:grid-cols-[1fr_280px]">
            {/* Interactive SVG Stage (.mstage) */}
            <div
              ref={stageRef}
              className="relative overflow-hidden p-1.5 min-[961px]:p-2.5 touch-none cursor-grab active:cursor-grabbing select-none"
              id="mapStage"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                dragRef.current.isDown = false;
                setTooltip(null);
              }}
            >
              <svg
                ref={svgRef}
                id="mapSvg"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                className={`w-full h-auto block ${highlightedCC ? 'focus' : ''}`}
                role="img"
                aria-label="World map of countries with live opportunities"
              >
                <defs>
                  <pattern id="mdots" width="9" height="9" patternUnits="userSpaceOnUse">
                    <circle cx="1.5" cy="1.5" r="0.8" fill="rgba(255,255,255,0.07)" />
                  </pattern>
                  <linearGradient id="mgreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#4ADE80" />
                    <stop offset="1" stopColor="#16A34A" />
                  </linearGradient>
                  <linearGradient id="mindia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#F0C27B" />
                    <stop offset="1" stopColor="#C8842D" />
                  </linearGradient>
                  <style>{`
                    @keyframes ring {
                      0% {
                        transform: scale(0.7);
                        opacity: 0.9;
                      }
                      100% {
                        transform: scale(2.1);
                        opacity: 0;
                      }
                    }
                    .map-marker-pulse {
                      transform-box: fill-box;
                      transform-origin: center;
                      animation: ring 2.4s cubic-bezier(0.2, 0, 0.4, 1) infinite;
                      pointer-events: none;
                    }
                  `}</style>
                </defs>

                {/* Dot grid background */}
                <rect x="-2000" y="-2000" width="5000" height="5000" fill="url(#mdots)" />

                {/* Country Paths */}
                <g id="worldMap">
                  {WORLD_MAP_PATHS.map((p) => {
                    const cc = NUM2CC[p.n];
                    const c = cc ? byCC[cc] : null;
                    const hasJobs = Boolean(c);
                    const isHighlighted = highlightedCC === cc;

                    let fill = '#1B3558';
                    let filter: string | undefined = undefined;
                    let cursor = 'default';

                    if (hasJobs) {
                      cursor = 'pointer';
                      if (isHighlighted) {
                        fill = '#86EFAC';
                      } else {
                        fill = 'url(#mgreen)';
                        filter = 'drop-shadow(0 0 5px rgba(34,197,94,0.55))';
                      }
                    }

                    const opacity = highlightedCC && hasJobs && !isHighlighted ? 0.55 : 1;

                    return (
                      <path
                        key={p.n}
                        d={p.d}
                        fill={fill}
                        stroke="#0B2440"
                        strokeWidth={0.6}
                        style={{
                          vectorEffect: 'non-scaling-stroke',
                          transition: 'fill 0.25s, opacity 0.25s',
                          filter,
                          cursor,
                          opacity,
                        }}
                        onMouseEnter={(e) => {
                          if (hasJobs && c && stageRef.current) {
                            const rect = stageRef.current.getBoundingClientRect();
                            setTooltip({
                              text: `${COUNTRY_FLAGS[cc] || ''} ${c.name} · ${c.count} live ${c.count === 1 ? 'role' : 'roles'}`,
                              x: e.clientX - rect.left + 14,
                              y: e.clientY - rect.top + 14,
                            });
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={(e) => {
                          if (hasJobs && c && !dragRef.current.moved) {
                            showPopupForCountry(cc, e.clientX, e.clientY);
                          }
                        }}
                      />
                    );
                  })}
                </g>

                {/* Marker pins & clusters */}
                <g id="mapMarkers">
                  {markerClusters.map((cl, idx) => {
                    const isMulti = cl.m.length > 1;
                    const isHl = highlightedCC && cl.m.some((m) => m.cc === highlightedCC);
                    const sw0 = svgRef.current?.clientWidth || 900;
                    const k = Math.min(2.4, Math.max(1, 760 / sw0));
                    const z = MAPW / viewBox.w / k;

                    const r = (isMulti ? 11 : cl.n > 9 ? 10 : 8.5) / z;
                    const sw = 1.6 / z;
                    const fs = (isMulti ? 10 : 9.5) / z;

                    let pinStroke = '#4ADE80';
                    let ringFill = 'rgba(34,197,94,0.35)';
                    let pinFill = '#0B2440';
                    let textColor = '#ffffff';

                    if (isMulti) {
                      pinStroke = '#ffffff';
                      ringFill = 'rgba(214,149,47,0.35)';
                      pinFill = '#D6952F';
                      textColor = '#061B36';
                    }

                    if (isHl) {
                      pinFill = '#16A34A';
                    }

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer outline-none"
                        tabIndex={0}
                        role="button"
                        onClick={(e) => {
                          if (dragRef.current.moved) return;
                          if (isMulti) {
                            setPopup(null);
                            setMapRegion('');
                            zoomToCountries(cl.m.map((m) => m.cc));
                          } else {
                            showPopupForCountry(cl.m[0].cc, e.clientX, e.clientY);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!stageRef.current) return;
                          const rect = stageRef.current.getBoundingClientRect();
                          if (isMulti) {
                            const ccs = cl.m.map((m) => m.cc);
                            setTooltip({
                              text: `${ccs.map((c) => COUNTRY_FLAGS[c] || '').join(' ')} ${ccs.length} countries · ${cl.n} live · tap to zoom`,
                              x: e.clientX - rect.left + 14,
                              y: e.clientY - rect.top + 14,
                            });
                          } else {
                            const c = byCC[cl.m[0].cc];
                            if (c) {
                              setTooltip({
                                text: `${COUNTRY_FLAGS[cl.m[0].cc] || ''} ${c.name} · ${c.count} live ${c.count === 1 ? 'role' : 'roles'}`,
                                x: e.clientX - rect.left + 14,
                                y: e.clientY - rect.top + 14,
                              });
                            }
                          }
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <circle
                          cx={cl.x}
                          cy={cl.y}
                          r={r + 3 / z}
                          fill={ringFill}
                          className="map-marker-pulse"
                          style={{
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                            animation: 'ring 2.4s cubic-bezier(0.2, 0, 0.4, 1) infinite',
                            pointerEvents: 'none',
                          }}
                        />
                        <circle cx={cl.x} cy={cl.y} r={r} fill={pinFill} stroke={pinStroke} strokeWidth={sw} />
                        <text
                          x={cl.x}
                          y={cl.y}
                          fontSize={fs}
                          fill={textColor}
                          fontFamily="'Poppins', sans-serif"
                          fontWeight={700}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="pointer-events-none"
                        >
                          {cl.n}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Map Zoom Controls (.mzoom) */}
              <div className="absolute left-[18px] bottom-[18px] flex flex-col gap-1.5 max-[640px]:left-auto max-[640px]:right-2 max-[640px]:bottom-2 max-[640px]:flex-row z-10">
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => zoomBy(1.6)}
                  className="w-[34px] h-[34px] rounded-[10px] border border-white/20 bg-[#061B36]/85 hover:bg-[#D6952F] hover:text-[#061B36] text-white text-[1.05rem] font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => zoomBy(1 / 1.6)}
                  className="w-[34px] h-[34px] rounded-[10px] border border-white/20 bg-[#061B36]/85 hover:bg-[#D6952F] hover:text-[#061B36] text-white text-[1.05rem] font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Reset view"
                  onClick={resetMap}
                  className="w-[34px] h-[34px] rounded-[10px] border border-white/20 bg-[#061B36]/85 hover:bg-[#D6952F] hover:text-[#061B36] text-white text-[1.05rem] font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  ⟲
                </button>
              </div>

              {/* Pan Hint (.mhint) */}
              <div className="absolute right-[18px] bottom-[16px] text-[0.7rem] text-[#7F92B2] max-[640px]:hidden pointer-events-none">
                Drag to pan · tap a marker for details
              </div>

              {/* Tooltip (.mtip) */}
              {tooltip && (
                <div
                  className="absolute pointer-events-none bg-white text-[#061B36] text-[0.78rem] font-semibold px-2.5 py-1.5 rounded-lg shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)] whitespace-nowrap z-20"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  {tooltip.text}
                </div>
              )}

              {/* Popup modal card (.mappop) */}
              {popup && (
                <div
                  className="absolute bg-white dark:bg-[#10243E] text-[#1A2236] dark:text-white rounded-[16px] p-[16px_18px] shadow-[0_24px_50px_-16px_rgba(0,0,0,0.6)] w-[250px] z-30 max-[640px]:!left-2 max-[640px]:!right-2 max-[640px]:!top-auto max-[640px]:!bottom-2 max-[640px]:w-auto"
                  style={{ left: popup.x, top: popup.y }}
                >
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => {
                      setPopup(null);
                      setHighlightedCC(null);
                    }}
                    className="absolute top-2 right-3 bg-transparent border-0 text-[1.2rem] text-[#5B6479] hover:text-[#061B36] dark:hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                  <div className="font-bold text-[#061B36] dark:text-white text-[1.02rem] flex items-center gap-1.5">
                    <span>{COUNTRY_FLAGS[popup.cc] || '🌐'}</span>
                    <span>{popup.name}</span>
                  </div>
                  <div className="text-[1.8rem] font-extrabold text-[#15803D] dark:text-[#4ADE80] leading-[1.1] mt-1">
                    {popup.count}{' '}
                    <small className="text-[0.8rem] font-medium text-[#5B6479] dark:text-[#AEB9D6]">
                      live {popup.count === 1 ? 'opportunity' : 'opportunities'}
                    </small>
                  </div>
                  {popup.cities.length > 0 && (
                    <div className="text-[0.76rem] text-[#5B6479] dark:text-[#AEB9D6] my-2">
                      📍 {popup.cities.join(' · ')}
                    </div>
                  )}
                  {popup.inds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {popup.inds.map((ind) => (
                        <span
                          key={ind}
                          className="text-[0.66rem] bg-[#F3F1EB] dark:bg-white/10 text-[#061B36] dark:text-white px-2 py-0.5 rounded-full font-semibold"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-[0.72rem] text-[#5B6479] dark:text-[#AEB9D6] mb-2.5">
                    Access:{' '}
                    <b className="text-[#061B36] dark:text-white">
                      Global vaults · Executive Premier
                    </b>
                  </div>
                  <Link
                    href={`/opportunities?country=${encodeURIComponent(popup.name)}`}
                    className="w-full inline-flex justify-center items-center rounded-full bg-[#061B36] dark:bg-[#D6952F] text-white dark:text-[#061B36] font-bold text-[0.82rem] py-2 px-4 transition-colors hover:bg-[#10243E] dark:hover:bg-[#C8842D]"
                  >
                    View {popup.name} jobs →
                  </Link>
                </div>
              )}
            </div>

            {/* Right Sidebar (.mside) */}
            <aside className="border-t min-[961px]:border-t-0 min-[961px]:border-l border-white/[0.08] p-[14px_16px_16px] flex flex-col gap-3 max-h-[520px] max-[960px]:max-h-none">
              {/* Stats Row (.mstats) */}
              <div className="grid grid-cols-3 gap-2" id="mapStats">
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-[12px] p-2.5 text-center">
                  <b className="block text-[1.3rem] text-[#86EFAC] leading-[1.1] font-bold">{totalLiveRoles}</b>
                  <span className="text-[0.6rem] text-[#9FB0CC] uppercase tracking-[0.02em] whitespace-nowrap block mt-0.5">
                    live roles
                  </span>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-[12px] p-2.5 text-center">
                  <b className="block text-[1.3rem] text-[#86EFAC] leading-[1.1] font-bold">{countries.length}</b>
                  <span className="text-[0.6rem] text-[#9FB0CC] uppercase tracking-[0.02em] whitespace-nowrap block mt-0.5">
                    countries
                  </span>
                </div>
                <div className="bg-white/[0.05] border border-white/[0.08] rounded-[12px] p-2.5 text-center">
                  <b className="block text-[1.3rem] text-[#86EFAC] leading-[1.1] font-bold">{totalCities}</b>
                  <span className="text-[0.6rem] text-[#9FB0CC] uppercase tracking-[0.02em] whitespace-nowrap block mt-0.5">
                    cities
                  </span>
                </div>
              </div>

              {/* Scrollable Country Rows (.mlist) */}
              <div className="overflow-y-auto scrollbar-navy-gold flex flex-col gap-1 pr-2 max-[960px]:grid max-[960px]:grid-cols-2 min-[640px]:max-[960px]:grid-cols-3" id="mapList">
                {countries.map((c) => {
                  const isHl = highlightedCC === c.cc;
                  const barWidth = Math.max(8, (c.count / maxCount) * 100);

                  return (
                    <button
                      key={c.name}
                      type="button"
                      onMouseEnter={() => setHighlightedCC(c.cc)}
                      onMouseLeave={() => setHighlightedCC(null)}
                      onClick={() => focusCountry(c.cc)}
                      className={`grid grid-cols-[24px_1fr_auto] gap-x-2 gap-y-0.5 items-center text-left bg-transparent border rounded-[10px] p-[7px_8px] text-white text-[0.82rem] transition-colors cursor-pointer ${
                        isHl
                          ? 'bg-white/[0.07] border-[#86EFAC]/30'
                          : 'border-transparent hover:bg-white/[0.07] hover:border-[#86EFAC]/30'
                      }`}
                    >
                      <span className="text-[1.1rem] row-span-2">{COUNTRY_FLAGS[c.cc] || '🌐'}</span>
                      <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{c.name}</span>
                      <span className="font-extrabold row-span-2 text-right text-[#86EFAC]">
                        {c.count}
                      </span>
                      <span className="h-1 rounded-full bg-white/[0.08] overflow-hidden block">
                        <i
                          className="block h-full rounded-full bg-gradient-to-r from-[#16A34A] to-[#4ADE80]"
                          style={{ width: `${barWidth}%` }}
                        />
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          {/* Map Legend (.mlegend) */}
          <div className="flex gap-4 min-[640px]:gap-[18px] flex-wrap justify-center text-[0.76rem] text-[#9FB0CC] p-[12px_16px_18px] border-t border-white/[0.06]">
            <span className="inline-flex items-center">
              <i className="w-[11px] h-[11px] rounded-[3px] bg-[#22C55E] inline-block mr-1.5" />
              Jobs available
            </span>
            <span className="inline-flex items-center">
              <i className="w-[11px] h-[11px] rounded-[3px] bg-[#1B3558] border border-[#2B4A73] inline-block mr-1.5" />
              No live jobs right now
            </span>
            <span className="inline-flex items-center">
              <i className="w-[11px] h-[11px] rounded-full bg-[#D6952F] inline-block mr-1.5" />
              Grouped markers (cities)
            </span>
          </div>
        </div>
        </ScrollReveal>

        {/* Country Directory Tiles Grid (.grid.ctiles#countryGrid) */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-7"
          id="countryGrid"
        >
          {visibleTiles.map((c, idx) => {
            const flag = COUNTRY_FLAGS[c.cc] || '🌐';
            const citiesArray = Array.from(c.cities);
            const isHighlighted = highlightedCC === c.cc;
            const isLocationsOpen = openLocationCC === c.cc;

            return (
              <ScrollReveal
                key={c.name}
                delay={(idx % 3) * 80}
                className={`h-full ${isLocationsOpen ? 'relative z-30' : ''}`}
              >
              <div
                data-country-location-dropdown
                onMouseEnter={() => setHighlightedCC(c.cc)}
                onMouseLeave={() => setHighlightedCC(null)}
                className={`group relative flex h-full flex-col justify-between rounded-[14px] border bg-white p-4 text-left transition-all duration-200 shadow-sm hover:-translate-y-1 hover:shadow-[0_12px_28px_-10px_rgba(6,27,54,0.12)] dark:bg-[#10243E] dark:hover:shadow-[0_12px_28px_-10px_rgba(0,0,0,0.4)] ${
                  isHighlighted || isLocationsOpen
                    ? 'border-[#C8943E] ring-1 ring-[#C8943E]/30'
                    : 'border-[#E9E5DC] dark:border-white/10 hover:border-[#C8943E]'
                }`}
              >
                <div>
                  {/* Header: Flag + Code + Live Hiring Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl leading-none" role="img" aria-label={c.name}>
                        {flag}
                      </span>
                      <span className="rounded bg-[#061B36]/5 px-1.5 py-0.5 font-mono text-[11px] font-bold text-content dark:bg-white/10 dark:text-white">
                        {c.cc}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Hiring now
                    </span>
                  </div>

                  {/* Country Name + Interactive Arrow */}
                  <Link
                    href={`/opportunities?country=${encodeURIComponent(c.name)}`}
                    className="mt-2.5 flex items-center justify-between gap-1.5 no-underline"
                  >
                    <h3 className="font-['Poppins',sans-serif] text-[0.95rem] font-bold text-[#061B36] transition-colors group-hover:text-[#C8943E] dark:text-white line-clamp-1">
                      {c.name}
                    </h3>
                    <HiArrowUpRight className="h-4 w-4 shrink-0 text-[#9FB0CC] transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#C8943E]" />
                  </Link>

                  {/* Metric Counter Display */}
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-['Poppins',sans-serif] text-2xl font-extrabold tracking-tight text-[#061B36] transition-colors group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                      {c.count}
                    </span>
                    <span className="text-[11px] font-medium text-[#5B6479] dark:text-[#AEB9D6]">
                      {c.count === 1 ? 'active opportunity' : 'active opportunities'}
                    </span>
                  </div>

                  {/* Opportunity Demand Volume Bar */}
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#F3F1EB] dark:bg-white/10">
                    <div
                      className="ge-demand-bar h-full rounded-full transition-colors duration-300 bg-gradient-to-r from-[#16A34A] to-[#4ADE80] group-hover:from-[#C8842D] group-hover:to-[#F0C27B]"
                      style={{ width: `${Math.max(14, (c.count / maxCount) * 100)}%` }}
                    />
                  </div>

                  {/* Locations Row with Fixed-Height Floating Dropdown Trigger */}
                  <div className="relative mt-2.5 flex items-center justify-between gap-2 text-[11px] text-[#5B6479] dark:text-[#AEB9D6]">
                    <div className="flex min-w-0 items-center gap-1">
                      <HiMapPin className="h-3.5 w-3.5 shrink-0 text-[#C8943E]" />
                      <span className="truncate">
                        {citiesArray.length > 0 ? citiesArray[0] : 'Multiple hubs'}
                        {citiesArray.length > 1 ? ` +${citiesArray.length - 1}` : ''}
                      </span>
                    </div>

                    {citiesArray.length > 0 && (
                      <button
                        type="button"
                        aria-expanded={isLocationsOpen}
                        onClick={() => setOpenLocationCC(isLocationsOpen ? null : c.cc)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[10.5px] font-bold transition cursor-pointer ${
                          isLocationsOpen
                            ? 'border-[#D6952F] bg-[#061B36] text-[#F0C27B]'
                            : 'border-[#E9E5DC] bg-[#FAF8F5] text-[#061B36] hover:border-[#D6952F] dark:border-white/15 dark:bg-white/5 dark:text-[#F0C27B]'
                        }`}
                      >
                        <span>Locations ({citiesArray.length})</span>
                        {isLocationsOpen ? (
                          <HiChevronUp className="h-3 w-3" />
                        ) : (
                          <HiChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    )}

                    {/* Floating Dropdown Popover (does not increase card height) */}
                    {isLocationsOpen && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-[#D6952F]/50 bg-white p-3 shadow-[0_18px_40px_-12px_rgba(6,27,54,0.28)] dark:border-[#D6952F]/40 dark:bg-[#081B33]">
                        <div className="mb-2 flex items-center justify-between gap-2 border-b border-[#E9E5DC] pb-1.5 dark:border-white/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B37517] dark:text-[#F0C27B]">
                            Exact Locations in {c.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenLocationCC(null)}
                            className="text-[10px] font-bold text-[#8C9AC0] hover:text-[#061B36] dark:hover:text-white cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto pr-0.5">
                          {citiesArray
                            .slice()
                            .sort((a, b) => (c.cityCounts[b] || 0) - (c.cityCounts[a] || 0))
                            .map((city) => {
                              const cityCount = c.cityCounts[city] || 0;
                              return (
                                <Link
                                  key={city}
                                  href={`/opportunities?country=${encodeURIComponent(c.name)}&search=${encodeURIComponent(city)}`}
                                  onClick={() => setOpenLocationCC(null)}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E9E5DC] bg-[#FAF8F5] px-2.5 py-1 text-[11px] font-semibold text-[#061B36] transition hover:border-[#D6952F] hover:bg-[#D6952F]/15 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-[#D6952F]"
                                >
                                  <HiMapPin className="h-3 w-3 shrink-0 text-[#D6952F]" />
                                  <span>{city}</span>
                                  {cityCount > 0 && (
                                    <span className="rounded-full bg-[#061B36] px-1.5 py-0.2 text-[10px] font-extrabold text-[#F0C27B]">
                                      {cityCount}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compact Card Footer */}
                <div className="mt-3 flex items-center justify-between border-t border-[#E9E5DC]/80 pt-2 text-[11px] font-semibold dark:border-white/10">
                  <span className="text-[#5B6479] dark:text-[#AEB9D6]">
                    Global Vaults
                  </span>
                  <Link
                    href={`/opportunities?country=${encodeURIComponent(c.name)}`}
                    className="inline-flex items-center gap-0.5 text-[#C8943E] transition-all hover:translate-x-0.5 no-underline"
                  >
                    View <HiArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* View All / Show Less Toggle Button */}
        {sortedTiles.length > 6 && (
          <div className="mt-8 flex flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="group inline-flex items-center justify-center gap-2 rounded-xl border border-[#D6952F]/40 bg-[#061B36] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0B2548] hover:border-[#D6952F] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#D6952F]/50 dark:bg-[#D6952F] dark:text-[#061B36] dark:hover:bg-[#C8842D]"
            >
              <span>
                {showAll
                  ? 'Show Top 6 Countries'
                  : `View All ${sortedTiles.length} Countries`}
              </span>
              {showAll ? (
                <HiChevronUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
              ) : (
                <HiChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
              )}
            </button>
            <p className="text-[11px] text-[#5B6479] dark:text-[#AEB9D6]">
              {showAll
                ? `Showing all ${sortedTiles.length} active country talent markets`
                : `Displaying top 6 of ${sortedTiles.length} countries with live opportunities`}
            </p>
          </div>
        )}

        {/* Billnote summary (.billnote#countryNote) */}
        <style>{`
          @keyframes ge-bar-reload {
            0% {
              transform: scaleX(0);
            }
            100% {
              transform: scaleX(1);
            }
          }
          .group:hover .ge-demand-bar {
            transform-origin: left center;
            animation: ge-bar-reload 750ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
        `}</style>
        <p className="text-center text-[#5B6479] dark:text-[#AEB9D6] text-[0.85rem] mt-[18px]" id="countryNote">
          {countries.length} countries worldwide · {totalLiveRoles} active opportunities · counted once per Job ID
        </p>
      </div>
    </section>
  );
}
