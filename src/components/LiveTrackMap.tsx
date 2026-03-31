"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

interface Point { lat: number; lng: number }

interface LiveTrackMapProps {
  points: Point[];
  currentPoint: Point | null;
  height?: string;
}

export default function LiveTrackMap({ points, currentPoint, height = "100%" }: LiveTrackMapProps) {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapInst    = useRef<any>(null);
  const polyRef    = useRef<any>(null);
  const markerRef  = useRef<any>(null);
  const pulseRef   = useRef<any>(null);

  // 최초 지도 초기화
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;
      if ((mapRef.current as any)._leaflet_id) {
        delete (mapRef.current as any)._leaflet_id;
      }

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false });
      mapInst.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        maxNativeZoom: 19,
        attribution:
          '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      }).addTo(map);

      // 경로 폴리라인 (라임색)
      polyRef.current = L.polyline([], { color: "#CAFF33", weight: 5, opacity: 0.9 }).addTo(map);

      // 현재 위치 마커 (검정 도트)
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:16px;height:16px;background:#0a0a0a;
          border:3px solid #fff;border-radius:50%;
          box-shadow:0 0 0 3px #CAFF33;
        "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker([0, 0], { icon, zIndexOffset: 1000 });

      // 초기 위치가 있으면 세팅
      const init = currentPoint ?? (points.length > 0 ? points[points.length - 1] : null);
      if (init) {
        map.setView([init.lat, init.lng], 16);
        markerRef.current.setLatLng([init.lat, init.lng]).addTo(map);
      } else {
        map.setView([37.5665, 126.9780], 13); // 서울 기본값
      }
      if (points.length > 1) {
        polyRef.current.setLatLngs(points.map((p) => [p.lat, p.lng]));
      }

      // flex 레이아웃에서 초기 크기 0으로 잡힌 뒤 타일이 안 그려지는 경우 보정
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    });
    return () => {
      cancelled = true;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새 포인트가 추가될 때마다 폴리라인 + 마커 갱신
  useEffect(() => {
    if (!mapInst.current || !currentPoint) return;
    const latlng: [number, number] = [currentPoint.lat, currentPoint.lng];

    // 폴리라인 연장
    if (polyRef.current) {
      polyRef.current.addLatLng(latlng);
    }
    // 현재 위치 마커 이동
    if (markerRef.current) {
      if (!mapInst.current.hasLayer(markerRef.current)) {
        markerRef.current.addTo(mapInst.current);
      }
      markerRef.current.setLatLng(latlng);
    }
    // 지도 자동 추적
    mapInst.current.panTo(latlng, { animate: true, duration: 0.5 });
  }, [currentPoint]);

  return <div ref={mapRef} className="absolute inset-0 z-0" />;
}
