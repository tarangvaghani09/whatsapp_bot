export function parseAppointmentDateTime(requestedDate?: string | null, requestedTime?: string | null): Date | null {
  if (!requestedDate || !requestedTime) return null;

  const date = parseDate(requestedDate.trim());
  const time = parseTime(requestedTime.trim());
  if (!date || !time) return null;

  return new Date(
    date.year,
    date.month - 1,
    date.day,
    time.hour24,
    time.minute,
    0,
    0,
  );
}

function parseDate(value: string): { year: number; month: number; day: number } | null {
  const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (!isValidDate(year, month, day)) return null;
    return { year, month, day };
  }

  const dmy = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (!isValidDate(year, month, day)) return null;
    return { year, month, day };
  }

  return null;
}

function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function parseTime(value: string): { hour24: number; minute: number } | null {
  const clean = value.toLowerCase().replace(/\s+/g, "");
  const m12 = clean.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (m12) {
    const h = Number(m12[1]);
    const min = Number(m12[2] ?? "00");
    if (h < 1 || h > 12 || min < 0 || min > 59) return null;
    let hour24 = h % 12;
    if (m12[3] === "pm") hour24 += 12;
    return { hour24, minute: min };
  }

  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hour24 = Number(m24[1]);
    const minute = Number(m24[2]);
    if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;
    return { hour24, minute };
  }

  return null;
}

export function formatDisplayTime(date: Date): string {
  const minute = String(date.getMinutes()).padStart(2, "0");
  const meridian = date.getHours() >= 12 ? "PM" : "AM";
  let hour = date.getHours() % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${meridian}`;
}

