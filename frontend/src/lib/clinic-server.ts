import { mockStore } from "@/lib/mock-store";
import type { ClinicSnapshot, StationStatus } from "@/types/clinic";

/**
 * Builds the clinic snapshot from the in-memory mock store.
 * Queue estimates are computed here (before any privacy scoping) so the numbers
 * stay consistent everywhere: kanban boards, patient dashboards and alerts.
 */
export async function getClinicSnapshot(): Promise<ClinicSnapshot> {
  const rooms = mockStore.rooms;
  const stations = mockStore.stations;
  const patients = mockStore.patients;
  const notes = mockStore.notes;
  const results = mockStore.results;
  const alerts = mockStore.alerts;
  const links = mockStore.links;
  const clinicLocation = mockStore.clinicLocation;

  const queueEstimates = new Map<number, { ahead: number; minutes: number }>();
  for (const room of rooms) {
    const queue = stations
      .filter((s) => s.roomCode === room.code && (s.status === "waiting" || s.status === "checked_in"))
      .sort((a, b) => {
        const ar = a.queueRank || Number.MAX_SAFE_INTEGER;
        const br = b.queueRank || Number.MAX_SAFE_INTEGER;
        return ar !== br ? ar - br : new Date(a.enteredQueueAt ?? 0).getTime() - new Date(b.enteredQueueAt ?? 0).getTime();
      });
    const inProgress = stations.filter((s) => s.roomCode === room.code && s.status === "in_progress").length;
    const completed = stations.filter((s) => s.roomCode === room.code && s.status === "completed" && s.spentMinutes > 0);
    const average = completed.length
      ? Math.max(1, Math.round(completed.reduce((sum, s) => sum + s.spentMinutes, 0) / completed.length))
      : room.avgServiceMinutes;
    queue.forEach((st, index) => {
      queueEstimates.set(st.id, {
        ahead: index + inProgress,
        minutes: Math.round(index * average + inProgress * average * 0.5),
      });
    });
  }

  const enrichedPatients = patients.map((p) => {
    const patientStations = stations
      .filter((s) => s.patientId === p.id)
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({
        id: s.id,
        patientId: s.patientId,
        roomCode: s.roomCode,
        roomName: s.roomName,
        category: s.category,
        stepOrder: s.stepOrder,
        status: s.status as StationStatus,
        enteredQueueAt: s.enteredQueueAt,
        checkedInAt: s.checkedInAt,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        spentMinutes: s.spentMinutes,
        addedByDoctor: s.addedByDoctor,
        queueRank: s.queueRank,
        queueAhead: queueEstimates.get(s.id)?.ahead ?? 0,
        estimatedWaitMinutes: queueEstimates.get(s.id)?.minutes ?? 0,
      }));

    return {
      id: p.id,
      qrToken: p.qrToken,
      fullName: p.fullName,
      nationalId: p.nationalId,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      pathwayTitle: p.pathwayTitle,
      checkInTime: p.checkInTime,
      completedAt: p.completedAt,
      intakeCompleted: p.intakeCompleted,
      medications: p.medications ?? [],
      surgeries: p.surgeries ?? [],
      familyHistory: p.familyHistory ?? [],
      allergies: p.allergies ?? [],
      recentConditions: p.recentConditions ?? [],
      intakeAnswers: p.intakeAnswers,
      autoOpenWayfinding: p.autoOpenWayfinding,
      homeLat: p.homeLat ?? null,
      homeLon: p.homeLon ?? null,
      homeAddress: p.homeAddress ?? null,
      stations: patientStations,
      clinicalNotes: notes
        .filter((n) => n.patientId === p.id)
        .map((n) => ({
          id: n.id,
          patientId: n.patientId,
          stationId: n.stationId,
          roomCode: n.roomCode,
          doctorName: n.doctorName,
          specialty: n.specialty,
          chiefComplaint: n.chiefComplaint,
          examFindings: n.examFindings,
          diagnosis: n.diagnosis,
          prescriptions: n.prescriptions ?? [],
          referralNote: n.referralNote,
          createdAt: n.createdAt,
        })),
      paraclinicResults: results
        .filter((r) => r.patientId === p.id)
        .map((r) => ({
          id: r.id,
          patientId: r.patientId,
          stationId: r.stationId,
          roomCode: r.roomCode,
          title: r.title,
          resultType: r.resultType,
          operatorName: r.operatorName,
          summaryStatus: r.summaryStatus,
          metrics: r.metrics ?? [],
          interpretation: r.interpretation,
          attachmentUrl: r.attachmentUrl,
          fileName: r.fileName,
          createdAt: r.createdAt,
        })),
      alerts: alerts
        .filter((a) => a.patientId === p.id)
        .map((a) => ({
          id: a.id,
          patientId: a.patientId,
          senderRole: a.senderRole,
          alertType: a.alertType,
          message: a.message,
          isRead: a.isRead,
          createdAt: a.createdAt,
        })),
    };
  });

  return {
    rooms,
    links: links.map((l) => ({
      id: l.id,
      userId: l.userId,
      patientId: l.patientId,
      relationship: l.relationship,
      permission: l.permission,
      visibility: l.visibility,
    })),
    pathways: mockStore.pathways,
    staff: mockStore.staff,
    patients: enrichedPatients,
    clinicLocation: { ...clinicLocation },
    packageRuleLibrary: JSON.parse(JSON.stringify(mockStore.packageRuleLibrary)),
    contracts: JSON.parse(JSON.stringify(mockStore.contracts)),
    serverTime: new Date().toISOString(),
  };
}
