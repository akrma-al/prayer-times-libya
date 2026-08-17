import {
  Coordinates,
  CalculationMethod,
  PrayerTimes
} from "https://cdn.jsdelivr.net/npm/adhan@4.4.3/+esm";

const CITY_STORAGE_KEY = "libya-prayer-city";
const LOCATION_STORAGE_KEY = "libya-prayer-location";
const NOTIFICATION_STORAGE_KEY = "libya-notifications-enabled";

const cities = {
  tripoli: {
    name: "طرابلس",
    latitude: 32.8872,
    longitude: 13.1913
  },

  benghazi: {
    name: "بنغازي",
    latitude: 32.1167,
    longitude: 20.0667
  },

  misrata: {
    name: "مصراتة",
    latitude: 32.3754,
    longitude: 15.0925
  },

  sabha: {
    name: "سبها",
    latitude: 27.0377,
    longitude: 14.4283
  },

  zawiya: {
    name: "الزاوية",
    latitude: 32.7571,
    longitude: 12.7276
  },

  zuwara: {
    name: "زوارة",
    latitude: 32.9312,
    longitude: 12.0819
  },

  derna: {
    name: "درنة",
    latitude: 32.767,
    longitude: 22.6367
  },

  tobruk: {
    name: "طبرق",
    latitude: 32.0836,
    longitude: 23.9764
  },

  ghat: {
    name: "غات",
    latitude: 24.9633,
    longitude: 10.18
  },

  ajdabiya: {
    name: "أجدابيا",
    latitude: 30.7554,
    longitude: 20.2263
  },

  khoms: {
    name: "الخمس",
    latitude: 32.6486,
    longitude: 14.2619
  },

  sirte: {
    name: "سرت",
    latitude: 31.2089,
    longitude: 16.5887
  }
};

const prayerDefinitions = [
  {
    key: "fajr",
    name: "الفجر",
    icon: "🌅",
    adhanKey: "fajr"
  },

  {
    key: "sunrise",
    name: "الشروق",
    icon: "☀️",
    adhanKey: "sunrise"
  },

  {
    key: "dhuhr",
    name: "الظهر",
    icon: "🌞",
    adhanKey: "dhuhr"
  },

  {
    key: "asr",
    name: "العصر",
    icon: "🌤️",
    adhanKey: "asr"
  },

  {
    key: "maghrib",
    name: "المغرب",
    icon: "🌇",
    adhanKey: "maghrib"
  },

  {
    key: "isha",
    name: "العشاء",
    icon: "🌙",
    adhanKey: "isha"
  }
];

const adhkar = [
  {
    text: "أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه",
    target: 3
  },

  {
    text: "اللهم صل وسلم وبارك على نبينا محمد",
    target: 10
  },

  {
    text: "سبحان الله وبحمده",
    target: 33
  },

  {
    text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير",
    target: 10
  },

  {
    text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم",
    target: 7
  }
];

const state = {
  selectedCity: localStorage.getItem(CITY_STORAGE_KEY) || "tripoli",
  location: null,
  prayerTimes: null,
  prayers: [],
  nextPrayer: null,
  timer: null,
  notifiedPrayer: null
};

const elements = {
  citySelect: document.querySelector("#citySelect"),
  selectedCityLabel: document.querySelector("#selectedCityLabel"),
  nextPrayerName: document.querySelector("#nextPrayerName"),
  nextPrayerTime: document.querySelector("#nextPrayerTime"),
  countdown: document.querySelector("#countdown"),
  progressCircle: document.querySelector("#progressCircle"),
  progressPercent: document.querySelector("#progressPercent"),
  prayerGrid: document.querySelector("#prayerGrid"),
  gregorianDate: document.querySelector("#gregorianDate"),
  hijriDate: document.querySelector("#hijriDate"),
  lastUpdated: document.querySelector("#lastUpdated"),
  infoCity: document.querySelector("#infoCity"),
  infoLatitude: document.querySelector("#infoLatitude"),
  infoLongitude: document.querySelector("#infoLongitude"),
  adhkarList: document.querySelector("#adhkarList"),
  notificationButton: document.querySelector("#notificationButton"),
  locationButton: document.querySelector("#locationButton"),
  resetLocationButton: document.querySelector("#resetLocationButton"),
  toast: document.querySelector("#toast")
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  window.clearTimeout(showToast.timeout);

  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3500);
}

function getCurrentCity() {
  return cities[state.selectedCity] || cities.tripoli;
}

function formatTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ar-LY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ar-LY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatHijriDate(date) {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  } catch {
    return "التاريخ الهجري غير متاح";
  }
}

function getCalculationParameters() {
  return CalculationMethod.UmmAlQura();
}

function getLocationData() {
  if (state.location) {
    return state.location;
  }

  const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);

  if (savedLocation) {
    try {
      const parsedLocation = JSON.parse(savedLocation);

      if (
        Number.isFinite(parsedLocation.latitude) &&
        Number.isFinite(parsedLocation.longitude)
      ) {
        return parsedLocation;
      }
    } catch {
      // استخدام المدينة الافتراضية عند وجود بيانات غير صالحة
    }
  }

  return getCurrentCity();
}

function calculatePrayerTimes() {
  const location = getLocationData();

  const coordinates = new Coordinates(
    location.latitude,
    location.longitude
  );

  const date = new Date();
  const parameters = getCalculationParameters();

  state.prayerTimes = new PrayerTimes(
    coordinates,
    date,
    parameters
  );

  state.prayers = prayerDefinitions.map((prayer) => ({
    ...prayer,
    time: state.prayerTimes[prayer.adhanKey]
  }));

  renderLocationInfo(location);
  renderPrayerCards();
  renderDates();
  updateNextPrayer();

  elements.lastUpdated.textContent = `تم التحديث في ${
    new Intl.DateTimeFormat("ar-LY", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date())
  }`;
}

function renderLocationInfo(location) {
  const city = getCurrentCity();

  elements.selectedCityLabel.textContent = city.name;
  elements.infoCity.textContent = city.name;
  elements.infoLatitude.textContent = Number(location.latitude).toFixed(4);
  elements.infoLongitude.textContent = Number(location.longitude).toFixed(4);
}

function renderDates() {
  const now = new Date();

  elements.gregorianDate.textContent = formatDate(now);
  elements.hijriDate.textContent = formatHijriDate(now);
}

function renderPrayerCards() {
  elements.prayerGrid.innerHTML = state.prayers
    .map(
      (prayer) => `
        <article class="prayer-card" data-prayer="${prayer.key}">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-slate-400">${prayer.name}</p>
              <p class="prayer-time mt-3">${formatTime(prayer.time)}</p>
            </div>

            <span class="prayer-icon">${prayer.icon}</span>
          </div>

          <p class="mt-4 text-xs text-slate-500">
            ${
              prayer.key === "sunrise"
                ? "بداية الشروق"
                : "وقت الأذان"
            }
          </p>
        </article>
      `
    )
    .join("");
}

function getNextPrayer() {
  const now = new Date();

  const upcoming = state.prayers.find((prayer) => {
    return prayer.key !== "sunrise" && prayer.time > now;
  });

  if (upcoming) {
    return {
      ...upcoming,
      date: upcoming.time
    };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const location = getLocationData();

  const coordinates = new Coordinates(
    location.latitude,
    location.longitude
  );

  const tomorrowPrayerTimes = new PrayerTimes(
    coordinates,
    tomorrow,
    getCalculationParameters()
  );

  return {
    ...prayerDefinitions[0],
    time: tomorrowPrayerTimes.fajr,
    date: tomorrowPrayerTimes.fajr,
    isTomorrow: true
  };
}

function getPreviousPrayerTime(nextPrayer) {
  const now = new Date();

  const prayerTimes = state.prayers
    .filter((prayer) => prayer.key !== "sunrise")
    .map((prayer) => prayer.time)
    .filter((time) => time <= now);

  if (nextPrayer.isTomorrow) {
    const todayFajr = state.prayers.find(
      (prayer) => prayer.key === "fajr"
    );

    return todayFajr?.time || new Date(now.getTime() - 3600000);
  }

  return prayerTimes.at(-1) || new Date(now.getTime() - 3600000);
}

function updateNextPrayer() {
  const nextPrayer = getNextPrayer();
  const now = new Date();

  state.nextPrayer = nextPrayer;

  const remainingMilliseconds = Math.max(
    0,
    nextPrayer.date.getTime() - now.getTime()
  );

  const totalSeconds = Math.floor(remainingMilliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  elements.nextPrayerName.textContent = nextPrayer.isTomorrow
    ? `${nextPrayer.name} غداً`
    : nextPrayer.name;

  elements.nextPrayerTime.textContent = formatTime(nextPrayer.date);

  elements.countdown.textContent = [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");

  updateProgress(nextPrayer, now);
  highlightNextPrayer(nextPrayer);
  sendPrayerNotificationIfNeeded(
    nextPrayer,
    remainingMilliseconds
  );

  if (remainingMilliseconds <= 1000) {
    window.setTimeout(() => {
      calculatePrayerTimes();
    }, 1500);
  }
}

function updateProgress(nextPrayer, now) {
  const previousTime = getPreviousPrayerTime(nextPrayer);

  const totalDuration =
    nextPrayer.date.getTime() - previousTime.getTime();

  const elapsed = now.getTime() - previousTime.getTime();

  const progress = Math.min(
    100,
    Math.max(0, (elapsed / totalDuration) * 100)
  );

  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (progress / 100) * circumference;

  elements.progressCircle.style.strokeDasharray = circumference;
  elements.progressCircle.style.strokeDashoffset = offset;
  elements.progressPercent.textContent = `${Math.round(progress)}%`;
}

function highlightNextPrayer(nextPrayer) {
  document.querySelectorAll(".prayer-card").forEach((card) => {
    card.classList.toggle(
      "active",
      card.dataset.prayer === nextPrayer.key &&
        !nextPrayer.isTomorrow
    );
  });
}

function startClock() {
  window.clearInterval(state.timer);

  updateNextPrayer();

  state.timer = window.setInterval(() => {
    updateNextPrayer();
  }, 1000);
}

function requestCurrentLocation() {
  if (!("geolocation" in navigator)) {
    showToast("المتصفح لا يدعم تحديد الموقع الجغرافي");
    return;
  }

  elements.locationButton.textContent = "⌛";

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      state.location = location;

      localStorage.setItem(
        LOCATION_STORAGE_KEY,
        JSON.stringify(location)
      );

      calculatePrayerTimes();

      showToast("تم تحديث المواقيت حسب موقعك الحالي");

      elements.locationButton.textContent = "📍";
    },
    () => {
      showToast("تعذر الحصول على موقعك، تم استخدام المدينة المختارة");
      elements.locationButton.textContent = "📍";
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000
    }
  );
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("المتصفح لا يدعم التنبيهات");
    return;
  }

  if (Notification.permission === "granted") {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, "true");
    showToast("تنبيهات الأذان مفعّلة");
    return;
  }

  if (Notification.permission === "denied") {
    showToast("التنبيهات مرفوضة من إعدادات المتصفح");
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, "true");
    showToast("تم تفعيل تنبيهات الأذان");
  } else {
    showToast("لم يتم تفعيل التنبيهات");
  }
}

function sendPrayerNotificationIfNeeded(
  prayer,
  remainingMilliseconds
) {
  const notificationEnabled =
    localStorage.getItem(NOTIFICATION_STORAGE_KEY) === "true";

  if (!notificationEnabled) {
    return;
  }

  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  if (
    remainingMilliseconds <= 1000 &&
    remainingMilliseconds >= 0 &&
    state.notifiedPrayer !==
      `${prayer.key}-${prayer.date.toDateString()}`
  ) {
    state.notifiedPrayer =
      `${prayer.key}-${prayer.date.toDateString()}`;

    const notificationOptions = {
      body: `حان الآن وقت صلاة ${prayer.name}`,
      icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E🕌%3C/text%3E%3C/svg%3E",
      tag: `prayer-${prayer.key}`,
      dir: "rtl",
      lang: "ar"
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(
            `أذان ${prayer.name}`,
            notificationOptions
          );
        })
        .catch(() => {
          new Notification(
            `أذان ${prayer.name}`,
            notificationOptions
          );
        });
    } else {
      new Notification(
        `أذان ${prayer.name}`,
        notificationOptions
      );
    }
  }
}

function renderAdhkar() {
  const savedCounters = JSON.parse(
    localStorage.getItem("adhkar-counters") || "{}"
  );

  elements.adhkarList.innerHTML = adhkar
    .map((dhikr, index) => {
      const count = Math.min(
        savedCounters[index] || 0,
        dhikr.target
      );

      const completed = count >= dhikr.target;

      return `
        <button
          class="adhkar-button ${completed ? "completed" : ""}"
          data-adhkar-index="${index}"
          type="button"
        >
          <div class="flex items-start gap-3">
            <span class="adhkar-counter">
              ${count}/${dhikr.target}
            </span>

            <span class="text-sm leading-7">
              ${dhikr.text}
            </span>
          </div>
        </button>
      `;
    })
    .join("");
}

function incrementDhikr(index) {
  const savedCounters = JSON.parse(
    localStorage.getItem("adhkar-counters") || "{}"
  );

  const currentCount = savedCounters[index] || 0;
  const target = adhkar[index].target;

  savedCounters[index] = Math.min(
    currentCount + 1,
    target
  );

  localStorage.setItem(
    "adhkar-counters",
    JSON.stringify(savedCounters)
  );

  renderAdhkar();

  if (savedCounters[index] === target) {
    showToast("أحسنت، اكتمل الذكر");
  }
}

function resetLocation() {
  state.location = null;

  localStorage.removeItem(LOCATION_STORAGE_KEY);

  calculatePrayerTimes();

  showToast(
    `تمت العودة إلى مدينة ${getCurrentCity().name}`
  );
}

function registerEvents() {
  elements.citySelect.value = state.selectedCity;

  elements.citySelect.addEventListener("change", (event) => {
    state.selectedCity = event.target.value;
    state.location = null;

    localStorage.setItem(
      CITY_STORAGE_KEY,
      state.selectedCity
    );

    localStorage.removeItem(LOCATION_STORAGE_KEY);

    calculatePrayerTimes();

    showToast(
      `تم اختيار مدينة ${getCurrentCity().name}`
    );
  });

  elements.locationButton.addEventListener(
    "click",
    requestCurrentLocation
  );

  elements.notificationButton.addEventListener(
    "click",
    requestNotifications
  );

  elements.resetLocationButton.addEventListener(
    "click",
    resetLocation
  );

  elements.adhkarList.addEventListener("click", (event) => {
    const button = event.target.closest(
      "[data-adhkar-index]"
    );

    if (!button) {
      return;
    }

    incrementDhikr(
      Number(button.dataset.adhkarIndex)
    );
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {
        showToast("تعذر تشغيل وضع العمل دون اتصال");
      });
  });
}

function initializeApp() {
  registerEvents();
  renderAdhkar();
  calculatePrayerTimes();
  startClock();
  registerServiceWorker();
}

initializeApp();
