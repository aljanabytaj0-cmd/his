// ============================================
// إعدادات Firebase — نظام إدارة المستشفى
// ============================================
// ⚠️ عدّل القيم التالية بالبيانات التي حصلت عليها من Firebase Console
// (Project Settings → عام → تطبيقاتك → SDK setup and configuration)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASRnEE3mZw5EMDJi4C9YMXHeV4clkNmrI",
  authDomain: "his-wazeerya.firebaseapp.com",
  projectId: "his-wazeerya",
  storageBucket: "his-wazeerya.firebasestorage.app",
  messagingSenderId: "635351274239",
  appId: "1:635351274239:web:395d84d61e2182ff1eb2ca"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
