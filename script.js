/**
 * مركز النخبة الطبي | نظام حجز المواعيد وتنظيم الانتظار الذكي
 * Front-End Interactive Controller (script.js)
 *
 * المهام البرمجية:
 * 1. إدارة بيانات العيادات والتخصصات الطبية وحالة الدور المباشرة لكل عيادة.
 * 2. توليد أيام المراجعة القادمة والفترات الزمنية (صباحاً / مساءً).
 * 3. حساب رقم الدور التقريبي ووقت الحضور المقترح (قبل الموعد بـ 10 دقائق) تلقائياً لمنع التكدس.
 * 4. التحقق من صحة بيانات المراجع وإصدار تذكرة الدور الفورية القابلة للطباعة.
 */

(function () {
  "use strict";

  // 1. بيانات التخصصات والعيادات وحالة الدور الحالية
  const CLINIC_SPECIALTIES = [
    {
      id: "internal",
      code: "A",
      name: "الباطنية والقلب",
      doctor: "د. طارق المنصور — استشاري باطنية وقلب",
      room: "عيادة رقم 102 (الدور الأول)",
      currentServing: 11,
      nextQueue: 14,
      avgMinutesPerPatient: 12,
    },
    {
      id: "pediatrics",
      code: "B",
      name: "طب الأطفال وحديثي الولادة",
      doctor: "د. سارة العتيبي — أخصائية أولى أطفال",
      room: "عيادة رقم 105 (الدور الأول)",
      currentServing: 18,
      nextQueue: 21,
      avgMinutesPerPatient: 10,
    },
    {
      id: "dental",
      code: "C",
      name: "طب وجراحة الأسنان",
      doctor: "د. مازن الشهري — استشاري تجميل وجراحة أسنان",
      room: "عيادة رقم 201 (الدور الثاني)",
      currentServing: 7,
      nextQueue: 9,
      avgMinutesPerPatient: 20,
    },
    {
      id: "derma",
      code: "D",
      name: "الجلدية والعناية بالبشرة",
      doctor: "د. ريم الحربي — أخصائية جلدية وليزر",
      room: "عيادة رقم 204 (الدور الثاني)",
      currentServing: 15,
      nextQueue: 18,
      avgMinutesPerPatient: 15,
    },
    {
      id: "ortho",
      code: "E",
      name: "العظام والمفاصل",
      doctor: "د. فهد الدوسري — استشاري جراحة عظام",
      room: "عيادة رقم 108 (الدور الأرضي)",
      currentServing: 9,
      nextQueue: 11,
      avgMinutesPerPatient: 15,
    },
    {
      id: "ophthal",
      code: "F",
      name: "العيون والبصريات",
      doctor: "د. خالد الزهراني — استشاري طب وجراحة العيون",
      room: "عيادة رقم 110 (الدور الأرضي)",
      currentServing: 12,
      nextQueue: 14,
      avgMinutesPerPatient: 12,
    },
  ];

  // 2. الفترات الزمنية المتاحة (الصباحية والمسائية) مع وقت الحضور المقترح (قبل الموعد بـ 10 دقائق)
  const TIME_SLOTS = {
    morning: [
      { id: "m1", time: "09:30 ص", arrival: "09:20 صباحاً", offsetQueue: 0, available: true },
      { id: "m2", time: "10:00 ص", arrival: "09:50 صباحاً", offsetQueue: 1, available: true },
      { id: "m3", time: "10:30 ص", arrival: "10:20 صباحاً", offsetQueue: 2, available: false },
      { id: "m4", time: "11:00 ص", arrival: "10:50 صباحاً", offsetQueue: 2, available: true },
      { id: "m5", time: "11:30 ص", arrival: "11:20 صباحاً", offsetQueue: 3, available: true },
      { id: "m6", time: "12:15 م", arrival: "12:05 ظهراً", offsetQueue: 4, available: true },
    ],
    evening: [
      { id: "e1", time: "05:00 م", arrival: "04:50 مساءً", offsetQueue: 0, available: false },
      { id: "e2", time: "05:30 م", arrival: "05:20 مساءً", offsetQueue: 0, available: true },
      { id: "e3", time: "06:00 م", arrival: "05:50 مساءً", offsetQueue: 1, available: true },
      { id: "e4", time: "06:30 م", arrival: "06:20 مساءً", offsetQueue: 2, available: true },
      { id: "e5", time: "07:15 م", arrival: "07:05 مساءً", offsetQueue: 3, available: false },
      { id: "e6", time: "07:45 م", arrival: "07:35 مساءً", offsetQueue: 3, available: true },
    ],
  };

  // توليد 4 أيام متاحة للحجز بدءاً من اليوم
  function generateUpcomingDays() {
    const arabicDayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const arabicMonths = [
      "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
      "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];

    const days = [];
    const baseDate = new Date();
    let added = 0;
    let offset = 0;

    while (added < 4) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + offset);
      offset++;

      // تخطي يوم الجمعة (إجازة المركز الأسبوعية)
      if (d.getDay() === 5) continue;

      const dayLabel =
        added === 0 ? "اليوم" : added === 1 ? "غداً" : arabicDayNames[d.getDay()];
      const dateStr = `${d.getDate()} ${arabicMonths[d.getMonth()]}`;

      days.push({
        id: `day-${added}`,
        label: dayLabel,
        fullDayName: arabicDayNames[d.getDay()],
        dateStr: dateStr,
        dayIndex: added,
      });
      added++;
    }
    return days;
  }

  const AVAILABLE_DAYS = generateUpcomingDays();

  // حالة الاختيار الحالية في النموذج
  const state = {
    specialtyId: CLINIC_SPECIALTIES[0].id,
    dayId: AVAILABLE_DAYS[0].id,
    shift: "evening",
    slotId: "e3", // 06:00 م افتراضياً
  };

  // عناصر DOM
  const specialtiesListEl = document.getElementById("specialtiesList");
  const specialtySelectEl = document.getElementById("specialtySelect");
  const selectedClinicMetaEl = document.getElementById("selectedClinicMeta");
  const daysPickerEl = document.getElementById("daysPicker");
  const slotsPickerEl = document.getElementById("slotsPicker");
  const shiftTabs = document.querySelectorAll(".shift-tab");

  const previewQueueNumEl = document.getElementById("previewQueueNum");
  const previewArrivalTimeEl = document.getElementById("previewArrivalTime");
  const appointmentFormEl = document.getElementById("appointmentForm");
  const patientNameEl = document.getElementById("patientName");
  const patientPhoneEl = document.getElementById("patientPhone");
  const formErrorEl = document.getElementById("formError");

  const bookingFormViewEl = document.getElementById("bookingFormView");
  const ticketConfirmationViewEl = document.getElementById("ticketConfirmationView");

  // عناصر تذكرة التأكيد
  const ticketQueueNumberEl = document.getElementById("ticketQueueNumber");
  const ticketArrivalTimeEl = document.getElementById("ticketArrivalTime");
  const ticketPatientNameEl = document.getElementById("ticketPatientName");
  const ticketPatientPhoneEl = document.getElementById("ticketPatientPhone");
  const ticketSpecialtyEl = document.getElementById("ticketSpecialty");
  const ticketDoctorEl = document.getElementById("ticketDoctor");
  const ticketDateTimeEl = document.getElementById("ticketDateTime");
  const ticketWaitNoteEl = document.getElementById("ticketWaitNote");
  const ticketRefCodeEl = document.getElementById("ticketRefCode");

  const btnPrintTicketEl = document.getElementById("btnPrintTicket");
  const btnNewBookingEl = document.getElementById("btnNewBooking");

  // استرجاع الكائنات المختارة حالياً
  function getSelectedSpecialty() {
    return CLINIC_SPECIALTIES.find((s) => s.id === state.specialtyId) || CLINIC_SPECIALTIES[0];
  }

  function getSelectedDay() {
    return AVAILABLE_DAYS.find((d) => d.id === state.dayId) || AVAILABLE_DAYS[0];
  }

  function getSelectedSlot() {
    const list = TIME_SLOTS[state.shift] || [];
    return list.find((s) => s.id === state.slotId) || list.find((s) => s.available) || list[0];
  }

  // حساب رقم الدور التقريبي وعدد المنتظرين
  function calculateQueueDetails() {
    const spec = getSelectedSpecialty();
    const day = getSelectedDay();
    const slot = getSelectedSlot();

    // إذا كان الحجز لليوم نفسه نحسب من الدور الحالي، وإذا كان ليوم قادم يبدأ الترقيم من أول الفترة
    const baseNum = day.dayIndex === 0 ? spec.nextQueue : (state.shift === "morning" ? 1 : 8);
    const calculatedNumber = baseNum + (slot ? slot.offsetQueue : 0);
    const formattedCode = `${spec.code}-${String(calculatedNumber).padStart(2, "0")}`;

    const aheadCount = Math.max(1, calculatedNumber - spec.currentServing);
    let waitNote = "";
    if (day.dayIndex === 0) {
      if (aheadCount === 1) {
        waitNote = "أمامك مراجع واحد فقط قبل موعدك";
      } else if (aheadCount === 2) {
        waitNote = "أمامك مراجعان فقط في نفس الفترة";
      } else {
        waitNote = `أمامك ${aheadCount} مراجعين — الحضور على الوقت المقترح يمنع الانتظار`;
      }
    } else {
      waitNote = "حجز مسبق مؤكد — أولوية دخول مباشرة حسب الفترة الزمنية";
    }

    return {
      queueCode: formattedCode,
      arrivalTime: slot ? slot.arrival : "05:50 مساءً",
      slotTime: slot ? slot.time : "06:00 م",
      waitNote: waitNote,
    };
  }

  // 1. رسم بطاقات التخصصات في الصفحة الرئيسية + قائمة الاختيار
  function renderSpecialties() {
    specialtiesListEl.innerHTML = "";
    specialtySelectEl.innerHTML = "";

    CLINIC_SPECIALTIES.forEach((spec) => {
      // أ) خيار في القائمة المنسدلة
      const opt = document.createElement("option");
      opt.value = spec.id;
      opt.textContent = `${spec.name} (${spec.doctor.split("—")[0].trim()})`;
      if (spec.id === state.specialtyId) opt.selected = true;
      specialtySelectEl.appendChild(opt);

      // ب) بطاقة تفاعلية في قسم التخصصات
      const card = document.createElement("button");
      card.type = "button";
      card.className = `spec-card ${spec.id === state.specialtyId ? "active" : ""}`;
      card.innerHTML = `
        <div class="spec-top">
          <div>
            <div class="spec-name">${spec.name}</div>
            <div class="spec-doc">${spec.doctor}</div>
          </div>
          <span class="queue-pill mono">الدور الآن: ${spec.code}-${String(spec.currentServing).padStart(2, "0")}</span>
        </div>
        <div class="spec-foot">
          <span>${spec.room}</span>
          <span>الرقم المتاح: <strong class="mono">${spec.code}-${String(spec.nextQueue).padStart(2, "0")}</strong></span>
        </div>
      `;

      card.addEventListener("click", () => {
        state.specialtyId = spec.id;
        renderSpecialties();
        updateClinicMetaAndPreview();

        // تمرير سلس إلى نموذج الحجز على الشاشات الصغيرة
        if (window.innerWidth < 980) {
          document.getElementById("bookingSection").scrollIntoView({ behavior: "smooth" });
        }
      });

      specialtiesListEl.appendChild(card);
    });
  }

  // 2. رسم أزرار اختيار اليوم
  function renderDays() {
    daysPickerEl.innerHTML = "";
    AVAILABLE_DAYS.forEach((day) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `day-btn ${day.id === state.dayId ? "active" : ""}`;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", day.id === state.dayId ? "true" : "false");
      btn.innerHTML = `
        <span class="d-name">${day.label}</span>
        <span class="d-date">${day.dateStr}</span>
      `;

      btn.addEventListener("click", () => {
        state.dayId = day.id;
        renderDays();
        updateClinicMetaAndPreview();
      });

      daysPickerEl.appendChild(btn);
    });
  }

  // 3. رسم أزرار الفترات الزمنية
  function renderSlots() {
    slotsPickerEl.innerHTML = "";
    const slots = TIME_SLOTS[state.shift] || [];

    // التأكد من أن الفترة المختارة متاحة
    const currentValid = slots.find((s) => s.id === state.slotId && s.available);
    if (!currentValid) {
      const firstAvailable = slots.find((s) => s.available);
      if (firstAvailable) state.slotId = firstAvailable.id;
    }

    slots.forEach((slot) => {
      const isSelected = slot.id === state.slotId && slot.available;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `slot-btn ${isSelected ? "active" : ""}`;
      btn.disabled = !slot.available;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", isSelected ? "true" : "false");

      btn.innerHTML = `
        <span class="slot-time mono">${slot.time}</span>
        <span class="slot-status">${slot.available ? "متاح للحجز" : "مكتمل"}</span>
      `;

      if (slot.available) {
        btn.addEventListener("click", () => {
          state.slotId = slot.id;
          renderSlots();
          updateClinicMetaAndPreview();
        });
      }

      slotsPickerEl.appendChild(btn);
    });
  }

  // 4. تحديث بيانات العيادة المختارة وشريط المعاينة الفورية للدور
  function updateClinicMetaAndPreview() {
    const spec = getSelectedSpecialty();
    const details = calculateQueueDetails();

    selectedClinicMetaEl.textContent = `${spec.doctor} · ${spec.room}`;
    previewQueueNumEl.textContent = details.queueCode;
    previewArrivalTimeEl.textContent = details.arrivalTime;
  }

  // ربط تغيير القائمة المنسدلة للتخصص
  specialtySelectEl.addEventListener("change", (e) => {
    state.specialtyId = e.target.value;
    renderSpecialties();
    updateClinicMetaAndPreview();
  });

  // ربط تبويبات الفترة (صباحاً / مساءً)
  shiftTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetShift = tab.getAttribute("data-shift");
      if (!targetShift || targetShift === state.shift) return;

      state.shift = targetShift;
      shiftTabs.forEach((t) => t.classList.toggle("active", t === tab));
      renderSlots();
      updateClinicMetaAndPreview();
    });
  });

  // 5. معالجة إرسال نموذج الحجز وإصدار بطاقة الدور
  appointmentFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    formErrorEl.classList.remove("visible");
    formErrorEl.textContent = "";

    const nameVal = patientNameEl.value.trim();
    const phoneVal = patientPhoneEl.value.trim();

    if (nameVal.length < 3) {
      formErrorEl.textContent = "يرجى إدخال الاسم الكامل للمريض بشكل صحيح.";
      formErrorEl.classList.add("visible");
      patientNameEl.focus();
      return;
    }

    const cleanDigits = phoneVal.replace(/\D/g, "");
    if (cleanDigits.length < 8) {
      formErrorEl.textContent = "يرجى إدخال رقم هاتف صحيح للتواصل وتأكيد الدور.";
      formErrorEl.classList.add("visible");
      patientPhoneEl.focus();
      return;
    }

    const spec = getSelectedSpecialty();
    const day = getSelectedDay();
    const details = calculateQueueDetails();
    const shiftLabel = state.shift === "morning" ? "الفترة الصباحية" : "الفترة المسائية";

    // تعبئة بيانات تذكرة الدور
    ticketQueueNumberEl.textContent = details.queueCode;
    ticketArrivalTimeEl.textContent = details.arrivalTime;
    ticketPatientNameEl.textContent = nameVal;
    ticketPatientPhoneEl.textContent = phoneVal;
    ticketSpecialtyEl.textContent = `${spec.name} (${spec.room})`;
    ticketDoctorEl.textContent = spec.doctor;
    ticketDateTimeEl.textContent = `${day.label} (${day.dateStr}) — الساعة ${details.slotTime} (${shiftLabel})`;
    ticketWaitNoteEl.textContent = details.waitNote;

    const randomRef = Math.floor(1000 + Math.random() * 9000);
    ticketRefCodeEl.textContent = `REF: ELITE-2026-${randomRef}`;

    // زيادة رقم الدور المتاح في العيادة المختارة لمحاكاة التحديث الفوري
    if (day.dayIndex === 0) {
      spec.nextQueue += 1;
      renderSpecialties();
    }

    // إخفاء النموذج وإظهار شاشة التأكيد وتذكرة الدور
    bookingFormViewEl.classList.add("hidden");
    ticketConfirmationViewEl.classList.remove("hidden");
    document.getElementById("bookingSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // 6. أزرار الطباعة وحجز موعد جديد
  btnPrintTicketEl.addEventListener("click", () => {
    window.print();
  });

  btnNewBookingEl.addEventListener("click", () => {
    patientNameEl.value = "";
    patientPhoneEl.value = "";
    ticketConfirmationViewEl.classList.add("hidden");
    bookingFormViewEl.classList.remove("hidden");
    updateClinicMetaAndPreview();
  });

  // التشغيل الأولي للواجهة
  renderSpecialties();
  renderDays();
  renderSlots();
  updateClinicMetaAndPreview();
})();
