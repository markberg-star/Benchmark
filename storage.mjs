import { validateState } from './model.mjs';

// Keep the database name stable across app releases. Cache updates never touch it.
const DATABASE_NAME = `setline-local:${new URL('./', import.meta.url).pathname}`;
const DATABASE_VERSION = 1;
const STORE = 'state';
const KEY = 'current';
let connection;
let opening;
let queue = Promise.resolve();
let expectedRevision = null;

function unpack(record) {
  if (record === undefined) return { revision: 0, data: undefined };
  if (record && Number.isSafeInteger(record.storageRevision) && record.storageRevision > 0 && record.data) return { revision: record.storageRevision, data: record.data };
  // Older v1 installations may store plain state; validate it before any migration.
  return { revision: 0, data: record };
}

function openStorage() {
  if (connection) return Promise.resolve(connection);
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Local storage is unavailable. Open this app in normal Safari, not a private or restricted browser.')); return; }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = event => {
      // Only create stores on first install. Future versions must migrate in place.
      if (event.oldVersion === 0) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => {
      connection = request.result;
      connection.onversionchange = () => { connection?.close(); connection = null; };
      resolve(connection);
    };
    request.onerror = () => reject(new Error(`Your saved workouts could not be opened. Nothing was erased. ${request.error?.message || ''}`));
    request.onblocked = () => reject(new Error('Close other tabs of this app and reopen it to finish the storage update. Your records were not erased.'));
  }).finally(() => { opening = null; });
  return opening;
}

export async function loadState() {
  await queue;
  const db = await openStorage();
  const data = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(KEY);
    let value;
    request.onsuccess = () => { value = request.result; };
    transaction.oncomplete = () => resolve(value);
    transaction.onerror = () => reject(new Error(`Your saved workouts could not be read. ${transaction.error?.message || ''}`));
    transaction.onabort = () => reject(new Error('Reading your saved workouts was interrupted. Please reopen the app.'));
  });
  // Undefined means first use. Corrupt or newer records throw instead of silently resetting.
  const stored = unpack(data);
  const clean = stored.data === undefined ? null : validateState(stored.data);
  expectedRevision = stored.revision;
  return clean;
}

export function saveState(state) {
  // Snapshot and validate synchronously before the write joins the queue.
  let snapshot;
  try { snapshot = validateState(state); } catch (error) { return Promise.reject(error); }
  const operation = queue.then(async () => {
    const db = await openStorage();
    await new Promise((resolve, reject) => {
      let transaction;
      try { transaction = db.transaction(STORE, 'readwrite', { durability: 'strict' }); }
      catch { transaction = db.transaction(STORE, 'readwrite'); }
      const objectStore = transaction.objectStore(STORE);
      let failure;
      let committedRevision;
      const currentRequest = objectStore.get(KEY);
      currentRequest.onsuccess = () => {
        const current = unpack(currentRequest.result);
        // Compare and write inside one IDB transaction, including across Safari tabs.
        // A stale tab can export its unsaved copy, but cannot overwrite newer records.
        if ((expectedRevision === null && current.data !== undefined) || (expectedRevision !== null && current.revision !== expectedRevision)) {
          failure = new Error('Another window saved newer records. Export your unsaved copy, then reload this window before making more changes.');
          failure.code = 'STALE_STORAGE';
          transaction.abort();
          return;
        }
        committedRevision = current.revision + 1;
        objectStore.put({ storageRevision: committedRevision, data: snapshot }, KEY);
      };
      // Success is the committed transaction, not merely a successful put request.
      transaction.oncomplete = () => { expectedRevision = committedRevision; resolve(); };
      transaction.onerror = () => reject(new Error(`Changes could not be saved on this device. Export your data now. ${transaction.error?.message || ''}`));
      transaction.onabort = () => reject(failure || new Error('Saving was interrupted. Export your data before closing this page.'));
    });
  });
  // Failed writes remain visible to their caller, but do not permanently block later retries.
  queue = operation.catch(() => {});
  return operation;
}

export async function flushStorage() { await queue; }
export async function closeStorage() { await queue; connection?.close(); connection = null; }
export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;
  try { return (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch { return false; }
}
