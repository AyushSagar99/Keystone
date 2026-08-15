import { Checkout } from './api';

const STORAGE_KEY = 'keystone-session-checkouts';

export function loadSessionCheckouts(): Checkout[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Checkout[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSessionCheckouts(checkouts: Checkout[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(checkouts));
}

export function clearSessionCheckouts() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
