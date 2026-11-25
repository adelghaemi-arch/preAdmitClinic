/*
 File: frontend/my/src/lib/__tests__/uc-adm-25.clinic-stations.test.ts
 Description: UC-ADM-25 — ناوبری rooms + فیلتر ایستگاه فعال + نگاشت DTO
 Parent Dependencies: workspace, clinic-stations
 */

import { describe, expect, it } from "vitest";
import {
  activeClinicRooms,
  mapClinicStationToRoom,
  type ApiClinicStationDto,
} from "@/lib/api/clinic-stations";
import { allowedPagesFor, NON_V1_PAGES, ROLE_NAV } from "@/lib/workspace";
import type { RoomDto } from "@/types/clinic";

describe("UC-ADM-25", () => {
  it("صفحه rooms در ناوبری ادمین و پلتفرم است و از NON_V1 خارج شده", () => {
    expect(NON_V1_PAGES).not.toContain("rooms");
    expect(allowedPagesFor("admin")).toContain("rooms");
    expect(allowedPagesFor("platform")).toContain("rooms");
    expect(ROLE_NAV.admin.labels?.rooms).toBe("ایستگاه‌ها و اتاق‌ها");
    expect(ROLE_NAV.platform.labels?.rooms).toBe("ایستگاه‌ها و اتاق‌ها");
  });

  it("activeClinicRooms فقط ایستگاه‌های فعال را نگه می‌دارد", () => {
    const rooms: RoomDto[] = [
      {
        id: 1,
        code: "LAB",
        name: "آزمایشگاه",
        category: "paraclinic",
        floor: 1,
        roomNumber: "۱۰۲",
        specialistName: "",
        specialtyTitle: "",
        prepInstructions: "",
        wayfindingSteps: "",
        mapX: 0,
        mapY: 0,
        avgServiceMinutes: 15,
        isActive: true,
      },
      {
        id: 2,
        code: "ECG",
        name: "نوار قلب",
        category: "paraclinic",
        floor: 2,
        roomNumber: "۲۰۴",
        specialistName: "",
        specialtyTitle: "",
        prepInstructions: "",
        wayfindingSteps: "",
        mapX: 0,
        mapY: 0,
        avgServiceMinutes: 15,
        isActive: false,
      },
      {
        id: 3,
        code: "CARDIO",
        name: "قلب",
        category: "specialist",
        floor: 2,
        roomNumber: "۲۰۱",
        specialistName: "",
        specialtyTitle: "",
        prepInstructions: "",
        wayfindingSteps: "",
        mapX: 0,
        mapY: 0,
        avgServiceMinutes: 15,
      },
    ];
    const active = activeClinicRooms(rooms);
    expect(active.map((r) => r.code)).toEqual(["LAB", "CARDIO"]);
  });

  it("mapClinicStationToRoom فیلدهای سرور را به RoomDto می‌برد", () => {
    const dto: ApiClinicStationDto = {
      id: "11111111-1111-1111-1111-111111111111",
      code: "LAB",
      titleFa: "آزمایشگاه تشخیص طبی",
      category: "paraclinic",
      floor: 1,
      roomNumber: "۱۰۲",
      prepInstructions: "ناشتا",
      wayfindingSteps: "لابی به چپ",
      isActive: true,
      sortOrder: 1,
    };
    const room = mapClinicStationToRoom(dto);
    expect(room.serverId).toBe(dto.id);
    expect(room.code).toBe("LAB");
    expect(room.name).toBe("آزمایشگاه تشخیص طبی");
    expect(room.isActive).toBe(true);
    expect(room.prepInstructions).toBe("ناشتا");
  });
});
