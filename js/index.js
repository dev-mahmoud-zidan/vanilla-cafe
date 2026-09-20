// ==========================================
// 1. الإعدادات وكلمة المرور
// ==========================================
const ADMIN_PASSWORD = "2242"; // كلمة مرور لوحة التحكم
const WHATSAPP_NUMBER = "201023276505"; // رقم الواتساب بدون +

// البيانات الافتراضية للأقسام (فارغة - سيضيفها الآدمن فقط)
const defaultCategories = [];

// البيانات الافتراضية للأصناف (فارغة - سيضيفها الآدمن فقط)
const defaultItems = [];

let categories = JSON.parse(localStorage.getItem('vanilla_categories')) || defaultCategories;
let items = JSON.parse(localStorage.getItem('vanilla_items')) || defaultItems;

let adminModalInstance = null;
let loginModalInstance = null;
let orderModalInstance = null;
let editItemModalInstance = null; // نسخة مودال التعديل
let isAuthenticated = false; // حالة التحقق من الآدمن

// كائن لحفظ الكميات المختارة
let selectedOrderItems = {};

// ==========================================
// 2. عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const adminElem = document.getElementById('adminModal');
    if (adminElem && window.bootstrap) adminModalInstance = new bootstrap.Modal(adminElem);

    const loginElem = document.getElementById('loginModal');
    if (loginElem && window.bootstrap) loginModalInstance = new bootstrap.Modal(loginElem);

    const orderElem = document.getElementById('orderModal');
    if (orderElem && window.bootstrap) orderModalInstance = new bootstrap.Modal(orderElem);

    const editItemElem = document.getElementById('editItemModal');
    if (editItemElem && window.bootstrap) editItemModalInstance = new bootstrap.Modal(editItemElem);

    renderApp();
});

// ==========================================
// 3. نظام حماية لوحة التحكم واكتشاف الدخول
// ==========================================
function toggleAdminModal() {
    if (!isAuthenticated) {
        if (loginModalInstance) {
            const passInput = document.getElementById('admin-pass-input');
            if (passInput) passInput.value = '';
            loginModalInstance.show();
        }
    } else {
        if (adminModalInstance) adminModalInstance.toggle();
    }
}

// دالة التحقق من كود الدخول الخاص بالمودال
function handleAdminLogin(e) {
    e.preventDefault();
    const passInput = document.getElementById('admin-pass-input');
    const password = passInput ? passInput.value.trim() : '';

    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        if (loginModalInstance) loginModalInstance.hide();
        if (adminModalInstance) adminModalInstance.show();
    } else {
        alert("كلمة المرور غير صحيحة!");
        if (passInput) passInput.value = '';
    }
}

// ==========================================
// 4. نظام "اطلب الآن" والحجوزات والأصناف الديناميكية
// ==========================================
function openOrderModal() {
    if (orderModalInstance) {
        orderModalInstance.show();
        handleOrderTypeChange(); // ضبط الحقول الظاهرة بحسب نوع الحجز
    }
}

// بناء قائمة المنيو التفاعلية داخل المودال ديناميكياً
function renderOrderModalMenu() {
    const groupItemsContainer = document.getElementById('group-items');
    if (!groupItemsContainer) return;

    let accordionHTML = `
        <label class="form-label fw-bold mb-1">اختر الأصناف من المنيو (اختياري):</label>
        <div class="accordion my-2" id="menuAccordion">
    `;

    categories.forEach((cat) => {
        const catItems = items.filter(item => item.category === cat.id);
        if (catItems.length === 0) return; // عدم عرض القسم إذا كان فارغاً

        const collapseId = `collapse-${cat.id}`;
        const headingId = `heading-${cat.id}`;

        accordionHTML += `
            <div class="accordion-item border rounded-3 overflow-hidden mb-2">
                <h2 class="accordion-header" id="${headingId}">
                    <button class="accordion-button collapsed py-2 bg-light fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                        <i class="fa-solid ${cat.icon || 'fa-utensils'} me-2 text-brown"></i> ${cat.name}
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#menuAccordion">
                    <div class="accordion-body p-2">
        `;

        catItems.forEach((item, itemIdx) => {
            const currentQty = selectedOrderItems[item.name] || 0;
            const borderClass = itemIdx === catItems.length - 1 ? '' : 'border-bottom';

            accordionHTML += `
                <div class="d-flex align-items-center justify-content-between py-2 ${borderClass}">
                    <div>
                        <span class="fw-bold fs-7 d-block text-dark">${item.name}</span>
                        <small class="text-muted">${item.price} SAR</small>
                    </div>
                    <div class="input-group input-group-sm" style="width: 110px;">
                        <button class="btn btn-outline-secondary" type="button" onclick="updateQty('${item.name}', -1)">-</button>
                        <input type="text" class="form-control text-center item-qty" id="qty-${item.name}" value="${currentQty}" readonly>
                        <button class="btn btn-outline-secondary" type="button" onclick="updateQty('${item.name}', 1)">+</button>
                    </div>
                </div>
            `;
        });

        accordionHTML += `
                    </div>
                </div>
            </div>
        `;
    });

    accordionHTML += `
        </div>
        <textarea id="order-items-text" class="form-control custom-input mt-2" rows="2" placeholder="الطلبات المختارة تظهر هنا تلقائياً، ويمكنك إضافة ملاحظات خاصة..."></textarea>
    `;

    groupItemsContainer.innerHTML = accordionHTML;
    syncItemsToTextArea();
}

// تحديث كمية صنف معين
function updateQty(itemName, change) {
    const inputField = document.getElementById(`qty-${itemName}`);
    let currentQty = selectedOrderItems[itemName] || 0;
    
    currentQty += change;
    if (currentQty < 0) currentQty = 0;
    
    if (inputField) inputField.value = currentQty;
    
    if (currentQty > 0) {
        selectedOrderItems[itemName] = currentQty;
    } else {
        delete selectedOrderItems[itemName];
    }
    
    syncItemsToTextArea();
}

// مزامنة العناصر المختارة داخل خانة الـ Textarea
function syncItemsToTextArea() {
    const textarea = document.getElementById('order-items-text');
    if (!textarea) return;

    let summaryText = [];
    for (const [item, qty] of Object.entries(selectedOrderItems)) {
        summaryText.push(`${qty}x ${item}`);
    }
    
    textarea.value = summaryText.join(' + ');
}

// التبديل بين حقول (عيد ميلاد - حجز في المكان - دليفري)
function handleOrderTypeChange() {
    const type = document.getElementById('order-type')?.value;
    const addressGroup = document.getElementById('group-address');
    const tableGroup = document.getElementById('group-table');
    const birthdayGroup = document.getElementById('group-birthday');

    // إخفاء جميع المجموعات أولاً
    if (addressGroup) addressGroup.style.display = 'none';
    if (tableGroup) tableGroup.style.display = 'none';
    if (birthdayGroup) birthdayGroup.style.display = 'none';

    // إظهار الحقول بناءً على الاختيار
    if (type === 'delivery') {
        if (addressGroup) addressGroup.style.display = 'block';
    } else if (type === 'in-house') {
        if (tableGroup) tableGroup.style.display = 'block';
    } else if (type === 'birthday') {
        if (birthdayGroup) birthdayGroup.style.display = 'block';
    }
}

// إرسال الطلب / الحجز عبر الواتساب
function submitBookingOrOrder(e) {
    e.preventDefault();

    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    const typeInput = document.getElementById('order-type');

    if (!nameInput || !phoneInput || !typeInput) return;

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const orderType = typeInput.value;

    let typeTitle = "";
    let extraDetails = "";

    if (orderType === 'delivery') {
        typeTitle = "🛵 طلب دليفري (توصيل)";
        const address = document.getElementById('client-address')?.value.trim() || '';
        const orderText = document.getElementById('order-items-text')?.value.trim() || '';
        extraDetails = `📍 *العنوان بالتفصيل:* ${address}\n📝 *الأصناف المطلوبة:* ${orderText || 'لم يتم تحديد أصناف'}`;
    } 
    else if (orderType === 'in-house') {
        typeTitle = "☕ حجز أوردر في المكان";
        const tableNum = document.getElementById('client-table')?.value.trim() || '';
        const orderText = document.getElementById('order-items-text')?.value.trim() || '';
        extraDetails = `🪑 *رقم الطاولة:* ${tableNum || 'غير محدد'}\n📝 *الأصناف المطلوبة:* ${orderText || 'لم يتم تحديد أصناف'}`;
    } 
    else if (orderType === 'birthday') {
        typeTitle = "🎂 حجز حفلة عيد ميلاد";
        const date = document.getElementById('birthday-date')?.value || '';
        const guests = document.getElementById('birthday-guests')?.value || '';
        const notes = document.getElementById('birthday-notes')?.value.trim() || '';
        extraDetails = `📅 *التاريخ والوقت:* ${date}\n👥 *عدد الأفراد:* ${guests}\n🎈 *ملاحظات وتجهيزات:* ${notes || 'لا يوجد'}`;
    }

    // تجهيز نص الرسالة
    const whatsappMessage = `*طلب حجز جديد - Vanilla Cafe*\n` +
        `------------------------------------\n` +
        `📌 *نوع الطلب:* ${typeTitle}\n` +
        `👤 *اسم العميل:* ${name}\n` +
        `📞 *رقم الهاتف:* ${phone}\n` +
        `${extraDetails}\n` +
        `------------------------------------`;

    // فتح رابط الواتساب مباشر
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');

    if (orderModalInstance) orderModalInstance.hide();
    alert("تم تجهيز الطلب وتحويلك للواتساب للتأكيد!");
}

// ==========================================
// 5. حفظ البيانات وعرض التطبيق
// ==========================================
function saveData() {
    localStorage.setItem('vanilla_categories', JSON.stringify(categories));
    localStorage.setItem('vanilla_items', JSON.stringify(items));
    renderApp();
}

function renderApp() {
    renderCategoryBar();
    renderMenuItems();
    renderOrderModalMenu(); // بناء عناصر مودال الطلبات ديناميكياً
    renderAdminSelectOptions();
    renderAdminItemsList();
}

function renderCategoryBar() {
    const bar = document.getElementById('category-bar');
    if (!bar) return;
    bar.innerHTML = categories.map((cat, idx) => `
        <a href="#section-${cat.id}" class="cat-btn ${idx === 0 ? 'active' : ''}">
            <i class="fa-solid ${cat.icon || 'fa-utensils'} me-1"></i>
            ${cat.name}
        </a>
    `).join('');
}

function renderMenuItems() {
    const container = document.getElementById('menu');
    if (!container) return;
    
    if (categories.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5">لا توجد أقسام أو أصناف لعرضها حالياً.</div>`;
        return;
    }

    container.innerHTML = categories.map(cat => {
        const catItems = items.filter(item => item.category === cat.id);
        if (catItems.length === 0) return '';

        return `
            <section id="section-${cat.id}" class="mb-5">
                <div class="d-flex align-items-center justify-content-center gap-3 my-4">
                    <div class="border-bottom flex-grow-1" style="max-width: 80px; border-color: var(--brand-accent) !important;"></div>
                    <h4 class="fw-bold text-brown mb-0">${cat.name}</h4>
                    <div class="border-bottom flex-grow-1" style="max-width: 80px; border-color: var(--brand-accent) !important;"></div>
                </div>

                <div class="row g-3">
                    ${catItems.map(item => `
                        <div class="col-md-4">
                            <div class="item-card d-flex align-items-center justify-content-between">
                                <div class="pe-2">
                                    <h6 class="fw-bold mb-1 text-dark">${item.name}</h6>
                                    <p class="small text-muted mb-2 text-truncate" style="max-width: 170px;">${item.desc || ''}</p>
                                    <span class="price-badge">${item.price} SAR</span>
                                </div>
                                <img src="${item.image}" alt="${item.name}" class="item-img">
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
    }).join('');
}

// ==========================================
// 6. لوحة التحكم وإضافة وتعديل وحذف الأصناف والصور
// ==========================================
function handleAddCategory(e) {
    e.preventDefault();
    const idInput = document.getElementById('cat-id-input');
    const nameInput = document.getElementById('cat-name-input');

    if (!idInput || !nameInput) return;

    const id = idInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const name = nameInput.value.trim();

    if (id && name) {
        if (categories.some(c => c.id === id)) {
            alert("معرف القسم موجود بالفعل، يرجى اختيار اسم/معرف آخر.");
            return;
        }
        categories.push({ id, name, icon: 'fa-mug-hot' });
        saveData();
        idInput.value = '';
        nameInput.value = '';
    }
}

function deleteCategory(catId) {
    if (confirm("هل أنت تأكد من حذف هذا القسم وكل الأصناف التابعة له؟")) {
        categories = categories.filter(c => c.id !== catId);
        items = items.filter(i => i.category !== catId);
        saveData();
    }
}

function renderAdminSelectOptions() {
    const selects = ['item-category', 'edit-item-category'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            if (categories.length === 0) {
                select.innerHTML = `<option value="">لا توجد أقسام المرجو إضافة قسم</option>`;
            } else {
                select.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            }
        }
    });

    const catList = document.getElementById('admin-categories-list');
    if (catList) {
        if (categories.length === 0) {
            catList.innerHTML = `<span class="text-muted small">لا توجد أقسام حالياً.</span>`;
            return;
        }
        catList.innerHTML = categories.map(cat => `
            <span class="badge bg-white text-dark border shadow-sm px-3 py-2 rounded-pill d-inline-flex align-items-center gap-2">
                <i class="fa-solid ${cat.icon || 'fa-tag'} text-amber small"></i>
                <span class="fw-bold">${cat.name}</span>
                <button type="button" onclick="deleteCategory('${cat.id}')" class="btn-close ms-1" style="font-size: 0.65rem;"></button>
            </span>
        `).join('');
    }
}

async function handleAddItem(e) {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const price = parseFloat(document.getElementById('item-price').value);
    const desc = document.getElementById('item-desc') ? document.getElementById('item-desc').value.trim() : '';
    
    if (!category) {
        alert("يرجى اختيار قسم أو إضافة قسم جديد أولاً!");
        return;
    }

    const fileInput = document.getElementById('item-image-file');
    const urlInput = document.getElementById('item-image-url');

    let imageUrl = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300";

    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            imageUrl = await convertFileToBase64(fileInput.files[0]);
        } catch (err) {
            alert("حدث خطأ في تحميل الصورة من الجهاز!");
            return;
        }
    } else if (urlInput && urlInput.value.trim() !== '') {
        imageUrl = urlInput.value.trim();
    }

    items.push({ id: Date.now(), name, category, price, image: imageUrl, desc });
    saveData();

    e.target.reset();
    alert("تمت إضافة الصنف بنجاح!");
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function deleteItem(itemId) {
    if (confirm("هل تريد حذف هذا الصنف؟")) {
        items = items.filter(i => i.id !== itemId);
        saveData();
    }
}

// فتح مودال التعديل وتعبئة بيانات الصنف
function openEditItemModal(itemId) {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    renderAdminSelectOptions();
    
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('edit-item-name').value = item.name;
    document.getElementById('edit-item-category').value = item.category;
    document.getElementById('edit-item-price').value = item.price;
    
    const urlInput = document.getElementById('edit-item-image-url');
    if (urlInput) {
        urlInput.value = (item.image && !item.image.startsWith('data:')) ? item.image : '';
    }
    
    const descInput = document.getElementById('edit-item-desc');
    if (descInput) {
        descInput.value = item.desc || '';
    }

    if (editItemModalInstance) {
        editItemModalInstance.show();
    } else {
        const el = document.getElementById('editItemModal');
        if (el) {
            editItemModalInstance = new bootstrap.Modal(el);
            editItemModalInstance.show();
        }
    }
}

// حفظ تعديلات الصنف
async function handleEditItemSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-item-id').value);
    const itemIndex = items.findIndex(i => i.id === id);
    if (itemIndex === -1) return;

    const fileInput = document.getElementById('edit-item-image-file');
    const urlInput = document.getElementById('edit-item-image-url');
    
    let newImage = items[itemIndex].image;
    if (fileInput && fileInput.files && fileInput.files[0]) {
        try {
            newImage = await convertFileToBase64(fileInput.files[0]);
        } catch (err) {
            alert("حدث خطأ في تحميل الصورة الجديدة!");
            return;
        }
    } else if (urlInput && urlInput.value.trim() !== '') {
        newImage = urlInput.value.trim();
    }
    
    items[itemIndex] = {
        ...items[itemIndex],
        name: document.getElementById('edit-item-name').value.trim(),
        category: document.getElementById('edit-item-category').value,
        price: parseFloat(document.getElementById('edit-item-price').value),
        image: newImage,
        desc: document.getElementById('edit-item-desc') ? document.getElementById('edit-item-desc').value.trim() : items[itemIndex].desc
    };

    saveData();

    if (editItemModalInstance) {
        editItemModalInstance.hide();
    }
    alert("تم تحديث الصنف بنجاح!");
}

function renderAdminItemsList() {
    const list = document.getElementById('admin-items-list');
    if (!list) return;

    if (items.length === 0) {
        list.innerHTML = `<div class="text-center text-muted py-3 small">لا توجد أصناف مضافة حالياً</div>`;
        return;
    }

    list.innerHTML = items.map(item => `
        <div class="d-flex align-items-center justify-content-between p-2 mb-2 bg-light rounded-3 border-0 shadow-sm transition-all">
            <div class="d-flex align-items-center gap-3">
                <img src="${item.image}" width="42" height="42" class="rounded-3 object-fit-cover shadow-sm">
                <div>
                    <h6 class="fw-bold text-dark mb-0 small">${item.name}</h6>
                    <span class="badge bg-amber-soft text-amber fw-bold" style="font-size: 0.7rem;">${item.price} SAR</span>
                </div>
            </div>
            <div class="d-flex align-items-center gap-1">
                <button onclick="openEditItemModal(${item.id})" class="btn btn-sm btn-outline-secondary border-0 rounded-circle p-2 d-flex align-items-center justify-content-center" style="width:32px; height:32px;" title="تعديل">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteItem(${item.id})" class="btn btn-sm btn-outline-danger border-0 rounded-circle p-2 d-flex align-items-center justify-content-center" style="width:32px; height:32px;" title="حذف">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}