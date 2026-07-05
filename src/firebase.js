const STORAGE_KEY = 'weflix_local_store';
const AUTH_KEY = 'weflix_auth_user';
const USERS_KEY = 'weflix_users';

const getStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveStore = (store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const getNestedValue = (store, path) => {
  let cursor = store;
  for (const segment of path) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[segment];
  }
  return cursor;
};

const setNestedValue = (store, path, value) => {
  let cursor = store;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[path[path.length - 1]] = value;
  return store;
};

const deleteNestedValue = (store, path) => {
  let cursor = store;
  for (let i = 0; i < path.length - 1; i += 1) {
    const segment = path[i];
    if (!cursor[segment] || typeof cursor[segment] !== 'object') return;
    cursor = cursor[segment];
  }
  delete cursor[path[path.length - 1]];
};

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const createGuestUser = () => ({
  uid: 'local-guest',
  email: 'guest@local',
  displayName: 'Guest',
  photoURL: null,
  emailVerified: true,
  isGuest: true,
});

const getAuthUser = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (saved) return saved;
  } catch {
    // ignore
  }

  return createGuestUser();
};

const listeners = new Set();

const emitAuthChange = () => {
  const user = getAuthUser();
  auth.currentUser = user;
  listeners.forEach((listener) => listener(user));
};

const auth = {
  currentUser: getAuthUser(),
  authStateReady: async () => Promise.resolve(auth.currentUser),
  reload: async () => {
    const current = getAuthUser();
    auth.currentUser = current;
    return current;
  },
  signOut: async () => {
    const guest = createGuestUser();
    localStorage.setItem(AUTH_KEY, JSON.stringify(guest));
    auth.currentUser = guest;
    emitAuthChange();
    return undefined;
  },
};

const createLocalUser = (email, password, displayName = 'Local User') => {
  const users = readUsers();
  const existing = users.find((user) => user.email === email);
  if (existing) {
    throw { code: 'auth/email-already-in-use' };
  }

  const user = {
    uid: `local-${Date.now()}`,
    email,
    displayName,
    photoURL: null,
    emailVerified: false,
    password,
  };

  users.push(user);
  writeUsers(users);
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  auth.currentUser = user;
  emitAuthChange();
  return { user };
};

export const createUserWithEmailAndPassword = async (authInstance, email, password) => createLocalUser(email, password, 'Local User');

export const signInWithEmailAndPassword = async (authInstance, email, password) => {
  const users = readUsers();
  const match = users.find((user) => user.email === email && user.password === password);
  if (!match) {
    throw { code: 'auth/invalid-credential' };
  }

  localStorage.setItem(AUTH_KEY, JSON.stringify(match));
  auth.currentUser = match;
  emitAuthChange();
  return { user: match };
};

export const signInWithPopup = async () => {
  const user = getAuthUser();
  auth.currentUser = user;
  emitAuthChange();
  return { user };
};

export const fetchSignInMethodsForEmail = async () => [];
export const linkWithCredential = async () => undefined;
export const updateProfile = async (user, data) => {
  const existing = readUsers().find((item) => item.uid === user.uid);
  if (!existing) return;
  const updated = { ...existing, ...data };
  const users = readUsers().filter((item) => item.uid !== user.uid);
  users.push(updated);
  writeUsers(users);
  localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  auth.currentUser = updated;
  emitAuthChange();
};

export const sendPasswordResetEmail = async () => undefined;
export const verifyPasswordResetCode = async () => undefined;
export const confirmPasswordReset = async () => undefined;
export const applyActionCode = async () => undefined;
export const sendEmailVerification = async () => undefined;
export const onAuthStateChanged = (authInstance, callback) => {
  listeners.add(callback);
  callback(getAuthUser());
  return () => listeners.delete(callback);
};

export const signOut = async () => {
  const guest = createGuestUser();
  localStorage.setItem(AUTH_KEY, JSON.stringify(guest));
  auth.currentUser = guest;
  emitAuthChange();
  return undefined;
};

export const googleProvider = { providerId: 'google.com' };
export const db = {};
export const EmailAuthProvider = { providerId: 'password' };
export const serverTimestamp = () => Date.now();

export const doc = (database, ...segments) => ({ path: segments.filter(Boolean) });
export const collection = (database, ...segments) => ({ path: segments.filter(Boolean) });
export const query = (collectionRef, ...filters) => ({ ref: collectionRef, filters });
export const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
export const limit = (value) => ({ type: 'limit', value });

const getDocsFromCollection = (collectionRef) => {
  const store = getStore();
  const target = getNestedValue(store, collectionRef.path);
  if (!target || typeof target !== 'object') return [];
  return Object.entries(target)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([id, value]) => ({
      id,
      data: () => value,
    }));
};

const applyFilters = (docs, filters = []) => {
  let result = [...docs];
  const orderFilter = filters.find((filter) => filter.type === 'orderBy');
  if (orderFilter) {
    result.sort((left, right) => {
      const leftValue = left.data()[orderFilter.field] || '';
      const rightValue = right.data()[orderFilter.field] || '';
      return String(leftValue).localeCompare(String(rightValue));
    });
  }
  const limitFilter = filters.find((filter) => filter.type === 'limit');
  if (limitFilter) {
    result = result.slice(0, limitFilter.value);
  }
  return result;
};

export const getDocs = async (queryRef) => {
  const docs = getDocsFromCollection(queryRef.ref || queryRef);
  const snapshot = {
    docs: applyFilters(docs, queryRef.filters || []),
    forEach: (callback) => {
      snapshot.docs.forEach(callback);
    },
    size: 0,
  };
  snapshot.size = snapshot.docs.length;
  return snapshot;
};

export const onSnapshot = (queryRef, callback) => {
  getDocs(queryRef).then(callback);
  return () => undefined;
};

export const setDoc = async (ref, data, options = {}) => {
  const store = getStore();
  const path = ref.path;
  const current = getNestedValue(store, path);
  const merged = options.merge ? { ...(current || {}), ...data } : data;
  setNestedValue(store, path, merged);
  saveStore(store);
  return undefined;
};

export const deleteDoc = async (ref) => {
  const store = getStore();
  deleteNestedValue(store, ref.path);
  saveStore(store);
  return undefined;
};

export { auth };
