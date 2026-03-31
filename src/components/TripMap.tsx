"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface GpsPoint {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  timestamp: string;
}

interface TripMapProps {
  gpsPoints: GpsPoint[];
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  startAddress?: string;
  endAddress?: string | null;
  height?: string;
}

export default function TripMap({
  gpsPoints,
  startLat,
  startLng,
  endLat,
  endLng,
  startAddress,
  endAddress,
  height = "100%",
}: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // 이미 초기화된 지도가 있으면 즉시 제거
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    if ((mapRef.current as any)._leaflet_id) {
      delete (mapRef.current as any)._leaflet_id;
    }

    // 비동기 import 완료 전에 cleanup이 실행되면 초기화 취소
    let cancelled = false;

    // 동적 import로 SSR 방지
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      // import 완료 시점에 DOM이 이미 초기화된 경우 한 번 더 제거
      if ((mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id;
      }

      // 기본 마커 아이콘 경로 수정 (Next.js 빌드 문제 방지)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // 좌표 수집: GPS 포인트 또는 시작/종료 좌표
      const coords: [number, number][] = gpsPoints.length > 0
        ? gpsPoints.map((p) => [p.lat, p.lng])
        : [
            ...(startLat && startLng ? [[startLat, startLng] as [number, number]] : []),
            ...(endLat && endLng ? [[endLat, endLng] as [number, number]] : []),
          ];

      if (coords.length === 0) return;

      // 지도 초기화
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      // ── 고해상도 타일: CartoDB Positron (Retina 지원) ──
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 20,
          maxNativeZoom: 19,
          detectRetina: true,
        }
      ).addTo(map);

      // 줌 컨트롤 (우하단)
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution (우하단, 작게)
      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution('© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // ── GPS 경로 폴리라인 ──
      if (coords.length > 1) {
        // 배경 선 (두꺼운 흰 테두리)
        L.polyline(coords, {
          color: "#ffffff",
          weight: 8,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);

        // 실제 경로 선 (라임 컬러)
        L.polyline(coords, {
          color: "#CAFF33",
          weight: 4,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
      }

      // ── 출발 마커 ──
      const startCoord = coords[0];
      const startIcon = L.divIcon({
        html: `
          <div style="
            width:28px;height:28px;
            background:#0a0a0a;
            border:3px solid #CAFF33;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
          ">
            <span style="color:#CAFF33;font-size:10px;font-weight:900;font-family:DM Sans,sans-serif;">S</span>
          </div>
        `,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker(startCoord, { icon: startIcon })
        .addTo(map)
        .bindPopup(`<div style="font-family:DM Sans,sans-serif;font-size:12px;font-weight:700;min-width:140px;">
          <div style="color:#666;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">출발</div>
          ${startAddress ?? `${startCoord[0].toFixed(5)}, ${startCoord[1].toFixed(5)}`}
        </div>`, { maxWidth: 220 });

      // ── 도착 마커 ──
      const endCoord = coords[coords.length - 1];
      if (coords.length > 1 || (endLat && endLng)) {
        const endIcon = L.divIcon({
          html: `
            <div style="
              width:28px;height:28px;
              background:#0a0a0a;
              border:3px solid #ff4444;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
            ">
              <span style="color:#ff4444;font-size:10px;font-weight:900;font-family:DM Sans,sans-serif;">E</span>
            </div>
          `,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker(endCoord, { icon: endIcon })
          .addTo(map)
          .bindPopup(`<div style="font-family:DM Sans,sans-serif;font-size:12px;font-weight:700;min-width:140px;">
            <div style="color:#666;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">도착</div>
            ${endAddress ?? `${endCoord[0].toFixed(5)}, ${endCoord[1].toFixed(5)}`}
          </div>`, { maxWidth: 220 });
      }

      // ── 중간 GPS 포인트 (50개 이상이면 샘플링) ──
      if (gpsPoints.length > 2) {
        const step = Math.max(1, Math.floor(gpsPoints.length / 50));
        gpsPoints.slice(1, -1).filter((_, i) => i % step === 0).forEach((pt) => {
          const dotIcon = L.divIcon({
            html: `<div style="
              width:6px;height:6px;
              background:#0a0a0a;
              border:2px solid #CAFF33;
              border-radius:50%;
              opacity:0.7;
            "></div>`,
            className: "",
            iconSize: [6, 6],
            iconAnchor: [3, 3],
          });
          L.marker([pt.lat, pt.lng], { icon: dotIcon }).addTo(map);
        });
      }

      // ── 지도 범위 조정 ──
      if (coords.length === 1) {
        map.setView(coords[0], 15);
      } else {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
      }

      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [gpsPoints, startLat, startLng, endLat, endLng, startAddress, endAddress]);

  return <div ref={mapRef} className="absolute inset-0 z-0" />;
}
