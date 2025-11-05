// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Paste your Firebase config here
const firebaseConfig = {
 apiKey: "AIzaSyD-ldTZ0guWYwolDXmry4cWGWSVIUrtNOo",
  authDomain: "legendium-2fbb6.firebaseapp.com",
  projectId: "legendium-2fbb6",
  storageBucket: "legendium-2fbb6.firebasestorage.app",
  messagingSenderId: "1080832705555",
  appId: "1:1080832705555:web:2cdc521dfd5821efe8ebe6",
  measurementId: "G-JTE4VCMGYS"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

export { firebaseApp, auth, db };
