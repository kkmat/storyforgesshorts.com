/* StoryForge Shorts — Dynamic content loader */
(function () {
  "use strict";

  const BASE = getBasePath();
  let allVideos = [];

  function getBasePath() {
    // Support both GitHub Pages subdirectory and custom domain
    const path = location.pathname;
    if (path.includes("/storyforgesshorts.com")) {
      return "/storyforgesshorts.com";
    }
    return "";
  }

  async function init() {
    try {
      const [videosRes, statsRes] = await Promise.all([
        fetch(`${BASE}/data/videos.json`),
        fetch(`${BASE}/data/stats.json`),
      ]);

      if (!videosRes.ok || !statsRes.ok) throw new Error("Failed to load data");

      allVideos = await videosRes.json();
      const stats = await statsRes.json();

      renderHeroVideos(allVideos.slice(0, 3));
      renderStats(stats);
      renderFilterTabs(stats.subreddits);
      renderGallery(allVideos);
    } catch (err) {
      console.error("Failed to load site data:", err);
      showFallback();
    }
  }

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

  function renderStats(stats) {
    const container = document.getElementById("stats-grid");
    if (!container) return;

    const cards = [
      { number: stats.total_videos, label: "Videos" },
      { number: stats.total_subreddits, label: "Subreddits" },
      {
        number: new Date(stats.last_updated).toLocaleDateString(),
        label: "Last Updated",
      },
    ];

    container.innerHTML = cards
      .map(
        (c) => `
      <div class="stat-card">
        <div class="number">${c.number}</div>
        <div class="label">${c.label}</div>
      </div>`
      )
      .join("");
  }

  function renderFilterTabs(subreddits) {
    const container = document.getElementById("filter-tabs");
    if (!container) return;

    const tabs = ["All", ...subreddits];
    container.innerHTML = tabs
      .map(
        (sub) =>
          `<button class="filter-tab${sub === "All" ? " active" : ""}" data-filter="${sub}">${sub}</button>`
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
        renderGallery(allVideos);
      } else {
        renderGallery(allVideos.filter((v) => v.subreddit === filter));
      }
    });
  }

  function renderGallery(videos) {
    const container = document.getElementById("video-grid");
    if (!container) return;

    if (!videos.length) {
      container.innerHTML =
        '<p class="loading">No videos found for this category.</p>';
      return;
    }

    container.innerHTML = videos
      .map(
        (v) => `
      <div class="video-card">
        <iframe src="${v.embed_url}" title="${escapeAttr(v.title)}"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
          allowfullscreen loading="lazy"></iframe>
        <div class="info">
          <div class="title">${escapeHtml(v.title)}</div>
          <div class="meta">${v.date}</div>
          <span class="subreddit-tag">${escapeHtml(v.subreddit)}</span>
        </div>
      </div>`
      )
      .join("");
  }

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

  function escapeHtml(str) {
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
