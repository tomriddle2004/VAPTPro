import { ScheduledScan, ScanType, ScheduleFrequency } from '@/types';

const SCHEDULER_KEY = 'vapt_schedules';

function loadSchedules(): ScheduledScan[] {
  try {
    const raw = localStorage.getItem(SCHEDULER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSchedules(schedules: ScheduledScan[]): void {
  localStorage.setItem(SCHEDULER_KEY, JSON.stringify(schedules));
}

export function computeNextRun(
  frequency: ScheduleFrequency,
  time: string,
  day_of_week?: number,
  day_of_month?: number,
): string {
  const now = new Date();
  const [h, m] = time.split(':').map(Number);

  if (frequency === 'daily') {
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.toISOString();
  }

  if (frequency === 'weekly') {
    const target = day_of_week ?? 1;
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    let daysUntil = (target - now.getDay() + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
    return next.toISOString();
  }

  // monthly
  const dom = day_of_month ?? 1;
  let next = new Date(now.getFullYear(), now.getMonth(), dom, h, m, 0, 0);
  if (next <= now) next = new Date(now.getFullYear(), now.getMonth() + 1, dom, h, m, 0, 0);
  return next.toISOString();
}

// Compute all scheduled occurrences for a schedule within a date range
export function getOccurrencesInRange(schedule: ScheduledScan, startDate: Date, endDate: Date): Date[] {
  const occurrences: Date[] = [];
  const [h, m] = schedule.time.split(':').map(Number);
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= endDate) {
    let matches = false;
    const d = new Date(cursor);
    d.setHours(h, m, 0, 0);

    if (schedule.frequency === 'daily') {
      matches = true;
    } else if (schedule.frequency === 'weekly') {
      matches = cursor.getDay() === (schedule.day_of_week ?? 1);
    } else if (schedule.frequency === 'monthly') {
      matches = cursor.getDate() === (schedule.day_of_month ?? 1);
    }

    if (matches && d >= startDate && d <= endDate) occurrences.push(d);
    cursor.setDate(cursor.getDate() + 1);
  }

  return occurrences;
}

export function getAllSchedules(): ScheduledScan[] {
  return loadSchedules().sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime());
}

export function createSchedule(
  data: Omit<ScheduledScan, 'id' | 'created_at' | 'next_run' | 'run_count'>
): ScheduledScan {
  const schedule: ScheduledScan = {
    ...data,
    id: `sched-${Date.now()}`,
    created_at: new Date().toISOString(),
    next_run: computeNextRun(data.frequency, data.time, data.day_of_week, data.day_of_month),
    run_count: 0,
  };
  const all = loadSchedules();
  all.push(schedule);
  saveSchedules(all);
  return schedule;
}

export function updateSchedule(id: string, updates: Partial<ScheduledScan>): void {
  const all = loadSchedules();
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates };
  // Recompute next_run if scheduling params changed
  if (updates.frequency || updates.time || updates.day_of_week !== undefined || updates.day_of_month !== undefined) {
    all[idx].next_run = computeNextRun(all[idx].frequency, all[idx].time, all[idx].day_of_week, all[idx].day_of_month);
  }
  saveSchedules(all);
}

export function deleteSchedule(id: string): void {
  saveSchedules(loadSchedules().filter(s => s.id !== id));
}

export function markRan(id: string): void {
  const all = loadSchedules();
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return;
  all[idx].last_run = new Date().toISOString();
  all[idx].run_count = (all[idx].run_count ?? 0) + 1;
  all[idx].next_run = computeNextRun(all[idx].frequency, all[idx].time, all[idx].day_of_week, all[idx].day_of_month);
  saveSchedules(all);
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
