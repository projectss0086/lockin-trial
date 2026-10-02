import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const TABLES = { expressions: "expressions", seasons: "season_greetings" };
function adminUids() {
  return (process.env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
}

// 관리자(운영자)만 통과 — 로그인 토큰의 uid가 ADMIN_UIDS에 있어야 함
async function auth(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!url || !anon || !svc || !token) return null;
  const { data } = await createClient(url, anon).auth.getUser(token);
  const uid = data?.user?.id;
  if (!uid || !adminUids().includes(uid)) return null;
  return createClient(url, svc, { auth: { persistSession: false } });
}

function rowFrom(b) {
  return b.type === "expressions"
    ? { section: b.section, situation: b.situation || null, emotion: b.emotion || null, value_tag: b.value_tag || null, expression: (b.expression || "").trim() }
    : { season: b.season, text: (b.text || "").trim() };
}

export async function GET(req) {
  const supa = await auth(req);
  if (!supa) return Response.json({ error: "권한 없음" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "expressions";
  if (type === "check") return Response.json({ admin: true });

  // 고객(원장) 목록 — 읽기 전용
  if (type === "customers") {
    const q = searchParams.get("q");
    let query = supa.from("academies")
      .select("id,name,owner_name,phone,plan,sub_status,billing_cycle,credits,sub_credits,sub_next_billing,created_at")
      .order("created_at", { ascending: false }).limit(500);
    if (q) query = query.or(`name.ilike.%${q}%,owner_name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { count } = await supa.from("academies").select("id", { count: "exact", head: true });
    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ rows: data || [], total: count ?? (data?.length ?? 0) });
  }

  // 체험단 신청자 — 목록 (가입 없이 공개 신청)
  if (type === "applicants") {
    const { data, error } = await supa.from("applicants").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return Response.json({ rows: [], total: 0, note: "아직 신청자가 없어요." });
    const rows = data || [];
    const pending = rows.filter((r) => r.status === "applied").length;
    return Response.json({ rows, total: rows.length, pending });
  }

  // 고객 문의함 — 목록 (학원명 붙여서)
  if (type === "inquiries") {
    const { data, error } = await supa.from("inquiries").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return Response.json({ rows: [], total: 0, note: "아직 문의가 없어요." });
    const ids = [...new Set((data || []).map((r) => r.academy_id).filter(Boolean))];
    const nameMap = {};
    if (ids.length) {
      const { data: acas } = await supa.from("academies").select("id,name,owner_name,phone").in("id", ids);
      (acas || []).forEach((a) => { nameMap[a.id] = a; });
    }
    const rows = (data || []).map((r) => ({
      ...r,
      academy_name: nameMap[r.academy_id]?.name || null,
      owner_name: nameMap[r.academy_id]?.owner_name || null,
      phone: nameMap[r.academy_id]?.phone || null,
    }));
    const pending = rows.filter((r) => r.status !== "answered").length;
    return Response.json({ rows, total: rows.length, pending });
  }

  // 해지 사유 모음 — 읽기 전용 (테이블 없으면 빈 목록)
  if (type === "cancellations") {
    const { data, error } = await supa.from("cancellations").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return Response.json({ rows: [], total: 0, note: "아직 해지 기록이 없어요." });
    const ids = [...new Set((data || []).map((r) => r.academy_id).filter(Boolean))];
    const nameMap = {};
    if (ids.length) {
      const { data: acas } = await supa.from("academies").select("id,name,owner_name").in("id", ids);
      (acas || []).forEach((a) => { nameMap[a.id] = a; });
    }
    const rows = (data || []).map((r) => ({
      ...r,
      academy_name: nameMap[r.academy_id]?.name || null,
      owner_name: nameMap[r.academy_id]?.owner_name || null,
    }));
    return Response.json({ rows, total: rows.length });
  }

  const table = TABLES[type];
  if (!table) return Response.json({ error: "bad type" }, { status: 400 });

  let query = supa.from(table).select("*").order("id", { ascending: false }).limit(300);
  if (type === "expressions") {
    const section = searchParams.get("section");
    const q = searchParams.get("q");
    if (section) query = query.eq("section", section);
    if (q) query = query.ilike("expression", `%${q}%`);
  } else {
    const season = searchParams.get("season");
    if (season) query = query.eq("season", season);
  }
  const { count } = await supa.from(table).select("id", { count: "exact", head: true });
  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ rows: data || [], total: count ?? null });
}

export async function POST(req) {
  const supa = await auth(req);
  if (!supa) return Response.json({ error: "권한 없음" }, { status: 403 });
  const b = await req.json();
  const table = TABLES[b.type];
  if (!table) return Response.json({ error: "bad type" }, { status: 400 });
  const { data, error } = await supa.from(table).insert(rowFrom(b)).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ row: data });
}

export async function PATCH(req) {
  const supa = await auth(req);
  if (!supa) return Response.json({ error: "권한 없음" }, { status: 403 });
  const b = await req.json();

  // 체험단 선정/미선정 처리 (가입 없이 신청 → 계정 크레딧 대신 쿠폰 코드 발급)
  if (b.type === "applicants") {
    if (!b.id || !b.decision) return Response.json({ error: "bad req" }, { status: 400 });
    const { data: appRow } = await supa.from("applicants").select("*").eq("id", b.id).single();
    if (!appRow) return Response.json({ error: "신청자를 찾을 수 없어요." }, { status: 404 });

    if (b.decision === "select") {
      await supa.from("applicants").update({ status: "selected", decided_at: new Date().toISOString() }).eq("id", b.id);
      return Response.json({ ok: true, status: "selected" });
    }
    if (b.decision === "reject") {
      // 첫 달 50% 쿠폰 코드 발급 (이미 있으면 유지)
      const code = appRow.coupon_code || ("BETA50-" + Math.random().toString(36).slice(2, 8).toUpperCase());
      await supa.from("applicants").update({ status: "rejected", decided_at: new Date().toISOString(), coupon_code: code }).eq("id", b.id);
      return Response.json({ ok: true, status: "rejected", coupon_code: code });
    }
    return Response.json({ error: "알 수 없는 결정" }, { status: 400 });
  }

  // 문의 답변 달기
  if (b.type === "inquiries") {
    if (!b.id) return Response.json({ error: "bad req" }, { status: 400 });
    const answer = (b.answer || "").trim();
    const { data, error } = await supa.from("inquiries")
      .update({ answer: answer.slice(0, 4000), status: answer ? "answered" : "pending", answered_at: new Date().toISOString() })
      .eq("id", b.id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ row: data });
  }

  const table = TABLES[b.type];
  if (!table || !b.id) return Response.json({ error: "bad req" }, { status: 400 });
  const { data, error } = await supa.from(table).update(rowFrom(b)).eq("id", b.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ row: data });
}

export async function DELETE(req) {
  const supa = await auth(req);
  if (!supa) return Response.json({ error: "권한 없음" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const table = TABLES[type];
  if (!table || !id) return Response.json({ error: "bad req" }, { status: 400 });
  const { error } = await supa.from(table).delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
