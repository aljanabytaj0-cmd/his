// ============================================
// البيانات المرجعية: الصلاحيات، الأدوار، الأقسام، تسلسل الحالات
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, doc, setDoc, getDocs, getDoc, addDoc, updateDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- القائمة الثابتة للصلاحيات ----------
export const PERMISSIONS = [
  { id: "view", label: "عرض" },
  { id: "create", label: "إنشاء" },
  { id: "update", label: "تعديل" },
  { id: "delete", label: "تعطيل (حذف ناعم)" },
  { id: "approve", label: "اعتماد" },
  { id: "print", label: "طباعة" },
  { id: "export", label: "تصدير" },
  { id: "upload_files", label: "رفع ملفات" },
  { id: "download_files", label: "تحميل ملفات" },
  { id: "view_financial", label: "رؤية البيانات المالية" },
  { id: "view_medical", label: "رؤية البيانات الطبية التفصيلية" },
  { id: "view_reports", label: "رؤية التقارير والإحصاء" },
  { id: "manage_users", label: "إدارة المستخدمين" },
  { id: "manage_roles", label: "إدارة الأدوار والصلاحيات" },
  { id: "manage_catalog", label: "إدارة كتالوج الخدمات" },
  { id: "manage_settings", label: "إدارة إعدادات النظام" }
];

// ---------- الأدوار الافتراضية عند أول تشغيل ----------
export const DEFAULT_ROLES = [
  { id: "admin", name: "مدير النظام", permissions: PERMISSIONS.map(p => p.id), departmentScope: "all" },
  { id: "reception", name: "موظف استعلامات", permissions: ["view", "create", "update", "print"], departmentScope: "all" },
  { id: "department_staff", name: "موظف قسم", permissions: ["view", "create", "update", "view_medical", "upload_files", "download_files", "print"], departmentScope: [] },
  { id: "doctor", name: "طبيب", permissions: ["view", "create", "update", "view_medical", "upload_files", "download_files", "print"], departmentScope: [] },
  { id: "cashier", name: "كاشير", permissions: ["view", "create", "view_financial", "print"], departmentScope: [] },
  { id: "financial_manager", name: "مدير مالي", permissions: ["view", "approve", "view_financial", "view_reports", "export"], departmentScope: [] },
  { id: "stats_viewer", name: "إحصاء", permissions: ["view", "view_reports", "export"], departmentScope: "all" },
  { id: "hr", name: "موارد بشرية", permissions: ["view", "create", "update"], departmentScope: [] }
];

export const DEFAULT_WORKFLOW = {
  states: ["waiting_for_payment", "paid", "waiting", "in_progress", "completed", "delivered"],
  terminalStates: ["cancelled", "rejected"]
};

// ---------- بذر البيانات الابتدائية (تُستدعى مرة واحدة من صفحة الترحيل) ----------
export async function seedInitialData() {
  const results = [];

  for (const p of PERMISSIONS) {
    await setDoc(doc(db, "permissions", p.id), { label: p.label });
  }
  results.push(`تم زرع ${PERMISSIONS.length} صلاحية`);

  for (const r of DEFAULT_ROLES) {
    await setDoc(doc(db, "roles", r.id), {
      name: r.name, permissions: r.permissions, departmentScope: r.departmentScope
    });
  }
  results.push(`تم زرع ${DEFAULT_ROLES.length} دور`);

  await setDoc(doc(db, "workflowConfig", "default"), DEFAULT_WORKFLOW);
  results.push("تم زرع إعدادات Workflow الافتراضية");

  return results;
}

// ---------- الأقسام ----------
export async function getDepartments() {
  const snap = await getDocs(query(collection(db, "departments"), orderBy("name")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addDepartment({ name, type, paymentModel, requiresDoctorAssignment }) {
  return addDoc(collection(db, "departments"), {
    name, type: type || "clinical",
    paymentModel: paymentModel || "per_service",
    requiresDoctorAssignment: !!requiresDoctorAssignment,
    active: true
  });
}

export async function updateDepartment(id, patch) {
  await updateDoc(doc(db, "departments", id), patch);
}

// ---------- الأدوار ----------
export async function getRoles() {
  const snap = await getDocs(collection(db, "roles"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveRole(roleId, { name, permissions, departmentScope }) {
  await setDoc(doc(db, "roles", roleId), { name, permissions, departmentScope }, { merge: true });
}

// ---------- كتالوج الخدمات ----------
export async function getCatalogByDepartment(departmentId) {
  const snap = await getDocs(collection(db, "serviceCatalog"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(s => s.departmentId === departmentId && s.active !== false);
}

export async function addCatalogService({ departmentId, name, defaultPrice, insurancePrice, requiresPayment }) {
  return addDoc(collection(db, "serviceCatalog"), {
    departmentId, name,
    defaultPrice: Number(defaultPrice) || 0,
    insurancePrice: Number(insurancePrice) || 0,
    requiresPayment: requiresPayment !== false,
    active: true
  });
}

export async function updateCatalogService(id, patch) {
  await updateDoc(doc(db, "serviceCatalog", id), patch);
}

export async function getWorkflowConfig() {
  const snap = await getDoc(doc(db, "workflowConfig", "default"));
  return snap.exists() ? snap.data() : DEFAULT_WORKFLOW;
}
