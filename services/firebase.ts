
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
const db = firebase.firestore();

// ENHANCED: Apply strict connectivity settings to bypass proxy/firewall delays
try {
  db.settings({
    experimentalForceLongPolling: true, 
    merge: true,
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });
  // Enable offline persistence for better UX when connection is spotty
  db.enablePersistence().catch((err) => {
      if (err.code === 'failed-precondition') {
          console.warn("Persistence failed: Multiple tabs open.");
      } else if (err.code === 'unimplemented') {
          console.warn("Persistence failed: Browser not supported.");
      }
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
