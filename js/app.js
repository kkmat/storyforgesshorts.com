/* StoryForge Shorts — Dynamic content loader */
(function () {
  "use strict";

  const BASE = getBasePath();
  let allStories = [];

  function getBasePath() {
    const path = location.pathname;
    if (path.includes("/storyforgesshorts.com")) {
      return "/storyforgesshorts.com";
    }
    return "";
  }

  // --- Helpers ---

  function escapeHtml(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return String(n);
  }

  // --- Group videos into stories ---

  function groupIntoStories(videos) {
    const map = new Map();
    for (const v of videos) {
      const key = v.story_id;
      if (!map.has(key)) {
        map.set(key, {
          story_id: key,
          subreddit: v.subreddit,
          date: v.date,
          parts: [],
          total_views: 0,
          total_likes: 0,
        });
      }
      const story = map.get(key);
      story.parts.push(v);
      story.total_views += v.views || 0;
      story.total_likes += v.likes || 0;
    }
    // Sort parts within each story
    for (const story of map.values()) {
      story.parts.sort((a, b) => (a.part || 1) - (b.part || 1));
    }
    return Array.from(map.values());
  }

  // --- Init ---

  async function init() {
    try {
      const [videosRes, statsRes] = await Promise.all([
        fetch(`${BASE}/data/videos.json`),
        fetch(`${BASE}/data/stats.json`),
      ]);

      if (!videosRes.ok || !statsRes.ok) throw new Error("Failed to load data");

      const allVideos = await videosRes.json();
      const stats = await statsRes.json();

      allStories = groupIntoStories(allVideos);

      renderHeroVideos(allVideos.slice(0, 3));
      renderStats(stats);
      renderFilterTabs(stats.subreddits, allStories);
      renderGallery(allStories);
      initBackToTop();
    } catch (err) {
      console.error("Failed to load site data:", err);
      showFallback();
    }
  }

  // --- Hero Videos (live embeds for top 3) ---

  function renderHeroVideos(videos) {
    const container = document.getElementById("hero-videos");
    if (!container || !videos.length) return;

    container.innerHTML = videos
      .map(
        (v) => `
      <div class="video-card">
        <iframe src="${v.embed_url}" title="${escapeAttr(v.title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowfullscreen loading="lazy"></iframe>
      </div>`
      )
      .join("");
  }

  // --- Stats with animated counters ---

  function renderStats(stats) {
    const container = document.getElementById("stats-grid");
    if (!container) return;

    const cards = [
      { number: stats.total_videos, label: "Videos" },
      { number: stats.total_views, label: "Views" },
      { number: stats.total_likes, label: "Likes" },
      { number: stats.total_subreddits, label: "Subreddits" },
    ];

    container.innerHTML = cards
      .map(
        (c) => `
      <div class="stat-card">
        <div class="number" data-target="${c.number}">0</div>
        <div class="label">${c.label}</div>
      </div>`
      )
      .join("");

    // Animate counters when they scroll into view
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const nums = entry.target.querySelectorAll(".number[data-target]");
          nums.forEach(animateCounter);
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(container);
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (isNaN(target) || target === 0) {
      el.textContent = "0";
      return;
    }
    const duration = 1200;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- Filter Tabs with counts ---

  function renderFilterTabs(subreddits, stories) {
    const container = document.getElementById("filter-tabs");
    if (!container) return;

    // Count stories per subreddit
    const counts = {};
    for (const s of stories) {
      counts[s.subreddit] = (counts[s.subreddit] || 0) + 1;
    }

    const tabs = [
      { name: "All", count: stories.length },
      ...subreddits.map((sub) => ({ name: sub, count: counts[sub] || 0 })),
    ];

    container.innerHTML = tabs
      .map(
        (t) =>
          `<button class="filter-tab${t.name === "All" ? " active" : ""}" data-filter="${t.name}">${escapeHtml(t.name)}<span class="count">${t.count}</span></button>`
      )
      .join("");

    container.addEventListener("click", function (e) {
      const btn = e.target.closest(".filter-tab");
      if (!btn) return;

      container
        .querySelectorAll(".filter-tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      if (filter === "All") {
        renderGallery(allStories);
      } else {
        renderGallery(allStories.filter((s) => s.subreddit === filter));
      }
    });
  }

  // --- Gallery with thumbnail click-to-play and story grouping ---

  function renderGallery(stories) {
    const container = document.getElementById("video-grid");
    if (!container) return;

    if (!stories.length) {
      container.innerHTML =
        '<p class="loading">No videos found for this category.</p>';
      return;
    }

    container.innerHTML = stories.map(renderStoryCard).join("");

    // Attach click-to-play handlers
    container.querySelectorAll(".thumb-wrap").forEach((wrap) => {
      wrap.addEventListener("click", function () {
        const id = this.dataset.videoId;
        const iframe = document.createElement("div");
        iframe.className = "iframe-wrap";
        iframe.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowfullscreen></iframe>`;
        this.replaceWith(iframe);
      });
    });

    // Attach part tab handlers
    container.querySelectorAll(".part-tabs").forEach((tabRow) => {
      tabRow.addEventListener("click", function (e) {
        const btn = e.target.closest(".part-tab");
        if (!btn) return;
        const card = btn.closest(".story-card");
        const videoId = btn.dataset.videoId;
        const watchUrl = btn.dataset.watchUrl;
        const views = btn.dataset.views;
        const partLabel = btn.dataset.partLabel;

        // Update active tab
        tabRow.querySelectorAll(".part-tab").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");

        // Replace video area with new thumbnail
        const videoArea = card.querySelector(".thumb-wrap, .iframe-wrap");
        if (videoArea) {
          const thumb = createThumbnail(videoId);
          videoArea.replaceWith(thumb);
          // Re-attach click handler
          thumb.addEventListener("click", function () {
            const iframe = document.createElement("div");
            iframe.className = "iframe-wrap";
            iframe.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowfullscreen></iframe>`;
            this.replaceWith(iframe);
          });
        }

        // Update views and watch link
        const viewsEl = card.querySelector(".views");
        if (viewsEl && views !== undefined) {
          viewsEl.textContent = parseInt(views, 10) > 0 ? formatNumber(parseInt(views, 10)) + " views" : "";
        }
        const ytLink = card.querySelector(".yt-link");
        if (ytLink) ytLink.href = watchUrl;
      });
    });
  }

  function createThumbnail(videoId) {
    const wrap = document.createElement("div");
    wrap.className = "thumb-wrap";
    wrap.dataset.videoId = videoId;
    wrap.innerHTML = `<img src="https://img.youtube.com/vi/${videoId}/0.jpg"
        alt="Video thumbnail" loading="lazy">
      <div class="play-btn"></div>`;
    return wrap;
  }

  function renderStoryCard(story) {
    const first = story.parts[0];
    const isMulti = story.parts.length > 1;
    const viewsText =
      first.views > 0 ? `<span class="views">${formatNumber(first.views)} views</span>` : '<span class="views"></span>';

    // Story title without part number
    const storyTitle = story.subreddit + " Story";

    let partTabsHtml = "";
    if (isMulti) {
      partTabsHtml =
        '<div class="part-tabs">' +
        story.parts
          .map(
            (p, i) =>
              `<button class="part-tab${i === 0 ? " active" : ""}"
                data-video-id="${p.id}" data-watch-url="${escapeAttr(p.watch_url)}"
                data-views="${p.views || 0}" data-part-label="${p.part || 1}">Part ${p.part || 1}</button>`
          )
          .join("") +
        "</div>";
    }

    return `
    <div class="story-card">
      ${partTabsHtml}
      <div class="thumb-wrap" data-video-id="${first.id}">
        <img src="https://img.youtube.com/vi/${first.id}/0.jpg"
          alt="${escapeAttr(storyTitle)}" loading="lazy">
        <div class="play-btn"></div>
      </div>
      <div class="info">
        <div class="title">${escapeHtml(storyTitle)}</div>
        <div class="meta">
          <span>${story.date}</span>
          ${viewsText}
        </div>
        <div class="tag-row">
          <span class="subreddit-tag">${escapeHtml(story.subreddit)}</span>
          <a href="${first.watch_url}" target="_blank" rel="noopener" class="yt-link">Watch on YouTube</a>
        </div>
      </div>
    </div>`;
  }

  // --- Back to Top ---

  function initBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        btn.classList.add("visible");
      } else {
        btn.classList.remove("visible");
      }
    });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // --- Fallback ---

  function showFallback() {
    const heroVideos = document.getElementById("hero-videos");
    if (heroVideos) heroVideos.innerHTML = "";

    const statsGrid = document.getElementById("stats-grid");
    if (statsGrid)
      statsGrid.innerHTML =
        '<p class="loading">Check out our videos on YouTube!</p>';

    const filterTabs = document.getElementById("filter-tabs");
    if (filterTabs) filterTabs.innerHTML = "";

    const videoGrid = document.getElementById("video-grid");
    if (videoGrid) videoGrid.innerHTML = "";
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
