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
        initRepeatToggle();
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

    function generateUUID() {
        if (crypto.randomUUID) return crypto.randomUUID();
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
        );
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
                <div class="detail-label">UUID</div>
                <div class="detail-value detail-uuid">${escapeHtml(ev.id)}</div>
            </div>
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
            if (ev.planId) {
                const plan = events.find(p => p.id === ev.planId);
                const planLabel = plan ? `${formatDate(plan.date)} ${plan.candidate} - ${plan.type}` : ev.planId;
                html += `
                    <div class="detail-row">
                        <div class="detail-label">來源計畫</div>
                        <div class="detail-value">${escapeHtml(planLabel)}</div>
                    </div>
                `;
            }
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

    function generateDates(startDate, endDate, frequency) {
        const dates = [];
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T00:00:00');
        const current = new Date(start);

        while (current <= end) {
            const yy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            dates.push(`${yy}-${mm}-${dd}`);
            switch (frequency) {
                case 'daily': current.setDate(current.getDate() + 1); break;
                case 'weekly': current.setDate(current.getDate() + 7); break;
                case 'biweekly': current.setDate(current.getDate() + 14); break;
                case 'monthly': current.setMonth(current.getMonth() + 1); break;
            }
        }
        return dates;
    }

    function updateRepeatPreview() {
        const preview = document.getElementById('repeat-preview');
        const startDate = document.getElementById('plan-date').value;
        const endDate = document.getElementById('plan-date-end').value;
        const frequency = document.getElementById('plan-frequency').value;

        if (!startDate || !endDate) {
            preview.innerHTML = '';
            return;
        }

        if (endDate < startDate) {
            preview.innerHTML = '<span style="color:var(--danger)">結束日期不可早於開始日期</span>';
            return;
        }

        const freqLabels = { daily: '每天', weekly: '每週', biweekly: '每兩週', monthly: '每月' };
        const dates = generateDates(startDate, endDate, frequency);
        preview.innerHTML = `<div class="preview-count">${freqLabels[frequency]}，共 ${dates.length} 筆活動</div>` +
            dates.map(d => formatDate(d)).join('、');
    }

    function initRepeatToggle() {
        const checkbox = document.getElementById('plan-repeat');
        const options = document.getElementById('repeat-options');

        checkbox.addEventListener('change', () => {
            options.style.display = checkbox.checked ? 'block' : 'none';
            if (checkbox.checked) updateRepeatPreview();
        });

        ['plan-date', 'plan-date-end', 'plan-frequency'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateRepeatPreview);
        });
    }

    async function handlePlanSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const candidate = form.querySelector('#plan-candidate').value;
        const type = form.querySelector('input[name="plan-type"]:checked')?.value;
        const startDate = form.querySelector('#plan-date').value;
        const description = form.querySelector('#plan-description').value.trim();
        const budget = form.querySelector('#plan-budget').value.trim();
        const isRepeat = form.querySelector('#plan-repeat').checked;

        if (!candidate || !type || !startDate || !description || !budget) {
            showToast('請填寫所有必填欄位', 'error');
            return;
        }

        let dates;
        if (isRepeat) {
            const endDate = form.querySelector('#plan-date-end').value;
            const frequency = form.querySelector('#plan-frequency').value;
            if (!endDate) {
                showToast('請填寫結束日期', 'error');
                return;
            }
            if (endDate < startDate) {
                showToast('結束日期不可早於開始日期', 'error');
                return;
            }
            dates = generateDates(startDate, endDate, frequency);
        } else {
            dates = [startDate];
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = form.querySelector('.modal-close');
        submitBtn.disabled = true;
        cancelBtn.disabled = true;

        const progressContainer = document.getElementById('plan-progress-container');
        const progressText = document.getElementById('plan-progress-text');
        const progressCount = document.getElementById('plan-progress-count');
        const progressFill = document.getElementById('plan-progress-fill');
        const progressLog = document.getElementById('plan-progress-log');

        if (dates.length > 1) {
            progressContainer.style.display = 'block';
            progressFill.style.width = '0%';
            progressLog.innerHTML = '';
            progressText.textContent = '提交中...';
            progressCount.textContent = `0 / ${dates.length}`;
        } else {
            submitBtn.textContent = '提交中...';
        }

        let okCount = 0, skipCount = 0, errCount = 0;

        for (let i = 0; i < dates.length; i++) {
            const dateStr = dates[i];
            const data = {
                id: generateUUID(),
                formType: 'plan',
                candidate,
                type,
                date: dateStr,
                description,
                budget,
                submitted: false,
                createdAt: new Date().toISOString()
            };

            const dup = findDuplicate(data);
            if (dup) {
                skipCount++;
                if (dates.length > 1) {
                    progressLog.innerHTML += `<div class="log-skip">${formatDate(dateStr)} — 已存在，略過</div>`;
                    progressLog.scrollTop = progressLog.scrollHeight;
                }
            } else {
                const params = {
                    [PLAN_FIELDS.candidate]: data.candidate,
                    [PLAN_FIELDS.type]: data.type,
                    ...buildDateParams(PLAN_FIELDS.date, dateStr),
                    [PLAN_FIELDS.description]: data.description,
                    [PLAN_FIELDS.budget]: data.budget
                };

                const ok = await submitToGoogleForm(PLAN_FORM_URL, params);
                data.submitted = ok;
                events.push(data);
                saveEvents();

                if (ok) {
                    okCount++;
                    if (dates.length > 1) {
                        progressLog.innerHTML += `<div class="log-ok">${formatDate(dateStr)} — 提交成功</div>`;
                    }
                } else {
                    errCount++;
                    if (dates.length > 1) {
                        progressLog.innerHTML += `<div class="log-err">${formatDate(dateStr)} — 提交失敗（已儲存本地）</div>`;
                    }
                }
                if (dates.length > 1) progressLog.scrollTop = progressLog.scrollHeight;
            }

            if (dates.length > 1) {
                const pct = Math.round(((i + 1) / dates.length) * 100);
                progressFill.style.width = pct + '%';
                progressCount.textContent = `${i + 1} / ${dates.length}`;
            }
        }

        submitBtn.disabled = false;
        cancelBtn.disabled = false;
        submitBtn.textContent = '儲存並提交';
        renderCalendar();

        if (dates.length === 1) {
            closeModal('modal-plan');
            form.reset();
            progressContainer.style.display = 'none';
            if (skipCount) {
                showToast('此活動計畫已存在，請勿重複提交', 'error');
            } else if (okCount) {
                showToast('計畫已儲存並提交至 Google 表單', 'success');
            } else {
                showToast('已儲存本地，但提交 Google 表單失敗', 'error');
            }
        } else {
            progressText.textContent = '完成！';
            const parts = [];
            if (okCount) parts.push(`${okCount} 筆成功`);
            if (skipCount) parts.push(`${skipCount} 筆略過（重複）`);
            if (errCount) parts.push(`${errCount} 筆失敗`);
            showToast(`批次提交完成：${parts.join('、')}`, errCount ? 'error' : 'success');
        }
    }

    async function handleRecordSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const fromPlanId = form.querySelector('#record-from-plan').value || null;
        const data = {
            id: generateUUID(),
            formType: 'record',
            planId: fromPlanId,
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

    function populatePlanPicker(selectedPlanId) {
        const picker = document.getElementById('record-plan-picker');
        const plans = events.filter(e => e.formType === 'plan').sort((a, b) => a.date.localeCompare(b.date));
        picker.innerHTML = '<option value="">— 手動填寫 —</option>';
        plans.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${formatDate(p.date)} ${p.candidate} - ${p.type}`;
            if (p.id === selectedPlanId) opt.selected = true;
            picker.appendChild(opt);
        });
    }

    function fillRecordFromPlan(plan) {
        const form = document.getElementById('form-record');
        form.querySelector('#record-from-plan').value = plan.id;
        form.querySelector('#record-candidate').value = plan.candidate;

        const radioBtn = form.querySelector(`input[name="record-type"][value="${plan.type}"]`);
        if (radioBtn) radioBtn.checked = true;

        form.querySelector('#record-date').value = plan.date;
        form.querySelector('#record-description').value = plan.description;
        form.querySelector('#record-budget').value = plan.budget;
    }

    function convertToRecord(planId) {
        const plan = events.find(e => e.id === planId);
        if (!plan) return;

        closeModal('modal-detail');

        const form = document.getElementById('form-record');
        form.reset();
        populatePlanPicker(planId);
        fillRecordFromPlan(plan);

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
            document.getElementById('repeat-options').style.display = 'none';
            document.getElementById('plan-progress-container').style.display = 'none';
            document.getElementById('repeat-preview').innerHTML = '';
            openModal('modal-plan');
        });

        document.getElementById('btn-record').addEventListener('click', () => {
            document.getElementById('form-record').reset();
            document.getElementById('record-from-plan').value = '';
            populatePlanPicker();
            openModal('modal-record');
        });

        document.getElementById('record-plan-picker').addEventListener('change', (e) => {
            const planId = e.target.value;
            if (!planId) return;
            const plan = events.find(ev => ev.id === planId);
            if (!plan) return;
            fillRecordFromPlan(plan);
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
