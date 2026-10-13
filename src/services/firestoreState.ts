import { getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { canonicalJson, STATE_KEYS, type RemoteValues, type StateRepository } from './appStateStore';

// Separate app: data lives in datafitjac/(default), independently of Drive login.
const config = {
  apiKey: 'AIzaSyB7zEl5raOOaxBVEntvfKsSMTyrH6zbjjE',
  appId: '1:750916419580:web:411467cfcb351d2ad07c79',
  authDomain: 'datafitjac.firebaseapp.com',
  messagingSenderId: '750916419580',
  projectId: 'datafitjac',
  storageBucket: 'datafitjac.firebasestorage.app',
};
const app = getApps().find((app) => app.name === 'datafit-storage') || initializeApp(config, 'datafit-storage');
const db = getFirestore(app);

export const firestoreRepository: StateRepository = {
  listen(next, fail) {
    return onSnapshot(collection(db, 'appState'), { includeMetadataChanges: true }, (snapshot) => {
      // Never hydrate from an empty/incomplete cache or a pending local write.
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
      try {
        const values = {} as RemoteValues;
        for (const key of STATE_KEYS) {
          const entry = snapshot.docs.find((entry) => entry.id === key);
          if (!entry) { values[key] = null; continue; }
          const json = entry.data().json;
          if (typeof json !== 'string') throw new Error(`Falta el campo json en appState/${key}.`);
          values[key] = json;
        }
        next(values);
      } catch (error) { fail(error); }
    }, fail);
  },
  async commit(changes) {
    await runTransaction(db, async (transaction) => {
      const refs = changes.map((change) => doc(db, 'appState', change.key));
      // Firestore requires every read to occur before any write.
      const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
      snapshots.forEach((snapshot, index) => {
        const current = snapshot.exists() ? snapshot.data().json : null;
        if (current !== null && typeof current !== 'string') throw new Error('El formato del documento cambió.');
        if (canonicalJson(changes[index].key, current) !== changes[index].expected) {
          throw new Error('Los datos cambiaron en otra sesión. Descarga tus cambios pendientes y vuelve a cargar antes de continuar.');
        }
      });
      changes.forEach((change, index) => {
        transaction.set(refs[index], { json: change.json, updatedAt: serverTimestamp() }, { merge: true });
      });
    });
  },
};
