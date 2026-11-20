import { randomUUID } from "@/lib/uuid";
import { CONTRACT_ACTION_NAMES, runContractAction } from "@/lib/contract-actions";
import { readSessionId, revokeAuthSession, revokeOtherAuthSessions } from "@/lib/auth-sessions";
import { ensureProfilePhotoFromRecord, PLATFORM_ACTION_NAMES, runPlatformAction } from "@/lib/platform-actions";

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
import { normalizePersianInput, normalizePersianLetters, toFaDigits } from "@/lib/persian";
import {
  COMPANION_FEATURE_ENABLED,
  COMPANION_RELATION_CODES,
  ROLES,
  normalizeNationalId,
  normalizeText,
} from "@/lib/workspace";

/** Reception / paraclinic mutations — temporarily platform-admin only. */
const OPS_CLINIC_ACTIONS = new Set([
  "CHECKIN_NEW_PATIENT",
  "REORDER_ROOM_QUEUE",
  "REORDER_PATIENT_QUEUE",
  "SEND_PATIENT_ALERT",
  "ASSIGN_TO_DOCTOR_ROOM",
  "UPDATE_PARACLINIC_STATUS",
  "UPLOAD_PARACLINIC_RESULT",
]);
import {
  defaultCompanionVisibility,
  emptyIntakeAnswers,
  type CompanionVisibility,
  type FormAnswer,
  type FormDefinition,
  type PatientIntakeDocumentFile,
  type PatientIntakeDocumentGroup,
} from "@/types/clinic";
import {
  buildContext,
  formVersionId,
  syncSkippedAnswers,
  validateForm,
  validateFormDefinitionCoding,
} from "@/lib/form-engine";
import {
  INTAKE_DOCUMENT_MAX_FILES_PER_GROUP,
  INTAKE_DOCUMENT_MAX_GROUPS,
  intakeDocumentLabelFa,
  isIntakeDocumentType,
  normalizeIntakeFilePayload,
} from "@/lib/intake-documents";

const INTAKE_DOC_ACTIONS = new Set([
  "ADD_INTAKE_DOCUMENT_GROUP",
  "ADD_INTAKE_DOCUMENT_FILES",
  "REMOVE_INTAKE_DOCUMENT_GROUP",
  "REMOVE_INTAKE_DOCUMENT_FILE",
]);


/** Compares national ids digit-wise so Persian/Arabic digits match the stored ASCII value. */
const sameNationalId = (a: string, b: string) => normalizeNationalId(a) === normalizeNationalId(b);
/** Actions a companion account may run; everything else is staff-only. */
const PATIENT_ROLE_ACTIONS = new Set([
  "SAVE_FORM_RESPONSE",
  "UPDATE_PATIENT_PHOTO",
  "ADD_INTAKE_DOCUMENT_GROUP",
  "ADD_INTAKE_DOCUMENT_FILES",
  "REMOVE_INTAKE_DOCUMENT_GROUP",
  "REMOVE_INTAKE_DOCUMENT_FILE",
  "PATIENT_STATION_CHECKIN",
  "MARK_ALERTS_READ",
  "LINK_COMPANION",
  "UNLINK_COMPANION",
  "UPDATE_COMPANION_VISIBILITY",
  "DISMISS_JOURNEY_INTRO",
  "UPDATE_PATIENT_HOME",
  "START_FRAUD_CAMERA_SESSION",
  "CAPTURE_FRAUD_FRAME",
  "END_FRAUD_CAMERA_SESSION",
  "RECORD_USER_GPS",
  "REVOKE_AUTH_SESSION",
  "REVOKE_OTHER_AUTH_SESSIONS",
]);
/** Actions that change clinical data and require the "manage" permission. */
const COMPANION_MANAGE_ACTIONS = new Set([
  "SAVE_FORM_RESPONSE",
  "UPDATE_PATIENT_PHOTO",
  "ADD_INTAKE_DOCUMENT_GROUP",
  "ADD_INTAKE_DOCUMENT_FILES",
  "REMOVE_INTAKE_DOCUMENT_GROUP",
  "REMOVE_INTAKE_DOCUMENT_FILE",
  "PATIENT_STATION_CHECKIN",
  "UPDATE_PATIENT_HOME",
]);

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

    if (action === "REVOKE_AUTH_SESSION" || action === "REVOKE_OTHER_AUTH_SESSIONS") {
      if (!effectiveViewer) {
        return NextResponse.json({ ok: false, error: "این عملیات نیاز به ورود به حساب کاربری دارد." }, { status: 403 });
      }
      if (action === "REVOKE_AUTH_SESSION") {
        const sessionId = String(body.sessionId ?? "");
        const session = mockStore.platform.authSessions?.find((s) => s.id === sessionId);
        if (!session) return NextResponse.json({ ok: false, error: "نشست یافت نشد." }, { status: 404 });
        const isPlatform = effectiveRole === "platform";
        if (!isPlatform && session.userId !== effectiveViewer.userId) {
          return NextResponse.json({ ok: false, error: "اجازه قطع این نشست را ندارید." }, { status: 403 });
        }
        const result = revokeAuthSession(sessionId, {
          actor: isPlatform ? "ادمین کل" : "کاربر",
          clearLocalIfCurrent: true,
        });
        if (!result.ok) {
          return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
        }
        return NextResponse.json({
          ok: true,
          wasCurrent: result.wasCurrent,
          snapshot: await getClinicSnapshot(),
        });
      }
      const keepId = body.keepSessionId != null ? String(body.keepSessionId) : readSessionId();
      const count = revokeOtherAuthSessions(
        effectiveViewer.userId,
        keepId,
        effectiveRole === "platform" ? "ادمین کل" : "کاربر"
      );
      return NextResponse.json({
        ok: true,
        revokedCount: count,
        snapshot: await getClinicSnapshot(),
      });
    }

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

    if (PLATFORM_ACTION_NAMES.has(action)) {
      const outcome = runPlatformAction(body, effectiveRole ?? null);
      if (!outcome.ok) {
        return NextResponse.json({ ok: false, error: outcome.error }, { status: outcome.status });
      }
      return NextResponse.json({
        ok: true,
        ...(outcome.meta ?? {}),
        snapshot: await getClinicSnapshot(),
      });
    }

    if (effectiveRole === "platform") {
      if (!OPS_CLINIC_ACTIONS.has(action)) {
        return NextResponse.json(
          { ok: false, error: "ادمین کل فقط به کنترل پلتفرم و عملیات پذیرش/پاراکلینیک (دمو) دسترسی دارد." },
          { status: 403 }
        );
      }
      // Fall through: platform may run temporary OPS clinic actions.
    } else if (OPS_CLINIC_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "عملیات پذیرش، صف و پاراکلینیک فعلاً فقط برای ادمین کل فعال است. پزشک از لیست انتظار و پرونده استفاده کند.",
        },
        { status: 403 }
      );
    }

    if (effectiveRole === "supervisor") {
      return NextResponse.json({ ok: false, error: "ناظر سازمان فقط دسترسی پایش قرارداد مربوطه را دارد." }, { status: 403 });
    }

    if (
      !COMPANION_FEATURE_ENABLED &&
      (action === "LINK_COMPANION" ||
        action === "UNLINK_COMPANION" ||
        action === "UPDATE_COMPANION_VISIBILITY")
    ) {
      return NextResponse.json(
        { ok: false, error: "بخش همراه موقتاً غیرفعال است و در فاز بعدی فعال می‌شود." },
        { status: 403 }
      );
    }

    if (!effectiveViewer && (action === "LINK_COMPANION" || action === "UNLINK_COMPANION")) {
      return NextResponse.json({ ok: false, error: "این عملیات نیاز به ورود به حساب کاربری دارد." }, { status: 403 });
    }

    if (effectiveRole === "patient" || effectiveRole === "owner") {
      if (!PATIENT_ROLE_ACTIONS.has(action)) {
        const roleLabel = effectiveRole === "owner" ? "سلامتجو" : "همراه سلامتجو";
        return NextResponse.json({ ok: false, error: `این عملیات در نقش «${roleLabel}» مجاز نیست. برای پذیرش و جست‌وجوی سلامتجویان، نقش «پذیرش و هماهنگی» را از منوی «نقش فعال» انتخاب کنید.` }, { status: 403 });
      }
      if (action !== "LINK_COMPANION" && action !== "UNLINK_COMPANION" && effectiveViewer) {
        const link = mockStore.linksOfUser(effectiveViewer.userId).find((l) => l.patientId === Number(body.patientId));
        if (!link) {
          return NextResponse.json({ ok: false, error: "این پرونده به حساب شما متصل نیست." }, { status: 403 });
        }
        if (effectiveRole === "owner" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "در نقش سلامتجو فقط پرونده خودتان در دسترس است؛ برای پرونده دیگران نقش همراه سلامتجو را فعال کنید." }, { status: 403 });
        }
        if (effectiveRole === "patient" && link.relationship === "self") {
          return NextResponse.json({ ok: false, error: "پرونده خودتان در نقش سلامتجو نمایش داده می‌شود، نه همراه سلامتجو." }, { status: 403 });
        }
        if (COMPANION_MANAGE_ACTIONS.has(action) && link.permission !== "manage") {
          return NextResponse.json({ ok: false, error: "دسترسی شما به این پرونده فقط پیگیری است." }, { status: 403 });
        }
        if (action === "SAVE_FORM_RESPONSE" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "پرسشنامه پیش‌پذیرش فقط توسط خود سلامتجو ثبت می‌شود." }, { status: 403 });
        }
        if (action === "UPDATE_PATIENT_PHOTO" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "عکس پرونده سلامت الکترونیک فقط توسط خود سلامتجو ثبت می‌شود." }, { status: 403 });
        }
        if (INTAKE_DOC_ACTIONS.has(action) && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "مدارک همراه پیش‌پذیرش فقط توسط خود سلامتجو ثبت می‌شود." }, { status: 403 });
        }
        if (action === "DISMISS_JOURNEY_INTRO" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "معرفی مسیر فقط توسط خود سلامتجو بسته می‌شود." }, { status: 403 });
        }
        if (action === "UPDATE_COMPANION_VISIBILITY" && link.relationship !== "self") {
          return NextResponse.json({ ok: false, error: "فقط خود سلامتجو می‌تواند دسترسی همراه را تعیین کند." }, { status: 403 });
        }
      }
    }

    if (action === "LINK_COMPANION" && effectiveViewer) {
      const token = String(body.qrToken ?? "").trim();
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const relationship = COMPANION_RELATION_CODES.includes(String(body.relationship)) ? String(body.relationship) : "other";
      const permission = body.permission === "follow" ? "follow" : "manage";
      if (!token || !/^\d{10}$/.test(nationalId)) {
        return NextResponse.json({ ok: false, error: "کد QR و کد ملی ۱۰ رقمی سلامتجو را وارد کنید." }, { status: 400 });
      }
      const patient = mockStore.patientByToken(token);
      if (!patient || !sameNationalId(patient.nationalId, nationalId)) {
        return NextResponse.json({ ok: false, error: "کد QR یا کد ملی با پرونده سلامتجو مطابقت ندارد." }, { status: 404 });
      }
      if (effectiveRole === "owner" && relationship !== "self") {
        return NextResponse.json({ ok: false, error: "در نقش سلامتجو فقط می‌توانید پرونده خودتان را متصل کنید." }, { status: 403 });
      }
      if (effectiveRole === "patient" && relationship === "self") {
        return NextResponse.json({ ok: false, error: "برای اتصال پرونده خودتان، نقش سلامتجو را فعال کنید." }, { status: 403 });
      }
      if (relationship === "self") {
        const account = mockStore.userById(effectiveViewer.userId);
        if (!account || normalizeText(account.fullName).replace(/\s|\u200c/g, "") !== normalizeText(patient.fullName).replace(/\s|\u200c/g, "")) {
          return NextResponse.json({ ok: false, error: "اتصال به‌عنوان خود سلامتجو فقط برای حساب هویتی همان سلامتجو ممکن است." }, { status: 403 });
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
      if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ ok: false, error: "شناسه سلامتجو نامعتبر است." }, { status: 400 });
      const patient = mockStore.patientById(id);
      if (!patient) return NextResponse.json({ ok: false, error: "پرونده سلامتجو یافت نشد." }, { status: 404 });
      if (body.stationId) {
        const station = mockStore.stationById(Number(body.stationId));
        if (!station || station.patientId !== id) return NextResponse.json({ ok: false, error: "این ایستگاه متعلق به پرونده انتخاب‌شده نیست." }, { status: 400 });
        if (["PATIENT_STATION_CHECKIN", "UPDATE_PARACLINIC_STATUS", "COMPLETE_SPECIALIST_STATION", "SAVE_CLINICAL_NOTE_AND_ORDERS"].includes(action) && ["completed", "sample_taken"].includes(station.status)) return NextResponse.json({ ok: false, error: "این مرحله قبلاً انجام شده و امکان شروع مجدد ندارد." }, { status: 409 });
        if (["PATIENT_STATION_CHECKIN", "UPDATE_PARACLINIC_STATUS", "COMPLETE_SPECIALIST_STATION", "SAVE_CLINICAL_NOTE_AND_ORDERS"].includes(action) && station.status === "pending") return NextResponse.json({ ok: false, error: "ابتدا ایستگاه‌های قبلی سلامتجو باید انجام شوند؛ برای تغییر ترتیب از مدیریت صف استفاده کنید." }, { status: 409 });
        if (action === "PATIENT_STATION_CHECKIN" && station.status !== "waiting") return NextResponse.json({ ok: false, error: "حضور سلامتجو قبلاً ثبت شده است." }, { status: 409 });
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
      const notInContractMsg =
        "کد ملی شما در هیچ قراردادی یافت نشد. لطفا با سازمان خود جهت ثبت اطلاعات تماس حاصل فرمایید.";
      const inContract = (mockStore.contracts ?? []).some(
        (c) => c.status === "active" && (c.members ?? []).some((m) => normalizeNationalId(m.nationalId) === nationalId),
      );
      const rows = mockStore.patientByNationalId(nationalId).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
      if (!rows.length) {
        if (!inContract) {
          return NextResponse.json({ ok: true, found: false, inContract: false, blocked: true, error: notInContractMsg });
        }
        return NextResponse.json({ ok: true, found: false, inContract: true, blocked: false });
      }
      const latest = rows[0];
      return NextResponse.json({
        ok: true,
        found: true,
        inContract,
        blocked: false,
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
      const fullName = normalizePersianLetters(String(body.fullName ?? "").trim());
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const phone = normalizeText(String(body.phone ?? "")).replace(/\D/g, "");
      const age = Number(normalizeText(String(body.age ?? "")));
      if (fullName.length < 3 || fullName.length > 100 || !/^\d{10}$/.test(nationalId) || !/^09\d{9}$/.test(phone) || !Number.isFinite(age) || age < 1 || age > 120) return NextResponse.json({ ok: false, error: "نام کامل، کد ملی ۱۰ رقمی، موبایل معتبر و سن صحیح را وارد کنید." }, { status: 400 });
      // دفاع دوم: پذیرش walk-in بدون عضویت قرارداد فعال ممنوع
      const inActiveContract = (mockStore.contracts ?? []).some(
        (c) => c.status === "active" && (c.members ?? []).some((m) => normalizeNationalId(m.nationalId) === nationalId),
      );
      if (!inActiveContract) {
        return NextResponse.json({
          ok: false,
          error: "کد ملی شما در هیچ قراردادی یافت نشد. لطفا با سازمان خود جهت ثبت اطلاعات تماس حاصل فرمایید.",
        }, { status: 403 });
      }
      if (body.gender !== "زن" && body.gender !== "مرد") {
        return NextResponse.json({ ok: false, error: "جنسیت سلامتجو را صریحاً مرد یا زن انتخاب کنید؛ برای پرسشنامه پیش‌پذیرش الزامی است." }, { status: 400 });
      }
      const roomMap = new Map(mockStore.rooms.map((r) => [r.code, r]));
      const codes = Array.isArray(body.stationCodes) ? [...new Set<string>(body.stationCodes)] : [];
      if (!codes.length || codes.some((c) => !roomMap.has(c))) return NextResponse.json({ ok: false, error: "حداقل یک ایستگاه معتبر انتخاب کنید." }, { status: 400 });

      const previous = mockStore.patientByNationalId(nationalId).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime())[0];
      if (previous && !previous.completedAt) return NextResponse.json({ ok: false, error: "این سلامتجو هم‌اکنون یک مراجعه فعال دارد؛ ابتدا مراجعه قبلی را تکمیل کنید." }, { status: 409 });

      const patient = mockMutations.insertPatient({
        qrToken: `NBZ-${randomUUID()}`,
        fullName,
        nationalId,
        phone,
        age,
        gender: body.gender,
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
        formResponses: [],
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
        message: `${fullName} عزیز، پذیرش کلینیک شما ثبت شد. لطفاً ابتدا پرسشنامه پیش‌پذیرش را تکمیل کنید؛ سپس به ${firstRoom.name}، طبقه ${toFaDigits(firstRoom.floor)}، اتاق ${firstRoom.roomNumber} مراجعه کنید.`,
        isRead: false,
        createdAt: now.toISOString(),
      });

      return NextResponse.json({ ok: true, createdPatientId: patient.id, qrToken: patient.qrToken, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_PATIENT_DETAILS") {
      const fullName = normalizePersianLetters(String(body.fullName ?? "").trim());
      const nationalId = normalizeNationalId(String(body.nationalId ?? ""));
      const phone = normalizeText(String(body.phone ?? "")).replace(/\D/g, "");
      const age = Number(body.age);
      if (fullName.length < 3 || !/^\d{10}$/.test(nationalId) || !/^09\d{9}$/.test(phone) || !Number.isFinite(age) || age < 1 || age > 120) return NextResponse.json({ ok: false, error: "اطلاعات سلامتجو را کامل و صحیح وارد کنید." }, { status: 400 });
      if (body.gender !== "زن" && body.gender !== "مرد") {
        return NextResponse.json({ ok: false, error: "جنسیت سلامتجو را صریحاً مرد یا زن انتخاب کنید." }, { status: 400 });
      }
      mockMutations.updatePatient(Number(body.patientId), { fullName, nationalId, phone, age, gender: body.gender });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_PATIENT_HOME") {
      const patientId = Number(body.patientId);
      if (!mockStore.patientById(patientId)) {
        return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      }
      const lat = body.homeLat === null || body.homeLat === "" ? null : Number(body.homeLat);
      const lon = body.homeLon === null || body.homeLon === "" ? null : Number(body.homeLon);
      if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
        return NextResponse.json({ ok: false, error: "عرض جغرافیایی معتبر نیست." }, { status: 400 });
      }
      if (lon !== null && (!Number.isFinite(lon) || lon < -180 || lon > 180)) {
        return NextResponse.json({ ok: false, error: "طول جغرافیایی معتبر نیست." }, { status: 400 });
      }
      mockStore.updatePatientHome(patientId, {
        homeLat: lat,
        homeLon: lon,
        homeAddress: String(body.homeAddress ?? "") || null,
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPDATE_PATIENT_PHOTO") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      const photoDataUrl = String(body.photoDataUrl ?? "").trim();
      if (!photoDataUrl.startsWith("data:image/") || photoDataUrl.length < 32) {
        return NextResponse.json({ ok: false, error: "عکس پرتره معتبر نیست؛ دوباره بگیرید." }, { status: 400 });
      }
      // Cap ~350KB data URL (6×8 cm @ 150 dpi JPEG).
      if (photoDataUrl.length > 350_000) {
        return NextResponse.json({ ok: false, error: "حجم عکس زیاد است؛ دوباره با کیفیت پایین‌تر بگیرید." }, { status: 400 });
      }
      mockMutations.updatePatient(patientId, { photoDataUrl });
      // Mirror into platform photo history for platform-admin review.
      const roleForPlatform = String(effectiveRole ?? "owner");
      const userId = effectiveViewer?.userId ?? null;
      ensureProfilePhotoFromRecord(patientId, photoDataUrl, userId);
      let sessionId = String(body.fraudSessionId ?? "").trim();
      if (!sessionId) {
        const started = runPlatformAction(
          { action: "START_FRAUD_CAMERA_SESSION", patientId, userId },
          roleForPlatform
        );
        sessionId = String((started.meta as { sessionId?: string } | undefined)?.sessionId ?? "");
      }
      if (sessionId) {
        runPlatformAction(
          {
            action: "CAPTURE_FRAUD_FRAME",
            patientId,
            userId,
            sessionId,
            kind: body.fraudSessionId ? "fraud_confirm" : "portrait",
            photoDataUrl,
            lat: body.lat,
            lon: body.lon,
            accuracy: body.accuracy,
          },
          roleForPlatform
        );
        if (!body.fraudSessionId) {
          runPlatformAction({ action: "END_FRAUD_CAMERA_SESSION", sessionId }, roleForPlatform);
        }
      }
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "ADD_INTAKE_DOCUMENT_GROUP") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      if (patient.intakeCompleted) {
        return NextResponse.json({ ok: false, error: "پس از ثبت نهایی پیش‌پذیرش، افزودن مدرک مجاز نیست." }, { status: 409 });
      }
      const documentTypeRaw = String(body.documentType ?? "").trim();
      if (!isIntakeDocumentType(documentTypeRaw)) {
        return NextResponse.json({ ok: false, error: "نوع مدرک را از فهرست انتخاب کنید." }, { status: 400 });
      }
      if (documentTypeRaw === "mammography" && patient.gender !== "زن") {
        return NextResponse.json({ ok: false, error: "ماموگرافی فقط برای سلامتجویان زن قابل ثبت است." }, { status: 400 });
      }
      const existing = patient.intakeDocuments ?? [];
      if (existing.length >= INTAKE_DOCUMENT_MAX_GROUPS) {
        return NextResponse.json(
          { ok: false, error: `حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_GROUPS)} تیپ مدرک می‌توانید اضافه کنید.` },
          { status: 400 }
        );
      }
      const rawFiles = Array.isArray(body.files) ? body.files : [];
      if (!rawFiles.length) {
        return NextResponse.json({ ok: false, error: "حداقل یک فایل انتخاب کنید." }, { status: 400 });
      }
      if (rawFiles.length > INTAKE_DOCUMENT_MAX_FILES_PER_GROUP) {
        return NextResponse.json(
          { ok: false, error: `هر تیپ مدرک حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل می‌پذیرد.` },
          { status: 400 }
        );
      }
      const noteRaw = normalizePersianInput(String(body.note ?? "").trim());
      const dateRaw = normalizePersianInput(String(body.documentDate ?? "").trim());
      const sharedDate = dateRaw ? dateRaw.slice(0, 80) : null;
      const files: PatientIntakeDocumentFile[] = [];
      for (const raw of rawFiles) {
        const parsed = normalizeIntakeFilePayload(raw, randomUUID, sharedDate);
        if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
        files.push(parsed.file);
      }
      const note = documentTypeRaw === "other" && noteRaw ? noteRaw.slice(0, 120) : null;
      const typeLabelFa =
        documentTypeRaw === "other"
          ? note || "سایر مدارک پزشکی"
          : intakeDocumentLabelFa(documentTypeRaw);
      const group: PatientIntakeDocumentGroup = {
        id: randomUUID(),
        documentType: documentTypeRaw,
        typeLabelFa,
        note,
        documentDate: null,
        files,
        uploadedAt: now.toISOString(),
      };
      mockMutations.updatePatient(patientId, { intakeDocuments: [...existing, group] });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "ADD_INTAKE_DOCUMENT_FILES") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      if (patient.intakeCompleted) {
        return NextResponse.json({ ok: false, error: "پس از ثبت نهایی پیش‌پذیرش، افزودن مدرک مجاز نیست." }, { status: 409 });
      }
      const groupId = String(body.groupId ?? "").trim();
      const existing = patient.intakeDocuments ?? [];
      const group = existing.find((g) => g.id === groupId);
      if (!group) return NextResponse.json({ ok: false, error: "گروه مدرک یافت نشد." }, { status: 404 });
      const rawFiles = Array.isArray(body.files) ? body.files : [];
      if (!rawFiles.length) {
        return NextResponse.json({ ok: false, error: "حداقل یک فایل انتخاب کنید." }, { status: 400 });
      }
      const room = INTAKE_DOCUMENT_MAX_FILES_PER_GROUP - group.files.length;
      if (room <= 0) {
        return NextResponse.json(
          { ok: false, error: `هر تیپ مدرک حداکثر ${toFaDigits(INTAKE_DOCUMENT_MAX_FILES_PER_GROUP)} فایل می‌پذیرد.` },
          { status: 400 }
        );
      }
      if (rawFiles.length > room) {
        return NextResponse.json(
          { ok: false, error: `برای این تیپ فقط ${toFaDigits(room)} فایل دیگر می‌توانید اضافه کنید.` },
          { status: 400 }
        );
      }
      const dateRaw = normalizePersianInput(String(body.documentDate ?? "").trim());
      const sharedDate = dateRaw ? dateRaw.slice(0, 80) : null;
      const added: PatientIntakeDocumentFile[] = [];
      for (const raw of rawFiles) {
        const parsed = normalizeIntakeFilePayload(raw, randomUUID, sharedDate);
        if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
        added.push(parsed.file);
      }
      mockMutations.updatePatient(patientId, {
        intakeDocuments: existing.map((g) =>
          g.id === groupId ? { ...g, files: [...g.files, ...added] } : g
        ),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "REMOVE_INTAKE_DOCUMENT_GROUP") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      if (patient.intakeCompleted) {
        return NextResponse.json({ ok: false, error: "پس از ثبت نهایی پیش‌پذیرش، حذف مدرک مجاز نیست." }, { status: 409 });
      }
      const groupId = String(body.groupId ?? "").trim();
      if (!groupId) return NextResponse.json({ ok: false, error: "شناسه مدرک نامعتبر است." }, { status: 400 });
      const existing = patient.intakeDocuments ?? [];
      if (!existing.some((g) => g.id === groupId)) {
        return NextResponse.json({ ok: false, error: "گروه مدرک یافت نشد." }, { status: 404 });
      }
      mockMutations.updatePatient(patientId, {
        intakeDocuments: existing.filter((g) => g.id !== groupId),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "REMOVE_INTAKE_DOCUMENT_FILE") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      if (patient.intakeCompleted) {
        return NextResponse.json({ ok: false, error: "پس از ثبت نهایی پیش‌پذیرش، حذف مدرک مجاز نیست." }, { status: 409 });
      }
      const groupId = String(body.groupId ?? "").trim();
      const fileId = String(body.fileId ?? "").trim();
      if (!groupId || !fileId) {
        return NextResponse.json({ ok: false, error: "شناسه فایل نامعتبر است." }, { status: 400 });
      }
      const existing = patient.intakeDocuments ?? [];
      const group = existing.find((g) => g.id === groupId);
      if (!group || !group.files.some((f) => f.id === fileId)) {
        return NextResponse.json({ ok: false, error: "فایل یافت نشد." }, { status: 404 });
      }
      const nextFiles = group.files.filter((f) => f.id !== fileId);
      mockMutations.updatePatient(patientId, {
        intakeDocuments:
          nextFiles.length === 0
            ? existing.filter((g) => g.id !== groupId)
            : existing.map((g) => (g.id === groupId ? { ...g, files: nextFiles } : g)),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "DISMISS_JOURNEY_INTRO") {
      const patientId = Number(body.patientId);
      mockMutations.updatePatient(patientId, { journeyIntroSeen: true });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "SAVE_PATIENT_INTAKE") {
      // Legacy intake save must not mark pre-admit complete — use SAVE_FORM_RESPONSE.
      return NextResponse.json(
        { ok: false, error: "ثبت پیش‌پذیرش فقط از طریق پرسشنامه منتشرشده (SAVE_FORM_RESPONSE) مجاز است." },
        { status: 410 }
      );
    }

    if (action === "SAVE_FORM_RESPONSE") {
      const patientId = Number(body.patientId);
      const patient = mockStore.patientById(patientId);
      if (!patient) return NextResponse.json({ ok: false, error: "سلامتجو یافت نشد." }, { status: 404 });
      const formId = String(body.formId ?? "");
      const form = mockStore.formById(formId);
      if (!form || form.status !== "published") {
        return NextResponse.json({ ok: false, error: "فرم منتشرشده‌ای برای ثبت یافت نشد." }, { status: 400 });
      }
      if (form.targetAudience.gender !== "همه" && form.targetAudience.gender !== patient.gender) {
        return NextResponse.json({ ok: false, error: "این فرم با جنسیت سلامتجو هم‌خوان نیست." }, { status: 409 });
      }
      const mode = body.mode === "submit" ? "submit" : "draft";
      const incomingAnswers = ((Array.isArray(body.answers) ? body.answers : []) as FormAnswer[]).map((a) => ({
        ...a,
        valueRaw: a.valueRaw == null || a.valueRaw === "" ? a.valueRaw : normalizePersianInput(String(a.valueRaw)),
        notes: a.notes == null || a.notes === "" ? a.notes : normalizePersianInput(String(a.notes)),
      }));
      const ctx = buildContext(patient, incomingAnswers, form);
      const answers = syncSkippedAnswers(form, incomingAnswers, ctx);
      const existing = [...(patient.formResponses ?? [])];
      const versionKey = formVersionId(form);
      let response = existing.find((r) => r.formId === form.id && r.formVersionId === versionKey && r.status === "draft");
      const nowIso = now.toISOString();
      if (!response) {
        response = {
          id: `fr_${randomUUID()}`,
          patientId,
          formId: form.id,
          formCode: form.code,
          formVersion: form.version,
          formVersionId: versionKey,
          status: "draft",
          startedAt: nowIso,
          updatedAt: nowIso,
          completedAt: null,
          answers,
          context: { gender: patient.gender, age: patient.age, maritalStatus: ctx.maritalStatus },
        };
        existing.push(response);
      } else {
        response.answers = answers;
        response.updatedAt = nowIso;
        response.context = { gender: patient.gender, age: patient.age, maritalStatus: ctx.maritalStatus };
      }

      if (mode === "submit") {
        const validation = validateForm(form, answers, ctx);
        if (!validation.ok) {
          return NextResponse.json({ ok: false, error: validation.message, missingCodes: validation.missingCodes }, { status: 400 });
        }
        response.status = "submitted";
        response.completedAt = nowIso;
        response.updatedAt = nowIso;
        mockMutations.updatePatient(patientId, {
          formResponses: existing.map((r) => (r.id === response!.id ? response! : r)),
          intakeCompleted: true,
          journeyIntroSeen: true,
        });
      } else {
        mockMutations.updatePatient(patientId, {
          formResponses: existing.map((r) => (r.id === response!.id ? response! : r)),
        });
      }
      return NextResponse.json({ ok: true, responseId: response.id, snapshot: await getClinicSnapshot() });
    }

    if (action === "UPSERT_FORM") {
      const form = body.form as FormDefinition | undefined;
      if (!form?.id || !form.code || !form.title) {
        return NextResponse.json({ ok: false, error: "تعریف فرم ناقص است." }, { status: 400 });
      }
      const normalized: FormDefinition = {
        ...form,
        sections: Array.isArray(form.sections) ? form.sections : [],
        items: Array.isArray(form.items) ? form.items : [],
        targetAudience: form.targetAudience ?? { gender: "همه", ageMin: null, ageMax: null, maritalStatuses: [] },
      };
      if (normalized.status === "published") {
        const codingIssues = validateFormDefinitionCoding(normalized);
        if (codingIssues.length) {
          return NextResponse.json(
            {
              ok: false,
              error: `کدینگ ناقص برای ${codingIssues.length} آیتم. هر آیتم باید UMLS و حداقل یک کد استاندارد داشته باشد.`,
              codingIssues,
            },
            { status: 400 }
          );
        }
      }
      mockMutations.upsertForm(normalized);
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "PUBLISH_FORM") {
      const formId = String(body.formId ?? "");
      const bumpVersion = Boolean(body.bumpVersion);
      const form = mockStore.formById(formId);
      if (!form) return NextResponse.json({ ok: false, error: "فرم یافت نشد." }, { status: 404 });
      const next: FormDefinition = {
        ...structuredClone(form),
        status: "published",
        version: bumpVersion ? form.version + 1 : form.version,
      };
      const codingIssues = validateFormDefinitionCoding(next);
      if (codingIssues.length) {
        return NextResponse.json(
          {
            ok: false,
            error: `انتشار ممکن نیست: ${codingIssues.length} آیتم بدون کدینگ کامل (UMLS + SNOMED/LOINC/ICD-10).`,
            codingIssues,
          },
          { status: 400 }
        );
      }
      mockMutations.upsertForm(next);
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "REORDER_FORM_ITEMS") {
      const formId = String(body.formId ?? "");
      const sectionId = String(body.sectionId ?? "");
      const orderedItemIds: string[] = Array.isArray(body.orderedItemIds) ? body.orderedItemIds.map(String) : [];
      const form = mockStore.formById(formId);
      if (!form) return NextResponse.json({ ok: false, error: "فرم یافت نشد." }, { status: 404 });
      const sectionItems = form.items.filter((i) => i.sectionId === sectionId);
      if (!orderedItemIds.length || orderedItemIds.length !== sectionItems.length || orderedItemIds.some((id) => !sectionItems.some((i) => i.id === id))) {
        return NextResponse.json({ ok: false, error: "ترتیب آیتم‌ها معتبر نیست." }, { status: 400 });
      }
      const next = structuredClone(form);
      orderedItemIds.forEach((id, index) => {
        const item = next.items.find((i) => i.id === id);
        if (item) item.sortOrder = index + 1;
      });
      mockMutations.upsertForm(next);
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "PATIENT_STATION_CHECKIN") {
      const [intakePatient] = mockStore.patients.filter((p) => p.id === Number(body.patientId));
      if (!intakePatient?.intakeCompleted) return NextResponse.json({ ok: false, error: "پیش از اعلام حضور، پرسشنامه پیش‌پذیرش امروز باید ثبت نهایی شود." }, { status: 409 });
      const hasSubmittedForm = (intakePatient.formResponses ?? []).some((r) => r.status === "submitted");
      if (!hasSubmittedForm) return NextResponse.json({ ok: false, error: "پرسشنامه پیش‌پذیرش ثبت نهایی نشده است." }, { status: 409 });
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
        doctorName: normalizePersianLetters(String(doctorName ?? "")),
        specialty: normalizePersianLetters(String(specialty ?? "")),
        chiefComplaint: normalizePersianInput(String(chiefComplaint || "معاینه تخصصی مسیر چکاپ روزانه")),
        examFindings: normalizePersianInput(String(examFindings || "معاینه بالینی انجام شد.")),
        diagnosis: normalizePersianInput(String(diagnosis ?? "")),
        prescriptions: Array.isArray(prescriptions)
          ? prescriptions.map((p: { drug?: string; dosage?: string; instruction?: string; duration?: string }) => ({
              drug: normalizePersianInput(String(p?.drug ?? "")),
              dosage: normalizePersianInput(String(p?.dosage ?? "")),
              instruction: normalizePersianInput(String(p?.instruction ?? "")),
              duration: normalizePersianInput(String(p?.duration ?? "")),
            }))
          : [],
        referralNote: referralNote ? normalizePersianInput(String(referralNote)) : null,
        createdAt: now.toISOString(),
      });

      // Visit start is CALL_PATIENT_IN; note save no longer flips station to in_progress.

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

    if (action === "CALL_PATIENT_IN") {
      if (effectiveRole === "patient" || effectiveRole === "owner") {
        return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 403 });
      }
      const station = mockStore.stationById(Number(body.stationId));
      if (!station) {
        return NextResponse.json({ ok: false, error: "ایستگاه یافت نشد." }, { status: 404 });
      }
      if (!["waiting", "checked_in"].includes(station.status)) {
        return NextResponse.json({ ok: false, error: "فقط سلامتجوی در صف یا اعلام‌حضور را می‌توان به داخل اتاق فراخواند." }, { status: 409 });
      }
      mockMutations.updateStation(station.id, { status: "in_progress", startedAt: now.toISOString() });
      const doctorLabel = normalizePersianLetters(String(body.doctorName ?? "پزشک معالج"));
      mockMutations.insertAlert({
        patientId: station.patientId,
        senderRole: doctorLabel,
        alertType: "call_in",
        message: `${doctorLabel} شما را به داخل اتاق فراخواند. لطفاً وارد ${station.roomName} شوید.`,
        isRead: false,
        createdAt: now.toISOString(),
      });
      return NextResponse.json({ ok: true, snapshot: await getClinicSnapshot() });
    }

    if (action === "ASSIGN_TO_DOCTOR_ROOM") {
      if (effectiveRole === "patient" || effectiveRole === "owner") {
        return NextResponse.json({ ok: false, error: "دسترسی مجاز نیست." }, { status: 403 });
      }
      const patientId = Number(body.patientId);
      const roomCode = String(body.roomCode ?? "");
      const patient = mockStore.patients.find((p) => p.id === patientId);
      const targetRoom = mockStore.roomByCode(roomCode);
      if (!patient || !targetRoom) {
        return NextResponse.json({ ok: false, error: "سلامتجو یا اتاق مقصد یافت نشد." }, { status: 404 });
      }
      if (targetRoom.category !== "specialist") {
        return NextResponse.json({ ok: false, error: "ارجاع مستقیم فقط به مطب پزشک (اتاق تخصصی) مجاز است." }, { status: 400 });
      }

      const stations = mockStore.stationsOf(patientId);
      const activeOther = stations.find(
        (st) =>
          st.roomCode !== roomCode &&
          (st.status === "waiting" || st.status === "checked_in" || st.status === "in_progress")
      );
      if (activeOther) {
        return NextResponse.json({
          ok: false,
          error: `سلامتجو هم‌اکنون در «${activeOther.roomName}» فعال است. ابتدا همان ایستگاه را تمام کنید یا از مدیریت صف مسیر استفاده کنید.`,
        }, { status: 409 });
      }

      const existingSame = stations.find((st) => st.roomCode === roomCode && st.status !== "completed");
      if (existingSame && (existingSame.status === "waiting" || existingSame.status === "checked_in" || existingSame.status === "in_progress")) {
        return NextResponse.json({ ok: false, error: "این سلامتجو هم‌اکنون در صف یا داخل همین مطب است." }, { status: 409 });
      }

      const roomQueue = mockStore.stations.filter(
        (s) => s.roomCode === roomCode && (s.status === "waiting" || s.status === "checked_in")
      );
      const nextRank =
        roomQueue.reduce((max, s) => Math.max(max, s.queueRank || 0), 0) + 1;

      if (existingSame && existingSame.status === "pending") {
        mockMutations.updateStation(existingSame.id, {
          status: "waiting",
          enteredQueueAt: now.toISOString(),
          queueRank: nextRank,
        });
      } else if (!existingSame) {
        const insertOrder =
          stations.reduce((max, s) => Math.max(max, s.stepOrder), 0) + 1;
        mockMutations.insertStation({
          patientId,
          roomCode: targetRoom.code,
          roomName: targetRoom.name,
          category: targetRoom.category,
          stepOrder: insertOrder,
          status: "waiting",
          enteredQueueAt: now.toISOString(),
          checkedInAt: null,
          startedAt: null,
          completedAt: null,
          spentMinutes: 0,
          addedByDoctor: "ارجاع پذیرش به مطب پزشک",
          queueRank: nextRank,
        });
      } else {
        return NextResponse.json({ ok: false, error: "وضعیت ایستگاه برای ارجاع قابل تغییر نیست." }, { status: 409 });
      }

      mockMutations.updatePatient(patientId, {
        autoOpenWayfinding: Boolean(patient.intakeCompleted),
        completedAt: null,
      });

      const sender = normalizePersianLetters(String(body.senderName ?? "پذیرش کلینیک"));
      const locationDesc = `طبقه ${toFaDigits(targetRoom.floor)}، اتاق ${targetRoom.roomNumber} (${targetRoom.name})`;
      const liveQueueText = await queueText(patientId, roomCode);
      mockMutations.insertAlert({
        patientId,
        senderRole: sender,
        alertType: "move_to_room",
        message: `پذیرش شما را به ${locationDesc} ارجاع داد. لطفاً طبق نقشه به مطب مراجعه فرمایید.${liveQueueText}`,
        isRead: false,
        createdAt: now.toISOString(),
      });

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
      const { id, role, roomCode, permissions, isActive } = body;
      const fullName = normalizePersianLetters(String(body.fullName ?? "").trim());
      const specialtyOrDept = normalizePersianLetters(String(body.specialtyOrDept ?? "").trim());
      const medicalCouncilCode = normalizePersianInput(String(body.medicalCouncilCode ?? "").trim());
      const appUserId =
        body.appUserId === null || body.appUserId === undefined || body.appUserId === ""
          ? null
          : Number(body.appUserId);
      const resolvedRoom = roomCode || null;
      if (id) {
        const member = mockStore.staff.find((s) => s.id === Number(id));
        if (member) {
          Object.assign(member, {
            fullName, role, specialtyOrDept, roomCode: resolvedRoom,
            medicalCouncilCode, permissions: permissions ?? [], isActive: isActive ?? true,
            appUserId: Number.isFinite(appUserId as number) ? appUserId : member.appUserId ?? null,
          });
        }
      } else {
        mockStore.staff.push({
          id: mockStore.staff.reduce((max, s) => Math.max(max, s.id), 0) + 1,
          fullName,
          role,
          specialtyOrDept,
          roomCode: resolvedRoom,
          medicalCouncilCode: medicalCouncilCode || "12345",
          permissions: permissions ?? [],
          isActive: true,
          appUserId: Number.isFinite(appUserId as number) ? appUserId : null,
        });
      }
      // Keep legacy room headline in sync so older UI paths stay consistent.
      if (resolvedRoom) {
        const room = mockStore.roomByCode(resolvedRoom);
        if (room) {
          Object.assign(room, {
            specialistName: fullName,
            specialtyTitle: specialtyOrDept || room.specialtyTitle,
          });
        }
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
    if (error instanceof Error && error.message === "ACTIVE_VISIT") return NextResponse.json({ ok: false, error: "این سلامتجو هم‌اکنون یک مراجعه فعال دارد؛ ابتدا مراجعه قبلی را تکمیل کنید." }, { status: 409 });
    console.error("Clinic action error:", error);
    return NextResponse.json(
      { ok: false, error: "خطا در ثبت تغییرات در پایگاه داده" },
      { status: 500 }
    );
  }
}
