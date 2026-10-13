import test from 'node:test';
import assert from 'node:assert/strict';
import { AppStateStore, STATE_KEYS, canonicalJson } from '../src/services/appStateStore.ts';

const defaults = () => ({ employees: [], inventory: [], matrix: [], movements: [], deliveries: [], config: {} });
function fixture() {
  const remote = Object.fromEntries(STATE_KEYS.map(key => [key, JSON.stringify(defaults()[key])]));
  remote.employees = JSON.stringify([{ id: 'existing-worker', fullName: 'Trabajador existente' }]);
  const commits = [];
  let next, fail, view;
  const repository = {
    listen(onNext, onFail) { next = onNext; fail = onFail; return () => {}; },
    async commit(changes) {
      for (const change of changes) {
        if (canonicalJson(change.key, remote[change.key]) !== change.expected) throw new Error('Conflicto de otra sesión');
      }
      commits.push(changes);
      for (const change of changes) remote[change.key] = change.json;
      next({ ...remote });
    },
  };
  const store = new AppStateStore(repository, defaults(), value => { view = value; });
  store.start();
  return { store, remote, commits, repository, hydrate: () => next({ ...remote }), fail: error => fail(error), get view() { return view; } };
}

test('initial load and a reload recover stored workers without any write', async () => {
  const f = fixture();
  try {
    f.store.update('employees', []); // Editing before the first server snapshot is blocked.
    f.hydrate();
    await f.store.flush();
    assert.equal(f.view.values.employees[0].id, 'existing-worker');
    assert.equal(f.commits.length, 0);
    f.hydrate();
    await f.store.flush();
    assert.equal(f.commits.length, 0);
  } finally { f.store.stop(); }
});

test('missing cloud documents stay empty and are never automatically seeded', async () => {
  const f = fixture();
  try {
    f.remote.employees = null;
    f.hydrate();
    await f.store.flush();
    assert.deepEqual(f.view.values.employees, []);
    assert.equal(f.remote.employees, null);
    assert.equal(f.commits.length, 0);
  } finally { f.store.stop(); }
});

test('explicit edits save only changed documents and retain existing workers', async () => {
  const f = fixture();
  try {
    f.hydrate();
    f.store.update('employees', previous => [...previous, { id: 'new-worker' }]);
    f.store.update('movements', [{ id: 'movement-1' }]);
    await f.store.flush();
    assert.equal(f.commits.length, 1);
    assert.deepEqual(f.commits[0].map(change => change.key), ['employees', 'movements']);
    assert.equal(JSON.parse(f.remote.employees).length, 2);
    assert.equal(f.view.pending, false);
    f.hydrate();
    await f.store.flush();
    assert.equal(f.commits.length, 1); // Receiving our own snapshot causes no write loop.
  } finally { f.store.stop(); }
});

test('a concurrent change is preserved and local edits remain available for download', async () => {
  const f = fixture();
  try {
    f.hydrate();
    f.store.update('employees', previous => [...previous, { id: 'local-worker' }]);
    f.remote.employees = JSON.stringify([{ id: 'worker-from-other-session' }]);
    f.hydrate();
    await f.store.flush();
    assert.match(f.view.error, /Conflicto/);
    assert.equal(f.view.values.employees[1].id, 'local-worker');
    assert.equal(JSON.parse(f.remote.employees)[0].id, 'worker-from-other-session');
    assert.equal(f.commits.length, 0);
    f.store.update('employees', []);
    await f.store.flush();
    assert.equal(f.commits.length, 0);
  } finally { f.store.stop(); }
});

test('invalid JSON stops load without replacing or uploading cloud records', async () => {
  const f = fixture();
  try {
    f.remote.inventory = 'invalid-json';
    f.hydrate();
    assert.equal(f.view.ready, false);
    assert.ok(f.view.error);
    f.store.update('employees', []);
    await f.store.flush();
    assert.equal(f.commits.length, 0);
  } finally { f.store.stop(); }
});

test('read errors block editing and writing', async () => {
  const f = fixture();
  try {
    f.fail(new Error('permission-denied'));
    f.store.update('employees', []);
    await f.store.flush();
    assert.equal(f.view.ready, false);
    assert.equal(f.view.error, 'permission-denied');
    assert.equal(f.commits.length, 0);
  } finally { f.store.stop(); }
});

test('edits while a save is pending are kept for the next save', async () => {
  const f = fixture();
  try {
    f.hydrate();
    const originalCommit = f.repository.commit;
    let finish;
    f.repository.commit = async changes => {
      await new Promise(resolve => { finish = resolve; });
      return originalCommit(changes);
    };
    f.store.update('employees', previous => [...previous, { id: 'first' }]);
    const saving = f.store.flush();
    f.store.update('employees', previous => [...previous, { id: 'second' }]);
    finish();
    await saving;
    assert.equal(f.view.pending, true);
    f.repository.commit = originalCommit;
    await f.store.flush();
    assert.equal(JSON.parse(f.remote.employees).length, 3);
    assert.equal(f.view.pending, false);
  } finally { f.store.stop(); }
});
