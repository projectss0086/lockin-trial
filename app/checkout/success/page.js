"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function SuccessInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const [state, setState] = useState("working"); // working | done | error
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login"); return; }

      const isSub = sp.get("sub") === "1" || !!sp.get("authKey");
      const payload = isSub
        ? { kind: "sub", authKey: sp.get("authKey"), customerKey: sp.get("customerKey"), plan: sp.get("plan"), cycle: sp.get("cycle"), coupon: sp.get("coupon") }
        : { kind: "credit", paymentKey: sp.get("paymentKey"), orderId: sp.get("orderId"), amount: sp.get("amount") };

      try {
        const res = await fetch("/api/pay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.ok) {
          setState("done");
          setMsg(data.kind === "credit" ? `${data.added}회 이용권이 추가됐어요.` : "구독이 시작됐어요. 감사합니다!");
        } else {
          setState("error");
          setMsg(data.message || data.error || "결제 확인에 실패했어요.");
        }
      } catch (e) {
        setState("error"); setMsg("결제 확인 중 연결 문제가 생겼어요.");
      }
    })();
  }, [router, sp]);

  return (
    <div className="phone">
      <div className="pad center" style={{ textAlign: "center" }}>
        {state === "working" && <div className="spin">결제를 확인하는 중…</div>}
        {state === "done" && (<>
          <div style={{ fontSize: 54 }}>🎉</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>결제 완료</div>
          <div className="lead" style={{ textAlign: "center" }}>{msg}</div>
        </>)}
        {state === "error" && (<>
          <div style={{ fontSize: 48 }}>🙏</div>
          <div className="h1" style={{ textAlign: "center", marginTop: 8 }}>확인이 필요해요</div>
          <div className="lead" style={{ textAlign: "center" }}>{msg}</div>
        </>)}
      </div>
      {state !== "working" && (
        <div className="foot">
          <button className="btn primary lg" onClick={() => router.push("/dashboard")}>대시보드로</button>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="phone"><div className="spin">불러오는 중…</div></div>}>
      <SuccessInner />
    </Suspense>
  );
}
