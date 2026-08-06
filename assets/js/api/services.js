// ============================================
// API الخدمات الطبية — التنفيذ الفعلي المرتبط بالكتالوج + الزيارة
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, getDoc, query, where, orderBy,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { record } from "./auditLog.js";
import { checkAndCloseVisit } from "./visits.js";

export const SERVICE_STATUS = {
  waiting_for_payment: { label: "بانتظار الدفع", badge: "badge-neutral" },
  paid: { label: "مدفوعة", badge: "badge-neutral" },
  waiting: { label: "بانتظار التنفيذ", badge: "badge-neutral" },
  in_progress: { label: "قيد التنفيذ", badge: "badge-neutral" },
  completed: { label: "مكتملة", badge: "badge-success" },
  delivered: { label: "تم التسليم", badge: "badge-success" },
  cancelled: { label: "ملغاة", badge: "badge-danger" },
  rejected: { label: "مرفوضة", badge: "badge-danger" }
};

// إضافة خدمة لزيارة — فقط من قسم مُحوَّل له المريض ضمن visit.referrals
export async function addService({ visitId, patientId, patientName, patientMRN, departmentId, catalogServiceId, serviceName, price, skipPaymentGate }, actor) {
  try {
    const docRef = await addDoc(collection(db, "services"), {
      visitId, patientId, patientName, patientMRN,
      departmentId, catalogServiceId,
      serviceName, price: Number(price) || 0,
      discount: 0, finalPrice: Number(price) || 0,
      status: "waiting_for_payment",
      skipPaymentGate: !!skipPaymentGate,
      result: "",
      requestedBy: actor?.uid || null,
      requestedByName: actor?.name || "",
      createdAt: serverTimestamp(),
      completedAt: null,
      deliveredAt: null
    });
    await record({
      userId: actor?.uid, userName: actor?.name,
      action: "create", entityType: "services", entityId: docRef.id,
      details: { visitId, serviceName }
    });
    return { success: true, serviceId: docRef.id };
  } catch (err) {
    console.error(err);
    return { success: false, errorCode: "CREATE_FAILED", message: "تعذر إضافة الخدمة" };
  }
}

export async function updateServiceStatus(serviceId, newStatus, extra = {}, actor) {
  const payload = { status: newStatus, ...extra };
  if (newStatus === "completed") payload.completedAt = serverTimestamp();
  if (newStatus === "delivered") payload.deliveredAt = serverTimestamp();

  await updateDoc(doc(db, "services", serviceId), payload);
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "status_change", entityType: "services", entityId: serviceId,
    details: { newStatus }
  });

  const snap = await getDoc(doc(db, "services", serviceId));
  if (snap.exists() && ["delivered", "cancelled", "rejected"].includes(newStatus)) {
    await checkAndCloseVisit(snap.data().visitId);
  }
  return { success: true };
}

export function subscribeDepartmentServices(departmentId, callback) {
  const q = query(
    collection(db, "services"),
    where("departmentId", "==", departmentId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export function subscribeVisitServices(visitId, callback) {
  const q = query(collection(db, "services"), where("visitId", "==", visitId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// اشتراك حي بكل الخدمات بحالة معيّنة عبر كل الأقسام (تُستخدم بطابور الكاشير الموحّد)
export function subscribeServicesByStatus(status, callback) {
  const q = query(collection(db, "services"), where("status", "==", status), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
