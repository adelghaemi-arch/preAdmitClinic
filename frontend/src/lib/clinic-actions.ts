import { randomUUID } from "@/lib/uuid";
import { CONTRACT_ACTION_NAMES, runContractAction } from "@/lib/contract-actions";

/**
 * Pure browser-side clinic engine. This module performs every mutation directly on
 * the in-memory mock store, so the application needs no server and no database.
 */

class EngineResponse {
  status: number;
  private payload: unknown;
  constructor(payload: unknown, status = 200) {
    this.payload = payload;
    this.status = status;
  }
  async json() {
    return this.payload;
  }
}

const NextResponse = {
  json: (payload: unknown, init?: { status?: number }) => new EngineResponse(payload, init?.status ?? 200),
};
import type { SnapshotViewer } from "@/lib/clinic-scope";
import { mockMutations, mockStore, resetMockStore } from "@/lib/mock-store";
import { getClinicSnapshot } from "@/lib/clinic-server";
import { toFaDigits } from "@/lib/persian";
import { COMPANION_RELATION_CODES, ROLES, normalizeNationalId, normalizeText } from "@/lib/workspace";
import { defaultCompanionVisibility, emptyIntakeAnswers, type CompanionVisibility } from "@/types/clinic";


/** Compares national ids digit-wise so Persian/Arabic digits match the stored ASCII value. */
const sameNationalId = (a: string, b: string) => normalizeNationalId(a) === normalizeNationalId(b);
/** Actions a companion account may run; everything else is staff-only. */
const PATIENT_ROLE_ACTIONS = new Set(["SAVE_PATIENT_INTAKE", "PATIENT_STATION_CHECKIN", "MARK_ALERTS_READ", "LINK_COMPANION", "UNLINK_COMPANION", "UPDATE_COMPANION_VISIBILITY", "DISMISS_JOURNEY_INTRO"]);
/** Actions that change clinical data and require the "manage" permission. */
const COMPANION_MANAGE_ACTIONS = new Set(["SAVE_PATIENT_INTAKE", "PATIENT_STATION_CHECKIN"]);

async function queueText(patientId: number, roomCode: string): Promise<string> {
  const snapshot = await getClinicSnapshot();
  const station = snapshot.patients.find((p) => p.id === patientId)?.stations.find((st) => st.roomCode === roomCode && ["waiting", "checked_in"].includes(st.status));
  return station ? ` اکنون ${toFaDigits(station.queueAhead)} نفر جلوتر از شما هستند؛ زمان تقریبی فراخوان ${station.estimatedWaitMinutes === 0 ? "بسیار نزدیک است" : `حدود ${toFaDigits(station.estimatedWaitMinutes)} دقیقه است`} (بر اساس ترتیب صف و میانگین زمان خدمت این اتاق).` : "";
}

async function advancePatientFlowIfNeeded(patientId: number) {
  const now = new Date();
  const stations = mockStore.stationsOf(patientId);

  const activeNow = stations.find(
    (st) => st.status === "waiting" || st.status === "checked_in" || st.status === "in_progress"
  );
  if (activeNow) return activeNow;

  const nextPending = stations.find((st) => st.status === "pending");
  if (nextPending) {
    mockMutations.updateStation(nextPending.id, { status: "waiting", enteredQueueAt: now.toISOString() });
    const roomInfo = mockStore.roomByCode(nextPending.roomCode);
    const patientRow = mockStore.patients.find((p) => p.id === patientId);
    mockMutations.updatePatient(patientId, {
      autoOpenWayfinding: Boolean(patientRow?.intakeCompleted),
      homeLat: null,
      homeLon: null,
      homeAddress: null,
      completedAt: null,
    });

    const locationDesc = roomInfo
      ? `طبقه ${toFaDigits(roomInfo.floor)}، اتاق ${roomInfo.roomNumber} (${roomInfo.name})`
      : nextPending.roomName;
    const liveQueueText = await queueText(patientId, nextPending.roomCode);

    mockMutations.insertAlert({
      patientId,
      senderRole: "مسیریاب هوشمند کلینیک",
      alertType: "move_to_room",
      message: `ایستگاه بعدی شما فعال شد: لطفاً به ${locationDesc} مراجعه فرمایید. نقشه مسیر در گوشی شما باز شد.${liveQueueText}`,
      isRead: false,
      createdAt: now.toISOString(),
    });
    return nextPending;
  }

  const allDone = stations.length > 0 && stations.every((st) => st.status === "completed");
  if (allDone) {
    mockMutations.updatePatient(patientId, { completedAt: now.toISOString(), autoOpenWayfinding: false });
    mockMutations.insertAlert({
      patientId,
      senderRole: "پذیرش و پرونده الکترونیک",
      alertType: "result_ready",
      message: "کلیه مراحل درمانی امروز شما با موفقیت تکمیل گردید. فایل PDF پرونده الکترونیک جامع یک‌روزه هم‌اکنون قابل دانلود است.",
      isRead: false,
      createdAt: now.toISOString(),
    });
    // Reflect completed checkup back into corporate contract member row if linked
    for (const contract of mockStore.contracts) {
      const linked = contract.members.find((m) => m.linkedPatientId === patientId);
      if (linked) linked.appointmentStatus = "visit_done";
    }
  }
  return null;
}

export async function handleClinicAction(body: Record<string, any>, viewer: SnapshotViewer | null): Promise<EngineResponse> {
    if (body?.action === "GET_FULL_SNAPSHOT") return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });

  try {
    const { action } = body;
    const now = new Date();

    // If the request explicitly comes from a staff panel (e.g. reception directory search / lookup)
    // or if the action itself is a staff action, respect the requested role.
    const effectiveRole = (body.role && ROLES.some((r) => r.id === body.role)) ? body.role : viewer?.role;
    const effectiveViewer = viewer ? { ...viewer, role: effectiveRole } : null;

    if (CONTRACT_ACTION_NAMES.has(action)) {
      const outcome = runContractAction(body, effectiveRole ?? null);
      if (!outcome.ok) {
        return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
      }
      return NextResponse.json({
        ok: true,
        ...(outcome.meta ?? {}),
        snapshot: await getClinicSnapshot(),
      });
    }

    if (effectiveRole === "supervisor") {
      return NextResponse.json({ ok: false, error: "ناظر سازمان فقط دسترسی پایش قرارداد مربوطه را دارد." }, { status: 403 });
    }

    if (!effectiveViewer && (action === "LINK_COMPANION" || action === "UNLINK_COMPANION")) {
      return NextResponse.json({ ok: false, error: "این عملیات نیاز به ورود به حساب کاربری دارد." }, { status: 403 });
    }

    if (effectiveRole === "patient" || effectiveRole === "owner") {
      if (!PATIENT_ROLE_ACTIONS.has(action)) {
        return NextResponse.json({ ok: false, error: "این عملیات در نقش «همراه بیمار» مجاز نیست. برای پذیرش و جست‌وجوی بیماران، نقش «پذیرش و هماهنگی» را از منوی «نقش فعال» انتخاب کنید." }, { status: 403 });
      }
      if (action !== "LINK_COMPANION" && action !== "UNLINK_COMPANION" && effectiveViewer) {
        const link = mockStore.linksOfUser(effectiveViewer.userId).find((l) => l.patientId === Number(body.patientId));
        if (!link) {
          return NextResponse.json({ ok: false, error: "این پرونده به حساب شما متصل نیست." }, { status: 403 });
        }
        if (effectiveRole === "owner" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "در نقش بیمار فقط پرونده خودتان در دسترس است؛ برای پرونده دیگران نقش همراه بیمار را فعال کنید." }, { status: 403 });
        }
        if (effectiveRole === "patient" && link.relationship === "self") {
          return NextResponse.json({ ok: false, error: "پرونده خودتان در نقش بیمار نمایش داده می‌شود، نه همراه بیمار." }, { status: 403 });
        }
        if (COMPANION_MANAGE_ACTIONS.has(action) && link.permission !== "manage") {
          return NextResponse.json({ ok: false, error: "دسترسی شما به این پرونده فقط پیگیری است." }, { status: 403 });
        }
        if (action === "SAVE_PATIENT_INTAKE" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "شرح حال بالینی فقط توسط خود بیمار ثبت می‌شود." }, { status: 403 });
        }
        if (action === "DISMISS_JOURNEY_INTRO" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "معرفی مسیر فقط توسط خود بیمار بسته می‌شود." }, { status: 403 });
        }
        if (action === "UPDATE_COMPANION_VISIBILITY" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "فقط خود بیمار می‌تواند دسترسی همراه را تعیین کند." }, { status: 403 });
        }
      }
    }

    if (action === "LINK_COMPANION" && effectiveViewer) {
      const token = String(body.qrToken ?? "").trim();
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const relationship = COMPANION_RELATION_CODES.includes(String(body.relationship)) ? String(body.relationship) : "other";
      const permission = body.permission === "follow" ? "follow" : "manage";
      if (!token || !/^\d{10}$/.test(nationalId)) {
        return NextResponse.json({ ok: false, error: "کد QR و کد ملی ۱۰ رقمی بیمار را وارد کنید." }, { status: 400 });
      }
      const patient = mockStore.patientByToken(token);
      if (!patient || !sameNationalId(patient.nationalId, nationalId)) {
        return NextResponse.json({ ok: false, error: "کد QR یا کد ملی با پرونده بیمار مطابقت ندارد." }, { status: 404 });
      }
      if (effectiveRole === "owner" && relationship !== "self") {
        return NextResponse.json({ ok: false, error: "در نقش بیمار فقط می‌توانید پرونده خودتان را متصل کنید." }, { status: 403 });
      }
      if (effectiveRole === "patient" && relationship === "self") {
        return NextResponse.json({ ok: false, error: "برای اتصال پرونده خودتان، نقش بیمار را فعال کنید." }, { status: 403 });
      }
      if (relationship === "self") {
        const account = mockStore.userById(effectiveViewer.userId);
        if (!account || normalizeText(account.fullName).replace(/\s|\u200c/g, "") !== normalizeText(patient.fullName).replace(/\s|\u200c/g, "")) {
          return NextResponse.json({ ok: false, error: "اتصال به‌عنوان خود بیمار فقط برای حساب هویتی همان بیمار ممکن است." }, { status: 403 });
        }
      }
      const existing = mockStore.linksOfUser(effectiveViewer.userId).find((l) => l.patientId === patient.id);
      if (existing) {
        return NextResponse.json({ ok: false, error: "این پرونده قبلاً به حساب شما متصل شده است." }, { status: 409 });
      }
      mockMutations.insertLink({
        userId: effectiveViewer.userId,
        patientId: patient.id,
        relationship,
        permission,
        visibility: { ...defaultCompanionVisibility },
        createdAt: now.toISOString(),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_COMPANION_VISIBILITY" && effectiveViewer) {
      const selfLink = mockStore.linksOfUser(effectiveViewer.userId).find((l) => l.patientId === Number(body.patientId) && l.relationship === "self");
      if (!selfLink) return NextResponse.json({ ok: false, error: "فقط صاحب پرونده می‌تواند این تنظیمات را تغییر دهد." }, { status: 403 });
      const target = mockStore.linksOfPatient(Number(body.patientId)).find((l) => l.id === Number(body.linkId));
      if (!target || target.relationship === "self") return NextResponse.json({ ok: false, error: "همراه معتبر یافت نشد." }, { status: 404 });
      const input = body.visibility && typeof body.visibility === "object" ? body.visibility : {};
      const visibility: CompanionVisibility = Object.fromEntries(
        Object.keys(defaultCompanionVisibility).map((key) => [key, input[key] === true])
      ) as unknown as CompanionVisibility;
      mockMutations.updateLink(target.id, { visibility });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UNLINK_COMPANION" && effectiveViewer) {
      const link = mockStore.linksOfUser(effectiveViewer.userId).find((l) => l.patientId === Number(body.patientId));
      if (link) mockMutations.removeLink(link.id);
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (body.patientId !== undefined) {
      const id = Number(body.patientId);
      if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "شناسه بیمار نامعتبر است." }, { status: 400 });
      const patient = mockStore.patientById(id);
      if (!patient) return NextResponse.json({ ok: false, error: "پرونده بیمار یافت نشد." }, { status: 404 });
      if (body.stationId) {
        const station = mockStore.stationById(Number(body.stationId));
        if (!station || station.patientId !== id) return NextResponse.json({ ok: false, error: "این ایستگاه متعلق به پرونده انتخاب‌شده نیست." }, { status: 400 });
        if (["PATIENT_STATION_CHECKIN", "UPDATE_PARACLINIC_STATUS", "COMPLETE_SPECIALIST_STATION", "SAVE_CLINICAL_NOTE_AND_ORDERS"].includes(action) && ["completed", "sample_taken"].includes(station.status)) return NextResponse.json({ ok: false, error: "این مرحله قبلاً انجام شده و امکان شروع مجدد ندارد." }, { status: 409 });
        if (["PATIENT_STATION_CHECKIN", "UPDATE_PARACLINIC_STATUS", "COMPLETE_SPECIALIST_STATION", "SAVE_CLINICAL_NOTE_AND_ORDERS"].includes(action) && station.status === "pending") return NextResponse.json({ ok: false, error: "ابتدا ایستگاه‌های قبلی بیمار باید انجام شوند؛ برای تغییر ترتیب از مدیریت صف استفاده کنید." }, { status: 409 });
        if (action === "PATIENT_STATION_CHECKIN" && station.status !== "waiting") return NextResponse.json({ ok: false, error: "حضور بیمار قبلاً ثبت شده است." }, { status: 409 });
      }
    }

    if (action === "SEARCH_PATIENT_DIRECTORY") {
      if (effectiveRole === "patient" || effectiveRole === "owner") return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 403 });
      const query = normalizeText(String(body.query ?? "")).replace(/\s+/g, " ").trim();
      const statusFilter = String(body.visitStatus ?? "any");
      const roomFilter = String(body.roomCode ?? "any");
      const terms = query.split(" ").filter(Boolean);
      if (!terms.length && statusFilter === "any" && roomFilter === "any") return NextResponse.json({ ok: false, error: "برای جست‌وجو حداقل دو حرف وارد کنید یا یک فیلتر انتخاب کنید." }, { status: 400 });

      const groups = new Map<string, typeof mockStore.patients>();
      for (const patient of mockStore.patients) {
        const key = normalizeNationalId(patient.nationalId);
        groups.set(key, [...(groups.get(key) ?? []), patient]);
      }
      const activeStatuses = ["waiting", "checked_in", "in_progress"];

      const candidates = [...groups.entries()]
        .map(([nationalId, visits]) => {
          const latest = visits[0];
          const stations = mockStore.stationsOf(latest.id);
          const current = stations.find((st) => activeStatuses.includes(st.status))
            ?? stations.find((st) => st.status === "pending")
            ?? stations.find((st) => st.status === "sample_taken");
          const haystack = normalizeText([
            latest.fullName, nationalId, normalizeNationalId(latest.phone), latest.phone, latest.pathwayTitle,
            current?.roomName ?? "", latest.qrToken,
          ].join(" "));
          const allWordsFound = terms.length > 0 && terms.every((term) => haystack.includes(term));
          const statusMatch = statusFilter === "any"
            || (statusFilter === "active" && visits.some((visit) => !visit.completedAt))
            || (statusFilter === "completed" && visits.every((visit) => Boolean(visit.completedAt)))
            || (statusFilter === "intake_pending" && !latest.intakeCompleted)
            || (statusFilter === "allergy" && (latest.allergies ?? []).length > 0);
          const roomMatch = roomFilter === "any" || stations.some((st) => st.roomCode === roomFilter && activeStatuses.includes(st.status));
          return { nationalId, visits, stations, current, allWordsFound, statusMatch, roomMatch };
        })
        .filter((item) => item.statusMatch && item.roomMatch && (terms.length === 0 || item.allWordsFound))
        .sort((a, b) => Number(b.allWordsFound) - Number(a.allWordsFound)
          || Number(Boolean(b.current)) - Number(Boolean(a.current))
          || new Date(b.visits[0].checkInTime).getTime() - new Date(a.visits[0].checkInTime).getTime())
        .slice(0, 40)
        .map(({ nationalId, visits, current }) => {
          const latest = visits[0];
          return {
            nationalId,
            patient: { id: latest.id, fullName: latest.fullName, nationalId: latest.nationalId, age: latest.age, gender: latest.gender, phone: latest.phone, pathwayTitle: latest.pathwayTitle, allergies: latest.allergies ?? [], medications: latest.medications ?? [], intakeCompleted: latest.intakeCompleted },
            currentStationName: current?.roomName ?? null,
            currentStationStatus: current?.status ?? null,
            hasActiveVisit: visits.some((visit) => !visit.completedAt),
            activeVisitId: visits.find((visit) => !visit.completedAt)?.id ?? null,
            visitCount: visits.length,
            lastVisitAt: latest.checkInTime,
          };
        });
      return NextResponse.json({ ok: true, candidates });
    }

    if (action === "LOOKUP_PATIENT_BY_NATIONAL_ID") {
      if (effectiveRole === "patient" || effectiveRole === "owner") return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 403 });
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      if (!/^\d{10}$/.test(nationalId)) return NextResponse.json({ ok: false, error: "کد ملی باید ۱۰ رقم باشد." }, { status: 400 });
      const rows = mockStore.patientByNationalId(nationalId).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
      if (!rows.length) return NextResponse.json({ ok: true, found: false });
      const latest = rows[0];
      return NextResponse.json({
        ok: true,
        found: true,
        patient: { id: latest.id, fullName: latest.fullName, nationalId: latest.nationalId, age: latest.age, gender: latest.gender, phone: latest.phone, pathwayTitle: latest.pathwayTitle, allergies: latest.allergies ?? [], medications: latest.medications ?? [], intakeCompleted: latest.intakeCompleted },
        activeVisitId: rows.find((r) => !r.completedAt)?.id ?? null,
        visits: rows.map((r) => ({ id: r.id, checkInTime: r.checkInTime, completedAt: r.completedAt, pathwayTitle: r.pathwayTitle })),
      });
    }

    if (action === "REORDER_ROOM_QUEUE") {
      if (effectiveRole === "patient" || effectiveRole === "owner") return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 403 });
      const roomCode = String(body.roomCode ?? "");
      const ids: number[] = Array.isArray(body.orderedStationIds) ? body.orderedStationIds.map(Number) : [];
      const roomQueue = mockStore.stations.filter((s) => s.roomCode === roomCode && ["waiting", "checked_in"].includes(s.status));
      if (!ids.length || ids.length !== roomQueue.length || ids.some((id) => !roomQueue.some((s) => s.id === id))) return NextResponse.json({ ok: false, error: "ترتیب صف با وضعیت فعلی اتاق هم‌خوانی ندارد؛ صفحه را به‌روزرسانی کنید." }, { status: 409 });
      ids.forEach((id, index) => mockMutations.updateStation(id, { queueRank: index + 1 }));
      const updated = await getClinicSnapshot();
      for (const entry of updated.patients) {
        const station = entry.stations.find((st) => ids.includes(st.id));
        if (station) {
          mockMutations.insertAlert({
            patientId: entry.id,
            senderRole: "هماهنگ‌کننده صف",
            alertType: "queue_reorder",
            message: `ترتیب صف ${station.roomName} تغییر کرد. اکنون ${toFaDigits(station.queueAhead)} نفر جلوتر از شما هستند؛ زمان تقریبی فراخوان ${station.estimatedWaitMinutes === 0 ? "بسیار نزدیک است" : `حدود ${toFaDigits(station.estimatedWaitMinutes)} دقیقه است`}.`,
            isRead: false,
            createdAt: now.toISOString(),
          });
        }
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "CHECKIN_NEW_PATIENT") {
      const fullName = String(body.fullName ?? "").trim();
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const phone = normalizeText(String(body.phone ?? "")).replace(/\D/g, "");
      const age = Number(normalizeText(String(body.age ?? "")));
      if (fullName.length < 3 || fullName.length > 100 || !/^\d{10}$/.test(nationalId) || !/^09\d{9}$/.test(phone) || !Number.isFinite(age) || age < 1 || age > 120) return NextResponse.json({ ok: false, error: "نام کامل، کد ملی ۱۰ رقمی، موبایل معتبر و سن صحیح را وارد کنید." }, { status: 400 });
      const roomMap = new Map(mockStore.rooms.map((r) => [r.code, r]));
      const codes = Array.isArray(body.stationCodes) ? [...new Set<string>(body.stationCodes)] : [];
      if (!codes.length || codes.some((c) => !roomMap.has(c))) return NextResponse.json({ ok: false, error: "حداقل یک ایستگاه معتبر انتخاب کنید." }, { status: 400 });

      const previous = mockStore.patientByNationalId(nationalId).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0];
      if (previous && !previous.completedAt) return NextResponse.json({ ok: false, error: "این بیمار هم‌اکنون یک مراجعه فعال دارد؛ ابتدا مراجعه قبلی را تکمیل کنید." }, { status: 409 });

      const patient = mockMutations.insertPatient({
        qrToken: `NBZ-${randomUUID()}`,
        fullName,
        nationalId,
        phone,
        age,
        gender: body.gender === "زن" ? "زن" : "مرد",
        pathwayTitle: String(body.pathwayTitle || "مسیر اختصاصی"),
        checkInTime: now.toISOString(),
        completedAt: null,
        intakeCompleted: false,
        medications: previous?.medications ?? [],
        surgeries: previous?.surgeries ?? [],
        familyHistory: previous?.familyHistory ?? [],
        allergies: previous?.allergies ?? [],
        recentConditions: previous?.recentConditions ?? [],
        intakeAnswers: { ...emptyIntakeAnswers },
        autoOpenWayfinding: false,
        journeyIntroSeen: false,
      homeLat: null,
      homeLon: null,
      homeAddress: null,
      });

      codes.forEach((code, index) => {
        const room = roomMap.get(code)!;
        mockMutations.insertStation({
          patientId: patient.id,
          roomCode: code,
          roomName: room.name,
          category: room.category,
          stepOrder: index + 1,
          status: index === 0 ? "waiting" : "pending",
          enteredQueueAt: index === 0 ? now.toISOString() : null,
          checkedInAt: null,
          startedAt: null,
          completedAt: null,
          spentMinutes: 0,
          addedByDoctor: null,
          queueRank: 0,
        });
      });

      const firstRoom = roomMap.get(codes[0])!;
      mockMutations.insertAlert({
        patientId: patient.id,
        senderRole: "پذیرش مرکزی",
        alertType: "general",
        message: `${fullName} عزیز، خوش آمدید. لطفاً شرح حال و حساسیت‌ها را تکمیل کرده و به ${firstRoom.name}، طبقه ${toFaDigits(firstRoom.floor)}، اتاق ${firstRoom.roomNumber} مراجعه کنید.`,
        isRead: false,
        createdAt: now.toISOString(),
      });

      return NextResponse.json({ ok: true, createdPatientId: patient.id, qrToken: patient.qrToken, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_PATIENT_DETAILS") {
      const fullName = String(body.fullName ?? "").trim();
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const phone = normalizeText(String(body.phone ?? "")).replace(/\D/g, "");
      const age = Number(body.age);
      if (fullName.length < 3 || !/^\d{10}$/.test(nationalId) || !/^09\d{9}$/.test(phone) || !Number.isFinite(age) || age < 1 || age > 120) return NextResponse.json({ ok: false, error: "اطلاعات بیمار را کامل و صحیح وارد کنید." }, { status: 400 });
      mockMutations.updatePatient(Number(body.patientId), { fullName, nationalId, phone, age, gender: body.gender === "زن" ? "زن" : "مرد" });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "DISMISS_JOURNEY_INTRO") {
      const patientId = Number(body.patientId);
      mockMutations.updatePatient(patientId, { journeyIntroSeen: true });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "SAVE_PATIENT_INTAKE") {
      const { patientId, medications, surgeries, familyHistory, allergies, recentConditions, intakeAnswers } = body;
      mockMutations.updatePatient(Number(patientId), {
        medications: medications ?? [],
        surgeries: surgeries ?? [],
        familyHistory: familyHistory ?? [],
        allergies: allergies ?? [],
        recentConditions: recentConditions ?? [],
        intakeAnswers: { ...emptyIntakeAnswers, ...(intakeAnswers ?? {}) },
        intakeCompleted: true,
        journeyIntroSeen: true,
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "PATIENT_STATION_CHECKIN") {
      const [intakePatient] = mockStore.patients.filter((p) => p.id === Number(body.patientId));
      if (!intakePatient?.intakeCompleted) return NextResponse.json({ ok: false, error: "پیش از اعلام حضور، مرحله اول شرح حال امروز باید تکمیل شود." }, { status: 409 });
      mockMutations.updateStation(Number(body.stationId), { status: "checked_in", checkedInAt: now.toISOString() });
      mockMutations.updatePatient(Number(body.patientId), { autoOpenWayfinding: false });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "MARK_ALERTS_READ") {
      const patientId = Number(body.patientId);
      mockStore.alertsOfPatient(patientId).forEach((alert) => { alert.isRead = true; });
      mockMutations.updatePatient(patientId, { autoOpenWayfinding: false });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "REORDER_PATIENT_QUEUE") {
      const patientId = Number(body.patientId);
      const orderedStationIds: number[] = Array.isArray(body.orderedStationIds) ? body.orderedStationIds.map(Number) : [];
      const existing = mockStore.stationsOf(patientId);
      if (!orderedStationIds.length || orderedStationIds.length !== existing.length || orderedStationIds.some((id) => !existing.some((s) => s.id === id))) {
        return NextResponse.json({ ok: false, error: "ترتیب ایستگاه‌ها معتبر نیست." }, { status: 400 });
      }
      if (existing.some((s) => ["completed", "sample_taken"].includes(s.status) && orderedStationIds.indexOf(s.id) + 1 !== s.stepOrder)) {
        return NextResponse.json({ ok: false, error: "مراحل انجام‌شده قابل جابه‌جایی نیستند." }, { status: 409 });
      }
      const hasCheckedInOrInProgress = existing.some((s) => s.status === "checked_in" || s.status === "in_progress");
      let activatedRoomName = "";
      let foundFirstIncomplete = false;
      orderedStationIds.forEach((stationId, index) => {
        const station = existing.find((s) => s.id === stationId)!;
        let nextStatus = station.status;
        if (!hasCheckedInOrInProgress && station.status !== "completed" && station.status !== "sample_taken") {
          if (!foundFirstIncomplete) {
            nextStatus = "waiting";
            foundFirstIncomplete = true;
            activatedRoomName = station.roomName;
          } else {
            nextStatus = "pending";
          }
        }
        mockMutations.updateStation(stationId, {
          stepOrder: index + 1,
          status: nextStatus,
          enteredQueueAt: nextStatus === "waiting" ? station.enteredQueueAt ?? now.toISOString() : station.enteredQueueAt,
        });
      });
      if (activatedRoomName) {
        const intakeDone = Boolean(mockStore.patients.find((p) => p.id === patientId)?.intakeCompleted);
        mockMutations.updatePatient(patientId, { autoOpenWayfinding: intakeDone });
        mockMutations.insertAlert({
          patientId,
          senderRole: "هماهنگ‌کننده هوشمند صف",
          alertType: "queue_reorder",
          message: `جهت جلوگیری از معطلی شما در صف شلوغ، اولویت مسیر شما به‌روزرسانی شد. لطفاً هم‌اکنون به «${activatedRoomName}» مراجعه فرمایید.`,
          isRead: false,
          createdAt: now.toISOString(),
        });
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "SEND_PATIENT_ALERT") {
      const { patientId, senderRole, alertType, message } = body;
      const station = mockStore.stationsOf(Number(patientId)).find((st) => ["waiting", "checked_in"].includes(st.status));
      const liveQueue = alertType === "move_to_room" && station
        ? await queueText(Number(patientId), station.roomCode)
        : "";
      mockMutations.insertAlert({
        patientId: Number(patientId),
        senderRole: senderRole || "پذیرش کلینیک",
        alertType: alertType || "move_to_room",
        message: `${String(message)}${liveQueue}`,
        isRead: false,
        createdAt: now.toISOString(),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_PARACLINIC_STATUS") {
      const station = mockStore.stationById(Number(body.stationId));
      if (station) {
        if (body.newStatus === "in_progress") {
          mockMutations.updateStation(station.id, { status: "in_progress", startedAt: now.toISOString() });
        } else if (body.newStatus === "sample_taken") {
          mockMutations.updateStation(station.id, { status: "sample_taken", spentMinutes: Math.max(station.spentMinutes, 12) });
          await advancePatientFlowIfNeeded(Number(body.patientId));
        } else if (body.newStatus === "completed") {
          mockMutations.updateStation(station.id, { status: "completed", completedAt: now.toISOString(), spentMinutes: Math.max(station.spentMinutes, 14) });
          await advancePatientFlowIfNeeded(Number(body.patientId));
        }
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPLOAD_PARACLINIC_RESULT") {
      const {
        patientId, stationId, roomCode, title, resultType, operatorName,
        summaryStatus, metrics, interpretation, attachmentUrl, fileName,
      } = body;

      mockMutations.insertResult({
        patientId: Number(patientId),
        stationId: stationId ? Number(stationId) : null,
        roomCode,
        title,
        resultType,
        operatorName: operatorName || "اپراتور بخش تشخیصی",
        summaryStatus: summaryStatus || "نرمال",
        metrics: metrics ?? [],
        interpretation: interpretation || "گزارش ثبت شد.",
        attachmentUrl: attachmentUrl || null,
        fileName: fileName || null,
        createdAt: now.toISOString(),
      });

      const patientStations = mockStore.stationsOf(Number(patientId));
      const matchingStation = stationId
        ? patientStations.find((s) => s.id === Number(stationId))
        : patientStations.find((s) => s.roomCode === roomCode && s.status !== "completed");
      if (matchingStation) {
        mockMutations.updateStation(matchingStation.id, { status: "completed", completedAt: now.toISOString(), spentMinutes: Math.max(matchingStation.spentMinutes, 14) });
      }

      mockMutations.insertAlert({
        patientId: Number(patientId),
        senderRole: `بخش پاراکلینیک (${roomCode})`,
        alertType: "result_ready",
        message: `نتیجه «${title}» آماده شد و در پرونده لحظه‌ای شما و پنل پزشکان متخصص بارگذاری گردید.`,
        isRead: false,
        createdAt: now.toISOString(),
      });

      await advancePatientFlowIfNeeded(Number(patientId));
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "SAVE_CLINICAL_NOTE_AND_ORDERS") {
      const {
        patientId, stationId, roomCode, doctorName, specialty, chiefComplaint,
        examFindings, diagnosis, prescriptions, referralNote, addUrgentRoomCode,
      } = body;

      mockMutations.insertNote({
        patientId: Number(patientId),
        stationId: stationId ? Number(stationId) : null,
        roomCode,
        doctorName,
        specialty,
        chiefComplaint: chiefComplaint || "معاینه تخصصی مسیر چکاپ روزانه",
        examFindings: examFindings || "معاینه بالینی انجام شد.",
        diagnosis,
        prescriptions: prescriptions ?? [],
        referralNote: referralNote || null,
        createdAt: now.toISOString(),
      });

      if (stationId) {
        mockMutations.updateStation(Number(stationId), { status: "in_progress", startedAt: now.toISOString() });
      }

      if (addUrgentRoomCode) {
        const targetRoom = mockStore.roomByCode(addUrgentRoomCode);
        if (targetRoom) {
          const currentStations = mockStore.stationsOf(Number(patientId));
          const currentSt = currentStations.find((s) => s.id === Number(stationId));
          const insertOrder = currentSt ? currentSt.stepOrder + 1 : currentStations.length + 1;
          currentStations.filter((s) => s.stepOrder >= insertOrder).forEach((s) => {
            mockMutations.updateStation(s.id, { stepOrder: s.stepOrder + 1 });
          });
          mockMutations.insertStation({
            patientId: Number(patientId),
            roomCode: targetRoom.code,
            roomName: targetRoom.name,
            category: targetRoom.category,
            stepOrder: insertOrder,
            status: "pending",
            enteredQueueAt: null,
            checkedInAt: null,
            startedAt: null,
            completedAt: null,
            spentMinutes: 0,
            addedByDoctor: `ارجاع فوری توسط ${doctorName}`,
            queueRank: 0,
          });
          mockMutations.insertAlert({
            patientId: Number(patientId),
            senderRole: doctorName,
            alertType: "queue_reorder",
            message: `به دستور ${doctorName}، ایستگاه «${targetRoom.name}» (طبقه ${toFaDigits(targetRoom.floor)}، اتاق ${targetRoom.roomNumber}) به مسیر درمانی امروز شما اضافه گردید.`,
            isRead: false,
            createdAt: now.toISOString(),
          });
        }
      }

      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "COMPLETE_SPECIALIST_STATION") {
      const station = mockStore.stationById(Number(body.stationId));
      if (station) {
        mockMutations.updateStation(station.id, { status: "completed", completedAt: now.toISOString(), spentMinutes: Math.max(station.spentMinutes, 20) });
      }
      await advancePatientFlowIfNeeded(Number(body.patientId));
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPSERT_PATHWAY") {
      const { id, code, title, description, stationCodes, estimatedTotalMinutes } = body;
      if (id) {
        const target = mockStore.pathways.find((p) => p.id === Number(id));
        if (target) Object.assign(target, { title, description, stationCodes, estimatedTotalMinutes: Number(estimatedTotalMinutes) || 90 });
      } else {
        mockStore.pathways.push({
          id: mockStore.pathways.reduce((max, p) => Math.max(max, p.id), 0) + 1,
          code: code || `PKG_${Date.now()}`,
          title,
          description,
          stationCodes,
          estimatedTotalMinutes: Number(estimatedTotalMinutes) || 90,
          isActive: true,
        });
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_ROOM_CONFIG") {
      const { id, floor, roomNumber, specialistName, specialtyTitle, prepInstructions, wayfindingSteps, avgServiceMinutes } = body;
      const room = mockStore.rooms.find((r) => r.id === Number(id));
      if (room) {
        Object.assign(room, {
          floor: Number(floor),
          roomNumber,
          specialistName,
          specialtyTitle,
          prepInstructions,
          wayfindingSteps,
          avgServiceMinutes: Number(avgServiceMinutes) || 15,
        });
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPSERT_STAFF_MEMBER") {
      const { id, fullName, role, specialtyOrDept, roomCode, medicalCouncilCode, permissions, isActive } = body;
      if (id) {
        const member = mockStore.staff.find((s) => s.id === Number(id));
        if (member) {
          Object.assign(member, {
            fullName, role, specialtyOrDept, roomCode: roomCode || null,
            medicalCouncilCode, permissions: permissions ?? [], isActive: isActive ?? true,
          });
        }
      } else {
        mockStore.staff.push({
          id: mockStore.staff.reduce((max, s) => Math.max(max, s.id), 0) + 1,
          fullName,
          role,
          specialtyOrDept,
          roomCode: roomCode || null,
          medicalCouncilCode: medicalCouncilCode || "۱۲۳۴۵",
          permissions: permissions ?? [],
          isActive: true,
        });
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "RESET_MOCK_DATA") {
      resetMockStore();
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    return NextResponse.json(
      { ok: false, error: "عملیات نامعتبر است" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "ACTIVE_VISIT") return NextResponse.json({ ok: false, error: "این بیمار هم‌اکنون یک مراجعه فعال دارد؛ ابتدا مراجعه قبلی را تکمیل کنید." }, { status: 409 });
    console.error("Clinic action error:", error);
    return NextResponse.json(
      { ok: false, error: "خطا در ثبت تغییرات در پایگاه داده" },
      { status: 500 }
    );
  }
}
