// ============================================
// سجل النشاط المركزي (Audit Trail)
// لا يُستدعى مباشرة من الواجهات — فقط من داخل ملفات api/* الأخرى
// ============================================
import { db } from "../firebase-config.js";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function record({ userId, userName, action, entityType, entityId, details }) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      userId, userName, action, entityType, entityId,
      details: details || {},
      createdAt: serverTimestamp()
    });
  } catch (err) {
    // فشل تسجيل الـ Audit لا يجب أن يوقف العملية الأساسية أبداً
    console.error("Audit log failed:", err);
  }
}

export async function getLogsForEntity(entityId, max = 50) {
  const q = query(
    collection(db, "auditLogs"),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecentLogs(max = 100) {
  const q = query(collection(db, "auditLogs"), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
