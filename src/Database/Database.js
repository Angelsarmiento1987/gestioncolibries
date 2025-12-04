

import { getFirestore } from "@firebase/firestore";//RECORDAR SIEMPRE QUE EN EXPO GO ESTOS IMPORTS SON CON @
import { initializeApp, FirebaseApp } from "@firebase/app";
 import {getAuth} from '@firebase/auth'


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAN6YO4M4YEB0MCCsdq_INW9mOsZ0-IHeA",
  authDomain: "gestioncolibries.firebaseapp.com",
  projectId: "gestioncolibries",
  storageBucket: "gestioncolibries.firebasestorage.app",
  messagingSenderId: "513391630527",
  appId: "1:513391630527:web:95682d11e7976a559e0e0a"
};


// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig) //estas con figuraciones las realizo yo
export const FIRESTORE_DB = getFirestore(FIREBASE_APP)
export const auth = getAuth(FIREBASE_APP);
// export const FIREBASE_AUTH = getAuth(FIREBASE_APP)