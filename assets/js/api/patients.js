// ============================================
// API المرضى — بديل الوصول المباشر لـ Firestore من الواجهات
// ============================================
import { db } from "../firebase-config.js";
import {
  collection, addDoc, updateDoc, doc, getDoc, getDocs, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { generateMRN } from "../mrn.js";
import { record } from "./auditLog.js";

export async function createPatient(input, actor) {
  try {
    const mrn = await generateMRN();
    const docRef = await addDoc(collection(db, "patients"), {
      mrn,
      name: input.name,
      motherName: input.motherName || "",
      gender: input.gender,
      age: Number(input.age) || null,
      maritalStatus: input.maritalStatus || "",
      phone: input.phone || "",
      altPhone: input.altPhone || "",
      province: input.province || "",
      district: input.district || "",
      address: input.address || "",
      nationalId: input.nationalId || "",
      cardNumber: input.cardNumber || "",
      bloodType: input.bloodType || "",
      allergies: input.allergies || "",
      chronicConditions: input.chronicConditions || "",
      insuranceProvider: input.insuranceProvider || "",
      insuranceNumber: input.insuranceNumber || "",
      isInsured: !!input.isInsured,
      insuranceType: input.isInsured ? (input.insuranceType || "") : "",
      nationality: input.nationality || "عراقي",
      notes: input.notes || "",
      active: true,
      createdAt: serverTimestamp(),
      createdBy: actor?.uid || null
    });

    await record({
      userId: actor?.uid, userName: actor?.name,
      action: "create", entityType: "patients", entityId: docRef.id,
      details: { name: input.name, mrn }
    });

    return { success: true, patientId: docRef.id, mrn };
  } catch (err) {
    console.error(err);
    return { success: false, errorCode: "CREATE_FAILED", message: "تعذر حفظ المريض" };
  }
}

export async function updatePatient(patientId, patch, actor) {
  await updateDoc(doc(db, "patients", patientId), patch);
  await record({
    userId: actor?.uid, userName: actor?.name,
    action: "update", entityType: "patients", entityId: patientId, details: patch
  });
  return { success: true };
}

export function subscribeAllPatients(callback) {
  const q = query(collection(db, "patients"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export async function getPatient(patientId) {
  const snap = await getDoc(doc(db, "patients", patientId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
