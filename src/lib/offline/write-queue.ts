'use client';

/**
 * Persistent write queue for a flaky venue network (UAE-23).
 *
 * The arena's internet drops and crawls, so a synchronous write hangs the UI
 * and a failed one is lost. Every mutation goes through here instead: it is
 * applied optimistically in the UI, enqueued in IndexedDB, and flushed to the
 * server whenever the network is up — surviving reloads and reconnects.
 *
 * The queue is a durable log of intents, not a general sync engine: each op
 * names a handler (registered at startup) and carries a plain-JSON payload.
 * Handlers must be idempotent — an op can be retried after a reload.
 */

export interface QueuedOp {
  id: string;
  /** Registered handler key, e.g. 'task.setStatus'. */
  kind: string;
  payload: unknown;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

type Handler = (payload: unknown) => Promise<void>;

const DB_NAME = 'uaew-offline';
const STORE = 'write-queue';
const handlers = new Map<string, Handler>();
const listeners = new Set<(state: QueueState) => void>();

export interface QueueState {
  pending: number;
  online: boolean;
  flushing: boolean;
  lastError: string | null;
}

let state: QueueState = { pending: 0, online: true, flushing: false, lastError: null };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function allOps(): Promise<QueuedOp[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const out: QueuedOp[] = [];
    const cursor = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        out.push(c.value as QueuedOp);
        c.continue();
      } else {
        out.sort((a, b) => a.createdAt - b.createdAt);
        resolve(out);
      }
    };
    cursor.onerror = () => reject(cursor.error);
  });
}

function emit() {
  for (const l of listeners) l(state);
}

async function refreshPending() {
  try {
    const count = (await allOps()).length;
    state = { ...state, pending: count };
    emit();
  } catch {
    /* IndexedDB unavailable — nothing to report */
  }
}

/** Register the handler that actually performs an op of `kind`. Idempotent. */
export function registerHandler(kind: string, handler: Handler) {
  handlers.set(kind, handler);
}

export function subscribeQueue(fn: (s: QueueState) => void): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

/** Enqueue an op and try to flush immediately. The UI has already updated. */
export async function enqueue(kind: string, payload: unknown): Promise<void> {
  const op: QueuedOp = {
    id: `${kind}-${cryptoRandom()}`,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx('readwrite', (s) => s.put(op));
  await refreshPending();
  void flush();
}

let flushing = false;

/** Drain the queue oldest-first, stopping on the first network failure. */
export async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;
  state = { ...state, flushing: true };
  emit();
  try {
    const ops = await allOps();
    for (const op of ops) {
      const handler = handlers.get(op.kind);
      if (!handler) continue; // handler not registered this session — leave it
      try {
        await handler(op.payload);
        await tx('readwrite', (s) => s.delete(op.id));
        state = { ...state, lastError: null };
      } catch (err) {
        // Stop on first failure: order matters and the network is likely down.
        op.attempts += 1;
        op.lastError = err instanceof Error ? err.message : String(err);
        await tx('readwrite', (s) => s.put(op));
        state = { ...state, lastError: op.lastError };
        break;
      }
    }
  } finally {
    flushing = false;
    state = { ...state, flushing: false };
    await refreshPending();
  }
}

function cryptoRandom(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Wire up online/offline flushing. Call once, client-side. */
export function initWriteQueue() {
  if (typeof window === 'undefined') return;
  const setOnline = (online: boolean) => {
    state = { ...state, online };
    emit();
    if (online) void flush();
  };
  window.addEventListener('online', () => setOnline(true));
  window.addEventListener('offline', () => setOnline(false));
  state = { ...state, online: navigator.onLine };
  void refreshPending();
  void flush();
  // A slow drop doesn't fire 'offline'; retry on a timer as a safety net.
  setInterval(() => { if (navigator.onLine) void flush(); }, 20_000);
}
