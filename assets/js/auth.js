// ============================================
// المصادقة وإدارة الصلاحيات — نظام إدارة المستشفى
// ============================================
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// تسجيل الدخول
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// تسجيل الخروج
export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

// جلب بيانات الموظف (الاسم، الدور، القسم) من Firestore عبر uid
export async function getEmployeeProfile(uid) {
  const snap = await getDoc(doc(db, "employees", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// حارس الصفحات المحمية: يستدعى بأعلى كل صفحة داخلية
// يعيد التوجيه لصفحة الدخول إذا ما كان المستخدم مسجّل
// ويعيد { user, profile } إذا كان مسجّل وحسابه فعّال
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const profile = await getEmployeeProfile(user.uid);
    if (!profile || profile.active === false) {
      await signOut(auth);
      window.location.href = "index.html?disabled=1";
      return;
    }
    callback({ user, profile });
  });
}

// خريطة صلاحيات الأدوار → أسماء عرض عربية
export const ROLE_LABELS = {
  admin: "مدير النظام",
  reception: "موظف استقبال",
  nurse: "ممرض/ممرضة",
  doctor: "طبيب",
  pharmacist: "صيدلاني",
  lab: "فني مختبر/أشعة",
  accountant: "محاسب",
  hr: "موارد بشرية"
};

// أي الوحدات مسموحة لكل دور (تستخدم لإظهار/إخفاء عناصر القائمة الجانبية)
export const ROLE_MODULES = {
  admin: ["patients", "appointments", "emergency", "pharmacy", "lab", "hr", "billing", "reports"],
  reception: ["patients", "appointments", "billing"],
  nurse: ["patients", "emergency"],
  doctor: ["patients", "appointments", "lab"],
  pharmacist: ["pharmacy"],
  lab: ["lab"],
  accountant: ["billing", "reports"],
  hr: ["hr"]
};

export function canAccess(role, moduleKey) {
  if (role === "admin") return true;
  return (ROLE_MODULES[role] || []).includes(moduleKey);
}
