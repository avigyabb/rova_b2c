// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage"; // Import for storage

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHmo5zkdpph4xa-CgO2eWrwpq56tzC9hE",
  authDomain: "swing-b2c.firebaseapp.com",
  databaseURL: "https://swing-b2c-default-rtdb.firebaseio.com",
  projectId: "swing-b2c",
  storageBucket: "swing-b2c.appspot.com",
  messagingSenderId: "186422493109",
  appId: "1:186422493109:web:efb53f7ebd48aacbf2e3fc",
  measurementId: "G-4ZE5BPHV9H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Get the Realtime Database instance
const database = getDatabase(app);

const storage = getStorage(app); // Initialize storage

export { database, storage };