export default function SettingsPage() {
  return (
    <div className="px-12 py-10">
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">설정</h1>
      <p className="text-gray-500 mb-10">계정 및 회사 설정</p>

      <div className="max-w-2xl space-y-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-lg font-extrabold mb-6">회사 설정</h2>
          <div className="space-y-4">
            {[
              { label: "회사명", placeholder: "(주) 데모기업" },
              { label: "사업자등록번호", placeholder: "123-45-67890" },
              { label: "세무사 이메일", placeholder: "tax@example.com" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{f.label}</label>
                <input
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
          <button className="mt-6 px-6 py-2.5 bg-[#CAFF33] text-[#0a0a0a] rounded-lg font-bold text-sm hover:brightness-95">저장</button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-lg font-extrabold mb-6">알림 설정</h2>
          <div className="space-y-4">
            {[
              { label: "목적 미입력 24시간 경과 시 알림", checked: true },
              { label: "이상 운행 감지 시 알림", checked: true },
              { label: "월간 보고서 자동 생성 알림", checked: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold">{item.label}</span>
                <div className={`w-10 h-5 rounded-full relative ${item.checked ? "bg-black" : "bg-gray-200"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${item.checked ? "left-5.5" : "left-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8">
          <h2 className="text-lg font-extrabold mb-2">카카오 지도 API 연동</h2>
          <p className="text-sm text-gray-500 mb-6">역지오코딩(좌표 → 주소)을 위해 카카오 REST API 키가 필요합니다.</p>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">카카오 REST API Key</label>
            <input
              type="password"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black font-mono"
              placeholder="kakao api key..."
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">서버의 .env.local 파일에 KAKAO_REST_API_KEY를 설정하세요.</p>
        </div>
      </div>
    </div>
  );
}
