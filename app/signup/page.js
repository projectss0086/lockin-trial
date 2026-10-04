"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, idToEmail, makeLoginId } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({
    name: "", owner: "", subject: "", phone: "", address: "", pw: "", pw2: "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const loginId = makeLoginId(f.name, f.phone);

  async function handleSignup() {
    setErr("");
    if (!f.name.trim() || !f.phone.trim() || !f.pw) {
      setErr("학원 이름, 연락처, 비밀번호는 꼭 입력해주세요.");
      return;
    }
    if (f.pw.length < 6) { setErr("비밀번호는 6자 이상으로 해주세요."); return; }
    if (f.pw !== f.pw2) { setErr("비밀번호가 서로 달라요."); return; }
    setBusy(true);

    // 1) 로그인 계정 생성
    const { data, error } = await supabase.auth.signUp({
      email: idToEmail(loginId),
      password: f.pw,
      options: { data: { display_name: f.name.trim(), phone_number: f.phone.trim() } },
    });
    if (error) {
      setBusy(false);
      console.error("signup error:", error);
      if (error.message.toLowerCase().includes("already")) {
        setErr("이미 등록된 학원이에요. 로그인해주세요.");
      } else {
        setErr("오류: " + error.message);
      }
      return;
    }

    // 2) 학원 프로필 저장
    const uid = data.user?.id;
    if (uid) {
      await supabase.from("academies").insert({
        id: uid,
        name: f.name.trim(),
        owner_name: f.owner.trim(),
        subject: f.subject.trim(),
        phone: f.phone.trim(),
        address: f.address.trim(),
        login_id: loginId,
   credits: 30, // 체험단 무료 이용권 30회
      });
    }
    setBusy(false);
    router.push("/welcome");
  }

  return (
    <div className="phone">
      <div className="top">
        <Link href="/login" className="back">‹</Link>
        <h2>학원 등록</h2>
      </div>
      <div className="pad">
        <div className="h1">학원 정보를 입력해주세요</div>
        <div className="lead">처음 한 번만 등록하면 됩니다.</div>

        <label className="fl">학원 이름</label>
        <input className="tf" value={f.name} onChange={set("name")} placeholder="예: 서울국어학원" />
        <label className="fl">원장 이름</label>
        <input className="tf" value={f.owner} onChange={set("owner")} placeholder="예: 김수학" />
        <label className="fl">지도 과목</label>
        <input className="tf" value={f.subject} onChange={set("subject")} placeholder="예: 국어" />
        <label className="fl">원장 연락처</label>
        <input className="tf" value={f.phone} onChange={set("phone")} placeholder="01012345678" inputMode="numeric" />
        <label className="fl">학원 주소</label>
        <input className="tf" value={f.address} onChange={set("address")} placeholder="예: 경상북도 울릉군 ㅇㅇ로 ㅇㅇ" />

        <div className="idbox">
          로그인 아이디 &nbsp; <b>{loginId || "—"}</b>
          <div className="idhint">학원이름 + 연락처 뒷 4자리로 자동 생성돼요</div>
        </div>

        <label className="fl">비밀번호 설정</label>
        <input className="tf" type="password" value={f.pw} onChange={set("pw")} placeholder="비밀번호 (6자 이상)" />
        <label className="fl">비밀번호 확인</label>
        <input className="tf" type="password" value={f.pw2} onChange={set("pw2")} placeholder="비밀번호 다시 입력" />
        <div className="err">{err}</div>
      </div>
      <div className="foot">
        <button className="btn primary lg" onClick={handleSignup} disabled={busy}>
          {busy ? "등록 중…" : "가입하고 학생 등록 →"}
        </button>
      </div>
    </div>
  );
}
