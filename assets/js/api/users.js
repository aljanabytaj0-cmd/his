// ============================================
// إدارة المستخدمين (يستبدل مفهوم employees القديم بنسخة موسّعة)
// ============================================
import { app, db } from "../firebase-config.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, doc, setDoc, updateDoc, getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { record } from "./auditLog.js";

// إنشاء موظف جديد بدون تسجيل خروج الأدمن الحالي:
// نستخدم نسخة ثانوية مؤقتة من تطبيق Firebase بس لعملية الإنشاء، ثم نتخلص منها فوراً.
export async function createEmployee({ name, email, password, roleIds, departmentIds, isConsultant, specialty, createdBy, createdByName }) {
  const secondaryApp = initializeApp(app.options, "secondary-" + Date.now());
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    await setDoc(doc(db, "users", uid), {
      name, email,
      roleIds: roleIds || [],
      departmentIds: departmentIds || [],
      isConsultant: !!isConsultant,
      specialty: isConsultant ? (specialty || "") : "",
      active: true,
      createdAt: new Date(),
      createdBy
    });

    await record({
      userId: createdBy, userName: createdByName,
      action: "create", entityType: "users", entityId: uid,
      details: { name, email, roleIds, departmentIds, isConsultant, specialty }
    });

    return { success: true, uid };
  } catch (err) {
    return { success: false, errorCode: err.code || "UNKNOWN", message: mapAuthError(err.code) };
  } finally {
    await secondaryAuth.signOut().catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

export async function getUsers() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateUserRolesAndDepartments(uid, { roleIds, departmentIds }) {
  await updateDoc(doc(db, "users", uid), { roleIds, departmentIds });
}

export async function setUserActive(uid, active, { changedBy, changedByName }) {
  await updateDoc(doc(db, "users", uid), { active });
  await record({
    userId: changedBy, userName: changedByName,
    action: "status_change", entityType: "users", entityId: uid,
    details: { active }
  });
}

export async function sendPasswordReset(email) {
  const { auth } = await import("../firebase-config.js");
  await sendPasswordResetEmail(auth, email);
}

function mapAuthError(code) {
  const map = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مستخدم مسبقاً",
    "auth/weak-password": "كلمة المرور ضعيفة (٦ أحرف على الأقل)",
    "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة"
  };
  return map[code] || "حدث خطأ أثناء إنشاء الحساب";
}
