# Firebase usage in WeFlix and localStorage alternatives

This document focuses on the app features that need remote cloud storage for persistence, especially the watchlist and similar user-data features. It explains what the Firebase-based pieces do and how they can be replaced with browser localStorage for a local-only version.

> Note: localStorage can replace the app’s client-side persistence, but it will not provide the same cross-device sync, shared backend, or security model as Firebase.

---

## 1. Core Firebase setup

File: [src/firebase.js](src/firebase.js)

### What is used
- `initializeApp(...)`
- `getAuth(...)`
- `new GoogleAuthProvider()`
- `getFirestore(...)`

### What it does
This file initializes Firebase and exposes the shared services used by the app:
- `auth` is the Firebase Authentication instance.
- `googleProvider` enables Google sign-in.
- `db` is the Firestore database instance.

### For a local-only version
If authentication is removed entirely, the relevant part is the Firestore database connection:
- Keep the app data in localStorage instead of Firestore.
- Use keys like `weflix_watchlist_<uid>` and `weflix_continue_watching_<uid>`.

---

## 2. Remote-storage features that need cloud persistence

### A. Watchlist
File: [src/context/WatchlistContext.jsx](src/context/WatchlistContext.jsx)

#### Methods used
- `collection(...)`
- `onSnapshot(...)`
- `doc(...)`
- `setDoc(...)`
- `deleteDoc(...)`

#### What it does
- Loads the user’s watchlist from Firestore in real time.
- Adds or removes items from the watchlist.
- Keeps the list synced with the backend.
- Saves a local cache to localStorage for faster reloads.

#### Why it needs remote storage
- The watchlist should survive page refreshes and device changes.
- A single browser-only solution would not be shared across devices.

#### LocalStorage alternative
- Save the watchlist under a storage key such as:
  - `weflix_watchlist_<uid>`
- On add/remove, update the array in localStorage immediately.
- On app load, read the stored list and restore it in memory.

### B. Continue watching
File: [src/utils/continueWatching.js](src/utils/continueWatching.js)

#### Methods used
- `doc(...)`
- `setDoc(...)`
- `getDocs(...)`
- `collection(...)`
- `query(...)`
- `orderBy(...)`
- `limit(...)`
- `deleteDoc(...)`

#### What it does
- Saves the currently watched item to a per-user Firestore collection.
- Keeps only the latest 20 items.
- Removes older entries when the limit is exceeded.

#### Why it needs remote storage
- The continue-watching list is user-specific and should survive reloads and future sessions.

#### LocalStorage alternative
- Store the list under a key such as:
  - `weflix_continue_watching_<uid>`
- On save:
  - append or update the item
  - sort by `updatedAt`
  - trim to 20 entries
- On remove:
  - filter it out and write it back to localStorage

### C. Continue watching row display
File: [src/pages/Home/ContinueWatchingRow.jsx](src/pages/Home/ContinueWatchingRow.jsx)

#### Methods used
- `collection(...)`
- `query(...)`
- `orderBy(...)`
- `limit(...)`
- `onSnapshot(...)`

#### What it does
- Reads the user’s continue-watching items from Firestore.
- Displays them in a horizontal row on the homepage.

#### LocalStorage alternative
- Read from `weflix_continue_watching_<uid>` on load.
- Re-render the UI when the storage value changes.

### D. Personalized recommendations
File: [src/pages/Home/PersonalizedRow.jsx](src/pages/Home/PersonalizedRow.jsx)

#### Methods used
- `collection(...)`
- `query(...)`
- `orderBy(...)`
- `limit(...)`
- `getDocs(...)`

#### What it does
- Reads recent continue-watching items from Firestore.
- Builds a personalized recommendations row based on that history.

#### LocalStorage alternative
- Read the continue-watching data from localStorage instead of Firestore.
- Use the same logic to build the recommendations feed.

---

## 3. Other related data persistence

### A. User profile storage
File: [src/components/AuthModal.jsx](src/components/AuthModal.jsx)

#### Methods used
- `doc(...)`
- `setDoc(...)`
- `serverTimestamp()`

#### What it does
- Stores user profile info such as displayName, email, photoURL, emailVerified, and lastLoginAt.

#### LocalStorage alternative
- Store the profile in localStorage under a key such as:
  - `weflix_user_profile_<uid>`

### B. Cached state for instant refresh
The app already stores some data in localStorage as a cache, especially for watchlist and continue-watching.

#### Why this matters
- It helps the UI feel fast even when the remote store is slow.
- A local-only version can keep the same pattern and simply make localStorage the source of truth.

---

## 4. Suggested localStorage-based storage model

If you want to remove Firebase and keep the same experience for a single browser, a simple structure would be:

### Suggested storage keys
- `weflix_watchlist_<uid>` – watchlist items
- `weflix_continue_watching_<uid>` – continue-watching items
- `weflix_user_profile_<uid>` – optional profile metadata

### Suggested behavior
1. On app load, read the relevant storage keys.
2. Restore the watchlist and continue-watching list into React state.
3. When the user adds or removes an item, update the localStorage entry immediately.
4. Keep the same UI and component structure, but swap the remote calls for local storage helpers.

---

## 5. Recommended replacement approach

### Best approach for a local-only version
- Keep the UI and component structure the same.
- Replace Firestore reads/writes with helper functions that use localStorage.
- Example helper ideas:
  - `loadWatchlist(uid)`
  - `saveWatchlist(uid, items)`
  - `loadContinueWatching(uid)`
  - `saveContinueWatching(uid, item)`
  - `removeContinueWatching(uid, id)`

### What you gain
- No Firebase dependency
- Simpler setup
- Works fully in the browser
- Good for demos, prototypes, or single-device use

### What you lose
- No shared cloud storage across devices
- No real-time cross-device sync
- No backend security rules

---

## 6. Summary

The main features that truly need remote cloud storage are:
- Watchlist
- Continue watching
- Personalized recommendations based on that history
- Any other user-specific saved media lists

For a local-only version, these can all be replaced with browser localStorage while preserving the same functionality for a single user/browser.

---

## 7. Summary of the implemented change

The project has now been updated to use browser localStorage for the main persistence features instead of Firebase.

### What was changed
- Replaced the Firebase-backed data layer with a localStorage-based compatibility layer in [src/firebase.js](src/firebase.js).
- Updated the app to use that local layer for:
  - watchlist persistence in [src/context/WatchlistContext.jsx](src/context/WatchlistContext.jsx)
  - continue-watching storage in [src/utils/continueWatching.js](src/utils/continueWatching.js)
  - continue-watching row loading in [src/pages/Home/ContinueWatchingRow.jsx](src/pages/Home/ContinueWatchingRow.jsx)
  - personalized recommendations in [src/pages/Home/PersonalizedRow.jsx](src/pages/Home/PersonalizedRow.jsx)
  - auth-related UI flows in [src/components/AuthModal.jsx](src/components/AuthModal.jsx)

### Storage approach used
- Watchlist data is stored in browser storage under keys based on the current user.
- Continue-watching data is stored in browser storage and trimmed to the latest items.
- The app still behaves similarly for a single-browser experience, while avoiding Firebase dependency.

### Result
- The app now works locally without Firebase for the main persisted features.
- The build completes successfully after the migration.

### A. Save a user profile to Firestore
File: [src/components/AuthModal.jsx](src/components/AuthModal.jsx)

#### Methods: `doc(...)`, `setDoc(...)`, `serverTimestamp()`
- Creates or updates a `users/{uid}` document.
- Stores profile fields such as displayName, email, photoURL, emailVerified, and lastLoginAt.

#### LocalStorage alternative
- Save the user object under a key like:
  - `weflix_users`
- Or save it under a per-user key:
  - `weflix_user_<uid>`

### B. Watchlist
File: [src/context/WatchlistContext.jsx](src/context/WatchlistContext.jsx)

#### Methods: `collection(...)`, `onSnapshot(...)`, `doc(...)`, `setDoc(...)`, `deleteDoc(...)`
- Loads the user’s watchlist in real time from Firestore.
- Adds or removes items from the watchlist.
- Saves the watchlist to localStorage as a cache for instant reloads.

#### LocalStorage alternative
- Store the watchlist under a key such as:
  - `weflix_watchlist_<uid>`
- Use a plain array of items and a `Set`-like array of IDs in memory.
- On each update, overwrite the localStorage entry.

### C. Continue watching
File: [src/utils/continueWatching.js](src/utils/continueWatching.js)

#### Methods: `doc(...)`, `setDoc(...)`, `getDocs(...)`, `collection(...)`, `query(...)`, `orderBy(...)`, `limit(...)`, `deleteDoc(...)`
- Saves the currently viewing item to a per-user Firestore collection.
- Keeps only the most recent 20 items.
- Removes older items when the limit is exceeded.

#### LocalStorage alternative
- Store an array under:
  - `weflix_continue_watching_<uid>`
- On save:
  - push the new item to the array
  - sort by `updatedAt`
  - trim to 20 entries
- On remove:
  - filter the array and write it back to localStorage

### D. Continue watching row
File: [src/pages/Home/ContinueWatchingRow.jsx](src/pages/Home/ContinueWatchingRow.jsx)

#### Methods: `collection(...)`, `query(...)`, `orderBy(...)`, `limit(...)`, `onSnapshot(...)`, `onAuthStateChanged(...)`
- Reads the user’s continue-watching items from Firestore in real time.
- Shows them in a horizontal row on the homepage.

#### LocalStorage alternative
- Read from `weflix_continue_watching_<uid>` on load.
- Re-render the UI whenever localStorage changes.

### E. Personalized recommendations
File: [src/pages/Home/PersonalizedRow.jsx](src/pages/Home/PersonalizedRow.jsx)

#### Methods: `collection(...)`, `query(...)`, `orderBy(...)`, `limit(...)`, `getDocs(...)`, `onAuthStateChanged(...)`
- Reads recent continue-watching items from Firestore.
- Builds a personalized recommendations row for the logged-in user.

#### LocalStorage alternative
- Read the continue-watching items from localStorage and use them to build the same recommendation feed.

---

## 4. Where Firebase is used in the app

### Components and files
- [src/firebase.js](src/firebase.js) – Firebase initialization
- [src/components/AuthModal.jsx](src/components/AuthModal.jsx) – sign-in, sign-up, reset password, Google auth, profile storage
- [src/context/WatchlistContext.jsx](src/context/WatchlistContext.jsx) – watchlist sync
- [src/utils/continueWatching.js](src/utils/continueWatching.js) – continue-watching persistence
- [src/pages/Home/ContinueWatchingRow.jsx](src/pages/Home/ContinueWatchingRow.jsx) – display continue-watching items
- [src/pages/Home/PersonalizedRow.jsx](src/pages/Home/PersonalizedRow.jsx) – personalized recommendations based on stored data
- [src/pages/Home/EmailVerificationPage.jsx](src/pages/Home/EmailVerificationPage.jsx) – email verification flow
- [src/pages/Home/ResetPasswordPage.jsx](src/pages/Home/ResetPasswordPage.jsx) – password reset flow
- [src/pages/Home/ParentComponent.jsx](src/pages/Home/ParentComponent.jsx) – auth state and logout
- [src/pages/Home/Sidebar.jsx](src/pages/Home/Sidebar.jsx) – auth state and logout

---

## 5. Suggested localStorage-based architecture

If you want the same experience without Firebase, a simple structure would be:

### Suggested storage keys
- `weflix_auth_user` – currently signed-in user
- `weflix_users` – local user accounts
- `weflix_watchlist_<uid>` – watchlist items
- `weflix_continue_watching_<uid>` – continue-watching items
- `weflix_reset_requests` – temporary reset tokens

### Suggested behavior
1. On app load, read the current user from `weflix_auth_user`.
2. If a user is logged in, load watchlist and continue-watching data from the matching localStorage keys.
3. When the user changes data, update the related localStorage entries immediately.
4. When the user logs out, remove the auth key.

### What would be different
- No real-time sync across devices
- No secure auth backend
- No email verification backend
- No protected Firestore rules
- Faster and simpler for a single-browser demo or prototype

---

## 6. Recommended replacement strategy

### Best approach for a local-only version
- Keep the UI and component structure the same.
- Replace Firebase calls with helper functions that read and write localStorage.
- Example helpers:
  - `loginUser(email, password)`
  - `registerUser(email, password, displayName)`
  - `saveWatchlist(uid, items)`
  - `loadWatchlist(uid)`
  - `saveContinueWatching(uid, item)`
  - `loadContinueWatching(uid)`

### Example logic
- Authentication becomes a local user store rather than a server-backed auth system.
- Watchlist and continue-watching become browser-persisted arrays.
- The app still feels the same for a single-user experience.

---

## 7. Summary

Firebase is currently used for:
- User authentication
- Google sign-in
- Email verification
- Password reset
- User profile storage
- Watchlist persistence
- Continue-watching persistence
- Personalized content based on saved user activity

A localStorage-based version could achieve the same app experience for a single browser, with the main tradeoff being that it would be less secure and would not sync between devices.
