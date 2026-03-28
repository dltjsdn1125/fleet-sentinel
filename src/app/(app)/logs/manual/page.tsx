"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const PURPOSE_OPTIONS = [
  { value: "CLIENT_VISIT", label: "고객사 방문" },
  { value: "DELIVERY", label: "납품·배송" },
  { value: "MEETING", label: "회의" },
  { value: "COMMUTE", label: "출퇴근" },
  { value: "MAINTENANCE", label: "차량 정비" },
  { value: "PRIVATE", label: "사적 운행" },
  { value: "OTHER", label: "기타" },
];

export default function ManualLogPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<{ id: string; licensePlate: string; make: string; model: string }[]>([]);
  const [form, setForm] = useState({
    vehicleId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    startAddress: "",
    endAddress: "",
    distanceKm: "",
    purpose: "",
    purposeCode: "",
    passengers: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vehicles?status=active")
      .then((r) => r.json())
      .then((data) => {
        setVehicles(Array.isArray(data) ? data : []);
        if (data.length > 0) setForm((p) => ({ ...p, vehicleId: data[0].id }));
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const startTime = new Date(`${form.date}T${form.startTime}`);
    const endTime = new Date(`${form.date}T${form.endTime}`);

    // 운행 생성
    const tripRes = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: form.vehicleId,
        startTime: startTime.toISOString(),
        startAddress: form.startAddress,
        isManualEntry: true,
      }),
    });
    if (!tripRes.ok) {
      setError("운행 기록 생성 실패");
      setLoading(false);
      return;
    }
    const trip = await tripRes.json();

    // 도착 처리
    await fetch(`/api/trips/${trip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endTime: endTime.toISOString(),
        endAddress: form.endAddress,
        distanceKm: Number(form.distanceKm),
        purpose: form.purpose,
        purposeCode: form.purposeCode,
        passengers: form.passengers,
        status: "COMPLETED",
      }),
    });

    router.push("/logs");
  }

  return (
    <div className="px-12 py-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">수동 운행 입력</h1>
        <p className="text-gray-500 mt-2">
          GPS 신호 불량 구간(지하주차장 등) 운행을 직접 입력합니다. 수동 입력분은 일지에 태그됩니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">차량</label>
          <select
            value={form.vehicleId}
            onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            required
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "date", label: "운행 날짜", type: "date" },
            { key: "startTime", label: "출발 시각", type: "time" },
            { key: "endTime", label: "도착 시각", type: "time" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
              <input
                type={f.type}
                value={(form as Record<string, string>)[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                required
              />
            </div>
          ))}
        </div>

        {[
          { key: "startAddress", label: "출발지 주소", placeholder: "서울특별시 강남구 테헤란로 521" },
          { key: "endAddress", label: "도착지 주소", placeholder: "경기도 수원시 팔달구 삼성로 129" },
        ].map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
            <input
              value={(form as Record<string, string>)[f.key]}
              onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              placeholder={f.placeholder}
              required
            />
          </div>
        ))}

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">운행 거리 (km)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.distanceKm}
            onChange={(e) => setForm((p) => ({ ...p, distanceKm: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="12.5"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">운행 목적</label>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, purposeCode: opt.value }))}
                className={`py-2 px-3 text-xs font-bold rounded-lg border transition-colors ${
                  form.purposeCode === opt.value ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            value={form.purpose}
            onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="상세 운행 목적 입력"
          />
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">동승자 (선택)</label>
          <input
            value={form.passengers}
            onChange={(e) => setForm((p) => ({ ...p, passengers: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            placeholder="홍길동, 김철수"
          />
        </div>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
          <span className="font-bold">※ 수동 입력 안내:</span> 이 기록은 일지에 "(수동입력)" 태그가 자동 부착됩니다. GPS 데이터와 달리 세무 조사 시 추가 소명이 필요할 수 있습니다.
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-black text-white rounded-lg font-bold text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "저장 중..." : "운행 기록 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
