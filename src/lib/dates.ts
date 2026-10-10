const pad = (n: number) => String(n).padStart(2, '0');

export interface DateRange {
  from: string;
  to: string;
}

export function monthRange(month: string): DateRange {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export const monthToDate = (month: string) => `${month}-01`;
