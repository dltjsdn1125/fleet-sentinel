export default function SupportPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 py-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black">Support</h2>
        <p className="text-gray-500 mt-2 font-medium text-sm">도움이 필요하신가요?</p>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-xl">mail</span>
            </div>
            <div>
              <h3 className="font-black text-[#0a0a0a] mb-1">이메일 문의</h3>
              <p className="text-sm text-gray-500 mb-3">기술 지원 및 계정 관련 문의는 이메일로 연락해 주세요.</p>
              <a
                href="mailto:support@fleet-sentinel.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#CAFF33] text-[#0a0a0a] rounded-lg text-sm font-bold hover:brightness-95 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                이메일 보내기
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-xl">menu_book</span>
            </div>
            <div>
              <h3 className="font-black text-[#0a0a0a] mb-1">자주 묻는 질문</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">
                  <span className="text-[#CAFF33] font-black shrink-0">Q.</span>
                  <span>운행 기록을 수동으로 입력할 수 있나요?</span>
                </li>
                <li className="flex gap-2 pl-4">
                  <span className="text-gray-400 font-black shrink-0">A.</span>
                  <span>네, <strong>/logs/manual</strong> 메뉴에서 수동으로 운행 기록을 입력할 수 있습니다.</span>
                </li>
                <li className="flex gap-2 mt-3">
                  <span className="text-[#CAFF33] font-black shrink-0">Q.</span>
                  <span>엑셀 보고서를 다운로드하려면 어떻게 하나요?</span>
                </li>
                <li className="flex gap-2 pl-4">
                  <span className="text-gray-400 font-black shrink-0">A.</span>
                  <span>대시보드 또는 보고서 페이지에서 <strong>엑셀 내보내기</strong> 버튼을 클릭하세요.</span>
                </li>
                <li className="flex gap-2 mt-3">
                  <span className="text-[#CAFF33] font-black shrink-0">Q.</span>
                  <span>차량을 추가하려면 어떻게 하나요?</span>
                </li>
                <li className="flex gap-2 pl-4">
                  <span className="text-gray-400 font-black shrink-0">A.</span>
                  <span>관리자 계정으로 로그인 후 <strong>차량 관리</strong> 메뉴에서 차량을 등록하세요.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-xl">info</span>
            </div>
            <div>
              <h3 className="font-black text-[#0a0a0a] mb-1">앱 정보</h3>
              <p className="text-sm text-gray-500">
                Fleet Sentinel — 법인 차량 운행일지 관리 시스템
              </p>
              <p className="text-xs text-gray-400 mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
