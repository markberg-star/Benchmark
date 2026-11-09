/* Benchmark data model. No networking, storage side effects, or personal seed data. */
export const SCHEMA_VERSION = 1;
export const BACKUP_FORMAT = 'benchmark-backup';
export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const MODES = new Set(['per-dumbbell', 'machine-total', 'total', 'bodyweight', 'assistance']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export const clone = value => structuredClone(value);
export const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
const now = () => new Date().toISOString();
function fail(message) { throw new Error(message); }
function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`);
  if (own(value, '__proto__') || own(value, 'constructor') || own(value, 'prototype')) fail(`${label} contains unsupported fields.`);
  return value;
}
function text(value, label, max = 160) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) fail(`${label} must be text between 1 and ${max} characters.`);
  return value;
}
function id(value, label = 'Identifier') { return text(value, label, 160); }
function list(value, label, max) {
  if (!Array.isArray(value) || value.length > max) fail(`${label} must be a list with no more than ${max} items.`);
  return value;
}
function unique(items, field, label) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item[field])) fail(`${label} contains duplicate identifiers.`);
    ids.add(item[field]);
  }
  return ids;
}
function number(value, label, { nullable = false, integer = false, min = 0, max = 100000 } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${label} must be ${integer ? 'a whole number' : 'a number'} from ${min} to ${max}.`);
  return value;
}
function date(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) fail(`${label} is not a valid date.`);
  return value;
}
function boolean(value, label) {
  if (typeof value !== 'boolean') fail(`${label} must be true or false.`);
  return value;
}
function catalogItem(value) {
  object(value, 'Exercise');
  if (!MODES.has(value.weightMode)) fail('Exercise has an unsupported weight convention.');
  return { id: id(value.id), name: text(value.name, 'Exercise name'), equipment: text(value.equipment, 'Equipment', 80), group: text(value.group, 'Muscle group', 80), weightMode: value.weightMode };
}
function targetSet(value) {
  object(value, 'Set');
  return { id: id(value.id, 'Set identifier'), targetReps: number(value.targetReps, 'Target reps', { integer: true, min: 1, max: 10000 }) };
}
function routineItem(value, catalogIds) {
  object(value, 'Routine');
  const exercises = list(value.exercises, 'Routine exercises', 200).map(item => {
    object(item, 'Routine exercise');
    const exerciseId = id(item.exerciseId);
    if (!catalogIds.has(exerciseId)) fail('A routine refers to an exercise missing from its library.');
    const sets = list(item.sets, 'Routine sets', 100).map(targetSet);
    if (!sets.length) fail('Every routine exercise needs at least one set.');
    unique(sets, 'id', 'Routine sets');
    return { slotId: id(item.slotId, 'Exercise slot identifier'), exerciseId, sets };
  });
  unique(exercises, 'slotId', 'Routine exercise slots');
  return { id: id(value.id), name: text(value.name, 'Routine name'), exercises };
}
function workoutItem(value, finished) {
  object(value, 'Workout');
  const exercises = list(value.exercises, 'Workout exercises', 300).map(item => {
    const metadata = catalogItem({ ...item, id: item.exerciseId });
    const sets = list(item.sets, 'Workout sets', 100).map(set => {
      const base = targetSet(set);
      const result = { ...base, weight: number(set.weight, 'Weight', { nullable: true }), reps: number(set.reps, 'Actual reps', { nullable: true, integer: true, max: 10000 }), completed: boolean(set.completed, 'Set completion') };
      if (result.completed && (result.reps === null || (metadata.weightMode !== 'bodyweight' && result.weight === null))) fail('A completed set is missing its weight or actual reps.');
      return result;
    });
    if (!sets.length) fail('Every workout exercise needs at least one set.');
    unique(sets, 'id', 'Workout sets');
    return { slotId: id(item.slotId), exerciseId: metadata.id, name: metadata.name, equipment: metadata.equipment, group: metadata.group, weightMode: metadata.weightMode, retained: item.retained === undefined ? false : boolean(item.retained, 'Retained exercise'), sets };
  });
  unique(exercises, 'slotId', 'Workout exercise slots');
  const startedAt = date(value.startedAt, 'Workout start');
  const completedAt = date(value.completedAt, 'Workout completion', !finished);
  if (!finished && completedAt !== null) fail('An unfinished workout cannot have a completion date.');
  if (finished && Date.parse(completedAt) < Date.parse(startedAt)) fail('Workout completion cannot precede its start.');
  if (finished && !exercises.some(exercise => exercise.sets.some(set => set.completed))) fail('A completed workout must contain at least one completed set.');
  return { id: id(value.id), routineId: id(value.routineId), routineName: text(value.routineName, 'Workout routine name'), startedAt, completedAt, exercises };
}
function baselineItem(value, catalog) {
  object(value, 'Imported reference');
  const exerciseId = id(value.exerciseId);
  const exercise = catalog.find(item => item.id === exerciseId);
  if (!exercise) fail('An imported reference refers to an exercise missing from its library.');
  const sets = list(value.sets, 'Reference sets', 100).map(set => {
    object(set, 'Reference set');
    const weight = number(set.weight, 'Reference weight', { nullable: exercise.weightMode === 'bodyweight' });
    const reps = number(set.reps, 'Reference reps', { integer: true, max: 10000 });
    if (set.completed !== true) fail('Imported reference sets must contain completed results.');
    return { id: id(set.id), weight, reps, completed: true };
  });
  if (!sets.length) fail('An imported reference needs at least one set.');
  unique(sets, 'id', 'Reference sets');
  return { exerciseId, slotId: id(value.slotId), routineName: text(value.routineName, 'Reference routine name'), sets };
}

/** Validates and returns a detached, canonical copy. Never changes the supplied state. */
export function validateState(value) {
  object(value, 'Saved data');
  if (value.schemaVersion !== SCHEMA_VERSION) fail('This data uses an unsupported version. Keep your file and update the app before importing it.');
  const catalog = list(value.catalog, 'Exercise library', 5000).map(catalogItem);
  const catalogIds = unique(catalog, 'id', 'Exercise library');
  const routines = list(value.routines, 'Routines', 1000).map(item => routineItem(item, catalogIds));
  unique(routines, 'id', 'Routines');
  const history = list(value.history, 'Workout history', 25000).map(item => workoutItem(item, true));
  const historyIds = unique(history, 'id', 'Workout history');
  const baselines = list(value.baselines ?? [], 'Imported references', 5000).map(item => baselineItem(item, catalog));
  unique(baselines, 'slotId', 'Imported references');
  const active = value.active === null ? null : workoutItem(value.active, false);
  if (active && historyIds.has(active.id)) fail('The unfinished workout is also present in completed history.');
  object(value.settings, 'Settings');
  if (value.settings.unit !== 'lb') fail('This app currently uses pounds.');
  return { schemaVersion: SCHEMA_VERSION, catalog, routines, history, baselines, active, settings: { unit: 'lb' }, lastExportAt: date(value.lastExportAt, 'Last export date', true) };
}

export function createState(catalog = []) {
  return validateState({ schemaVersion: SCHEMA_VERSION, catalog, routines: [], history: [], baselines: [], active: null, settings: { unit: 'lb' }, lastExportAt: null });
}
export function createRoutine(name) { return { id: uid(), name: name.trim(), exercises: [] }; }
export function createRoutineExercise(exerciseId, targets = [10, 10]) {
  if (!Array.isArray(targets) || !targets.length || targets.length > 100) fail('Choose from 1 to 100 sets.');
  return { slotId: uid(), exerciseId, sets: targets.map(targetReps => targetSet({ id: uid(), targetReps })) };
}
export function saveRoutine(state, routine) {
  const clean = routineItem(routine, new Set(state.catalog.map(item => item.id)));
  const next = clone(state);
  const index = next.routines.findIndex(item => item.id === clean.id);
  if (index < 0) next.routines.push(clean); else next.routines[index] = clean;
  return next;
}
export function removeRoutine(state, routineId) {
  const next = clone(state);
  next.routines = next.routines.filter(item => item.id !== routineId);
  return next;
}
export function addCatalogExercise(state, exercise) {
  const item = catalogItem({ id: uid(), ...exercise });
  if (state.catalog.some(existing => existing.id === item.id)) fail('An exercise with this identifier already exists.');
  const next = clone(state); next.catalog.push(item); return next;
}
export function renameExercise(state, exerciseId, name) {
  const trimmed = text(name, 'Exercise name').trim();
  if (!state.catalog.some(item => item.id === exerciseId)) fail('This exercise could not be found.');
  if (state.catalog.some(item => item.id !== exerciseId && item.name.trim().toLowerCase() === trimmed.toLowerCase())) fail('That name already exists. Choose a different name.');
  const next = clone(state);
  next.catalog.find(item => item.id === exerciseId).name = trimmed;
  // Keep identity and comparisons, and preserve names in completed history snapshots.
  next.active?.exercises.filter(item => item.exerciseId === exerciseId).forEach(item => { item.name = trimmed; });
  return next;
}
function snapshot(state, item) {
  const metadata = state.catalog.find(exercise => exercise.id === item.exerciseId);
  if (!metadata) fail('This exercise is no longer in the exercise library.');
  return { slotId: item.slotId, exerciseId: metadata.id, name: metadata.name, equipment: metadata.equipment, group: metadata.group, weightMode: metadata.weightMode, retained: false, sets: item.sets.map((set, setIndex) => {
    const previous = previousForSet(state, item.exerciseId, item.slotId, set.id, setIndex);
    const targetReps = previous ? Math.min(previous.reps + 1, 10000) : set.targetReps;
    return { ...targetSet({ id: set.id, targetReps }), weight: null, reps: null, completed: false };
  }) };
}
export function startWorkout(state, routineId) {
  if (state.active) fail('Resume or finish your current workout before starting another.');
  const routine = state.routines.find(item => item.id === routineId);
  if (!routine) fail('This routine could not be found.');
  if (!routine.exercises.length) fail('Add an exercise to this routine before starting.');
  const next = clone(state);
  next.active = { id: uid(), routineId: routine.id, routineName: routine.name, startedAt: now(), completedAt: null, exercises: routine.exercises.map(item => snapshot(state, item)) };
  return next;
}
function activeCopy(state) { if (!state.active) fail('There is no unfinished workout.'); return clone(state); }
function exerciseAt(state, slotId) {
  const item = state.active?.exercises.find(exercise => exercise.slotId === slotId);
  if (!item) fail('This workout exercise could not be found.');
  return item;
}
function setAt(exercise, setId) {
  const item = exercise.sets.find(set => set.id === setId);
  if (!item) fail('This set could not be found.');
  return item;
}
export function setActiveSet(state, slotId, setId, patch) {
  object(patch, 'Set changes');
  const next = activeCopy(state), exercise = exerciseAt(next, slotId), set = setAt(exercise, setId);
  if (own(patch, 'targetReps')) set.targetReps = number(patch.targetReps, 'Target reps', { integer: true, min: 1, max: 10000 });
  if (own(patch, 'weight')) set.weight = number(patch.weight, 'Weight', { nullable: true });
  if (own(patch, 'reps')) set.reps = number(patch.reps, 'Actual reps', { nullable: true, integer: true, max: 10000 });
  if (set.reps === null || (exercise.weightMode !== 'bodyweight' && set.weight === null)) set.completed = false;
  if (own(patch, 'completed')) {
    boolean(patch.completed, 'Set completion');
    if (patch.completed && (set.reps === null || (exercise.weightMode !== 'bodyweight' && set.weight === null))) fail('Enter today’s weight and actual reps before completing this set.');
    set.completed = patch.completed;
  }
  return next;
}
export const setCompleted = (state, slotId, setId, completed) => setActiveSet(state, slotId, setId, { completed });
export function finishWorkout(state) {
  const next = activeCopy(state);
  if (!next.active.exercises.some(exercise => exercise.sets.some(set => set.completed))) fail('Complete at least one set before saving this workout.');
  next.active.completedAt = now();
  next.history.push(workoutItem(next.active, true));
  next.active = null;
  return next;
}
export function discardWorkout(state) { const next = clone(state); next.active = null; return next; }
export function addActiveExercise(state, exerciseId, targets = [10, 10]) {
  const next = activeCopy(state);
  if (next.active.exercises.length >= 300) fail('This workout has reached the exercise limit.');
  next.active.exercises.push(snapshot(next, createRoutineExercise(exerciseId, targets)));
  return next;
}
export function hasEnteredResults(exercise) {
  return exercise.sets.some(set => set.completed || set.weight !== null || set.reps !== null);
}
export function replaceActiveExercise(state, slotId, exerciseId, { keepLogged = true } = {}) {
  const next = activeCopy(state), old = exerciseAt(next, slotId);
  if (old.exerciseId === exerciseId) return next;
  const index = next.active.exercises.findIndex(item => item.slotId === slotId);
  const replacement = snapshot(next, createRoutineExercise(exerciseId, old.sets.map(set => set.targetReps)));
  if (hasEnteredResults(old) && keepLogged) {
    old.retained = true;
    next.active.exercises.splice(index + 1, 0, replacement);
  } else next.active.exercises.splice(index, 1, replacement);
  return next;
}
export function removeActiveExercise(state, slotId) {
  const next = activeCopy(state);
  exerciseAt(next, slotId);
  next.active.exercises = next.active.exercises.filter(item => item.slotId !== slotId);
  return next;
}
function move(items, from, toIndex) {
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= items.length) fail('The requested position is outside the list.');
  items.splice(toIndex, 0, items.splice(from, 1)[0]);
}
export function moveActiveExercise(state, slotId, toIndex) {
  const next = activeCopy(state); exerciseAt(next, slotId);
  move(next.active.exercises, next.active.exercises.findIndex(item => item.slotId === slotId), toIndex);
  return next;
}
export function addActiveSet(state, slotId, targetReps = null) {
  const next = activeCopy(state), exercise = exerciseAt(next, slotId);
  if (exercise.sets.length >= 100) fail('This exercise has reached the set limit.');
  exercise.sets.push({ ...targetSet({ id: uid(), targetReps: targetReps ?? exercise.sets.at(-1)?.targetReps ?? 10 }), weight: null, reps: null, completed: false });
  return next;
}
export function removeActiveSet(state, slotId, setId) {
  const next = activeCopy(state), exercise = exerciseAt(next, slotId);
  setAt(exercise, setId);
  if (exercise.sets.length <= 1) fail('Keep at least one set, or remove the exercise.');
  exercise.sets = exercise.sets.filter(item => item.id !== setId);
  return next;
}
export function moveActiveSet(state, slotId, setId, toIndex) {
  const next = activeCopy(state), exercise = exerciseAt(next, slotId); setAt(exercise, setId);
  move(exercise.sets, exercise.sets.findIndex(item => item.id === setId), toIndex);
  return next;
}
export function updateSavedRoutine(state) {
  if (!state.active) fail('There is no unfinished workout.');
  const current = state.routines.find(item => item.id === state.active.routineId);
  if (!current) fail('The original routine was deleted. Create a new routine to save these changes.');
  return saveRoutine(state, { id: current.id, name: current.name, exercises: state.active.exercises.filter(item => !item.retained).map(item => ({ slotId: item.slotId, exerciseId: item.exerciseId, sets: item.sets.map(({ id, targetReps }) => ({ id, targetReps })) })) });
}
/** Latest completed workout containing a completed set for this exact exercise identity. */
export function previousForExercise(state, exerciseId, slotId = null) {
  const workouts = [...state.history].reverse().sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  for (const workout of workouts) {
    const options = workout.exercises.filter(item => item.exerciseId === exerciseId && item.sets.some(set => set.completed));
    if (!options.length) continue;
    const exercise = options.find(item => item.slotId === slotId) || options.at(-1);
    return clone({ workoutId: workout.id, routineName: workout.routineName, completedAt: workout.completedAt, source: 'Completed workout', exercise, sets: exercise.sets });
  }
  const references = (state.baselines || []).filter(item => item.exerciseId === exerciseId);
  const baseline = references.find(item => item.slotId === slotId) || references.at(-1);
  if (baseline) {
    const metadata = state.catalog.find(item => item.id === exerciseId);
    const exercise = { ...metadata, exerciseId, slotId: baseline.slotId, sets: baseline.sets };
    return clone({ workoutId: null, routineName: baseline.routineName, completedAt: null, source: 'Imported reference', exercise, sets: baseline.sets });
  }
  return null;
}
export function previousForSet(state, exerciseId, slotId, setId, setIndex) {
  const result = previousForExercise(state, exerciseId, slotId);
  if (!result) return null;
  const set = result.exercise.slotId === slotId ? result.sets.find(item => item.id === setId) : result.sets[setIndex];
  if (!set?.completed) return null;
  return { weight: set.weight, reps: set.reps, completedAt: result.completedAt, routineName: result.routineName, source: result.source };
}
export function exerciseHistory(state, exerciseId) {
  return state.history.filter(workout => workout.exercises.some(exercise => exercise.exerciseId === exerciseId && exercise.sets.some(set => set.completed))).reverse().sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)).map(workout => ({ workoutId: workout.id, routineName: workout.routineName, completedAt: workout.completedAt, exercises: clone(workout.exercises.filter(exercise => exercise.exerciseId === exerciseId)) }));
}
export function exportBackup(state) {
  return JSON.stringify({ format: BACKUP_FORMAT, version: SCHEMA_VERSION, exportedAt: now(), data: validateState(state) }, null, 2);
}
/** Parse fully before a UI asks for confirmation. Caller must explicitly save the returned replacement. */
export function parseBackup(source) {
  if (typeof source !== 'string' || source.length > MAX_BACKUP_BYTES || new TextEncoder().encode(source).byteLength > MAX_BACKUP_BYTES) fail('Choose a Benchmark JSON backup smaller than 25 MB.');
  let value;
  try { value = JSON.parse(source); } catch { fail('This file is not valid JSON. Your existing records have not been changed.'); }
  object(value, 'Backup');
  if (![BACKUP_FORMAT, 'setline-backup'].includes(value.format) || value.version !== SCHEMA_VERSION) fail('This is not a supported Benchmark backup. Your existing records have not been changed.');
  date(value.exportedAt, 'Backup date');
  return validateState(value.data);
}
export function backupSummary(state) {
  return { routines: state.routines.length, workouts: state.history.length, exercises: state.catalog.length, references: (state.baselines || []).length, unfinishedWorkout: Boolean(state.active) };
}
