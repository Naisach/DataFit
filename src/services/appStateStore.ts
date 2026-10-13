// The existing database stores one JSON string per appState document.
export const STATE_KEYS = ['employees', 'inventory', 'matrix', 'movements', 'deliveries', 'config'] as const;
export type StateKey = typeof STATE_KEYS[number];
export type AppStateValues = Record<StateKey, any>;
export type RemoteValues = Record<StateKey, string | null>;
export interface StateChange { key: StateKey; expected: string | null; json: string }
export interface StateRepository {
  listen: (next: (values: RemoteValues) => void, fail: (error: unknown) => void) => () => void;
  commit: (changes: StateChange[]) => Promise<void>;
}
export interface StoreView {
  values: AppStateValues;
  ready: boolean;
  pending: boolean;
  error: string | null;
}

export function parseState(key: StateKey, json: string): any {
  const value = JSON.parse(json);
  if (key === 'config' ? !value || typeof value !== 'object' || Array.isArray(value) : !Array.isArray(value)) {
    throw new Error(`El documento appState/${key} tiene un formato inesperado.`);
  }
  return value;
}

export function canonicalJson(key: StateKey, json: string | null): string | null {
  return json === null ? null : JSON.stringify(parseState(key, json));
}

// Only explicit user changes are queued. Receiving a snapshot never writes data.
export class AppStateStore {
  private repository: StateRepository;
  private notify: (view: StoreView) => void;
  private defaults: AppStateValues;
  private values: AppStateValues;
  private baseline = {} as RemoteValues;
  private dirty = new Set<StateKey>();
  private ready = false;
  private error: string | null = null;
  private saving = false;
  private active = true;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private loadTimer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(repository: StateRepository, defaults: AppStateValues, notify: (view: StoreView) => void) {
    this.repository = repository;
    this.defaults = defaults;
    this.values = defaults;
    this.notify = notify;
  }

  start() {
    this.loadTimer = setTimeout(() => {
      if (!this.ready) this.fail(new Error('No se pudo conectar a Firestore. Revisa tu conexión y vuelve a cargar.'));
    }, 15000);
    this.unsubscribe = this.repository.listen((remote) => {
      if (!this.active) return;
      try {
        // Validate the whole snapshot before replacing any in-memory data.
        const parsed = {} as AppStateValues;
        for (const key of STATE_KEYS) {
          parsed[key] = remote[key] === null ? this.defaults[key] : parseState(key, remote[key]);
        }
        const next = { ...this.values };
        for (const key of STATE_KEYS) {
          if (this.dirty.has(key)) continue;
          next[key] = parsed[key];
          this.baseline[key] = canonicalJson(key, remote[key]);
        }
        this.values = next;
        this.ready = true;
        clearTimeout(this.loadTimer);
        this.emit();
      } catch (error) { this.fail(error); }
    }, (error) => this.fail(error));
  }

  update(key: StateKey, update: any) {
    if (!this.active || !this.ready || this.error) return;
    const value = typeof update === 'function' ? update(this.values[key]) : update;
    const json = JSON.stringify(value);
    parseState(key, json);
    if (json === JSON.stringify(this.values[key])) return;
    this.values = { ...this.values, [key]: value };
    this.dirty.add(key);
    this.emit();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, 250);
  }

  // One transaction persists all documents changed by the same UI operation.
  async flush() {
    clearTimeout(this.timer);
    if (!this.active || this.saving || this.error || !this.dirty.size) return;
    this.saving = true;
    const changes = [...this.dirty].map((key) => ({
      key, expected: this.baseline[key], json: JSON.stringify(this.values[key]),
    }));
    try {
      await this.repository.commit(changes);
      if (!this.active) return;
      for (const change of changes) {
        this.baseline[change.key] = change.json;
        if (JSON.stringify(this.values[change.key]) === change.json) this.dirty.delete(change.key);
      }
    } catch (error) { this.fail(error); }
    finally {
      this.saving = false;
      if (this.active) {
        this.emit();
        if (this.dirty.size && !this.error) this.timer = setTimeout(() => { void this.flush(); }, 250);
      }
    }
  }

  private fail(error: unknown) {
    if (!this.active) return;
    clearTimeout(this.timer);
    clearTimeout(this.loadTimer);
    this.error = error instanceof Error ? error.message : 'No se pudieron sincronizar los datos con Firestore.';
    this.emit();
  }

  private emit() {
    this.notify({ values: this.values, ready: this.ready, pending: this.dirty.size > 0, error: this.error });
  }

  stop() {
    this.active = false;
    clearTimeout(this.timer);
    clearTimeout(this.loadTimer);
    this.unsubscribe?.();
  }
}
