/* Wedding site logic — no dependencies.
   Data comes from event.js (EVENT) and guests.js (GUESTS). */
(function () {
  "use strict";

  var REDUCED = false;
  try {
    REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { /* older browser — animate */ }

  /* ══════════ Hebrew-aware normalization ══════════ */
  var FINALS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

  function normalize(s) {
    if (!s) return "";
    var out = String(s).toLowerCase();
    // strip geresh, gershayim, apostrophes, quotes, periods, hyphens
    out = out.replace(/[\u05F3\u05F4'"’‘”“`׳״.\u05BE-]/g, "");
    // map Hebrew final letters to medial forms
    out = out.replace(/[ךםןףץ]/g, function (c) { return FINALS[c]; });
    // collapse whitespace
    out = out.replace(/\s+/g, " ").trim();
    return out;
  }

  function findMatches(query) {
    var q = normalize(query);
    if (q.length < 2) return [];
    var matches = [];
    for (var i = 0; i < GUESTS.length; i++) {
      if (normalize(GUESTS[i].name).indexOf(q) !== -1) matches.push(GUESTS[i]);
    }
    return matches;
  }

  /* expose for console self-test (task 4.1) */
  window.__wedding = { normalize: normalize, findMatches: findMatches };

  /* ══════════ Render EVENT into the page ══════════ */
  function text(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderEvent() {
    text("groom-name", EVENT.couple.groom);
    text("bride-name", EVENT.couple.bride);
    var dateEl = document.getElementById("event-date");
    if (dateEl) {
      dateEl.innerHTML = "";
      EVENT.dateDisplay.split(" \u00b7 ").forEach(function (part, i) {
        if (i > 0) {
          var sep = document.createElement("span");
          sep.className = "date-sep";
          sep.textContent = " \u00b7 ";
          dateEl.appendChild(sep);
        }
        var sp = document.createElement("span");
        sp.className = "date-part";
        sp.textContent = part;
        dateEl.appendChild(sp);
      });
    }
    text("hero-venue", EVENT.venue.name);
    text("venue-name", EVENT.venue.name);
    text("venue-address", EVENT.venue.address);
    text("footer-note", EVENT.footerNote || "");
    var note = document.getElementById("venue-note");
    if (note && EVENT.venue.note) { note.textContent = EVENT.venue.note; note.hidden = false; }
    var waze = document.getElementById("waze-link");
    var maps = document.getElementById("maps-link");
    if (waze) waze.href = EVENT.venue.wazeUrl;
    if (maps) maps.href = EVENT.venue.mapsUrl;

    var tl = document.getElementById("timeline");
    if (tl) {
      tl.innerHTML = "";
      EVENT.schedule.forEach(function (item) {
        var li = document.createElement("li");
        var t = document.createElement("span");
        t.className = "tl-time";
        t.textContent = item.time;
        var l = document.createElement("span");
        l.className = "tl-label";
        l.textContent = item.label;
        li.appendChild(t);
        li.appendChild(l);
        tl.appendChild(li);
      });
    }
  }

  /* ══════════ Finder UI ══════════ */
  var input, clearBtn, sugList, resultCard, nomatchCard;

  function hide(el) { if (el) { el.hidden = true; el.classList.remove("is-in"); } }
  function show(el) {
    if (el) {
      el.hidden = false;
      // restart the entrance animation
      el.classList.remove("is-in");
      void el.offsetWidth;
      el.classList.add("is-in");
    }
  }

  /* shared-element morph between the search box and the result cards */
  function morph(mutate, after) {
    if (!REDUCED && document.startViewTransition) {
      var t = document.startViewTransition(mutate);
      if (after) t.finished.then(after).catch(after);
    } else {
      mutate();
      if (after) after();
    }
  }

  function closeSuggestions() {
    sugList.classList.remove("is-open");
    sugList.innerHTML = "";
  }

  function openSuggestions(matches) {
    sugList.innerHTML = "";
    matches.slice(0, 8).forEach(function (g) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      var name = document.createElement("span");
      name.textContent = g.name;
      var tbl = document.createElement("span");
      tbl.className = "sug-table";
      tbl.textContent = String(g.table).length > 2 ? g.zone : "שולחן " + g.table + " · " + g.zone;
      li.appendChild(name);
      li.appendChild(tbl);
      li.addEventListener("click", function () { select(g); });
      sugList.appendChild(li);
    });
    sugList.classList.add("is-open");
  }

  function select(guest) {
    closeSuggestions();
    text("result-name", guest.name + " 🤍");
    var tableEl = document.getElementById("result-table");
    tableEl.textContent = String(guest.table);
    tableEl.classList.toggle("result__table--text", String(guest.table).length > 2);
    text("result-zone", guest.zone || "");
    var finderBox = document.getElementById("finder-box");
    morph(function () {
      hide(nomatchCard);
      finderBox.hidden = true;
      show(resultCard);
    }, function () {
      resultCard.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "center" });
      if (!REDUCED) confettiBurst();
    });
  }

  function showNoMatch() {
    closeSuggestions();
    var finderBox = document.getElementById("finder-box");
    morph(function () {
      hide(resultCard);
      finderBox.hidden = true;
      show(nomatchCard);
    });
  }

  function resetSearch() {
    var finderBox = document.getElementById("finder-box");
    input.value = "";
    clearBtn.hidden = true;
    closeSuggestions();
    morph(function () {
      hide(resultCard);
      hide(nomatchCard);
      finderBox.hidden = false;
    }, function () {
      input.focus();
    });
  }

  function onInput() {
    var v = input.value;
    clearBtn.hidden = v.length === 0;
    hide(resultCard);
    hide(nomatchCard);
    var matches = findMatches(v);
    if (normalize(v).length < 2) { closeSuggestions(); return; }
    if (matches.length === 0) { closeSuggestions(); return; }
    openSuggestions(matches);
  }

  function onSubmit() {
    var matches = findMatches(input.value);
    if (normalize(input.value).length < 2) return;
    if (matches.length === 1) select(matches[0]);
    else if (matches.length === 0) showNoMatch();
    else openSuggestions(matches); // ambiguous — let the guest pick
  }

  function wireFinder() {
    input = document.getElementById("guest-input");
    clearBtn = document.getElementById("finder-clear");
    sugList = document.getElementById("suggestions");
    resultCard = document.getElementById("result");
    nomatchCard = document.getElementById("nomatch");

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
      if (e.key === "Escape") closeSuggestions();
    });
    clearBtn.addEventListener("click", resetSearch);
    document.getElementById("search-again").addEventListener("click", resetSearch);
    document.getElementById("nomatch-again").addEventListener("click", resetSearch);
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#finder-box")) closeSuggestions();
    });
  }

  /* ══════════ Scroll reveals ══════════ */
  function wireReveals() {
    var targets = document.querySelectorAll(".reveal");
    if (REDUCED || !("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target); // fire once
        }
      });
    }, { threshold: 0.18 });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ══════════ Confetti (canvas, transform/opacity only) ══════════ */
  function confettiBurst() {
    var canvas = document.getElementById("confetti");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    var colors = ["#a97e3f", "#c9a86a", "#4a3421", "#63482e", "#e8d9b8"];
    var parts = [];
    for (var i = 0; i < 90; i++) {
      parts.push({
        x: w / 2, y: h * 0.55,
        vx: (Math.random() - 0.5) * 9,
        vy: -(Math.random() * 8 + 4),
        size: Math.random() * 5 + 3,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1
      });
    }
    var start = null;
    function frame(ts) {
      if (!start) start = ts;
      var done = true;
      ctx.clearRect(0, 0, w, h);
      parts.forEach(function (p) {
        if (p.life <= 0) return;
        done = false;
        p.vy += 0.25;              // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.012;
        ctx.save();
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (!done && ts - start < 3500) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  /* ══════════ Boot ══════════ */
  function boot() {
    renderEvent();
    wireFinder();
    wireReveals();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
