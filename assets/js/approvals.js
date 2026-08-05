// ============================================
// API طلبات الموافقة المالية — الكاشير يطلب، المدير المالي يعتمد
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { record } from "./auditLog.js";

export async function requestApproval({ type, relatedServiceId, relatedPaymentId, reason, amount }, actor) {
  if (!reason || !reason.trim()) {
    return { success: false, errorCode: "REASON_REQUIRED", message: "سبب الطلب إلزامي" };
  }
  const docRef = await addDoc(collection(db, "approvalRequests"), {
    type, relatedServiceId: relatedServiceId || null, relatedPaymentId: relatedPaymentId || null,
    reason, amount: Number(amount) || 0,
    status: "pending",
    requestedBy: actor?.uid || null,
    requestedByName: actor?.name || "",
    reviewedBy: null, reviewedByName: null, reviewNote: "",
    createdAt: serverTimestamp(), reviewedAt: null
  });
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "create", entityType: "approvalRequests", entityId: docRef.id,
    details: { type, amount }
  });
  return { success: true, requestId: docRef.id };
}

export async function reviewApproval(requestId, decision, note, actor) {
  await updateDoc(doc(db, "approvalRequests", requestId), {
    status: decision, // "approved" | "rejected"
    reviewedBy: actor?.uid || null,
    reviewedByName: actor?.name || "",
    reviewNote: note || "",
    reviewedAt: serverTimestamp()
  });
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "approve", entityType: "approvalRequests", entityId: requestId,
    details: { decision, note }
  });
  return { success: true };
}

export function subscribePendingApprovals(callback) {
  const q = query(
    collection(db, "approvalRequests"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
