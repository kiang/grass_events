(() => {
    'use strict';

    const STORAGE_KEY = 'grass_events';
    const PLAN_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScpQgzx5xqgRLCu-7iKLCC4ph_cfCs1LNleJOOm7P63XnzaUg/formResponse';
    const RECORD_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScU3m-bGBen71ZKuH2RIQURd2Fszd2Cryp_n7Xl0sLkwXaclQ/formResponse';

    const PLAN_FIELDS = {
        candidate: 'entry.732198570',
        type: 'entry.653919948',
        date: 'entry.524363547',
        description: 'entry.1470504244',
        budget: 'entry.272631492'
    };

    const RECORD_FIELDS = {
        candidate: 'entry.732198570',
        type: 'entry.653919948',
        date: 'entry.50953259',
        description: 'entry.1470504244',
        budget: 'entry.272631492',
        feedback: 'entry.456780522',
        link: 'entry.362614619'
    };

    let currentYear, currentMonth;
    let events = [];
    let selectedEventId = null;

    function init() {
        loadEvents();
        const today = new Date();
        currentYear = today.getFullYear();
        currentMonth = today.getMonth();
        renderCalendar();
        bindEvents();
    }

    function loadEvents() {
        try {
            events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch {
            events = [];
        }
    }

    function saveEvents() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function findDuplicate(eventData) {
        return events.find(e =>
            e.formType === eventData.formType &&
            e.candidate === eventData.candidate &&
            e.type === eventData.type &&
            e.date === eventData.date &&
            e.description === eventData.description
        );
    }

    function showToast(msg, type = '') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = 'toast show' + (type ? ' ' + type : '');
        setTimeout(() => { toast.className = 'toast'; }, 3000);
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }

    // Calendar rendering
    function renderCalendar() {
        document.getElementById('current-month').textContent =
            `${currentYear} 年 ${currentMonth + 1} 月`;

        const body = document.getElementById('calendar-body');
        body.innerHTML = '';

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';

            let year = currentYear, month = currentMonth, day;

            if (i < firstDay) {
                day = prevMonthDays - firstDay + 1 + i;
                month = currentMonth - 1;
                if (month < 0) { month = 11; year--; }
                cell.classList.add('other-month');
            } else if (i >= firstDay + daysInMonth) {
                day = i - firstDay - daysInMonth + 1;
                month = currentMonth + 1;
                if (month > 11) { month = 0; year++; }
                cell.classList.add('other-month');
            } else {
                day = i - firstDay + 1;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (dateStr === todayStr) cell.classList.add('today');

            const numEl = document.createElement('div');
            numEl.className = 'day-number';
            numEl.textContent = day;
            cell.appendChild(numEl);

            const dayEvents = events.filter(e => e.date === dateStr);
            dayEvents.slice(0, 3).forEach(ev => {
                const tag = document.createElement('div');
                tag.className = `day-event type-${ev.formType}`;
                tag.textContent = `${ev.candidate} ${ev.type}`;
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showEventDetail(ev.id);
                });
                cell.appendChild(tag);
            });

            if (dayEvents.length > 3) {
                const more = document.createElement('div');
                more.className = 'day-event';
                more.textContent = `+${dayEvents.length - 3} 更多`;
                more.style.background = '#eee';
                more.style.fontSize = '0.65rem';
                cell.appendChild(more);
            }

            cell.addEventListener('click', () => showDayEvents(dateStr));
            body.appendChild(cell);
        }
    }

    function showDayEvents(dateStr) {
        const dayEvents = events.filter(e => e.date === dateStr);
        const panel = document.getElementById('day-events');
        const list = document.getElementById('day-events-list');
        document.getElementById('day-events-title').textContent = formatDate(dateStr) + ' 活動';

        if (dayEvents.length === 0) {
            list.innerHTML = '<p style="color:var(--text-light);font-size:0.9rem;">此日無活動</p>';
        } else {
            list.innerHTML = dayEvents.map(ev => `
                <div class="event-card type-${ev.formType}" data-id="${ev.id}">
                    <div class="event-card-header">
                        <span class="event-card-title">${escapeHtml(ev.candidate)} - ${escapeHtml(ev.type)}</span>
                        <span class="event-card-badge">${ev.formType === 'plan' ? '計畫' : '回報'}</span>
                    </div>
                    <div class="event-card-meta">${escapeHtml(ev.description.slice(0, 60))}${ev.description.length > 60 ? '...' : ''}</div>
                </div>
            `).join('');

            list.querySelectorAll('.event-card').forEach(card => {
                card.addEventListener('click', () => showEventDetail(card.dataset.id));
            });
        }

        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function showEventDetail(id) {
        const ev = events.find(e => e.id === id);
        if (!ev) return;

        selectedEventId = id;
        document.getElementById('detail-title').textContent =
            `${ev.formType === 'plan' ? '計畫' : '回報'} - ${ev.candidate}`;

        const statusClass = ev.submitted ? 'status-submitted' : 'status-local';
        const statusText = ev.submitted ? '已提交 Google 表單' : '僅儲存本地';

        let html = `
            <div class="detail-row">
                <div class="detail-label">狀態</div>
                <div class="detail-value"><span class="detail-status ${statusClass}">${statusText}</span></div>
            </div>
            <div class="detail-row">
                <div class="detail-label">參選人</div>
                <div class="detail-value">${escapeHtml(ev.candidate)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">活動類型</div>
                <div class="detail-value">${escapeHtml(ev.type)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">日期</div>
                <div class="detail-value">${formatDate(ev.date)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">描述</div>
                <div class="detail-value">${escapeHtml(ev.description)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">經費</div>
                <div class="detail-value">${escapeHtml(ev.budget)}</div>
            </div>
        `;

        if (ev.formType === 'record') {
            html += `
                <div class="detail-row">
                    <div class="detail-label">活動回饋</div>
                    <div class="detail-value">${escapeHtml(ev.feedback || '')}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">粉專連結</div>
                    <div class="detail-value"><a href="${escapeHtml(ev.link || '')}" target="_blank">${escapeHtml(ev.link || '')}</a></div>
                </div>
            `;
        }

        document.getElementById('detail-body').innerHTML = html;

        const convertBtn = document.getElementById('btn-convert-to-record');
        convertBtn.style.display = ev.formType === 'plan' ? '' : 'none';

        openModal('modal-detail');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Form submission
    async function submitToGoogleForm(url, params) {
        const form = new URLSearchParams();
        for (const [key, val] of Object.entries(params)) {
            form.append(key, val);
        }

        try {
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: form.toString()
            });
            return true;
        } catch {
            return false;
        }
    }

    function buildDateParams(fieldName, dateStr) {
        const [y, m, d] = dateStr.split('-');
        return {
            [fieldName + '_year']: y,
            [fieldName + '_month']: m,
            [fieldName + '_day']: d
        };
    }

    async function handlePlanSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            id: generateId(),
            formType: 'plan',
            candidate: form.querySelector('#plan-candidate').value,
            type: form.querySelector('input[name="plan-type"]:checked')?.value,
            date: form.querySelector('#plan-date').value,
            description: form.querySelector('#plan-description').value.trim(),
            budget: form.querySelector('#plan-budget').value.trim(),
            submitted: false,
            createdAt: new Date().toISOString()
        };

        if (!data.candidate || !data.type || !data.date || !data.description || !data.budget) {
            showToast('請填寫所有必填欄位', 'error');
            return;
        }

        const dup = findDuplicate(data);
        if (dup) {
            showToast('此活動計畫已存在，請勿重複提交', 'error');
            return;
        }

        const params = {
            [PLAN_FIELDS.candidate]: data.candidate,
            [PLAN_FIELDS.type]: data.type,
            ...buildDateParams(PLAN_FIELDS.date, data.date),
            [PLAN_FIELDS.description]: data.description,
            [PLAN_FIELDS.budget]: data.budget
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        const ok = await submitToGoogleForm(PLAN_FORM_URL, params);
        data.submitted = ok;
        events.push(data);
        saveEvents();

        submitBtn.disabled = false;
        submitBtn.textContent = '儲存並提交';

        closeModal('modal-plan');
        form.reset();
        renderCalendar();

        if (ok) {
            showToast('計畫已儲存並提交至 Google 表單', 'success');
        } else {
            showToast('已儲存本地，但提交 Google 表單失敗', 'error');
        }
    }

    async function handleRecordSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const data = {
            id: generateId(),
            formType: 'record',
            candidate: form.querySelector('#record-candidate').value,
            type: form.querySelector('input[name="record-type"]:checked')?.value,
            date: form.querySelector('#record-date').value,
            description: form.querySelector('#record-description').value.trim(),
            budget: form.querySelector('#record-budget').value.trim(),
            feedback: form.querySelector('#record-feedback').value.trim(),
            link: form.querySelector('#record-link').value.trim(),
            submitted: false,
            createdAt: new Date().toISOString()
        };

        if (!data.candidate || !data.type || !data.date || !data.description || !data.budget || !data.feedback || !data.link) {
            showToast('請填寫所有必填欄位', 'error');
            return;
        }

        const dup = findDuplicate(data);
        if (dup) {
            showToast('此活動回報已存在，請勿重複提交', 'error');
            return;
        }

        const params = {
            [RECORD_FIELDS.candidate]: data.candidate,
            [RECORD_FIELDS.type]: data.type,
            ...buildDateParams(RECORD_FIELDS.date, data.date),
            [RECORD_FIELDS.description]: data.description,
            [RECORD_FIELDS.budget]: data.budget,
            [RECORD_FIELDS.feedback]: data.feedback,
            [RECORD_FIELDS.link]: data.link
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        const ok = await submitToGoogleForm(RECORD_FORM_URL, params);
        data.submitted = ok;
        events.push(data);
        saveEvents();

        submitBtn.disabled = false;
        submitBtn.textContent = '儲存並提交';

        closeModal('modal-record');
        form.reset();
        renderCalendar();

        if (ok) {
            showToast('回報已儲存並提交至 Google 表單', 'success');
        } else {
            showToast('已儲存本地，但提交 Google 表單失敗', 'error');
        }
    }

    function convertToRecord(planId) {
        const plan = events.find(e => e.id === planId);
        if (!plan) return;

        closeModal('modal-detail');

        const form = document.getElementById('form-record');
        form.querySelector('#record-candidate').value = plan.candidate;

        const radioBtn = form.querySelector(`input[name="record-type"][value="${plan.type}"]`);
        if (radioBtn) radioBtn.checked = true;

        form.querySelector('#record-date').value = plan.date;
        form.querySelector('#record-description').value = plan.description;
        form.querySelector('#record-budget').value = plan.budget;

        openModal('modal-record');
    }

    function deleteEvent(id) {
        if (!confirm('確定要刪除此活動？')) return;
        events = events.filter(e => e.id !== id);
        saveEvents();
        closeModal('modal-detail');
        renderCalendar();
        document.getElementById('day-events').style.display = 'none';
        showToast('已刪除', 'success');
    }

    // Modal helpers
    function openModal(id) {
        document.getElementById(id).classList.add('active');
    }

    function closeModal(id) {
        document.getElementById(id).classList.remove('active');
    }

    // Bindings
    function bindEvents() {
        document.getElementById('prev-month').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });

        document.getElementById('btn-today').addEventListener('click', () => {
            const today = new Date();
            currentYear = today.getFullYear();
            currentMonth = today.getMonth();
            renderCalendar();
        });

        document.getElementById('btn-plan').addEventListener('click', () => {
            document.getElementById('form-plan').reset();
            openModal('modal-plan');
        });

        document.getElementById('btn-record').addEventListener('click', () => {
            document.getElementById('form-record').reset();
            openModal('modal-record');
        });

        document.getElementById('close-day-events').addEventListener('click', () => {
            document.getElementById('day-events').style.display = 'none';
        });

        document.getElementById('form-plan').addEventListener('submit', handlePlanSubmit);
        document.getElementById('form-record').addEventListener('submit', handleRecordSubmit);

        document.getElementById('btn-delete-event').addEventListener('click', () => {
            if (selectedEventId) deleteEvent(selectedEventId);
        });

        document.getElementById('btn-convert-to-record').addEventListener('click', () => {
            if (selectedEventId) convertToRecord(selectedEventId);
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.closest('.modal').classList.remove('active');
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        });
    }

    init();
})();
