/* ============================================
   StoryForge Shorts — App
   ============================================ */
(function () {
  "use strict";

  const BASE = ".";

  let allStories = [];
  let currentFilter = "All";
  let currentSort = "newest";

  /* --- Utilities --- */

  function esc(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function escAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function fmt(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  /* --- Scroll Reveal --- */

  function initReveal() {
    const els = document.querySelectorAll(".reveal:not(.revealed)");
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
  }

  /* --- Nav scroll + scroll hint hide --- */

  function initNav() {
    const nav = document.querySelector(".site-nav");
    const toggle = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    const scrollHint = document.querySelector(".scroll-hint");

    if (nav) {
      window.addEventListener("scroll", () => {
        nav.classList.toggle("scrolled", window.scrollY > 60);
        // Hide scroll indicator once user scrolls
        if (scrollHint) {
          scrollHint.classList.toggle("hidden", window.scrollY > 100);
        }
      });
    }

    if (toggle && links) {
      toggle.addEventListener("click", () => {
        toggle.classList.toggle("open");
        links.classList.toggle("open");
      });
      links.querySelectorAll("a").forEach((a) => {
        a.addEventListener("click", () => {
          toggle.classList.remove("open");
          links.classList.remove("open");
        });
      });
    }
  }

  /* --- Back to top --- */

  function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;
    window.addEventListener("scroll", () => {
      btn.classList.toggle("visible", window.scrollY > 500);
    });
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* --- Animated counters --- */

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (!target) { el.textContent = "0"; return; }
    const duration = 1400;
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  function initCounters() {
    const container = document.getElementById("stats-row");
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          observer.unobserve(e.target);
          e.target.querySelectorAll("[data-target]").forEach(animateCounter);
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(container);
  }

  /* --- Group videos into stories --- */

  function groupStories(videos) {
    const map = new Map();
    for (const v of videos) {
      if (!map.has(v.story_id)) {
        map.set(v.story_id, {
          story_id: v.story_id,
          subreddit: v.subreddit,
          title: v.title || "",
          date: v.date,
          parts: [],
          views: 0,
          likes: 0,
        });
      }
      const s = map.get(v.story_id);
      s.parts.push(v);
      s.views += v.views || 0;
      s.likes += v.likes || 0;
    }
    for (const s of map.values()) {
      s.parts.sort((a, b) => (a.part || 1) - (b.part || 1));
    }
    return Array.from(map.values());
  }

  /* --- Sorting --- */

  function sortStories(stories, mode) {
    const copy = [...stories];
    if (mode === "popular") {
      copy.sort((a, b) => b.views - a.views);
    }
    // "newest" is already the default order from the JSON
    return copy;
  }

  function getFilteredSorted() {
    let list = currentFilter === "All"
      ? allStories
      : allStories.filter((s) => s.subreddit === currentFilter);
    return sortStories(list, currentSort);
  }

  /* --- Init --- */

  async function init() {
    initNav();
    initBackToTop();

    try {
      const [vRes, sRes] = await Promise.all([
        fetch(`${BASE}/data/videos.json`),
        fetch(`${BASE}/data/stats.json`),
      ]);
      if (!vRes.ok || !sRes.ok) throw new Error("fetch failed");

      const videos = await vRes.json();
      const stats = await sRes.json();
      allStories = groupStories(videos);

      renderHero(videos[0]);
      renderStats(stats);
      renderLatest(allStories.slice(0, 3));
      renderFilters(stats.subreddits);
      renderSortToggle();
      renderGallery(getFilteredSorted());
      initCounters();
      initReveal();
    } catch (err) {
      console.error("Data load failed:", err);
      const el = document.getElementById("video-grid");
      if (el) el.innerHTML = '<p class="loading-msg">Visit our YouTube channel for the latest videos.</p>';
      initReveal();
    }
  }

  /* --- Hero featured video --- */

  function renderHero(video) {
    const el = document.getElementById("hero-video");
    if (!el || !video) return;
    el.innerHTML = `<iframe src="${video.embed_url}" title="${escAttr(video.title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
      allowfullscreen loading="lazy"></iframe>`;
  }

  /* --- Stats --- */

  function renderStats(stats) {
    const el = document.getElementById("stats-row");
    if (!el) return;

    // Show stories + videos, views, subreddits
    // If likes > 0 show likes, otherwise show stories count
    const items = [
      { n: stats.total_stories || 0, l: "Stories" },
      { n: stats.total_videos, l: "Videos" },
      { n: stats.total_views, l: "Views" },
    ];
    if (stats.total_likes > 0) {
      items.push({ n: stats.total_likes, l: "Likes" });
    } else {
      items.push({ n: stats.total_subreddits, l: "Subreddits" });
    }

    el.innerHTML = items
      .map(
        (i) => `<div class="stat-item">
          <div class="stat-number" data-target="${i.n}">0</div>
          <div class="stat-label">${i.l}</div>
        </div>`
      )
      .join("");
  }

  /* --- Latest stories (3 featured) --- */

  function renderLatest(stories) {
    const el = document.getElementById("latest-grid");
    if (!el) return;
    el.innerHTML = stories.map((s, i) => storyCardHTML(s, `reveal reveal-delay-${i + 1}`)).join("");
    attachCardHandlers(el);
  }

  /* --- Filters --- */

  function renderFilters(subreddits) {
    const el = document.getElementById("filter-tabs");
    if (!el) return;

    const counts = {};
    for (const s of allStories) counts[s.subreddit] = (counts[s.subreddit] || 0) + 1;

    const tabs = [
      { name: "All", count: allStories.length },
      ...subreddits.map((s) => ({ name: s, count: counts[s] || 0 })),
    ];

    el.innerHTML = tabs
      .map(
        (t) =>
          `<button class="filter-tab${t.name === "All" ? " active" : ""}" data-filter="${t.name}">${esc(t.name)}<span class="count">${t.count}</span></button>`
      )
      .join("");

    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-tab");
      if (!btn) return;
      el.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderGallery(getFilteredSorted());
    });
  }

  /* --- Sort toggle --- */

  function renderSortToggle() {
    const el = document.getElementById("sort-toggle");
    if (!el) return;

    el.innerHTML = `
      <button class="sort-btn active" data-sort="newest">Newest</button>
      <button class="sort-btn" data-sort="popular">Most Viewed</button>`;

    el.addEventListener("click", (e) => {
      const btn = e.target.closest(".sort-btn");
      if (!btn) return;
      el.querySelectorAll(".sort-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      renderGallery(getFilteredSorted());
    });
  }

  /* --- Gallery --- */

  function renderGallery(stories) {
    const el = document.getElementById("video-grid");
    if (!el) return;
    if (!stories.length) {
      el.innerHTML = '<p class="loading-msg">No stories in this category yet.</p>';
      return;
    }
    el.innerHTML = stories.map((s) => storyCardHTML(s)).join("");
    attachCardHandlers(el);
  }

  /* --- Story Card HTML --- */

  function storyCardHTML(story, extraClass) {
    const first = story.parts[0];
    const multi = story.parts.length > 1;
    // Use actual video title, strip " #shorts" suffix for cleaner display
    const rawTitle = first.title || (story.subreddit + " Story");
    const title = rawTitle.replace(/\s*#shorts\s*$/i, "").replace(/\s*-\s*Part\s*\d+\s*$/i, "");
    const views = first.views > 0 ? `<span>${fmt(first.views)} views</span>` : "";

    let tabs = "";
    if (multi) {
      tabs = '<div class="part-tabs">' +
        story.parts.map((p, i) =>
          `<button class="part-tab${i === 0 ? " active" : ""}" data-vid="${p.id}" data-url="${escAttr(p.watch_url)}" data-views="${p.views || 0}">Part ${p.part || 1}</button>`
        ).join("") + "</div>";
    }

    const cls = extraClass ? ` ${extraClass}` : "";

    return `<div class="story-card${cls}">
      ${tabs}
      <div class="thumb-wrap" data-vid="${first.id}">
        <img src="https://img.youtube.com/vi/${first.id}/0.jpg" alt="${escAttr(title)}" loading="lazy">
        <div class="play-btn"></div>
      </div>
      <div class="card-info">
        <div class="title">${esc(title)}</div>
        <div class="meta"><span>${story.date}</span>${views}</div>
        <div class="tag-row">
          <span class="subreddit-tag">${esc(story.subreddit)}</span>
          <a href="${first.watch_url}" target="_blank" rel="noopener" class="yt-link">Watch on YouTube &#8599;</a>
        </div>
      </div>
    </div>`;
  }

  /* --- Card interaction handlers --- */

  function attachCardHandlers(root) {
    root.querySelectorAll(".thumb-wrap").forEach((wrap) => {
      wrap.addEventListener("click", function () {
        const id = this.dataset.vid;
        const div = document.createElement("div");
        div.className = "iframe-wrap";
        div.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowfullscreen></iframe>`;
        this.replaceWith(div);
      });
    });

    root.querySelectorAll(".part-tabs").forEach((row) => {
      row.addEventListener("click", (e) => {
        const btn = e.target.closest(".part-tab");
        if (!btn) return;
        const card = btn.closest(".story-card");
        const vid = btn.dataset.vid;
        const url = btn.dataset.url;
        const views = parseInt(btn.dataset.views, 10) || 0;

        row.querySelectorAll(".part-tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");

        const area = card.querySelector(".thumb-wrap, .iframe-wrap");
        if (area) {
          const thumb = document.createElement("div");
          thumb.className = "thumb-wrap";
          thumb.dataset.vid = vid;
          thumb.innerHTML = `<img src="https://img.youtube.com/vi/${vid}/0.jpg" alt="Video" loading="lazy"><div class="play-btn"></div>`;
          thumb.addEventListener("click", function () {
            const div = document.createElement("div");
            div.className = "iframe-wrap";
            div.innerHTML = `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1" title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowfullscreen></iframe>`;
            this.replaceWith(div);
          });
          area.replaceWith(thumb);
        }

        const metaSpans = card.querySelectorAll(".meta span");
        if (metaSpans.length > 1) {
          metaSpans[1].textContent = views > 0 ? fmt(views) + " views" : "";
        }
        const link = card.querySelector(".yt-link");
        if (link) link.href = url;
      });
    });
  }

  /* --- Boot --- */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
