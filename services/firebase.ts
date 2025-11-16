import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';

// REPLACE with your Firebase config from your project settings
export const firebaseConfig = {
  apiKey: "AIzaSyDf2rc5HHLqKOZYIYMYFJCfOFsXBtIK35k",
  authDomain: "edutecschools.firebaseapp.com",
  // The databaseURL can help the SDK resolve regional endpoints for other
  // services like Firestore, which is likely the cause of the timeout.
  databaseURL: "https://edutecschools-default-rtdb.us-west1.firebasedatabase.app",
  projectId: "edutecschools",
  storageBucket: "edutecschools.appspot.com",
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

// Enable offline persistence for a better offline experience.
// This allows the app to work seamlessly even with intermittent connectivity.
// `synchronizeTabs: true` ensures data consistency across multiple open tabs.
db.enablePersistence({synchronizeTabs: true})
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open and can't coordinate.
      console.warn('Firestore persistence failed: multiple tabs open and could not sync.');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence.
      console.warn('Firestore persistence not available in this browser.');
    }
  });


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


export { firebaseAuth, db, storage, functions, secondaryAuth, firebase };