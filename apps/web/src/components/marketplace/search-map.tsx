"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ListingCard } from "@homes/shared";

const STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function compactPrice(value: number, currency: string): string {
  const n = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return n;
}

export function SearchMap({ items }: { items: ListingCard[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [-98, 39],
      zoom: 3,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync markers + bounds whenever the result set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pins = items.filter((l) => l.lng != null && l.lat != null);
    const markers: maplibregl.Marker[] = [];
    const bounds = new maplibregl.LngLatBounds();

    for (const l of pins) {
      const el = document.createElement("a");
      el.href = `/listing/${l.slug}`;
      el.className = [
        "block cursor-pointer rounded-full border px-2 py-1 text-[12px] font-semibold shadow-sm transition-colors",
        l.isFeatured
          ? "border-transparent bg-[#ff385c] text-white"
          : "border-[#ebebeb] bg-white text-[#222222] hover:bg-[#222222] hover:text-white",
      ].join(" ");
      el.textContent = compactPrice(l.price, l.currency);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([l.lng as number, l.lat as number])
        .addTo(map);
      markers.push(marker);
      bounds.extend([l.lng as number, l.lat as number]);
    }

    if (pins.length > 0) {
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 });
    }

    return () => {
      for (const m of markers) m.remove();
    };
  }, [items]);

  return <div ref={containerRef} className="h-full w-full" />;
}
