
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';
import 'firebase/compat/database'; // Added for Realtime Database (Presence)

// REPLACE with your Firebase config from your project settings
export const firebaseConfig = {
  apiKey: "AIzaSyDf2rc5HHLqKOZYIYMYFJCfOFsXBtIK35k",
  authDomain: "edutecschools.firebaseapp.com",
  // The databaseURL can help the SDK resolve regional endpoints for other
  // services like Firestore, which is likely the cause of the timeout.
  databaseURL: "https://edutecschools-default-rtdb.us-west1.firebasedatabase.app",
  projectId: "edutecschools",
  storageBucket: "edutecschools.firebasestorage.app", // UPDATED to match console
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

// Apply settings to fix "Could not reach Cloud Firestore backend"
try {
  db.settings({
    experimentalForceLongPolling: true, // Force long polling to bypass proxy/firewall issues
  });
} catch (err) {
  console.warn("Firestore settings could not be applied:", err);
}

const rtdb = firebase.database(); // Initialize RTDB


const storage = firebase.storage();
const functions = app.functions('us-west1');

// Create a secondary app for user creation to avoid logging out the admin
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
