// ============================================
// بناء القائمة الجانبية حسب صلاحيات المستخدم
// ============================================
import { ROLE_LABELS, canAccess, logout } from "./auth.js";

const MODULES = [
  { key: "dashboard",    label: "الرئيسية",              icon: "⌂", href: "dashboard.html",   always: true },
  { key: "patients",     label: "المرضى والملفات الطبية", icon: "🩺", href: "patients.html" },
  { key: "appointments", label: "المواعيد والحجوزات",     icon: "📅", href: "#", soon: true },
  { key: "emergency",    label: "الطوارئ والأسرّة",        icon: "🛏", href: "#", soon: true },
  { key: "pharmacy",     label: "الصيدلية والمخزون",       icon: "💊", href: "#", soon: true },
  { key: "lab",          label: "المختبر والأشعة",         icon: "🧪", href: "#", soon: true },
  { key: "billing",      label: "الفوترة والحسابات",       icon: "💳", href: "#", soon: true },
  { key: "hr",           label: "الموارد البشرية",         icon: "👥", href: "#", soon: true },
  { key: "reports",      label: "التقارير الشهرية",        icon: "📊", href: "#", soon: true },
];

export function renderSidebar(activeKey, profile) {
  const mount = document.getElementById("sidebar-mount");
  if (!mount) return;

  const items = MODULES.map(m => {
    if (!m.always && !canAccess(profile.role, m.key)) return "";
    const isActive = m.key === activeKey;
    const isDisabled = !!m.soon;
    const cls = ["nav-item", isActive ? "active" : "", isDisabled ? "disabled" : ""].join(" ").trim();
    const suffix = isDisabled ? ' <span style="opacity:.5;font-size:11px">(قريباً)</span>' : "";
    return `<a class="${cls}" href="${m.href}"><span class="nav-icon">${m.icon}</span><span>${m.label}${suffix}</span></a>`;
  }).join("");

  const initials = (profile.name || "?").trim().charAt(0);

  mount.innerHTML = `
    <div class="sidebar-brand">
      <div class="logo-dot">ح</div>
      <div class="sidebar-brand-text">
        <div class="name">نظام إدارة المستشفى</div>
        <div class="sub">${profile.hospitalName || "لوحة التحكم"}</div>
      </div>
    </div>
    <div class="nav-group-label">القائمة</div>
    ${items}
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="avatar">${initials}</div>
        <div class="info">
          <div class="uname">${profile.name || "مستخدم"}</div>
          <div class="urole">${ROLE_LABELS[profile.role] || profile.role || ""}</div>
        </div>
      </div>
      <a href="#" id="logout-btn" class="logout-link">تسجيل الخروج ⟵</a>
    </div>
  `;

  document.getElementById("logout-btn").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}
