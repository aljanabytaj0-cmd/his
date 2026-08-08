// ============================================
// بناء القائمة الجانبية حسب صلاحيات المستخدم — نسخة ديناميكية
// الأقسام السريرية تُسحب مباشرة من قاعدة البيانات (departments)
// ============================================
import { logout } from "./auth.js";
import { getDepartments } from "./api/referenceData.js";

const CORE_MODULES = [
  { key: "dashboard",  label: "الرئيسية",              icon: "⌂", href: "dashboard.html", always: true },
  { key: "reception",  label: "الاستعلامات",            icon: "🧾", href: "reception.html", requiresPermission: "create" },
  { key: "patients",   label: "المرضى والملفات الطبية", icon: "🩺", href: "patients.html" },
];

const STATIC_TAIL = [
  { key: "cashier",  label: "الكاشير",             icon: "💵", href: "cashier.html", requiresPermission: "view_financial" },
  { key: "emergency_checkout", label: "تصفية الطوارئ", icon: "🚑", href: "emergency-checkout.html", requiresPermission: "view_financial" },
  { key: "financial_manager", label: "المدير المالي", icon: "🧾", href: "financial-manager.html", requiresPermission: "approve" },
  { key: "billing",  label: "الفوترة والحسابات",  icon: "💳", href: "#", soon: true },
  { key: "hr",       label: "الموارد البشرية",    icon: "👥", href: "#", soon: true },
  { key: "reports",  label: "التقارير الشهرية",   icon: "📊", href: "#", soon: true },
  { key: "admin",    label: "لوحة الأدمن",        icon: "⚙️", href: "admin.html", requiresPermission: "manage_users" },
];

const DEPT_ICONS = { clinical: "🏥", financial: "💳", administrative: "🗂️" };

export async function renderSidebar(activeKey, profile) {
  const mount = document.getElementById("sidebar-mount");
  if (!mount) return;

  let departments = [];
  try {
    departments = await getDepartments();
  } catch (err) {
    console.error("تعذر تحميل الأقسام بالقائمة الجانبية:", err);
  }

  const visibleDepts = departments.filter(d => {
    if (d.active === false) return false;
    if (profile.hasAllDepartments) return true;
    return (profile.departmentIds || []).includes(d.id);
  });

  const coreItems = CORE_MODULES.filter(m =>
    m.always || !m.requiresPermission || (profile.permissions || []).includes(m.requiresPermission)
  );

  const deptItems = visibleDepts.map(d => ({
    key: "dept_" + d.id,
    label: d.name,
    icon: DEPT_ICONS[d.type] || "🏬",
    href: `department-queue-v2.html?dept=${d.id}`
  }));

  const tailItems = STATIC_TAIL.filter(m =>
    !m.requiresPermission || (profile.permissions || []).includes(m.requiresPermission)
  );

  if (profile.isConsultant) {
    tailItems.unshift({ key: "consultant_queue", label: "طابور مرضاي", icon: "🩺", href: "consultant-queue.html" });
  }

  function renderGroup(items) {
    return items.map(m => {
      const isActive = m.key === activeKey;
      const isDisabled = !!m.soon;
      const cls = ["nav-item", isActive ? "active" : "", isDisabled ? "disabled" : ""].join(" ").trim();
      const suffix = isDisabled ? ' <span style="opacity:.5;font-size:11px">(قريباً)</span>' : "";
      return `<a class="${cls}" href="${m.href}"><span class="nav-icon">${m.icon}</span><span>${m.label}${suffix}</span></a>`;
    }).join("");
  }

  const initials = (profile.name || "?").trim().charAt(0);
  const deptGroupHtml = deptItems.length
    ? `<div class="nav-group-label">الأقسام</div>${renderGroup(deptItems)}`
    : "";

  mount.innerHTML = `
    <div class="sidebar-brand">
      <div class="logo-dot">ح</div>
      <div class="sidebar-brand-text">
        <div class="name">نظام إدارة المستشفى</div>
        <div class="sub">${profile.hospitalName || "لوحة التحكم"}</div>
      </div>
    </div>
    <div class="nav-group-label">القائمة</div>
    ${renderGroup(coreItems)}
    ${deptGroupHtml}
    <div class="nav-group-label">إدارة</div>
    ${renderGroup(tailItems)}
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="avatar">${initials}</div>
        <div class="info">
          <div class="uname">${profile.name || "مستخدم"}</div>
          <div class="urole">${(profile.roles || []).map(r => r.name).join("، ") || "بدون دور"}</div>
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
