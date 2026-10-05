/* Super Win storefront demo — vanilla JS SPA (hash router), no build step. */
(() => {
  "use strict";

  /* ---------------- Data & helpers ---------------- */
  const DATA = window.CATALOG || { categories: [], products: [], latest: [] };
  const WA_NUMBER = "584122200366";
  const IVA = 0.16;
  const PAGE = 24;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const cap = (s) => String(s || "").trim().toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  const CATS = DATA.categories.map((c) => ({ ...c, label: cap(c.name) }));
  const catById = new Map(CATS.map((c) => [c.id, c]));
  const subById = new Map();
  CATS.forEach((c) => c.subs.forEach((s) => subById.set(s.id, { ...s, label: cap(s.name), parent: c.id })));

  const P = DATA.products.map((p) => ({ ...p, n: norm(p.name + " " + p.sku), idn: +p.id }));
  const byId = new Map(P.map((p) => [p.id, p]));
  const newest = [...P].sort((a, b) => b.idn - a.idn);
  const NEW_SET = new Set([...(DATA.latest || []), ...newest.slice(0, Math.ceil(P.length * 0.12)).map((p) => p.id)]);
  CATS.forEach((c) => { c.items = P.filter((p) => p.cats.includes(c.id)); });
  const catOf = (p) => catById.get(p.cats[0]);

  const state = {
    cart: store.get("sw_cart", {}),
    wish: store.get("sw_wish", []),
  };

  /* ---------------- Icons (lucide-style) ---------------- */
  const ICONS = {
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    bag: '<path d="M6 7h12l1 14H5z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    store: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    filter: '<path d="M3 5h18M6 12h12M10 19h4"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    g2: '<rect x="4" y="4" width="7" height="16" rx="1.5"/><rect x="13" y="4" width="7" height="16" rx="1.5"/>',
    g3: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="9.5" y="4" width="5" height="16" rx="1"/><rect x="16" y="4" width="5" height="16" rx="1"/>',
    g4: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    gift: '<path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8S10.5 3 8 3a2.5 2.5 0 0 0 0 5M12 8s1.5-5 4-5a2.5 2.5 0 0 1 0 5"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  };
  const WA_SVG = '<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7A11.8 11.8 0 0 0 24 12c0-3.2-1.2-6.1-3.6-8.4z"/></svg>';
  const icon = (n, cls = "") => (n === "whatsapp" ? WA_SVG : `<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[n] || ""}</svg>`);
  const hydrateIcons = (root = document) => $$("[data-icon]", root).forEach((el) => {
    if (el.querySelector("svg")) return;
    el.insertAdjacentHTML("afterbegin", icon(el.dataset.icon));
  });

  /* ---------------- Cart / wishlist ---------------- */
  const cartItems = () => Object.entries(state.cart).map(([id, q]) => ({ p: byId.get(id), q })).filter((x) => x.p);
  const cartCount = () => cartItems().reduce((a, x) => a + x.q, 0);
  const cartSubtotal = () => cartItems().reduce((a, x) => a + x.q * x.p.price, 0);
  const saveCart = () => { store.set("sw_cart", state.cart); syncBadges(); renderCart(); };

  function addToCart(id, qty = 1, srcImg) {
    const p = byId.get(id); if (!p) return;
    state.cart[id] = Math.min(999, (state.cart[id] || 0) + qty);
    saveCart();
    if (srcImg) flyToCart(srcImg);
    bump("#cartCount");
    toast(`<img src="${p.img}" alt=""> Agregado: ${esc(p.title).slice(0, 34)}${p.title.length > 34 ? "…" : ""} <a href="#" data-open-cart>Ver carrito</a>`);
  }
  function setQty(id, q) {
    if (q <= 0) delete state.cart[id]; else state.cart[id] = Math.min(999, q);
    saveCart();
  }
  function toggleWish(id) {
    const i = state.wish.indexOf(id);
    if (i >= 0) state.wish.splice(i, 1); else { state.wish.push(id); bump("#wishCount"); }
    store.set("sw_wish", state.wish);
    $$(`[data-fav="${id}"]`).forEach((b) => b.classList.toggle("on", i < 0));
    syncBadges();
    toast(i < 0 ? "❤️ Guardado en tu lista de deseos" : "Eliminado de tu lista de deseos");
  }
  function syncBadges() {
    const c = cartCount(), w = state.wish.length;
    const cc = $("#cartCount"), wc = $("#wishCount");
    cc.textContent = c; cc.hidden = !c;
    wc.textContent = w; wc.hidden = !w;
    $("#cartTotalHeader").textContent = fmt(cartSubtotal());
  }
  function bump(sel) { const el = $(sel); if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }

  function flyToCart(img) {
    const target = $("#cartBtn").getBoundingClientRect();
    const r = img.getBoundingClientRect();
    if (!r.width) return;
    const f = img.cloneNode(); f.className = "fly";
    Object.assign(f.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    document.body.appendChild(f);
    const dx = target.left + target.width / 2 - (r.left + r.width / 2);
    const dy = target.top + target.height / 2 - (r.top + r.height / 2);
    f.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy - 80}px) scale(.5)`, opacity: .9, offset: .6 },
      { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: .3 },
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" }).onfinish = () => f.remove();
  }

  /* ---------------- Toast ---------------- */
  function toast(html) {
    const t = document.createElement("div");
    t.className = "toast"; t.innerHTML = html;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 2600);
    while ($("#toasts").children.length > 3) $("#toasts").firstChild.remove();
  }

  /* ---------------- Overlays ---------------- */
  const scrim = $("#scrim");
  function openLayer(el) {
    closeLayers(true);
    el.classList.add("open"); el.setAttribute("aria-hidden", "false");
    scrim.classList.add("open"); document.body.style.overflow = "hidden";
  }
  function closeLayers(silent) {
    $$(".drawer.open, .modal.open, .filters.open").forEach((el) => { el.classList.remove("open"); el.setAttribute("aria-hidden", "true"); });
    if (!silent) { scrim.classList.remove("open"); document.body.style.overflow = ""; }
  }
  scrim.addEventListener("click", () => closeLayers());
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeLayers(); });

  /* ---------------- Card / shared templates ---------------- */
  function card(p, i = 0) {
    const c = catOf(p);
    const fav = state.wish.includes(p.id);
    const sale = p.compare && p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
    return `
    <article class="card" style="animation-delay:${Math.min(i, 12) * 35}ms">
      <div class="card__media">
        <a href="#/p/${p.id}" class="card__link" aria-label="${esc(p.title)}">
          <img src="${p.img}" alt="${esc(p.title)}" loading="lazy" decoding="async" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
        </a>
        <div class="card__badges">${NEW_SET.has(p.id) ? '<span class="tag tag--new">Nuevo</span>' : ""}${sale ? `<span class="tag tag--sale">-${sale}%</span>` : ""}</div>
        <button class="card__fav ${fav ? "on" : ""}" data-fav="${p.id}" aria-label="Agregar a la lista de deseos">${icon("heart")}</button>
        <div class="card__actions">
          <button class="btn btn--primary" data-add="${p.id}">${icon("bag")} Agregar</button>
          <button class="btn btn--icon" data-quick="${p.id}" aria-label="Vista rápida">${icon("eye")}</button>
        </div>
        <button class="card__quick-mobile" data-add="${p.id}" aria-label="Agregar al carrito">${icon("plus")}</button>
      </div>
      <div class="card__body">
        ${c ? `<span class="card__cat">${esc(c.label)}</span>` : ""}
        <a class="card__title" href="#/p/${p.id}">${esc(p.title)}</a>
        ${p.sku ? `<span class="card__sku">Ref. #${esc(p.sku)}</span>` : ""}
        <div class="card__price"><span class="price">${fmt(p.price)}</span>${p.compare ? `<span class="price-old">${fmt(p.compare)}</span>` : ""}<span class="price-tax">+ IVA</span></div>
      </div>
    </article>`;
  }
  const grid = (list, cols) => `<div class="grid" ${cols ? `style="--cols:${cols}"` : ""}>${list.map(card).join("")}</div>`;
  const sectionHead = (title, sub, link, linkText = "Ver todo") => `
    <div class="section__head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div>
    ${link ? `<a class="link-arrow" href="${link}">${linkText} ${icon("arrow")}</a>` : ""}</div>`;
  const crumbs = (items) => `<nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${items.map((x) => `${icon("chevron", "")}${x.href ? `<a href="${x.href}">${esc(x.label)}</a>` : `<span>${esc(x.label)}</span>`}`).join("")}</nav>`;

  /* ---------------- Header: nav, mega, search ---------------- */
  function buildNav() {
    const nav = $("#catnav");
    nav.innerHTML = `<a class="catnav__link catnav__link--all" href="#/all">Todos los productos</a>` +
      CATS.filter((c) => c.items.length).map((c) => `<a class="catnav__link" href="#/c/${c.id}" data-mega="${c.id}">${esc(c.label)}</a>`).join("");
    $("#footerCats").innerHTML = CATS.filter((c) => c.items.length).slice(0, 8).map((c) => `<li><a href="#/c/${c.id}">${esc(c.label)}</a></li>`).join("");
    $("#menuBody").innerHTML = `<a class="menu-cat" href="#/all">Todos los productos <small>${P.length}</small></a>` +
      CATS.filter((c) => c.items.length).map((c) => `<a class="menu-cat" href="#/c/${c.id}">${esc(c.label)} <small>${c.items.length}</small></a>`).join("") +
      `<a class="menu-cat" href="#/wishlist">❤️ Lista de deseos</a><a class="menu-cat" href="#/info/contacto">📞 Contáctenos</a>`;

    const mega = $("#mega");
    let tOpen, tClose;
    const open = (cid) => {
      const c = catById.get(cid); if (!c) return;
      const subs = c.subs.filter((s) => c.items.some((p) => p.subs?.includes(s.id)));
      const feat = c.items.slice(0, 4);
      mega.innerHTML = `<div class="container mega__inner">
        <div><div class="mega__title">${esc(c.label)}</div>
          <div class="mega__links">${subs.length ? subs.map((s) => `<a href="#/c/${c.id}?sub=${s.id}">${esc(cap(s.name))}</a>`).join("") : ""}
          <a href="#/c/${c.id}" style="font-weight:700;color:var(--brand-text)">Ver todo ${esc(c.label)} →</a></div></div>
        <div class="mega__feature">${feat.map((p) => `<a class="mega__card" href="#/p/${p.id}"><img src="${p.img}" alt=""><span>${esc(p.title)} · ${fmt(p.price)}</span></a>`).join("")}</div>
      </div>`;
      mega.classList.add("open");
      $$(".catnav__link").forEach((a) => a.classList.toggle("active", a.dataset.mega === cid));
    };
    const close = () => { mega.classList.remove("open"); $$(".catnav__link").forEach((a) => a.classList.remove("active")); };
    nav.addEventListener("mouseover", (e) => {
      const a = e.target.closest("[data-mega]"); clearTimeout(tClose);
      if (!a) return; clearTimeout(tOpen); tOpen = setTimeout(() => open(a.dataset.mega), 140);
    });
    $(".catnav").addEventListener("mouseleave", () => { clearTimeout(tOpen); tClose = setTimeout(close, 180); });
    mega.addEventListener("mouseenter", () => clearTimeout(tClose));
    mega.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
    nav.addEventListener("click", close);
  }

  function search(q, limit = 999) {
    const t = norm(q).trim(); if (!t) return [];
    const words = t.split(/\s+/);
    return P.map((p) => {
      if (!words.every((w) => p.n.includes(w))) return null;
      let s = 0; if (p.n.startsWith(t)) s += 5; if (norm(p.sku) === t) s += 10; if (p.n.includes(" " + t)) s += 2;
      return { p, s };
    }).filter(Boolean).sort((a, b) => b.s - a.s || b.p.idn - a.p.idn).slice(0, limit).map((x) => x.p);
  }

  function setupSearch() {
    const input = $("#searchInput"), panel = $("#searchPanel");
    let active = -1, timer;
    const popular = ["Peluches", "Stitch", "Barbie", "Halloween", "Navidad", "Globos", "Piñata", "Labubu"];
    const render = () => {
      const q = input.value.trim();
      active = -1;
      if (!q) {
        panel.innerHTML = `<div class="sr-head">Búsquedas populares</div><div class="sr-chips">${popular.map((w) => `<button class="chip" data-term="${w}">${w}</button>`).join("")}</div>
          <div class="sr-head">Categorías</div><div class="sr-chips">${CATS.filter((c) => c.items.length).slice(0, 10).map((c) => `<a class="chip" href="#/c/${c.id}">${esc(c.label)}</a>`).join("")}</div>`;
      } else {
        const res = search(q);
        panel.innerHTML = res.length
          ? `<div class="sr-head">${res.length} resultado${res.length > 1 ? "s" : ""}</div>` + res.slice(0, 6).map((p) => `
            <a class="sr-item" href="#/p/${p.id}"><img src="${p.img}" alt=""><div><div class="sr-item__name">${esc(p.title)}</div><div class="muted small">${p.sku ? "#" + esc(p.sku) + " · " : ""}${esc(catOf(p)?.label || "")}</div></div><span class="sr-item__price">${fmt(p.price)}</span></a>`).join("") +
            `<a class="sr-all" href="#/search?q=${encodeURIComponent(q)}">Ver todos los resultados →</a>`
          : `<div class="empty" style="padding:28px">Sin resultados para “${esc(q)}”</div>`;
      }
      panel.classList.add("open");
    };
    input.addEventListener("focus", render);
    input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(render, 110); });
    input.addEventListener("keydown", (e) => {
      const items = $$(".sr-item", panel);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); if (!items.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach((x, i) => x.classList.toggle("active", i === active));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active >= 0 && items[active]) location.hash = items[active].getAttribute("href");
        else if (input.value.trim()) location.hash = "#/search?q=" + encodeURIComponent(input.value.trim());
        closeSearch();
      } else if (e.key === "Escape") closeSearch();
    });
    panel.addEventListener("click", (e) => {
      const term = e.target.closest("[data-term]");
      if (term) { input.value = term.dataset.term; render(); input.focus(); return; }
      if (e.target.closest("a")) closeSearch();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#search") && !e.target.closest("#searchBtnMobile")) closeSearch(true); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") closeLayers();
    });
    $("#searchBtnMobile").addEventListener("click", () => ($("#search").classList.contains("open") ? closeSearch() : openSearch()));
    function openSearch() { $("#search").classList.add("open"); input.focus(); }
    function closeSearch(keepMobile) { panel.classList.remove("open"); if (!keepMobile) { $("#search").classList.remove("open"); input.blur(); } }
    setupSearch.close = closeSearch;
  }

  /* ---------------- Views ---------------- */
  const app = $("#app");

  function viewHome() {
    const pick = (names) => names.map((n) => CATS.find((c) => norm(c.name).includes(n))).filter((c) => c && c.items.length);
    const heroCats = pick(["peluche", "juguete", "navidad", "flores", "halloween", "bolso"]);
    const heroProds = heroCats.map((c) => c.items.find((p) => p.price > 3) || c.items[0]).slice(0, 4);
    while (heroProds.length < 4 && newest[heroProds.length]) heroProds.push(newest[heroProds.length]);
    const latest = (DATA.latest || []).map((id) => byId.get(id)).filter(Boolean);
    const latestList = (latest.length >= 8 ? latest : newest).slice(0, 8);
    const subCount = CATS.reduce((a, c) => a + c.subs.length, 0);
    const promoCats = pick(["halloween", "peluche", "navidad", "juguete"]).slice(0, 2);
    const tabCats = pick(["juguete", "peluche", "navidad", "utiles", "bolso", "pinata", "fiesta", "decoracion"]).slice(0, 6);

    app.innerHTML = `
    <section class="hero">
      <div class="container hero__grid">
        <div>
          <span class="eyebrow"><b>NUEVO</b> Temporada de Halloween y Navidad ya disponible</span>
          <h1>Todo para <em>regalar, celebrar</em> y jugar.</h1>
          <p class="lead">Juguetes, peluches, piñatería, útiles escolares, decoración y mucho más. Precios claros, novedades cada semana y atención directa por WhatsApp.</p>
          <div class="hero__cta">
            <a class="btn btn--grad" href="#/all">${icon("bag")} Comprar ahora</a>
            <button class="btn btn--ghost" data-scroll="novedades">Ver novedades</button>
          </div>
          <div class="hero__stats">
            <div><b>${CATS.length}</b><span>Categorías</span></div>
            <div><b>${subCount}+</b><span>Subcategorías</span></div>
            <div><b>24/7</b><span>Pedidos en línea</span></div>
          </div>
        </div>
        <div class="collage" aria-hidden="true">
          ${heroProds.map((p) => `<a class="collage__card" href="#/p/${p.id}" tabindex="-1"><img src="${p.img}" alt=""></a>`).join("")}
          <div class="collage__tag collage__tag--a"><span class="dot">${icon("sparkles")}</span><div><b>Nuevos ingresos</b><span class="muted">cada semana</span></div></div>
          <div class="collage__tag collage__tag--b"><span class="dot" style="background:#25d366">${icon("whatsapp")}</span><div><b>Pide por WhatsApp</b><span class="muted">respuesta rápida</span></div></div>
        </div>
      </div>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee__track">
      ${[0, 1].map(() => CATS.map((c) => `<span>${esc(c.label)}</span>`).join("")).join("")}
    </div></div>

    <section class="section"><div class="container">
      <div class="trust">
        ${[["truck", "Envíos nacionales", "MRW · Zoom · Tealca*"], ["shield", "Compra segura", "Pago Móvil, Zelle, Binance*"], ["receipt", "Precios transparentes", "IVA (16%) calculado al pagar"], ["chat", "Atención directa", "WhatsApp 0412-2200366"]]
          .map(([i, t, s]) => `<div class="trust__item"><span class="trust__ico">${icon(i)}</span><div><b>${t}</b><span>${s}</span></div></div>`).join("")}
      </div>
    </div></section>

    <section class="section" style="padding-top:8px"><div class="container">
      ${sectionHead("Compra por categoría", "Encuentra exactamente lo que buscas", "#/all", "Todos los productos")}
      <div class="cats">${CATS.filter((c) => c.items.length).map((c) => `
        <a class="cat-tile" href="#/c/${c.id}"><div class="cat-tile__img"><img src="${(c.items.find((p) => p.price > 2) || c.items[0]).img}" alt="" loading="lazy"></div><b>${esc(c.label)}</b><small>${c.subs.length ? c.subs.length + " subcategorías" : c.items.length + " productos"}</small></a>`).join("")}
      </div>
    </div></section>

    <section class="section section--soft" id="novedades"><div class="container">
      ${sectionHead("Recién llegados ✨", "Lo último que entró a la tienda", "#/all?sort=new")}
      ${grid(latestList)}
    </div></section>

    ${promoCats.length === 2 ? `<section class="section"><div class="container promos">
      ${promoCats.map((c, i) => `<a class="promo promo--${i ? "b" : "a"}" href="#/c/${c.id}">
        <div class="promo__imgs">${c.items.slice(0, 4).map((p) => `<img src="${p.img}" alt="" loading="lazy">`).join("")}</div>
        <small>Colección</small><h3>${esc(c.label)}</h3><span class="btn btn--sm">Descubrir ${icon("arrow")}</span></a>`).join("")}
    </div></section>` : ""}

    <section class="section" style="padding-top:${promoCats.length === 2 ? 8 : 64}px"><div class="container">
      <div class="section__head"><div><h2>Lo más buscado</h2><p>Explora por colección</p></div>
        <div class="tabs" role="tablist">${tabCats.map((c, i) => `<button class="chip ${i ? "" : "active"}" role="tab" data-tab="${c.id}">${esc(c.label)}</button>`).join("")}</div></div>
      <div id="tabGrid">${tabCats[0] ? grid(tabCats[0].items.slice(0, 8)) : ""}</div>
      <div style="text-align:center;margin-top:28px"><a class="btn btn--ghost" id="tabMore" href="#/c/${tabCats[0]?.id || ""}">Ver toda la colección ${icon("arrow")}</a></div>
    </div></section>

    <section class="section"><div class="container">
      <div class="promo promo--a" style="min-height:auto;align-items:center;text-align:center;padding:56px 24px">
        <small>¿Compras para tu negocio o un evento?</small>
        <h3 style="max-width:none">Arma tu pedido y envíalo por WhatsApp</h3>
        <p style="margin:0 0 20px;opacity:.9;max-width:540px">Agrega productos al carrito y con un clic nos llega tu lista completa con referencias y precios. Te confirmamos disponibilidad y pago.</p>
        <a class="btn btn--wa" style="align-self:center" href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener">${icon("whatsapp")} Escribir por WhatsApp</a>
      </div>
    </div></section>`;

    $$("[data-tab]").forEach((b) => b.addEventListener("click", () => {
      $$("[data-tab]").forEach((x) => x.classList.toggle("active", x === b));
      const c = catById.get(b.dataset.tab);
      $("#tabGrid").innerHTML = grid(c.items.slice(0, 8));
      $("#tabMore").href = "#/c/" + c.id;
    }));
    $("[data-scroll]")?.addEventListener("click", (e) => $("#" + e.currentTarget.dataset.scroll).scrollIntoView({ behavior: "smooth" }));
  }

  function viewCollection({ cid, q, wish }, params) {
    const cat = cid ? catById.get(cid) : null;
    if (cid && !cat) return viewNotFound();
    const st = {
      sub: params.get("sub") || "",
      sort: params.get("sort") || "featured",
      min: params.get("min") || "",
      max: params.get("max") || "",
      cols: +store.get("sw_cols", 4),
      shown: PAGE,
    };
    const base = wish ? state.wish.map((id) => byId.get(id)).filter(Boolean) : q ? search(q) : cat ? cat.items : P;
    const title = wish ? "Lista de deseos" : q ? `Resultados para “${q}”` : cat ? cat.label : "Todos los productos";
    const subs = cat ? cat.subs.map((s) => ({ ...s, n: cat.items.filter((p) => p.subs?.includes(s.id)).length })).filter((s) => s.n) : [];

    app.innerHTML = `
      <div class="container page-head">
        ${crumbs(cat ? [{ label: cat.label, href: st.sub ? `#/c/${cat.id}` : "" }, ...(st.sub && subById.get(st.sub) ? [{ label: subById.get(st.sub).label }] : [])] : [{ label: title }])}
        <h1>${esc(title)}</h1>
        <p class="muted" id="countLine"></p>
      </div>
      <div class="container collection">
        <aside class="filters" id="filters">
          <div style="display:flex;justify-content:space-between;align-items:center" class="only-mobile-flex"><h3 style="font-size:18px">Filtros</h3></div>
          <div><h4>Categorías</h4><div class="filters__list">
            <a href="#/all" class="${!cat && !q && !wish ? "active" : ""}">Todos <small>${P.length}</small></a>
            ${CATS.filter((c) => c.items.length).map((c) => `<a href="#/c/${c.id}" class="${cat?.id === c.id ? "active" : ""}">${esc(c.label)} <small>${c.items.length}</small></a>`).join("")}
          </div></div>
          <div><h4>Precio (USD)</h4><div class="range">
            <input type="number" min="0" step="0.5" placeholder="Mín" id="fMin" value="${esc(st.min)}"><span class="muted">—</span><input type="number" min="0" step="0.5" placeholder="Máx" id="fMax" value="${esc(st.max)}">
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${[[0, 5], [5, 15], [15, 30], [30, ""]].map(([a, b]) => `<button class="chip" data-price="${a}-${b}">${b === "" ? `+$${a}` : `$${a}–$${b}`}</button>`).join("")}</div></div>
          <button class="btn btn--ghost btn--sm" id="fClear">Limpiar filtros</button>
          <button class="btn btn--primary only-mobile" id="fApply" style="width:100%">Ver resultados</button>
        </aside>
        <div>
          ${subs.length ? `<div class="subchips"><button class="chip ${st.sub ? "" : "active"}" data-sub="">Todo</button>${subs.map((s) => `<button class="chip ${st.sub === s.id ? "active" : ""}" data-sub="${s.id}">${esc(cap(s.name))} <small>${s.n}</small></button>`).join("")}</div>` : ""}
          <div class="toolbar">
            <div class="toolbar__left">
              <button class="btn btn--ghost btn--sm only-mobile" id="fOpen">${icon("filter")} Filtros</button>
              <span class="muted small hide-mobile" id="countSmall"></span>
            </div>
            <div class="toolbar__left">
              <select class="select" id="fSort" aria-label="Ordenar">
                ${[["featured", "Destacados"], ["new", "Más recientes"], ["price-asc", "Precio: menor a mayor"], ["price-desc", "Precio: mayor a menor"], ["az", "Nombre: A–Z"]].map(([v, l]) => `<option value="${v}" ${st.sort === v ? "selected" : ""}>${l}</option>`).join("")}
              </select>
              <div class="density hide-mobile">${[2, 3, 4].map((n) => `<button data-cols="${n}" class="${st.cols === n ? "active" : ""}" aria-label="${n} columnas">${icon("g" + n)}</button>`).join("")}</div>
            </div>
          </div>
          <div id="results"></div>
        </div>
      </div>`;

    const apply = (keepShown) => {
      if (!keepShown) st.shown = PAGE;
      let list = base.slice();
      if (st.sub) list = list.filter((p) => p.subs?.includes(st.sub));
      const mn = parseFloat(st.min), mx = parseFloat(st.max);
      if (!isNaN(mn)) list = list.filter((p) => p.price >= mn);
      if (!isNaN(mx)) list = list.filter((p) => p.price <= mx);
      const sorters = { new: (a, b) => b.idn - a.idn, "price-asc": (a, b) => a.price - b.price, "price-desc": (a, b) => b.price - a.price, az: (a, b) => a.title.localeCompare(b.title) };
      if (sorters[st.sort]) list.sort(sorters[st.sort]);
      const n = list.length;
      $("#countLine").textContent = `${n} producto${n === 1 ? "" : "s"}${st.sub ? "" : ""}`;
      $("#countSmall").textContent = `Mostrando ${Math.min(st.shown, n)} de ${n}`;
      $("#results").innerHTML = n ? grid(list.slice(0, st.shown), st.cols) + (n > st.shown ? `
        <div class="load-more"><span>Has visto ${st.shown} de ${n} productos</span><div class="progress"><i style="width:${(st.shown / n) * 100}%"></i></div><button class="btn btn--ghost" id="more">Cargar más</button></div>` : "")
        : `<div class="empty"><div class="empty__ico">${icon(wish ? "heart" : "search")}</div><h3>${wish ? "Tu lista está vacía" : "No encontramos productos"}</h3><p>${wish ? "Toca el ❤️ en cualquier producto para guardarlo aquí." : "Prueba con otra palabra o quita algunos filtros."}</p><a class="btn btn--primary" href="#/all">Explorar productos</a></div>`;
      hydrateIcons($("#results"));
      $("#more")?.addEventListener("click", () => { st.shown += PAGE; apply(true); });
      // reflect in URL without re-render
      const sp = new URLSearchParams(); if (q) sp.set("q", q);
      ["sub", "sort", "min", "max"].forEach((k) => { if (st[k] && !(k === "sort" && st[k] === "featured")) sp.set(k, st[k]); });
      const path = location.hash.split("?")[0];
      history.replaceState(null, "", path + (sp.toString() ? "?" + sp : ""));
    };
    $$("[data-sub]").forEach((b) => b.addEventListener("click", () => { st.sub = b.dataset.sub; $$("[data-sub]").forEach((x) => x.classList.toggle("active", x === b)); apply(); }));
    $("#fSort").addEventListener("change", (e) => { st.sort = e.target.value; apply(); });
    $$("[data-cols]").forEach((b) => b.addEventListener("click", () => { st.cols = +b.dataset.cols; store.set("sw_cols", st.cols); $$("[data-cols]").forEach((x) => x.classList.toggle("active", x === b)); apply(true); }));
    let pt; const onPrice = () => { clearTimeout(pt); pt = setTimeout(() => { st.min = $("#fMin").value; st.max = $("#fMax").value; apply(); }, 350); };
    $("#fMin").addEventListener("input", onPrice); $("#fMax").addEventListener("input", onPrice);
    $$("[data-price]").forEach((b) => b.addEventListener("click", () => { const [a, c] = b.dataset.price.split("-"); $("#fMin").value = st.min = a; $("#fMax").value = st.max = c; apply(); }));
    $("#fClear").addEventListener("click", () => { st.min = st.max = st.sub = ""; $("#fMin").value = $("#fMax").value = ""; $$("[data-sub]").forEach((x) => x.classList.toggle("active", !x.dataset.sub)); apply(); });
    $("#fOpen")?.addEventListener("click", () => openLayer($("#filters")));
    $("#fApply")?.addEventListener("click", () => closeLayers());
    apply();
  }

  function viewProduct(id) {
    const p = byId.get(id);
    if (!p) return viewNotFound();
    const c = catOf(p);
    const sub = p.subs?.[0] && subById.get(p.subs[0]);
    const related = (sub ? P.filter((x) => x.id !== p.id && x.subs?.includes(sub.id)) : []).concat(c ? c.items.filter((x) => x.id !== p.id) : []);
    const rel = [...new Map(related.map((x) => [x.id, x])).values()].slice(0, 8);
    const fav = state.wish.includes(p.id);
    const waMsg = encodeURIComponent(`Hola Super Win 👋, me interesa este producto:\n• ${p.name}\nPrecio: ${fmt(p.price)} + IVA\n¿Está disponible?`);
    document.title = `${p.title} · Super Win`;

    app.innerHTML = `
      <div class="container page-head" style="padding-bottom:0">${crumbs([...(c ? [{ label: c.label, href: `#/c/${c.id}` }] : []), ...(sub ? [{ label: sub.label, href: `#/c/${c.id}?sub=${sub.id}` }] : []), { label: p.title }])}</div>
      <div class="container pdp">
        <div class="pdp__media">
          <div class="zoom" id="zoom"><img src="${p.img}" alt="${esc(p.title)}"></div>
        </div>
        <div class="pdp__info">
          ${NEW_SET.has(p.id) ? '<span class="tag tag--new">Nuevo ingreso</span>' : ""}
          <h1>${esc(p.title)}</h1>
          <div class="pdp__meta">${p.sku ? `<span>Ref: <b>#${esc(p.sku)}</b></span>` : ""}<span>Código: <b>${p.id}</b></span>${c ? `<span>Categoría: <a href="#/c/${c.id}"><b>${esc(c.label)}</b></a></span>` : ""}</div>
          <div class="pdp__price"><span class="price">${fmt(p.price)}</span>${p.compare ? `<span class="price-old">${fmt(p.compare)}</span>` : ""}<span class="price-tax">+ IVA (16%)</span></div>
          <div class="muted small">Total con IVA: <b>${fmt(p.price * (1 + IVA))}</b></div>
          <div style="margin-top:14px"><span class="stock">Disponible para pedido</span></div>
          <div class="pdp__buy" id="buyBox">
            <div class="qty"><button data-q="-1" aria-label="Menos">${icon("minus")}</button><input id="qty" type="number" value="1" min="1" max="999" aria-label="Cantidad"><button data-q="1" aria-label="Más">${icon("plus")}</button></div>
            <button class="btn btn--primary btn--block" id="addBtn">${icon("bag")} Agregar al carrito</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:12px">
            <a class="btn btn--wa btn--block" target="_blank" rel="noopener" href="https://wa.me/${WA_NUMBER}?text=${waMsg}">${icon("whatsapp")} Consultar por WhatsApp</a>
            <button class="btn btn--ghost card__fav-lg ${fav ? "on" : ""}" data-fav="${p.id}" aria-label="Lista de deseos" style="width:52px;padding:0">${icon("heart")}</button>
          </div>
          <div class="pdp__perks">
            <div class="perk">${icon("truck")}<div><b>Envíos a todo el país</b>o retiro en tienda, Caracas</div></div>
            <div class="perk">${icon("shield")}<div><b>Pago seguro</b>Pago Móvil · Zelle · Binance</div></div>
            <div class="perk">${icon("chat")}<div><b>Te asesoramos</b>colores y modelos por WhatsApp</div></div>
            <div class="perk">${icon("gift")}<div><b>Ideal para regalar</b>bolsas y papel de regalo disponibles</div></div>
          </div>
          <div class="acc">
            <details open><summary>Descripción</summary><div>${esc(p.title)}${p.sku ? ` (ref. #${esc(p.sku)})` : ""}. Producto de la categoría ${esc(c?.label || "")}${sub ? " · " + esc(sub.label) : ""}. Las imágenes son referenciales; colores y modelos pueden variar según disponibilidad. <i>(Descripción de ejemplo — se reemplaza con la ficha real.)</i></div></details>
            <details><summary>Envíos y entregas</summary><div>Despachos a nivel nacional mediante agencias de encomienda y delivery en Caracas. Tiempos y costos se confirman al procesar tu pedido. <i>(Texto de ejemplo.)</i></div></details>
            <details><summary>Métodos de pago</summary><div>Pago Móvil, transferencia, Zelle, Binance (USDT) o efectivo en tienda. Los precios no incluyen IVA (16%). <i>(A confirmar por la tienda.)</i></div></details>
          </div>
        </div>
      </div>
      ${rel.length ? `<section class="section section--soft"><div class="container">${sectionHead("También te puede gustar", "", c ? `#/c/${c.id}` : "")}${grid(rel)}</div></section>` : ""}
      <div class="sticky-buy" id="stickyBuy"><div class="container sticky-buy__row">
        <img src="${p.img}" alt=""><div class="sticky-buy__name">${esc(p.title)}<div class="muted small">${fmt(p.price)} + IVA</div></div>
        <button class="btn btn--primary btn--sm" id="addBtn2">${icon("bag")} Agregar</button></div></div>`;

    const qty = $("#qty");
    $$("[data-q]").forEach((b) => b.addEventListener("click", () => { qty.value = Math.max(1, Math.min(999, (+qty.value || 1) + +b.dataset.q)); }));
    $("#addBtn").addEventListener("click", () => addToCart(p.id, Math.max(1, +qty.value || 1), $("#zoom img")));
    $("#addBtn2").addEventListener("click", () => addToCart(p.id, Math.max(1, +qty.value || 1), $("#stickyBuy img")));
    const z = $("#zoom"), zi = $("#zoom img");
    if (matchMedia("(hover:hover)").matches) {
      z.addEventListener("mousemove", (e) => { const r = z.getBoundingClientRect(); zi.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`; });
      z.addEventListener("mouseenter", () => z.classList.add("on"));
      z.addEventListener("mouseleave", () => z.classList.remove("on"));
    }
    const sb = $("#stickyBuy");
    const io = new IntersectionObserver(([en]) => { const show = !en.isIntersecting && en.boundingClientRect.top < 0; sb.classList.toggle("show", show); document.body.classList.toggle("has-sticky", show); });
    io.observe($("#buyBox"));
    viewProduct.cleanup = () => { io.disconnect(); document.body.classList.remove("has-sticky"); };
  }

  function quickView(id) {
    const p = byId.get(id); if (!p) return;
    const c = catOf(p);
    $("#modalCard").innerHTML = `
      <button class="icon-btn modal__close" data-close aria-label="Cerrar">${icon("x")}</button>
      <div class="modal__media"><img src="${p.img}" alt="${esc(p.title)}"></div>
      <div class="modal__info">
        <span class="card__cat">${esc(c?.label || "")}</span>
        <h2>${esc(p.title)}</h2>
        ${p.sku ? `<span class="muted small">Ref. #${esc(p.sku)}</span>` : ""}
        <div class="pdp__price" style="margin:6px 0 0"><span class="price" style="font-size:30px">${fmt(p.price)}</span><span class="price-tax">+ IVA (16%)</span></div>
        <span class="stock">Disponible para pedido</span>
        <div class="pdp__buy" style="margin:12px 0 0">
          <div class="qty"><button data-mq="-1">${icon("minus")}</button><input id="mqty" type="number" value="1" min="1"><button data-mq="1">${icon("plus")}</button></div>
          <button class="btn btn--primary btn--block" id="mAdd">${icon("bag")} Agregar al carrito</button>
        </div>
        <a class="link-arrow" href="#/p/${p.id}" style="margin-top:8px">Ver detalles completos ${icon("arrow")}</a>
      </div>`;
    const q = $("#mqty");
    $$("[data-mq]").forEach((b) => b.addEventListener("click", () => { q.value = Math.max(1, (+q.value || 1) + +b.dataset.mq); }));
    $("#mAdd").addEventListener("click", () => { addToCart(p.id, Math.max(1, +q.value || 1), $(".modal__media img")); setTimeout(closeLayers, 350); });
    openLayer($("#modal"));
  }

  function renderCart() {
    const items = cartItems();
    const body = $("#cartBody"), foot = $("#cartFoot");
    $("#cartHeadCount").textContent = items.length ? `(${cartCount()})` : "";
    if (!items.length) {
      body.innerHTML = `<div class="empty" style="padding:40px 0"><div class="empty__ico">${icon("bag")}</div><h3>Tu carrito está vacío</h3><p>¡Descubre lo nuevo de la semana!</p></div>
        <div class="sr-head">Sugerencias para ti</div>
        ${newest.slice(0, 3).map((p) => `<div class="line"><a href="#/p/${p.id}"><img src="${p.img}" alt=""></a><div><div class="line__name">${esc(p.title)}</div><div class="line__meta">${fmt(p.price)} + IVA</div></div><div class="line__right"><button class="btn btn--primary btn--sm" data-add="${p.id}">${icon("plus")}</button></div></div>`).join("")}`;
      foot.innerHTML = `<a class="btn btn--primary btn--block" href="#/all" data-close-after>Explorar productos</a>`;
      return;
    }
    const sub = cartSubtotal(), tax = sub * IVA;
    body.innerHTML = items.map(({ p, q }) => `
      <div class="line">
        <a href="#/p/${p.id}"><img src="${p.img}" alt=""></a>
        <div><div class="line__name">${esc(p.title)}</div><div class="line__meta">${p.sku ? "Ref. #" + esc(p.sku) + " · " : ""}${fmt(p.price)} c/u</div>
          <div class="qty qty--sm"><button data-dec="${p.id}" aria-label="Menos">${icon("minus")}</button><input value="${q}" data-set="${p.id}" type="number" min="0" aria-label="Cantidad"><button data-inc="${p.id}" aria-label="Más">${icon("plus")}</button></div></div>
        <div class="line__right"><b>${fmt(p.price * q)}</b><button class="line__rm" data-rm="${p.id}">Eliminar</button></div>
      </div>`).join("");
    foot.innerHTML = `
      <div class="sum"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="sum"><span>IVA (16%)</span><span>${fmt(tax)}</span></div>
      <div class="sum sum--total"><span>Total</span><span>${fmt(sub + tax)}</span></div>
      <div class="note">${icon("truck")} El envío se calcula al confirmar tu pedido.</div>
      <a class="btn btn--grad btn--block" href="#/checkout" data-close-after>Finalizar compra ${icon("arrow")}</a>
      <a class="btn btn--wa btn--block" target="_blank" rel="noopener" href="${waOrderLink()}">${icon("whatsapp")} Enviar pedido por WhatsApp</a>`;
  }

  function orderText(extra = "") {
    const items = cartItems();
    const sub = cartSubtotal();
    return `🛍️ *Nuevo pedido — Super Win*\n${extra}\n` +
      items.map(({ p, q }) => `• ${q} × ${p.name} — ${fmt(p.price * q)}`).join("\n") +
      `\n\nSubtotal: ${fmt(sub)}\nIVA (16%): ${fmt(sub * IVA)}\n*Total: ${fmt(sub * (1 + IVA))}*`;
  }
  const waOrderLink = (extra) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(orderText(extra))}`;

  function viewCheckout() {
    const items = cartItems();
    if (!items.length) {
      app.innerHTML = `<div class="container"><div class="empty"><div class="empty__ico">${icon("bag")}</div><h3>Tu carrito está vacío</h3><p>Agrega productos para continuar.</p><a class="btn btn--primary" href="#/all">Explorar productos</a></div></div>`;
      return;
    }
    const sub = cartSubtotal();
    app.innerHTML = `
      <div class="container page-head">${crumbs([{ label: "Carrito", href: "" }, { label: "Finalizar compra" }])}<h1>Finalizar compra</h1><p class="muted">Completa tus datos — te confirmamos disponibilidad y pago por WhatsApp.</p></div>
      <form class="container checkout" id="coForm" novalidate>
        <div style="display:flex;flex-direction:column;gap:20px">
          <div class="panel"><h3><i>1</i> Datos de contacto</h3><div class="form">
            <div class="field"><label>Nombre y apellido *</label><input name="name" required autocomplete="name"></div>
            <div class="field"><label>Teléfono / WhatsApp *</label><input name="phone" required inputmode="tel" placeholder="0412-0000000" autocomplete="tel"></div>
            <div class="field"><label>Cédula o RIF</label><input name="doc" placeholder="V-12345678"></div>
            <div class="field"><label>Correo (opcional)</label><input name="email" type="email" autocomplete="email"></div>
          </div></div>
          <div class="panel"><h3><i>2</i> Entrega</h3><div class="form">
            <div class="field full"><div class="pay-opts">
              ${[["pickup", "🏬", "Retiro en tienda (Caracas)"], ["delivery", "🛵", "Delivery en Caracas"], ["national", "📦", "Envío nacional (MRW / Zoom / Tealca)"]].map(([v, e, l], i) => `<label class="pay-opt"><input type="radio" name="ship" value="${l}" ${i ? "" : "checked"}><span><em>${e}</em>${l}</span></label>`).join("")}
            </div></div>
            <div class="field"><label>Ciudad / Estado</label><input name="city" placeholder="Caracas, Distrito Capital"></div>
            <div class="field"><label>Dirección o agencia</label><input name="addr" placeholder="Dirección o código de agencia"></div>
          </div></div>
          <div class="panel"><h3><i>3</i> Método de pago</h3>
            <div class="pay-opts">
              ${[["📱", "Pago Móvil"], ["💵", "Zelle"], ["🪙", "Binance (USDT)"], ["💰", "Efectivo en tienda"]].map(([e, l], i) => `<label class="pay-opt"><input type="radio" name="pay" value="${l}" ${i ? "" : "checked"}><span><em>${e}</em>${l}</span></label>`).join("")}
              <label class="pay-opt" title="Próximamente"><input type="radio" name="pay" disabled><span style="opacity:.5"><em>💳</em>Tarjeta (próximamente)</span></label>
            </div>
            <div class="field" style="margin-top:14px"><label>Notas del pedido</label><textarea name="notes" placeholder="Colores preferidos, horario de entrega, etc."></textarea></div>
          </div>
        </div>
        <aside class="panel summary">
          <h3>Resumen del pedido</h3>
          ${items.map(({ p, q }) => `<div class="line"><img src="${p.img}" alt=""><div><div class="line__name">${esc(p.title)}</div><div class="line__meta">${q} × ${fmt(p.price)}</div></div><div class="line__right"><b>${fmt(p.price * q)}</b></div></div>`).join("")}
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">
            <div class="sum"><span>Subtotal</span><span>${fmt(sub)}</span></div>
            <div class="sum"><span>IVA (16%)</span><span>${fmt(sub * IVA)}</span></div>
            <div class="sum"><span>Envío</span><span class="muted">Por confirmar</span></div>
            <div class="sum sum--total"><span>Total</span><span>${fmt(sub * (1 + IVA))}</span></div>
            <button class="btn btn--grad btn--block" type="submit" style="margin-top:8px">${icon("whatsapp")} Confirmar pedido por WhatsApp</button>
            <div class="note">${icon("shield")} No se realiza ningún cobro en línea. Te enviamos los datos de pago al confirmar.</div>
          </div>
        </aside>
      </form>`;
    $("#coForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const bad = ["name", "phone"].filter((k) => !String(f.get(k) || "").trim());
      $$("#coForm input").forEach((i) => (i.style.borderColor = bad.includes(i.name) ? "#ef4444" : ""));
      if (bad.length) { toast("⚠️ Completa nombre y teléfono"); $(`[name=${bad[0]}]`).focus(); return; }
      const d = new Date();
      const id = `SW-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const info = `Pedido: *${id}*\nCliente: ${f.get("name")} · ${f.get("phone")}${f.get("doc") ? " · " + f.get("doc") : ""}\nEntrega: ${f.get("ship")}${f.get("city") ? " — " + f.get("city") : ""}${f.get("addr") ? ", " + f.get("addr") : ""}\nPago: ${f.get("pay")}${f.get("notes") ? "\nNotas: " + f.get("notes") : ""}\n`;
      const link = waOrderLink(info);
      store.set("sw_last_order", { id, link, total: cartSubtotal() * (1 + IVA), count: cartCount() });
      window.open(link, "_blank", "noopener");
      state.cart = {}; saveCart();
      location.hash = "#/gracias/" + id;
    });
  }

  function viewThanks(id) {
    const o = store.get("sw_last_order", {});
    app.innerHTML = `<div class="container success">
      <div class="success__ico">${icon("check")}</div>
      <h1>¡Pedido enviado!</h1>
      <p class="muted">Tu número de pedido es <b style="color:var(--text)">${esc(id)}</b>${o.total ? ` · ${o.count} artículo(s) · Total ${fmt(o.total)}` : ""}.<br>Te responderemos por WhatsApp con la disponibilidad y los datos de pago.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px">
        ${o.link ? `<a class="btn btn--wa" href="${o.link}" target="_blank" rel="noopener">${icon("whatsapp")} Abrir WhatsApp de nuevo</a>` : ""}
        <a class="btn btn--ghost" href="#/">Seguir comprando</a>
      </div></div>`;
  }

  function viewInfo(slug) {
    const pages = {
      envios: ["Envíos y entregas", "<h2>Cobertura</h2><p>Despachos a todo el país mediante agencias de encomienda (MRW, Zoom, Tealca) y delivery dentro de Caracas.</p><h2>Tiempos</h2><p>Los pedidos confirmados se despachan en 24–48 horas hábiles.</p>"],
      pagos: ["Métodos de pago", "<p>Pago Móvil, transferencia bancaria, Zelle, Binance (USDT) y efectivo en tienda. Los precios publicados no incluyen IVA (16%).</p>"],
      devoluciones: ["Cambios y devoluciones", "<p>Aceptamos cambios por defectos de fábrica dentro de los 7 días siguientes a la entrega, presentando la factura.</p>"],
      contacto: ["Contáctenos", `<p><b>Comercial Super Win C.A</b><br>Caracas, Venezuela<br>Teléfono / WhatsApp: <a href="https://wa.me/${WA_NUMBER}" target="_blank" rel="noopener"><b>0412-2200366</b></a></p>`],
    };
    const pg = pages[slug]; if (!pg) return viewNotFound();
    app.innerHTML = `<div class="container page-head">${crumbs([{ label: pg[0] }])}<h1>${pg[0]}</h1></div><div class="container prose">${pg[1]}<p class="muted small"><i>Texto de ejemplo para la demo — la tienda debe confirmar sus políticas reales.</i></p></div>`;
  }

  function viewNotFound() {
    app.innerHTML = `<div class="container"><div class="empty"><div class="empty__ico">${icon("search")}</div><h3>Página no encontrada</h3><p>El enlace puede haber cambiado.</p><a class="btn btn--primary" href="#/">Volver al inicio</a></div></div>`;
  }

  /* ---------------- Router ---------------- */
  function route() {
    viewProduct.cleanup?.(); viewProduct.cleanup = null;
    closeLayers(); setupSearch.close?.();
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    const seg = path.split("/").filter(Boolean);
    document.title = "Comercial Super Win C.A · Juguetes, Fiestas, Regalos y más";
    if (!seg.length) viewHome();
    else if (seg[0] === "c") viewCollection({ cid: seg[1] }, params);
    else if (seg[0] === "all") viewCollection({}, params);
    else if (seg[0] === "search") viewCollection({ q: params.get("q") || "" }, params);
    else if (seg[0] === "wishlist") viewCollection({ wish: true }, params);
    else if (seg[0] === "p") viewProduct(seg[1]);
    else if (seg[0] === "checkout") viewCheckout();
    else if (seg[0] === "gracias") viewThanks(seg[1] || "");
    else if (seg[0] === "info") viewInfo(seg[1]);
    else viewNotFound();
    hydrateIcons(app);
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    app.focus({ preventScroll: true });
  }

  /* ---------------- Global events ---------------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const add = t.closest("[data-add]");
    if (add) { e.preventDefault(); const img = add.closest(".card, .line")?.querySelector("img"); addToCart(add.dataset.add, 1, img); return; }
    const fav = t.closest("[data-fav]");
    if (fav) { e.preventDefault(); toggleWish(fav.dataset.fav); return; }
    const qv = t.closest("[data-quick]");
    if (qv) { e.preventDefault(); quickView(qv.dataset.quick); return; }
    if (t.closest("[data-open-cart]")) { e.preventDefault(); openLayer($("#cartDrawer")); return; }
    if (t.closest("[data-close]")) { closeLayers(); return; }
    if (t.closest("[data-close-after]")) { closeLayers(); return; }
    const inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]"), rm = t.closest("[data-rm]");
    if (inc) setQty(inc.dataset.inc, (state.cart[inc.dataset.inc] || 0) + 1);
    if (dec) setQty(dec.dataset.dec, (state.cart[dec.dataset.dec] || 0) - 1);
    if (rm) setQty(rm.dataset.rm, 0);
  });
  document.addEventListener("change", (e) => { const s = e.target.closest("[data-set]"); if (s) setQty(s.dataset.set, Math.max(0, parseInt(s.value, 10) || 0)); });

  $("#cartBtn").addEventListener("click", () => openLayer($("#cartDrawer")));
  $("#menuBtn").addEventListener("click", () => openLayer($("#menuDrawer")));
  $("#menuDrawer").addEventListener("click", (e) => { if (e.target.closest("a")) closeLayers(); });
  $("#accountBtn").addEventListener("click", () => toast("👤 Cuentas de cliente: disponibles en la próxima versión"));
  $("#newsForm").addEventListener("submit", (e) => { e.preventDefault(); e.target.reset(); toast("🎉 ¡Gracias por suscribirte! (demo)"); });
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("sw_theme", next);
    $('meta[name="theme-color"]').setAttribute("content", next === "dark" ? "#0d0a13" : "#5b21b6");
  });
  window.addEventListener("scroll", () => $("#header").classList.toggle("scrolled", scrollY > 8), { passive: true });

  // announcement rotator
  (() => {
    const spans = $$("#announceTrack span"); let i = 0;
    spans[0].classList.add("on");
    setInterval(() => {
      spans[i].classList.remove("on"); spans[i].classList.add("out");
      const prev = spans[i]; setTimeout(() => prev.classList.remove("out"), 600);
      i = (i + 1) % spans.length; spans[i].classList.add("on");
    }, 3800);
  })();

  /* ---------------- Boot ---------------- */
  $("#year").textContent = new Date().getFullYear();
  hydrateIcons();
  buildNav();
  setupSearch();
  syncBadges();
  renderCart();
  window.addEventListener("hashchange", route);
  route();
})();
