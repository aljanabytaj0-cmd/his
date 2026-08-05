// ============================================
// المصادقة وإدارة الصلاحيات — النسخة المحدّثة (نظام users/roles الديناميكي)
// ============================================
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, getDocs, collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}

// يجلب ملف المستخدم من users/{uid}، ويدمج صلاحيات كل أدواره بمصفوفة واحدة موحّدة
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const userData = { id: snap.id, ...snap.data() };

  const rolesSnap = await getDocs(collection(db, "roles"));
  const allRoles = rolesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const myRoles = allRoles.filter(r => (userData.roleIds || []).includes(r.id));

  const permissionSet = new Set();
  let hasAllDepartments = false;
  myRoles.forEach(r => {
    (r.permissions || []).forEach(p => permissionSet.add(p));
    if (r.departmentScope === "all") hasAllDepartments = true;
  });

  return {
    ...userData,
    roles: myRoles,
    permissions: Array.from(permissionSet),
    hasAllDepartments,
    // متوافق مع الكود القديم اللي يتوقع "role" مفرد (أول دور بمصفوفة roleIds)
    role: (userData.roleIds || [])[0] || null
  };
}

export function hasPermission(profile, permissionKey) {
  if (!profile) return false;
  return (profile.permissions || []).includes(permissionKey);
}

export function canAccessDepartment(profile, departmentId) {
  if (!profile) return false;
  if (profile.hasAllDepartments) return true;
  return (profile.departmentIds || []).includes(departmentId);
}

export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
    const profile = await getUserProfile(user.uid);
    if (!profile || profile.active === false) {
      await signOut(auth);
      window.location.href = "index.html?disabled=1";
      return;
    }
    callback({ user, profile });
  });
}

// حارس إضافي: يستدعى بعد requireAuth للتحقق من صلاحية دخول صفحة معيّنة
export function requirePermission(profile, permissionKey) {
  if (!hasPermission(profile, permissionKey)) {
    document.body.innerHTML = `<div style="padding:60px;text-align:center;font-family:sans-serif;direction:rtl;">
      <h2>لا تملك صلاحية الوصول لهذه الصفحة</h2>
      <a href="dashboard.html">العودة للرئيسية</a></div>`;
    return false;
  }
  return true;
}
