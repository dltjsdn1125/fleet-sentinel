"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: string;
  fuelType: string;
  odometer: number;
  isShared: boolean;
  isActive: boolean;
  assignedDriver: { name: string; email: string } | null;
  _count: { trips: number };
}

interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  assignedVehicle: { licensePlate: string; make: string; model: string } | null;
  _count: { trips: number };
}

const STATUS_LABEL: Record<string, string> = {
  SEDAN: "승용", SUV: "SUV", VAN: "승합", TRUCK: "화물",
};

export default function FleetPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"vehicles" | "employees">("vehicles");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // 차량 폼
  const [vForm, setVForm] = useState({
    licensePlate: "", make: "", model: "", year: new Date().getFullYear(),
    type: "SEDAN", fuelType: "GASOLINE", odometer: 0, isShared: false,
  });

  // 직원 폼
  const [eForm, setEForm] = useState({ name: "", email: "", password: "", role: "EMPLOYEE", phone: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]).then(([v, e]) => {
      setVehicles(Array.isArray(v) ? v : []);
      setEmployees(Array.isArray(e) ? e : []);
      setLoading(false);
    });
  }, []);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  async function addVehicle() {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vForm),
    });
    if (res.ok) {
      const v = await res.json();
      setVehicles((prev) => [v, ...prev]);
      setShowVehicleModal(false);
      setVForm({ licensePlate: "", make: "", model: "", year: new Date().getFullYear(), type: "SEDAN", fuelType: "GASOLINE", odometer: 0, isShared: false });
    }
  }

  async function addEmployee() {
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eForm),
    });
    if (res.ok) {
      const e = await res.json();
      setEmployees((prev) => [...prev, e]);
      setShowEmployeeModal(false);
      setEForm({ name: "", email: "", password: "", role: "EMPLOYEE", phone: "" });
    }
  }

  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.isActive).length,
    maintenance: vehicles.filter((v) => !v.isActive).length,
    efficiency: vehicles.length ? Math.round((vehicles.filter((v) => v.isActive).length / vehicles.length) * 100) : 0,
  };

  return (
    <div className="px-12 py-10">
      {/* 헤더 */}
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight">차량 & 직원</h1>
        <p className="text-gray-500 mt-2 max-w-2xl font-medium">
          차량 등록·배정 및 직원 계정 관리. 법인 차량 운행 규정 준수를 위한 중앙 관리.
        </p>
      </header>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-10">
        {(["vehicles", "employees"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-8 py-2 font-bold rounded-md text-sm flex items-center gap-2 transition-all ${
              tab === t ? "bg-white text-black border border-gray-200 shadow-sm" : "text-gray-500 hover:text-black"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t === "vehicles" ? "directions_car" : "group"}</span>
            {t === "vehicles" ? "차량" : "직원"}
          </button>
        ))}
      </div>

      {/* 차량 탭 */}
      {tab === "vehicles" && (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: "총 차량", value: stats.total, icon: "local_shipping" },
              { label: "운행 가능", value: stats.active, sub: "현재 활성" },
              { label: "정비 중", value: stats.maintenance, sub: "점검 예정" },
              { label: "운행 효율", value: `${stats.efficiency}%`, inverted: true },
            ].map((s) => (
              <div key={s.label} className={`p-6 rounded-lg border ${s.inverted ? "bg-black text-white border-black" : "bg-white border-gray-200"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${s.inverted ? "text-gray-400" : "text-gray-400"}`}>{s.label}</p>
                <p className="text-3xl font-extrabold">{s.value}</p>
                {s.sub && <p className="text-[10px] text-gray-400 font-bold mt-3">{s.sub}</p>}
                {s.icon && <span className="material-symbols-outlined text-gray-300 mt-2 block">{s.icon}</span>}
              </div>
            ))}
          </div>

          {/* 차량 테이블 */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <span className="font-black text-sm uppercase tracking-widest text-gray-500">등록 차량</span>
              {isAdmin && (
                <button
                  onClick={() => setShowVehicleModal(true)}
                  className="px-4 py-2 bg-[#CAFF33] text-[#0a0a0a] rounded-lg text-xs font-bold flex items-center gap-2 hover:brightness-95"
                >
                  <span className="material-symbols-outlined text-sm">add</span>차량 등록
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["차량 ID", "모델", "차량번호", "배정 직원", "누적 거리", "상태", ""].map((h, i) => (
                      <th key={i} className={`px-8 py-5 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest ${i === 6 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6 font-mono text-xs font-bold text-black">SENT-{v.id.slice(-6).toUpperCase()}</td>
                      <td className="px-6 py-6">
                        <div className="font-bold text-black">{v.make} {v.model}</div>
                        <div className="text-xs text-gray-400">{STATUS_LABEL[v.type] ?? v.type} · {v.year}</div>
                      </td>
                      <td className="px-6 py-6 font-bold text-gray-700">{v.licensePlate}</td>
                      <td className="px-6 py-6">
                        {v.assignedDriver ? (
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold">
                              {v.assignedDriver.name.charAt(0)}
                            </div>
                            <span className="text-sm font-semibold">{v.assignedDriver.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 italic text-sm">
                            <span className="material-symbols-outlined text-base">person_off</span>미배정
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-6 text-sm font-semibold text-gray-600">
                        {v.odometer.toLocaleString()} km
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${
                          v.isActive ? "bg-black text-white" : "bg-white text-black border border-black"
                        }`}>
                          {v.isActive ? "활성" : "정비중"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="material-symbols-outlined text-gray-400 hover:text-black">more_vert</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 직원 탭 */}
      {tab === "employees" && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <span className="font-black text-sm uppercase tracking-widest text-gray-500">직원 목록</span>
            {isAdmin && (
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="px-4 py-2 bg-[#CAFF33] text-[#0a0a0a] rounded-lg text-xs font-bold flex items-center gap-2 hover:brightness-95"
              >
                <span className="material-symbols-outlined text-sm">add</span>직원 추가
              </button>
            )}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["이름", "이메일", "권한", "배정 차량", "운행 횟수", "상태"].map((h) => (
                  <th key={h} className="px-8 py-5 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5 font-bold text-black">{e.name}</td>
                  <td className="px-8 py-5 text-sm text-gray-600">{e.email}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-1 rounded bg-gray-100">
                      {e.role === "ADMIN" ? "관리자" : "직원"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-600">
                    {e.assignedVehicle ? `${e.assignedVehicle.make} ${e.assignedVehicle.model}` : <span className="text-gray-400 italic">없음</span>}
                  </td>
                  <td className="px-8 py-5 font-bold text-black">{e._count.trips}회</td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded ${e.isActive ? "bg-black text-white" : "bg-gray-200 text-gray-600"}`}>
                      {e.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 차량 등록 모달 */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold">차량 등록</h2>
              <button onClick={() => setShowVehicleModal(false)} className="text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "licensePlate", label: "차량번호", placeholder: "12가3456" },
                { key: "make", label: "제조사", placeholder: "현대" },
                { key: "model", label: "모델", placeholder: "아반떼" },
                { key: "year", label: "연식", placeholder: "2023", type: "number" },
                { key: "odometer", label: "현재 주행 거리 (km)", placeholder: "0", type: "number" },
              ].map((f) => (
                <div key={f.key} className={f.key === "licensePlate" ? "col-span-2" : ""}>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={String((vForm as Record<string, unknown>)[f.key] ?? "")}
                    onChange={(e) => setVForm((prev) => ({ ...prev, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">차종</label>
                <select value={vForm.type} onChange={(e) => setVForm((p) => ({ ...p, type: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                  {["SEDAN", "SUV", "VAN", "TRUCK"].map((t) => <option key={t} value={t}>{STATUS_LABEL[t] ?? t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">연료</label>
                <select value={vForm.fuelType} onChange={(e) => setVForm((p) => ({ ...p, fuelType: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                  {["GASOLINE", "DIESEL", "ELECTRIC", "HYBRID"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input type="checkbox" id="shared" checked={vForm.isShared} onChange={(e) => setVForm((p) => ({ ...p, isShared: e.target.checked }))} className="w-4 h-4" />
              <label htmlFor="shared" className="text-sm font-semibold">공용 차량</label>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowVehicleModal(false)} className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm">취소</button>
              <button onClick={addVehicle} className="flex-1 py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm hover:brightness-95">등록</button>
            </div>
          </div>
        </div>
      )}

      {/* 직원 추가 모달 */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold">직원 추가</h2>
              <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-black">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4">
              {[
                { key: "name", label: "이름", placeholder: "홍길동" },
                { key: "email", label: "이메일", placeholder: "name@company.com", type: "email" },
                { key: "password", label: "임시 비밀번호", placeholder: "8자 이상", type: "password" },
                { key: "phone", label: "전화번호 (선택)", placeholder: "010-0000-0000" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={(eForm as Record<string, string>)[f.key] ?? ""}
                    onChange={(e) => setEForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">권한</label>
                <select value={eForm.role} onChange={(e) => setEForm((p) => ({ ...p, role: e.target.value }))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
                  <option value="EMPLOYEE">직원</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowEmployeeModal(false)} className="flex-1 py-3 border border-gray-200 rounded-lg font-bold text-sm">취소</button>
              <button onClick={addEmployee} className="flex-1 py-3 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm hover:brightness-95">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
