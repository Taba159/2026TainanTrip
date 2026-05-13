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
  const spyIds = ["transport", "stay", "day1", "day2", "day3", "notes"];
  const links = Array.prototype.slice.call(pageNav.querySelectorAll('a[href^="#"]'));

  function setActive(id) {
    links.forEach((a) => {
      const hrefId = (a.getAttribute("href") || "").slice(1);
      if (hrefId === id) {
        a.classList.add("nav-is-active");
        a.setAttribute("aria-current", "page");
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
    let activeId = spyIds[0];
    spyIds.forEach((sid) => {
      const el = document.getElementById(sid);
      if (!el) return;
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

// 店家名稱 → Google Maps：詞條維護請改 places.json（勿手改下方邏輯）；需以 http(s) 伺服器開啟才能 fetch。
// 內文區塊若要禁止自動連結，請在父層加 data-no-map-link。
(async function linkifyPlacesFromJson() {
  let config;
  try {
    const configUrl = new URL("places.json", document.baseURI || location.href).href;
    const res = await fetch(configUrl, { cache: "no-store" });
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
    link.className = "map-link";
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
