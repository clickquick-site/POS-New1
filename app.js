
// التحقق من تسجيل الدخول
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user && !window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
        return null;
    }
    return user;
}

// تحديث التاريخ والوقت
function updateDateTime() {
    const now = new Date();
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    document.querySelectorAll('.datetime').forEach(el => {
        el.textContent = now.toLocaleString('ar-DZ', options);
    });
}

// تحميل معلومات المستخدم الحالي
function loadCurrentUser() {
    const user = JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(sessionStorage.getItem('currentUser'));
    if (user) {
        document.querySelectorAll('.user-info').forEach(el => {
            el.textContent = `${user.fullName || user.username} (${user.role})`;
        });
    }
}

// الحصول على المستخدم الحالي
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser')) || JSON.parse(sessionStorage.getItem('currentUser'));
}

// تسجيل الخروج
function logout() {
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// فتح وإغلاق المودالات
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// تهيئة الصفحات
document.addEventListener('DOMContentLoaded', function() {
    if (!window.location.pathname.includes('index.html')) {
        checkAuth();
        loadCurrentUser();
    }
    updateDateTime();
    setInterval(updateDateTime, 1000);
});
