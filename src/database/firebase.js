// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDU6ONkr_AUsghYYeDuFRE7x_Yk464XDgA",
  authDomain: "fahafaha-8a3c2.firebaseapp.com",
  databaseURL: "https://fahafaha-8a3c2-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fahafaha-8a3c2",
  storageBucket: "fahafaha-8a3c2.appspot.com",
  messagingSenderId: "918037187326",
  appId: "1:918037187326:web:9cfe35975be04fb0e973af",
  measurementId: "G-FZ5K1EHY3J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
