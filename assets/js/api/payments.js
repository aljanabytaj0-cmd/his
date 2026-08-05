// ============================================
// API الدفعات — تحصيل عادي + تصفية حساب الطوارئ المفتوح
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, getDocs, query, where, runTransaction, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { record } from "./auditLog.js";

async function nextReceiptNumber() {
  const counterRef = doc(db, "counters", "receipts");
  return runTransaction(db, async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.exists() ? snap.data().value : 0) + 1;
    t.set(counterRef, { value: next }, { merge: true });
    return "RCT-" + String(next).padStart(6, "0");
  });
}

// تحصيل دفعة عادية لخدمة أو أكثر
export async function collectPayment({ visitId, patientId, serviceIds, amount, discount }, actor) {
  const receiptNumber = await nextReceiptNumber();
  const payDoc = await addDoc(collection(db, "payments"), {
    visitId, patientId, serviceIds,
    amount: Number(amount) || 0,
    discount: Number(discount) || 0,
    receiptNumber,
    collectedBy: actor?.uid || null,
    collectedByName: actor?.name || "",
    createdAt: serverTimestamp()
  });

  for (const sid of serviceIds) {
    await updateDoc(doc(db, "services", sid), { status: "paid" });
  }

  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "payment", entityType: "payments", entityId: payDoc.id,
    details: { visitId, amount, receiptNumber }
  });

  return { success: true, receiptNumber, paymentId: payDoc.id };
}

// تصفية الحساب المفتوح بالكامل عند خروج المريض (الطوارئ)
export async function settleEmergencyTab(visitId, actor) {
  const servicesSnap = await getDocs(query(collection(db, "services"), where("visitId", "==", visitId)));
  const services = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const unpaid = services.filter(s => !["cancelled", "rejected"].includes(s.status));
  const total = unpaid.reduce((sum, s) => sum + (s.finalPrice || s.price || 0), 0);

  const result = await collectPayment({
    visitId,
    patientId: unpaid[0]?.patientId,
    serviceIds: unpaid.map(s => s.id),
    amount: total,
    discount: 0
  }, actor);

  for (const s of unpaid) {
    await updateDoc(doc(db, "services", s.id), { status: "delivered" });
  }
  await updateDoc(doc(db, "visits", visitId), {
    status: "closed", settlementStatus: "settled", dischargedAt: serverTimestamp()
  });

  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "payment", entityType: "visits", entityId: visitId,
    details: { emergencySettlement: true, total }
  });

  return { success: true, total, receiptNumber: result.receiptNumber };
}
