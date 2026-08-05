// ============================================
// API الزيارات — Visit ID مستقل، تحويلات متعددة، إغلاق تلقائي
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { record } from "./auditLog.js";

export async function createVisit({ patientId, patientName, patientMRN, visitType, priority, referrals, notes, paymentModel }, actor) {
  if (!referrals || !referrals.length) {
    return { success: false, errorCode: "INVALID_REFERRAL", message: "يجب تحديد قسم واحد على الأقل" };
  }
  try {
    const docRef = await addDoc(collection(db, "visits"), {
      patientId, patientName, patientMRN,
      visitType: visitType || "normal",
      priority: priority || "normal",
      status: "sent",
      referrals: referrals.map(r => ({ ...r, sentAt: new Date().toISOString(), status: "pending" })),
      paymentModel: paymentModel || "per_service",
      settlementStatus: "open",
      dischargedAt: null,
      notes: notes || "",
      createdAt: serverTimestamp(),
      createdBy: actor?.uid || null
    });
    await record({
      userId: actor?.uid, userName: actor?.name,
      action: "create", entityType: "visits", entityId: docRef.id,
      details: { patientId, referrals }
    });
    return { success: true, visitId: docRef.id };
  } catch (err) {
    console.error(err);
    return { success: false, errorCode: "CREATE_FAILED", message: "تعذر إنشاء الزيارة" };
  }
}

export async function addReferral(visitId, referral, actor) {
  const visitSnap = await getDoc(doc(db, "visits", visitId));
  if (!visitSnap.exists()) return { success: false, message: "الزيارة غير موجودة" };
  const visit = visitSnap.data();
  if (visit.status === "closed") {
    return { success: false, errorCode: "VISIT_CLOSED", message: "الزيارة مقفلة — أعد فتحها أولاً" };
  }
  const referrals = [...(visit.referrals || []), { ...referral, sentAt: new Date().toISOString(), status: "pending" }];
  await updateDoc(doc(db, "visits", visitId), { referrals });
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "update", entityType: "visits", entityId: visitId,
    details: { addedReferral: referral }
  });
  return { success: true };
}

// تُستدعى من services.js كل ما تتحدث حالة خدمة — تتحقق هل كل خدمات الزيارة بحالة نهائية
export async function checkAndCloseVisit(visitId) {
  const visitSnap = await getDoc(doc(db, "visits", visitId));
  if (!visitSnap.exists()) return;
  const visit = visitSnap.data();
  if (visit.paymentModel === "deferred_tab") return; // يُقفل يدوياً فقط عند التصفية

  const servicesSnap = await getDocs(query(collection(db, "services"), where("visitId", "==", visitId)));
  const services = servicesSnap.docs.map(d => d.data());
  if (!services.length) return;

  const terminal = ["delivered", "cancelled", "rejected"];
  const allDone = services.every(s => terminal.includes(s.status));
  if (allDone && visit.status !== "closed") {
    await updateDoc(doc(db, "visits", visitId), { status: "closed" });
  }
}

export async function reopenVisit(visitId, reason, actor) {
  if (!reason || reason.trim().length < 5) {
    return { success: false, errorCode: "REASON_REQUIRED", message: "سبب إعادة الفتح إلزامي (٥ أحرف على الأقل)" };
  }
  await updateDoc(doc(db, "visits", visitId), { status: "in_service" });
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "status_change", entityType: "visits", entityId: visitId,
    details: { newStatus: "reopened", reason }
  });
  return { success: true };
}

export function subscribePatientVisits(patientId, callback) {
  const q = query(collection(db, "visits"), where("patientId", "==", patientId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function getVisit(visitId) {
  const snap = await getDoc(doc(db, "visits", visitId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
