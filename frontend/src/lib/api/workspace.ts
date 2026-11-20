/*
 File: frontend/src/lib/api/workspace.ts
 Description: bootstrap سبک workspace از API (جایگزین getClinicSnapshot/mock)
 Parent Dependencies: api/http, mock-platform defaults فقط برای ساختار خالی platform
 */

import { fetchClinicContracts } from "@/lib/api/contracts";
import { fetchClinicForms } from "@/lib/api/forms";
import { apiFetch } from "@/lib/api/http";
import { DEFAULT_OSM_LOCAL, DEFAULT_PLATFORM_SETTINGS } from "@/lib/mock-platform";
import type { ClinicSnapshot, CorporateContract, FormDefinition, PlatformState } from "@/types/clinic";

interface ClinicDto {
  id: string;
  name: string;
  city: string;
  status: string;
  isCurrentTenant: boolean;
}

function emptyPlatform(clinic: ClinicDto | null): PlatformState {
  return {
    clinics: clinic
      ? [
          {
            id: clinic.id,
            name: clinic.name,
            city: clinic.city,
            status: (clinic.status?.toLowerCase() as "active") || "active",
            plan: "v1",
            adminContact: "",
            adminPhone: "",
            patientsToday: 0,
            staffCount: 0,
            contractsCount: 0,
            createdAt: new Date().toISOString(),
            isCurrentTenant: clinic.isCurrentTenant,
          },
        ]
      : [],
    users: [],
    photos: [],
    packages: [],
    fraudSessions: [],
    authSessions: [],
    multiSessionAlerts: [],
    health: [],
    integrations: [],
    audit: [],
    settings: {
      ...DEFAULT_PLATFORM_SETTINGS,
      osmLocal: { ...DEFAULT_OSM_LOCAL },
    },
  };
}

interface ApiUserDto {
  id: string;
  fullName: string;
  mobile: string;
  nationalId?: string | null;
  isActive: boolean;
  roles: string[];
}

function mapApiRoleToPrimary(roles: string[]): PlatformState["users"][number]["primaryRole"] {
  if (roles.includes("Platform")) return "platform";
  if (roles.includes("Admin")) return "clinic_admin";
  if (roles.includes("Specialist")) return "staff";
  if (roles.includes("Supervisor")) return "supervisor";
  return "patient";
}

const ROLE_LABEL: Record<string, string> = {
  platform: "ادمین کل",
  clinic_admin: "ادمین کلینیک",
  staff: "کادر درمان",
  patient: "سلامتجو",
  supervisor: "ناظر سازمان",
};

/** بارگذاری اسکلت snapshot از سرور؛ لیست‌های عملیاتی غیر-v1 خالی می‌مانند. */
export async function loadWorkspaceSnapshot(): Promise<ClinicSnapshot> {
  let clinic: ClinicDto | null = null;
  try {
    clinic = await apiFetch<ClinicDto>("/api/clinics/current");
  } catch {
    clinic = null;
  }

  const platform = emptyPlatform(clinic);
  try {
    const users = await apiFetch<ApiUserDto[]>("/api/users");
    platform.users = users.map((u) => {
      const primaryRole = mapApiRoleToPrimary(u.roles ?? []);
      return {
        id: u.id,
        userId: null,
        patientId: null,
        fullName: u.fullName,
        phone: u.mobile,
        nationalId: u.nationalId ?? "",
        email: "",
        clinicId: clinic?.id ?? "",
        roleLabel: ROLE_LABEL[primaryRole] ?? primaryRole,
        primaryRole,
        notes: "",
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        profilePhotoDataUrl: null,
        lastGps: null,
        gpsHistory: [],
        isActive: u.isActive,
      };
    });
  } catch {
    /* Admin/Platform فقط؛ نقش‌های دیگر خالی می‌ماند */
  }

  let contracts: CorporateContract[] = [];
  let forms: FormDefinition[] = [];
  if (clinic?.id) {
    try {
      contracts = await fetchClinicContracts(clinic.id);
      const current = platform.clinics.find((c) => c.isCurrentTenant);
      if (current) current.contractsCount = contracts.length;
    } catch {
      /* Supervisor/Admin؛ نقش‌های بدون دسترسی خالی می‌ماند */
    }
    try {
      forms = await fetchClinicForms(clinic.id);
    } catch {
      /* Owner/Admin/Specialist؛ در صورت 403 خالی */
    }
  }

  return {
    clinicLocation: {
      lat: 35.7,
      lon: 51.4,
      address: clinic?.name ? `${clinic.name} — ${clinic.city}` : "کلینیک",
      city: clinic?.city ?? "تهران",
    },
    packageRuleLibrary: [],
    rooms: [],
    links: [],
    pathways: [],
    staff: [],
    patients: [],
    contracts,
    forms,
    platform,
    serverTime: new Date().toISOString(),
  };
}
