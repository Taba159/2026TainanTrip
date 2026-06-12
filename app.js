(function initThemeToggle() {
  const root = document.documentElement;
  const storageKey = "tainan-trip-theme";
  const valid = new Set(["dawn", "night-market"]);

  function apply(theme) {
    if (!valid.has(theme)) {
      theme = "dawn";
    }
    root.dataset.theme = theme;
    try {
      localStorage.setItem(storageKey, theme);
    } catch (_) {
      /* 私人模式等情境可能無法寫入 */
    }
    document.querySelectorAll("[data-theme-set]").forEach((btn) => {
      const on = btn.getAttribute("data-theme-set") === theme;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const themeColorMeta = document.getElementById("meta-theme-color");
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", theme === "night-market" ? "#0f1419" : "#fff8ef");
    }
  }

  let saved = null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch (_) {}
  apply(valid.has(saved) ? saved : "dawn");

  document.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest("[data-theme-set]");
    if (!btn) return;
    const next = btn.getAttribute("data-theme-set");
    if (valid.has(next)) {
      apply(next);
    }
  });
})();

(function initTripCountdown() {
  const el = document.getElementById("trip-countdown");
  if (!el) return;

  const tripStart = new Date(2026, 5, 19);
  const tripEnd = new Date(2026, 5, 22);
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (todayDate >= tripEnd) {
    el.hidden = true;
    return;
  }

  if (todayDate >= tripStart) {
    el.hidden = true;
    return;
  }

  const daysLeft = Math.round((tripStart - todayDate) / 86400000);
  el.textContent = daysLeft === 0 ? "今天出發！" : `距出發還有 ${daysLeft} 天`;
  el.hidden = false;
})();

(function initGoogleCalendarTripLink() {
  function googleCalendarTripUrl() {
    const text = "2026 台南三天兩夜（6/19～6/21）";
    const dates = "20260619/20260622";
    const details = [
      "6/19（五）～6/21（日）台南行。詳見旅行筆記頁面。",
      "高鐵訂票 https://irs.thsrc.com.tw/IMINT/",
    ].join("\n");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text,
      dates,
      details,
      location: "台南市",
    });
    return "https://calendar.google.com/calendar/render?" + params.toString();
  }

  const gLink = document.getElementById("link-google-calendar-trip");
  if (gLink) {
    gLink.href = googleCalendarTripUrl();
  }
})();

(function syncCanonicalAndOgUrl() {
  const link = document.getElementById("canonical-link");
  if (!link || (location.protocol !== "http:" && location.protocol !== "https:")) return;
  const u = new URL(location.href);
  u.hash = "";
  link.href = u.href;
  let og = document.querySelector('meta[property="og:url"]');
  if (!og) {
    og = document.createElement("meta");
    og.setAttribute("property", "og:url");
    document.head.appendChild(og);
  }
  og.setAttribute("content", u.href);
  let tu = document.querySelector('meta[name="twitter:url"]');
  if (!tu) {
    tu = document.createElement("meta");
    tu.setAttribute("name", "twitter:url");
    document.head.appendChild(tu);
  }
  tu.setAttribute("content", u.href);
  const baseDir = new URL(".", u);
  const ogImageAbs = new URL("icons/icon-512.png", baseDir).href;
  let ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) {
    ogImg.setAttribute("content", ogImageAbs);
  }
  let twImg = document.querySelector('meta[name="twitter:image"]');
  if (twImg) {
    twImg.setAttribute("content", ogImageAbs);
  }
})();

(function initSkipToMain() {
  const skip = document.querySelector(".skip-link");
  const mainEl = document.getElementById("main-content");
  if (!skip || !mainEl) return;
  skip.addEventListener("click", (e) => {
    e.preventDefault();
    mainEl.focus({ preventScroll: true });
    mainEl.scrollIntoView({ behavior: "auto", block: "start" });
    history.replaceState(null, "", "#main-content");
  });
})();

(function initSectionScrollSpy() {
  const pageNav = document.getElementById("page-nav");
  if (!pageNav) return;
  const spyIds = ["weather", "transport", "stay", "day1", "day2", "day3", "notes"];
  const links = Array.prototype.slice.call(pageNav.querySelectorAll('a[href^="#"]'));

  function setActive(id) {
    links.forEach((a) => {
      const hrefId = (a.getAttribute("href") || "").slice(1);
      if (hrefId === id) {
        a.classList.add("nav-is-active");
        a.setAttribute("aria-current", "true");
      } else {
        a.classList.remove("nav-is-active");
        a.removeAttribute("aria-current");
      }
    });
  }

  function updateSpy() {
    /* 只用「nav 下方一條線」時，跳到 #day3 後區塊頂常仍在線之下，視窗上部仍落在 #day2 的 DOM 尾端，會誤亮 Day2。
       改成取 nav 下方與畫面約 38% 高度中較低者為基準線，相當於以閱讀帶來判斷目前區塊。 */
    const navBottom = pageNav.getBoundingClientRect().bottom;
    const readingBand = Math.max(navBottom + 8, window.innerHeight * 0.38);
    let activeId =
      spyIds.find((sid) => {
        const el = document.getElementById(sid);
        return el && !el.hidden;
      }) || spyIds[0];
    spyIds.forEach((sid) => {
      const el = document.getElementById(sid);
      if (!el || el.hidden) return;
      if (el.getBoundingClientRect().top <= readingBand) activeId = sid;
    });
    setActive(activeId);
  }

  let raf = 0;
  function schedule() {
    if (raf) return;
    raf = window.requestAnimationFrame(() => {
      raf = 0;
      updateSpy();
    });
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);
  updateSpy();

  links.forEach((a) => {
    a.addEventListener("click", () => {
      window.requestAnimationFrame(updateSpy);
    });
  });
})();

(function initWeather() {
  const section = document.getElementById("weather");
  const navLink = document.getElementById("nav-weather");
  if (!section) return;

  const TRIP_START = new Date(2026, 5, 19);
  const TRIP_END = new Date(2026, 5, 22);
  const TRIP_DATES = ["2026-06-19", "2026-06-20", "2026-06-21"];
  const DAY_LABELS = ["6/19（五）", "6/20（六）", "6/21（日）"];
  const LAT = 22.9997;
  const LON = 120.2270;
  const CACHE_KEY = "tainan-trip-weather-v2";
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const HOURLY_START = 8;
  const HOURLY_END = 21;

  const metaEl = document.getElementById("weather-meta");
  const gridEl = document.getElementById("weather-grid");
  const tipsEl = document.getElementById("weather-tips");
  const errorEl = document.getElementById("weather-error");

  function todayDateOnly() {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }

  function todayIso() {
    const t = todayDateOnly();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function hideWeatherSection() {
    section.hidden = true;
    if (navLink) {
      navLink.hidden = true;
    }
  }

  if (todayDateOnly() >= TRIP_END) {
    hideWeatherSection();
    return;
  }

  function weatherCodeInfo(code) {
    const n = Number(code);
    if (n === 0) {
      return { label: "晴朗", icon: "☀️" };
    }
    if (n === 1) {
      return { label: "大致晴朗", icon: "🌤️" };
    }
    if (n === 2) {
      return { label: "多雲時晴", icon: "⛅" };
    }
    if (n === 3) {
      return { label: "多雲", icon: "☁️" };
    }
    if (n === 45 || n === 48) {
      return { label: "霧", icon: "🌫️" };
    }
    if (n >= 51 && n <= 57) {
      return { label: "毛毛雨", icon: "🌦️" };
    }
    if (n >= 61 && n <= 67) {
      return { label: "降雨", icon: "🌧️" };
    }
    if (n >= 71 && n <= 77) {
      return { label: "降雪", icon: "❄️" };
    }
    if (n >= 80 && n <= 82) {
      return { label: "陣雨", icon: "🌦️" };
    }
    if (n >= 85 && n <= 86) {
      return { label: "陣雪", icon: "🌨️" };
    }
    if (n === 95) {
      return { label: "雷雨", icon: "⛈️" };
    }
    if (n === 96 || n === 99) {
      return { label: "雷雨冰雹", icon: "⛈️" };
    }
    return { label: "多雲", icon: "⛅" };
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data || !parsed.fetchedAt) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ fetchedAt: Date.now(), data })
      );
    } catch (_) {
      /* 私人模式等情境可能無法寫入 */
    }
  }

  function isCacheFresh(entry) {
    return entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
  }

  async function fetchForecast() {
    const params = new URLSearchParams({
      latitude: String(LAT),
      longitude: String(LON),
      daily:
        "temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_probability_max,weathercode",
      hourly: "temperature_2m,apparent_temperature,precipitation_probability,weathercode",
      timezone: "Asia/Taipei",
      start_date: TRIP_DATES[0],
      end_date: TRIP_DATES[TRIP_DATES.length - 1],
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    return res.json();
  }

  function buildWeatherTips(daily) {
    const tips = [];
    const day2Rain = daily.precipitation_probability_max[1];
    const day2Temp = daily.temperature_2m_max[1];
    const maxRain = Math.max(...daily.precipitation_probability_max);
    const maxTemp = Math.max(...daily.temperature_2m_max);

    if (day2Rain >= 50) {
      tips.push(
        "Day 2 戶外多：6/20 降雨機率偏高，四草／安平建議帶輕便雨具，竹筏留意現場公告。"
      );
    }

    if (maxTemp >= 32) {
      tips.push(
        "氣溫偏高：補水與冰品當正式行程，八寶彬圓仔惠、南泉冰菓室可列入備案。"
      );
    } else if (day2Temp >= 30 && day2Rain < 50) {
      tips.push("Day 2 安平午後戶外多，飲料偏清爽，義豐冬瓜茶或手搖可提早補水。");
    }

    if (tips.length < 2 && maxRain < 40) {
      tips.push("降雨機率整體偏低，防曬與帽子仍建議列入行李。");
    }

    return tips.slice(0, 2);
  }

  function formatUpdatedAt(fetchedAt, stale) {
    const time = new Date(fetchedAt).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const staleNote = stale ? "（資料可能不是最新）" : "";
    return `更新於 ${time} · 台南市中西區${staleNote}`;
  }

  function currentHour() {
    return new Date().getHours();
  }

  function getHourlySlotsForDate(hourly, dateIso) {
    if (!hourly || !Array.isArray(hourly.time)) {
      return [];
    }

    const slots = [];
    for (let i = 0; i < hourly.time.length; i++) {
      const stamp = hourly.time[i];
      if (!stamp.startsWith(dateIso)) {
        continue;
      }
      const hour = Number(stamp.slice(11, 13));
      if (hour < HOURLY_START || hour > HOURLY_END) {
        continue;
      }
      slots.push({
        hour,
        timeLabel: `${String(hour).padStart(2, "0")}:00`,
        temp: Math.round(hourly.temperature_2m[i]),
        feels: Math.round(hourly.apparent_temperature[i]),
        rain: hourly.precipitation_probability[i],
        code: hourly.weathercode[i],
      });
    }
    return slots;
  }

  function scrollHourlyToNow(scroll) {
    requestAnimationFrame(() => {
      const nowSlot = scroll.querySelector(".weather-hourly-slot--now");
      if (!nowSlot) {
        return;
      }
      const left = nowSlot.offsetLeft - (scroll.clientWidth - nowSlot.offsetWidth) / 2;
      scroll.scrollLeft = Math.max(0, left);
    });
  }

  function createHourlyBlock(dateIso, hourly, isToday, onTrip) {
    const slots = getHourlySlotsForDate(hourly, dateIso);
    if (slots.length === 0) {
      return null;
    }

    const expanded = onTrip && isToday;
    const wrap = document.createElement("div");
    wrap.className = "weather-hourly";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "weather-hourly-toggle";
    if (expanded) {
      toggle.classList.add("is-open");
    }
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggle.textContent = expanded ? "今日逐時預報" : "查看逐時預報";

    const panel = document.createElement("div");
    panel.className = "weather-hourly-panel";
    panel.hidden = !expanded;

    const scroll = document.createElement("div");
    scroll.className = "weather-hourly-scroll";
    scroll.setAttribute("role", "list");
    scroll.setAttribute("aria-label", expanded ? "今日逐時預報" : "逐時預報");

    const nowHour = currentHour();
    const todayIsTripDay = todayIso() === dateIso;

    slots.forEach((slot) => {
      const info = weatherCodeInfo(slot.code);
      const item = document.createElement("div");
      item.className = "weather-hourly-slot";
      item.setAttribute("role", "listitem");
      if (todayIsTripDay && slot.hour === nowHour) {
        item.classList.add("weather-hourly-slot--now");
      } else if (todayIsTripDay && slot.hour < nowHour) {
        item.classList.add("weather-hourly-slot--past");
      }

      const timeEl = document.createElement("div");
      timeEl.className = "weather-hourly-slot__time";
      timeEl.textContent = slot.timeLabel;

      const iconEl = document.createElement("div");
      iconEl.className = "weather-hourly-slot__icon";
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = info.icon;

      const tempEl = document.createElement("div");
      tempEl.className = "weather-hourly-slot__temp";
      tempEl.textContent = `${slot.temp}°`;

      const rainEl = document.createElement("div");
      rainEl.className = "weather-hourly-slot__rain";
      rainEl.textContent = `${slot.rain}%`;

      const descEl = document.createElement("div");
      descEl.className = "weather-hourly-slot__desc";
      descEl.textContent = info.label;

      item.append(timeEl, iconEl, tempEl, rainEl, descEl);
      scroll.appendChild(item);
    });

    toggle.addEventListener("click", () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
      toggle.classList.toggle("is-open", willOpen);
      if (willOpen && todayIsTripDay && isToday) {
        scrollHourlyToNow(scroll);
      }
    });

    panel.appendChild(scroll);
    wrap.append(toggle, panel);

    if (expanded) {
      scrollHourlyToNow(scroll);
    }

    return wrap;
  }

  function renderWeatherCards(data, fetchedAt, stale) {
    const daily = data.daily;
    const hourly = data.hourly;
    if (!gridEl) return;

    gridEl.setAttribute("aria-busy", "false");
    gridEl.innerHTML = "";

    const today = todayIso();
    const onTrip = todayDateOnly() >= TRIP_START && todayDateOnly() < TRIP_END;

    TRIP_DATES.forEach((date, i) => {
      const info = weatherCodeInfo(daily.weathercode[i]);
      const tempMax = Math.round(daily.temperature_2m_max[i]);
      const tempMin = Math.round(daily.temperature_2m_min[i]);
      const feels = Math.round(daily.apparent_temperature_max[i]);
      const rain = daily.precipitation_probability_max[i];

      const card = document.createElement("article");
      card.className = "weather-day";
      if (onTrip && date === today) {
        card.classList.add("weather-day--today");
      } else if (onTrip && date !== today) {
        card.classList.add("weather-day--muted");
      }

      const dateEl = document.createElement("div");
      dateEl.className = "weather-day__date";
      dateEl.textContent = DAY_LABELS[i];

      const tempRow = document.createElement("div");
      tempRow.className = "weather-day__temp-row";
      const iconEl = document.createElement("span");
      iconEl.className = "weather-day__icon";
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = info.icon;
      const tempEl = document.createElement("span");
      tempEl.className = "weather-day__temp";
      tempEl.textContent = `${tempMax}°`;
      tempRow.append(iconEl, tempEl);

      const descEl = document.createElement("p");
      descEl.className = "weather-desc";
      descEl.textContent = info.label;

      const rangeEl = document.createElement("p");
      rangeEl.className = "weather-day__range";
      rangeEl.textContent = `${tempMin}°～${tempMax}°`;

      const rainEl = document.createElement("p");
      rainEl.className = "weather-day__rain";
      rainEl.textContent = `降雨 ${rain}%`;

      const feelsEl = document.createElement("p");
      feelsEl.className = "weather-day__feels";
      feelsEl.textContent = `體感 ${feels}°`;

      card.append(dateEl, tempRow, descEl, rangeEl, rainEl, feelsEl);

      const isToday = date === today;
      const hourlyBlock = createHourlyBlock(date, hourly, isToday, onTrip);
      if (hourlyBlock) {
        card.appendChild(hourlyBlock);
        card.classList.add("weather-day--has-hourly");
      }

      gridEl.appendChild(card);
    });

    if (metaEl) {
      metaEl.textContent = formatUpdatedAt(fetchedAt, stale);
    }
  }

  function renderTips(daily) {
    if (!tipsEl) return;
    const tips = buildWeatherTips(daily);
    tipsEl.innerHTML = "";
    if (tips.length === 0) {
      tipsEl.hidden = true;
      return;
    }
    tips.forEach((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      tipsEl.appendChild(li);
    });
    tipsEl.hidden = false;
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    if (gridEl) {
      gridEl.setAttribute("aria-busy", "false");
    }
  }

  async function loadWeather() {
    const cached = readCache();
    if (cached && isCacheFresh(cached)) {
      renderWeatherCards(cached.data, cached.fetchedAt, false);
      renderTips(cached.data.daily);
      return;
    }

    try {
      const data = await fetchForecast();
      const fetchedAt = Date.now();
      writeCache(data);
      if (errorEl) {
        errorEl.hidden = true;
      }
      renderWeatherCards(data, fetchedAt, false);
      renderTips(data.daily);
    } catch (err) {
      console.warn("[weather] 無法取得預報：", err);
      if (cached && cached.data && cached.data.daily) {
        renderWeatherCards(cached.data, cached.fetchedAt, true);
        renderTips(cached.data.daily);
        showError("目前無法更新天氣，已顯示上次快取資料。");
      } else {
        showError("天氣資料暫時無法載入，請稍後再試。");
        if (metaEl) {
          metaEl.textContent = "台南市中西區";
        }
        if (gridEl) {
          gridEl.innerHTML = "";
          gridEl.setAttribute("aria-busy", "false");
        }
      }
    }
  }

  loadWeather();
})();

// 店家名稱 → Google Maps：詞條維護請改 places.json（勿手改下方邏輯）；需以 http(s) 伺服器開啟才能 fetch。
// 內文區塊若要禁止自動連結，請在父層加 data-no-map-link。
(async function linkifyPlacesFromJson() {
  /* 變更 places.json 內容時可遞增，讓瀏覽器略過舊的快取項目。 */
  const placesJsonVersion = 6;
  let config;
  try {
    const configUrl = new URL(`places.json?v=${placesJsonVersion}`, document.baseURI || location.href).href;
    const res = await fetch(configUrl);
    if (!res.ok) throw new Error("HTTP " + res.status);
    config = await res.json();
  } catch (err) {
    console.warn(
      "[places] 無法載入 places.json（若用 file:// 開檔，請改用 python3 -m http.server 等本機 http）：",
      err
    );
    return;
  }

  const rawGroups = Array.isArray(config.groups) ? config.groups : [];
  const flat = [];
  for (const g of rawGroups) {
    if (!g || !Array.isArray(g.names)) continue;
    for (const n of g.names) {
      if (typeof n !== "string") continue;
      const t = n.trim();
      if (t) flat.push(t);
    }
  }

  const omit = new Set(
    Array.isArray(config.omitFromLinkify)
      ? config.omitFromLinkify
          .filter((x) => typeof x === "string" && x.trim())
          .map((x) => x.trim())
      : []
  );

  const counts = new Map();
  for (const n of flat) {
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  for (const [name, count] of counts) {
    if (count > 1) {
      console.warn(`[places] JSON 重複詞「${name}」出現 ${count} 次（已自動去重，建議刪冗餘條目）。`);
    }
  }

  for (const o of omit) {
    if (!counts.has(o)) {
      console.info(
        `[places] omitFromLinkify「${o}」未出現在任一 group（通常表示刻意阻擋泛指詞或未來預留，可視情況保留或刪除）。`
      );
    }
  }

  const mapPlaces = [...new Set(flat)].filter((n) => !omit.has(n));
  for (const n of omit) {
    if (counts.has(n)) console.info("[places] 已從 Regex 排除（omitFromLinkify）：", n);
  }

  const sortedPlaces = mapPlaces.sort((a, b) => b.length - a.length);
  if (sortedPlaces.length === 0) {
    console.warn("[places] 有效地名為 0，略過自動連結。");
    return;
  }

  const escapedPlaces = sortedPlaces.map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  const placeRegex = new RegExp(`(${escapedPlaces.join("|")})`, "g");

  function createMapLink(placeName) {
    const link = document.createElement("a");
    const query = `${placeName} 台南`;
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "ext-link ext-link--map map-link";
    link.textContent = placeName;
    link.title = "在 Google Maps 搜尋：" + query;
    link.setAttribute("aria-label", placeName + "，於台南以 Google Maps 搜尋（另開新分頁）");
    return link;
  }

  function linkifyTextNode(textNode) {
    const text = textNode.nodeValue;
    if (!placeRegex.test(text)) return;
    placeRegex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = placeRegex.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) fragment.appendChild(document.createTextNode(before));
      fragment.appendChild(createMapLink(match[0]));
      lastIndex = match.index + match[0].length;
    }

    const after = text.slice(lastIndex);
    if (after) fragment.appendChild(document.createTextNode(after));
    textNode.parentNode.replaceChild(fragment, textNode);
  }

  function shouldSkipNode(node) {
    const parent = node.parentElement;
    return (
      !parent ||
      parent.closest("a, script, style, textarea, input, button, noscript, [data-no-map-link]")
    );
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(linkifyTextNode);
})();
