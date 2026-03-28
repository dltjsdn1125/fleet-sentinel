"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  description: string | null;
  vendor: string | null;
  cardLast4: string | null;
  receiptNote: string | null;
  mileage: number | null;
  liters: number | null;
  pricePerL: number | null;
  receiptImagePath: string | null;
  isApproved: boolean;
  vehicle: { licensePlate: string; make: string; model: string };
  driver: { name: string };
}

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
}

const CATEGORIES: { value: string; label: string; icon: string; color: string }[] = [
  { value: "FUEL",         label: "주유",          icon: "local_gas_station", color: "bg-orange-100 text-orange-700" },
  { value: "MAINTENANCE",  label: "차량정비",      icon: "build",             color: "bg-blue-100 text-blue-700" },
  { value: "OIL_CHANGE",   label: "엔진오일 교환", icon: "opacity",           color: "bg-yellow-100 text-yellow-700" },
  { value: "TIRE",         label: "타이어",         icon: "tire_repair",       color: "bg-gray-100 text-gray-700" },
  { value: "CAR_WASH",     label: "세차",           icon: "local_car_wash",    color: "bg-cyan-100 text-cyan-700" },
  { value: "ADBLUE",       label: "요소수",         icon: "water_drop",        color: "bg-indigo-100 text-indigo-700" },
  { value: "CAR_SUPPLIES", label: "차량용품",       icon: "shopping_bag",      color: "bg-pink-100 text-pink-700" },
  { value: "PARKING",      label: "주차비",         icon: "local_parking",     color: "bg-purple-100 text-purple-700" },
  { value: "TOLL",         label: "통행료",         icon: "toll",              color: "bg-lime-100 text-lime-700" },
  { value: "INSPECTION",   label: "차량검사",       icon: "fact_check",        color: "bg-teal-100 text-teal-700" },
  { value: "INSURANCE",    label: "보험료",         icon: "shield",            color: "bg-green-100 text-green-700" },
  { value: "OTHER",        label: "기타",           icon: "more_horiz",        color: "bg-gray-100 text-gray-600" },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const defaultForm = {
  vehicleId: "", date: new Date().toISOString().split("T")[0],
  category: "FUEL", amount: "", description: "", vendor: "",
  cardLast4: "", receiptNote: "", mileage: "", liters: "", pricePerL: "",
};

/** Canvas API로 이미지를 WebP blob으로 변환 */
async function toWebP(file: File, maxSize = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize; }
        else       { w = Math.round((w * maxSize) / h); h = maxSize; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("WebP 변환 실패")), "image/webp", 0.88);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [summary, setSummary]     = useState<Record<string, number>>({});
  const [total, setTotal]         = useState(0);
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(defaultForm);
  const [saving, setSaving]       = useState(false);

  // 영수증 상태
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptBlob, setReceiptBlob]       = useState<Blob | null>(null);
  const [ocrLoading, setOcrLoading]         = useState(false);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate]     = useState(new Date().toISOString().split("T")[0]);
  const [catFilter, setCatFilter] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from: fromDate, to: toDate });
    if (catFilter) params.set("category", catFilter);
    const res  = await fetch(`/api/expenses?${params}`);
    const data = await res.json();
    setExpenses(data.expenses ?? []);
    setSummary(data.summary ?? {});
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [fromDate, toDate, catFilter]);

  useEffect(() => {
    fetchExpenses();
    fetch("/api/vehicles").then((r) => r.json()).then((v) => setVehicles(Array.isArray(v) ? v : []));
  }, [fetchExpenses]);

  // ── 영수증 사진 선택 + WebP 변환 + OCR ──────────────────────────
  async function handleReceiptCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const webp = await toWebP(file);
    setReceiptBlob(webp);
    const preview = URL.createObjectURL(webp);
    setReceiptPreview(preview);

    // Claude Vision OCR 자동 인식
    setOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res    = await fetch("/api/expenses/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        if (res.ok) {
          const parsed = await res.json();
          setForm((prev) => ({
            ...prev,
            ...(parsed.vendor    && { vendor:    parsed.vendor }),
            ...(parsed.amount    && { amount:    String(parsed.amount) }),
            ...(parsed.date      && { date:      parsed.date }),
            ...(parsed.cardLast4 && { cardLast4: parsed.cardLast4 }),
            ...(parsed.description && { description: parsed.description }),
            ...(parsed.liters    && { liters:    String(parsed.liters) }),
            ...(parsed.pricePerL && { pricePerL: String(parsed.pricePerL) }),
            ...(parsed.category  && CATEGORIES.some((c) => c.value === parsed.category)
                ? { category: parsed.category } : {}),
          }));
        }
      };
      reader.readAsDataURL(webp);
    } finally {
      setOcrLoading(false);
    }
  }

  // ── 경비 등록 ────────────────────────────────────────────────────
  async function submit() {
    if (!form.vehicleId || !form.amount) return;
    setSaving(true);

    // 1) 경비 생성
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount:    Number(form.amount),
        mileage:   form.mileage   ? Number(form.mileage)   : null,
        liters:    form.liters    ? Number(form.liters)     : null,
        pricePerL: form.pricePerL ? Number(form.pricePerL)  : null,
      }),
    });
    const created = await res.json();

    // 2) 영수증 WebP 업로드
    if (receiptBlob && created.id) {
      const fd = new FormData();
      fd.append("file",      new File([receiptBlob], "receipt.webp", { type: "image/webp" }));
      fd.append("expenseId", created.id);
      await fetch("/api/expenses/receipt", { method: "POST", body: fd });
    }

    setSaving(false);
    setShowForm(false);
    setForm(defaultForm);
    setReceiptPreview(null);
    setReceiptBlob(null);
    fetchExpenses();
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    fetchExpenses();
  }

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-8 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
              <span>FleetSentinel</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-[#0a0a0a]">경비관리</span>
            </nav>
            <h1 className="text-4xl font-black tracking-tight">경비관리</h1>
            <p className="text-gray-500 mt-1.5 text-sm">주유·정비·카드 사용 내역 및 영수증 증빙 관리</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">이달 총 경비</span>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-4xl font-black">{total.toLocaleString()}</span>
              <span className="text-base font-bold text-gray-400">원</span>
            </div>
          </div>
        </div>

        {/* 카테고리별 요약 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {CATEGORIES.filter((c) => summary[c.value]).map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCatFilter(catFilter === cat.value ? "" : cat.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                catFilter === cat.value
                  ? "border-[#CAFF33] bg-[#CAFF33]/10 ring-1 ring-[#CAFF33]"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className={`material-symbols-outlined text-xl p-2 rounded-lg ${cat.color}`}>{cat.icon}</span>
              <div>
                <p className="text-xs text-gray-400 font-bold">{cat.label}</p>
                <p className="text-base font-black">{(summary[cat.value] ?? 0).toLocaleString()}원</p>
              </div>
            </button>
          ))}
        </div>

        {/* 필터 + 등록 버튼 */}
        <div className="bg-white border border-gray-200 p-5 rounded-xl flex flex-wrap items-end gap-3 mb-6">
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">시작일</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div className="flex-1 min-w-[130px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">종료일</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-1.5">분류</label>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black">
              <option value="">전체</option>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <button onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm flex items-center gap-1.5 hover:brightness-95">
            <span className="material-symbols-outlined text-base">add_circle</span>
            경비 등록
          </button>
        </div>

        {/* 경비 목록 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["날짜", "분류", "차량", "가맹점", "금액", "카드", "영수증", "등록자", ""].map((h, i) => (
                  <th key={i} className={`px-5 py-4 text-xs font-black text-gray-400 uppercase tracking-widest ${i === 8 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">불러오는 중...</td></tr>
              )}
              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">receipt_long</span>
                    <p className="text-sm text-gray-400">등록된 경비가 없습니다.</p>
                  </td>
                </tr>
              )}
              {expenses.map((e) => {
                const cat = CAT_MAP[e.category];
                return (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-sm font-bold text-gray-700 whitespace-nowrap">
                      {new Date(e.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cat?.color ?? "bg-gray-100 text-gray-600"}`}>
                        <span className="material-symbols-outlined text-xs">{cat?.icon ?? "receipt"}</span>
                        {cat?.label ?? e.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold">{e.vehicle.licensePlate}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{e.vendor ?? "—"}</td>
                    <td className="px-5 py-4 text-sm font-black">{e.amount.toLocaleString()}원</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {e.cardLast4 ? `****${e.cardLast4}` : "—"}
                    </td>
                    <td className="px-5 py-4">
                      {e.receiptImagePath ? (
                        <button
                          onClick={() => setViewReceiptUrl(e.receiptImagePath)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-[#CAFF33] transition-colors flex-shrink-0 relative"
                          title="영수증 보기"
                        >
                          <img src={e.receiptImagePath} alt="영수증" className="w-full h-full object-cover" />
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">없음</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{e.driver.name}</td>
                    <td className="px-5 py-4 text-right">
                      <button onClick={() => deleteExpense(e.id)}
                        className="material-symbols-outlined text-gray-300 hover:text-red-500 text-base transition-colors">
                        delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 영수증 원본 뷰어 ── */}
      {viewReceiptUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewReceiptUrl(null)}
        >
          <div className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setViewReceiptUrl(null)}
              className="absolute -top-10 right-0 text-white font-bold flex items-center gap-1 hover:text-gray-300"
            >
              <span className="material-symbols-outlined">close</span> 닫기
            </button>
            <img src={viewReceiptUrl} alt="영수증 원본" className="w-full rounded-xl shadow-2xl" />
            <a
              href={viewReceiptUrl}
              download
              className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-[#CAFF33] text-[#0a0a0a] rounded-xl font-bold text-sm"
            >
              <span className="material-symbols-outlined text-base">download</span>
              다운로드
            </a>
          </div>
        </div>
      )}

      {/* ── 경비 등록 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">경비 등록</h2>
              <button onClick={() => { setShowForm(false); setReceiptPreview(null); setReceiptBlob(null); }}
                className="text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* ── 영수증 캡쳐 섹션 ── */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                영수증 사진 <span className="text-[#CAFF33] font-black">(자동 인식)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleReceiptCapture}
              />
              {receiptPreview ? (
                <div className="relative">
                  <img src={receiptPreview} alt="영수증 미리보기" className="w-full max-h-48 object-contain rounded-xl border border-gray-200 bg-gray-50" />
                  {ocrLoading && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-[#CAFF33]">progress_activity</span>
                      <span className="text-sm font-bold">AI 인식 중...</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setReceiptPreview(null); setReceiptBlob(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-[#CAFF33] hover:bg-[#CAFF33]/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl text-gray-300">photo_camera</span>
                  <span className="text-sm font-bold text-gray-400">촬영 또는 갤러리에서 선택</span>
                  <span className="text-xs text-gray-300">WebP로 저장 · AI가 내용 자동 입력</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* 차량 선택 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">차량 *</label>
                <select value={form.vehicleId} onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black">
                  <option value="">차량 선택</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} — {v.make} {v.model}</option>)}
                </select>
              </div>

              {/* 날짜 + 분류 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">날짜 *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">분류 *</label>
                  <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black">
                    {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* 금액 + 가맹점 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">금액 (원) *</label>
                  <input type="number" placeholder="85000" value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">가맹점</label>
                  <input type="text" placeholder="GS칼텍스 강남점" value={form.vendor}
                    onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
              </div>

              {/* 카드 + 주행거리 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">카드 뒤 4자리</label>
                  <input type="text" maxLength={4} placeholder="1234" value={form.cardLast4}
                    onChange={(e) => setForm((p) => ({ ...p, cardLast4: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">계기판 km</label>
                  <input type="number" placeholder="45230" value={form.mileage}
                    onChange={(e) => setForm((p) => ({ ...p, mileage: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
                </div>
              </div>

              {/* 주유 전용 */}
              {form.category === "FUEL" && (
                <div className="grid grid-cols-2 gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div>
                    <label className="block text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">주유량 (L)</label>
                    <input type="number" step="0.01" placeholder="45.5" value={form.liters}
                      onChange={(e) => setForm((p) => ({ ...p, liters: e.target.value }))}
                      className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-orange-500 uppercase tracking-widest mb-2">리터당 가격 (원)</label>
                    <input type="number" placeholder="1650" value={form.pricePerL}
                      onChange={(e) => setForm((p) => ({ ...p, pricePerL: e.target.value }))}
                      className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400" />
                  </div>
                </div>
              )}

              {/* 영수증 메모 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">영수증 메모</label>
                <textarea rows={2} placeholder="영수증 번호, 승인번호, 비고 등"
                  value={form.receiptNote}
                  onChange={(e) => setForm((p) => ({ ...p, receiptNote: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black resize-none" />
              </div>

              {/* 세부 내용 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">세부 내용</label>
                <input type="text" placeholder="엔진오일 5W-30 교환 + 필터 교체"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowForm(false); setReceiptPreview(null); setReceiptBlob(null); }}
                className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm">취소</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm hover:brightness-95 disabled:opacity-50">
                {saving ? "저장 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
