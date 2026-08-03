// ============================================
// توليد رقم الملف الطبي الموحّد (MRN)
// ============================================
import { db } from "./firebase-config.js";
import {
  doc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// يولّد رقم ملف تسلسلي فريد بصيغة MRN-000123
// يستخدم Firestore Transaction لضمان عدم تكرار الرقم حتى لو سجّل موظفان بنفس اللحظة
export async function generateMRN() {
  const counterRef = doc(db, "counters", "patients");
  const newValue = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() ? snap.data().value : 0;
    const next = current + 1;
    transaction.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return "MRN-" + String(newValue).padStart(6, "0");
}
