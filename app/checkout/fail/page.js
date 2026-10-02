"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FailInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const reason = sp.get("message") || "결제가 취소되었거나 완료되지 않았어요.";
  return (
    <div className="phone">
      <div className="pad center" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>🙏</div>
        <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>결제가 완료되지 않았어요</div>
        <div className="lead" style={{ textAlign: "center" }}>{reason}</div>
      </div>
      <div className="foot">
        <button className="btn primary lg" onClick={() => router.push("/pricing")}>다시 시도</button>
        <div style={{ height: 8 }} />
        <button className="btn" style={{ background: "none", color: "var(--teal-d)", border: "1.5px solid var(--teal)" }} onClick={() => router.push("/dashboard")}>대시보드로</button>
      </div>
    </div>
  );
}

export default function FailPage() {
  return (
    <Suspense fallback={<div className="phone"><div className="spin">불러오는 중…</div></div>}>
      <FailInner />
    </Suspense>
  );
}
