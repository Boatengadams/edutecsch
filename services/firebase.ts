import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';
import 'firebase/compat/database';

export const firebaseConfig = {
  apiKey: "AIzaSyDf2rc5HHLqKOZYIYMYFJCfOFsXBtIK35k",
  authDomain: "edutecschools.firebaseapp.com",
  databaseURL: "https://edutecschools-default-rtdb.us-west1.firebasedatabase.app",
  projectId: "edutecschools",
  storageBucket: "edutecschools.firebasestorage.app",
  messagingSenderId: "874590795053",
  appId: "1:874590795053:web:274a2cd1732e46d4f00fa4",
  measurementId: "G-ZMSQZ67NYH"
};

let app: firebase.app.App;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

const firebaseAuth = firebase.auth();

// FIX: Ensure persistence doesn't throw a blocking error in restricted environments
// Using immediate execution for better reliability in frame contexts
(async () => {
    try {
        await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (e) {
        console.warn("Local storage restricted, trying Session persistence...");
        try {
            await firebaseAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        } catch (e2) {
            console.warn("Persistence fully disabled by environment. Auth may not persist across refreshes.");
        }
    }
})();

const db = firebase.firestore();

try {
  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    experimentalAutoDetectLongPolling: true,
    host: "firestore.googleapis.com",
    ssl: true,
  });
} catch (err) {
  console.warn("Firestore settings could not be applied:", err);
}

const rtdb = firebase.database();
const storage = firebase.storage();
const functions = app.functions('us-west1');

const secondaryAppName = 'userCreationApp';
let secondaryApp: firebase.app.App;
const existingSecondaryApp = firebase.apps.find(app => app.name === secondaryAppName);
if (existingSecondaryApp) {
    secondaryApp = existingSecondaryApp;
} else {
    secondaryApp = firebase.initializeApp(firebaseConfig, secondaryAppName);
}
const secondaryAuth = secondaryApp.auth();

export { firebaseAuth, db, storage, functions, secondaryAuth, firebase, rtdb };