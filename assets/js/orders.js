// ============================================
// نظام الطلبات المركزي — يربط ملف المريض بكل الأقسام
// ============================================
import { db } from "./firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, query, where, orderBy,
  onSnapshot, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// خريطة الأقسام المتاحة للطلبات (يُضاف عليها لاحقاً: appointments, emergency, billing...)
export const DEPARTMENTS = {
  pharmacy: { label: "الصيدلية", icon: "💊" },
  lab: { label: "المختبر", icon: "🧪" },
  radiology: { label: "الأشعة", icon: "📷" }
};

export const ORDER_STATUS = {
  pending: { label: "بانتظار التنفيذ", badge: "badge-neutral" },
  in_progress: { label: "قيد التنفيذ", badge: "badge-neutral" },
  completed: { label: "مكتمل", badge: "badge-success" },
  cancelled: { label: "ملغى", badge: "badge-danger" }
};

// إنشاء طلب جديد — يُستدعى من ملف المريض (patients.html)
// يُخزّن اسم المريض ورقم ملفه مباشرة بالطلب (denormalized) حتى تعرضهم شاشة القسم فوراً بدون استعلام إضافي
export async function createOrder({ patientId, patientName, patientMRN, department, orderType, notes, requestedBy, requestedByName }) {
  return addDoc(collection(db, "orders"), {
    patientId,
    patientName,
    patientMRN,
    department,          // pharmacy | lab | radiology ...
    orderType,            // نص وصفي: اسم الدواء، نوع التحليل، نوع الأشعة...
    notes: notes || "",
    status: "pending",
    requestedBy,
    requestedByName,
    createdAt: serverTimestamp(),
    completedAt: null,
    result: ""
  });
}

// اشتراك حي بكل طلبات قسم معيّن (تُستخدم بشاشة كل قسم)
export function subscribeDepartmentOrders(department, callback) {
  const q = query(
    collection(db, "orders"),
    where("department", "==", department),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// اشتراك حي بكل طلبات مريض معيّن (تُستخدم بملف المريض لعرض تاريخ طلباته)
export function subscribePatientOrders(patientId, callback) {
  const q = query(
    collection(db, "orders"),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// تحديث حالة الطلب من داخل شاشة القسم (بدء التنفيذ / إكمال مع نتيجة / إلغاء)
export async function updateOrderStatus(orderId, status, extra = {}) {
  const payload = { status, ...extra };
  if (status === "completed") payload.completedAt = serverTimestamp();
  await updateDoc(doc(db, "orders", orderId), payload);
}
