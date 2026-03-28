/**
 * 역지오코딩 — 카카오 지도 REST API
 * KAKAO_REST_API_KEY 환경변수가 없으면 좌표 기반 임시 문자열 반환
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  }

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${apiKey}` } }
    );

    if (!res.ok) throw new Error("카카오 API 오류");

    const data = await res.json();
    const docs = data.documents;

    if (!docs || docs.length === 0) {
      return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
    }

    const addr = docs[0].road_address ?? docs[0].address;
    if (!addr) return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;

    return addr.address_name ?? `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  } catch {
    return `위도 ${lat.toFixed(4)}, 경도 ${lng.toFixed(4)}`;
  }
}
