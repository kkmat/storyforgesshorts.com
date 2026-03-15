/**
 * StoryForge Shorts - Main JavaScript
 * Vanilla JS, no build tools. Works on GitHub Pages with relative paths.
 */
(function () {
  'use strict';

  // ───────────────────────────────────────────────
  // Configuration
  // ───────────────────────────────────────────────
  const CONFIG = {
    videosPerPage: 12,
    debounceMs: 300,
    typingSpeed: 100,
    typingPause: 1800,
    deletingSpeed: 50,
    counterDuration: 2000,
    newBadgeDays: 3,
    typingWords: [
      'AITA', 'TIFU', 'Confessions', 'Relationships',
      'Revenge', 'Entitled Parents', 'Malicious Compliance'
    ],
    parallaxFactor: 0.15,
  };

  // ───────────────────────────────────────────────
  // State
  // ───────────────────────────────────────────────
  const state = {
    videos: [],
    stats: null,
    filteredVideos: [],
    activeFilter: 'All',
    searchQuery: '',
    visibleCount: CONFIG.videosPerPage,
    featuredVideo: null,
    featuredStoryParts: [],
    dataLoaded: false,
    statsAnimated: false,
  };

  // ───────────────────────────────────────────────
  // Utility Functions
  // ───────────────────────────────────────────────

  function formatNumber(n) {
    if (n == null) return '0';
    n = Number(n);
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString('en-US');
  }

  function formatNumberWithCommas(n) {
    if (n == null) return '0';
    return Number(n).toLocaleString('en-US');
  }

  function relativeDate(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr + 'T00:00:00');
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' minute' + (diffMins !== 1 ? 's' : '') + ' ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours !== 1 ? 's' : '') + ' ago';
    if (diffDays < 30) return diffDays + ' day' + (diffDays !== 1 ? 's' : '') + ' ago';
    if (diffMonths < 12) return diffMonths + ' month' + (diffMonths !== 1 ? 's' : '') + ' ago';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function isNew(dateStr) {
    if (!dateStr) return false;
    const now = new Date();
    const date = new Date(dateStr + 'T00:00:00');
    return (now - date) / 86400000 <= CONFIG.newBadgeDays;
  }

  function debounce(fn, ms) {
    let timer;
    return function () {
      clearTimeout(timer);
      const args = arguments;
      const ctx = this;
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function getStoryParts(storyId) {
    if (!storyId) return [];
    return state.videos.filter(function (v) { return v.story_id === storyId; })
      .sort(function (a, b) { return (a.part || 0) - (b.part || 0); });
  }

  function getTotalParts(storyId) {
    return getStoryParts(storyId).length;
  }

  // ───────────────────────────────────────────────
  // Data Loading
  // ───────────────────────────────────────────────

  function loadData() {
    var videosPromise = fetch('./data/videos.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Videos fetch failed');
        return r.json();
      })
      .catch(function (err) {
        console.warn('Could not load videos.json:', err.message);
        return [];
      });

    var statsPromise = fetch('./data/stats.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Stats fetch failed');
        return r.json();
      })
      .catch(function (err) {
        console.warn('Could not load stats.json:', err.message);
        return null;
      });

    return Promise.all([videosPromise, statsPromise]).then(function (results) {
      state.videos = results[0] || [];
      state.stats = results[1];
      state.filteredVideos = state.videos.slice();
      state.dataLoaded = true;

      if (state.videos.length > 0) {
        state.featuredVideo = state.videos[0];
        state.featuredStoryParts = getStoryParts(state.videos[0].story_id);
      }

      renderAll();
    });
  }

  // ───────────────────────────────────────────────
  // 1. Typing Effect
  // ───────────────────────────────────────────────

  function initTypingEffect() {
    var el = document.querySelector('.typing-text');
    if (!el) return;

    var words = CONFIG.typingWords;
    var wordIndex = 0;
    var charIndex = 0;
    var isDeleting = false;

    function tick() {
      var currentWord = words[wordIndex];

      if (isDeleting) {
        charIndex--;
        el.textContent = currentWord.substring(0, charIndex);
      } else {
        charIndex++;
        el.textContent = currentWord.substring(0, charIndex);
      }

      var delay = isDeleting ? CONFIG.deletingSpeed : CONFIG.typingSpeed;

      if (!isDeleting && charIndex === currentWord.length) {
        delay = CONFIG.typingPause;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        delay = 400;
      }

      setTimeout(tick, delay);
    }

    tick();
  }

  // ───────────────────────────────────────────────
  // 2. Scroll Reveal Animations
  // ───────────────────────────────────────────────

  function initScrollReveal() {
    var reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      reveals.forEach(function (el) { observer.observe(el); });
    } else {
      // Fallback: just show everything
      reveals.forEach(function (el) { el.classList.add('active'); });
    }
  }

  // ───────────────────────────────────────────────
  // 3. Stats Counter Animation
  // ───────────────────────────────────────────────

  function renderStats() {
    var statsSection = document.querySelector('.stats-section, #stats');
    if (!statsSection) return;

    var targets = statsSection.querySelectorAll('[data-target]');
    if (!targets.length) return;

    // Remove skeleton state
    targets.forEach(function (el) {
      el.classList.remove('skeleton');
    });

    if (!state.stats) {
      targets.forEach(function (el) {
        el.textContent = '--';
      });
      return;
    }

    // Set the raw target values as data attributes for animation
    targets.forEach(function (el) {
      var key = el.getAttribute('data-target');
      var value = state.stats[key];
      if (value != null) {
        el.setAttribute('data-value', value);
        el.textContent = '0';
      }
    });
  }

  function animateCounters() {
    if (state.statsAnimated) return;
    state.statsAnimated = true;

    var statsSection = document.querySelector('.stats-section, #stats');
    if (!statsSection) return;

    var targets = statsSection.querySelectorAll('[data-target]');

    targets.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-value'), 10);
      if (isNaN(target)) return;

      var start = 0;
      var startTime = null;
      var duration = CONFIG.counterDuration;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        // Ease-out cubic
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.floor(eased * target);
        el.textContent = formatNumberWithCommas(current);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = formatNumberWithCommas(target);
        }
      }

      requestAnimationFrame(step);
    });
  }

  function initStatsObserver() {
    var statsSection = document.querySelector('.stats-section, #stats');
    if (!statsSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && state.dataLoaded) {
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      observer.observe(statsSection);
    } else {
      // Fallback
      if (state.dataLoaded) animateCounters();
    }
  }

  // ───────────────────────────────────────────────
  // 4. Video Gallery
  // ───────────────────────────────────────────────

  function renderFilterPills() {
    var container = document.querySelector('.filter-pills, #filter-pills');
    if (!container) return;

    var subreddits = [];
    var seen = {};
    state.videos.forEach(function (v) {
      if (v.subreddit && !seen[v.subreddit]) {
        seen[v.subreddit] = true;
        subreddits.push(v.subreddit);
      }
    });
    subreddits.sort();

    var html = '<button class="filter-pill active" data-filter="All">All</button>';
    subreddits.forEach(function (sub) {
      html += '<button class="filter-pill" data-filter="' + escapeHtml(sub) + '">' + escapeHtml(sub) + '</button>';
    });

    container.innerHTML = html;

    // Attach events
    container.querySelectorAll('.filter-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.activeFilter = this.getAttribute('data-filter');
        state.visibleCount = CONFIG.videosPerPage;
        container.querySelectorAll('.filter-pill').forEach(function (b) { b.classList.remove('active'); });
        this.classList.add('active');
        applyFilters();
        renderVideoCards();
      });
    });
  }

  function applyFilters() {
    var query = state.searchQuery.toLowerCase().trim();
    state.filteredVideos = state.videos.filter(function (v) {
      var matchesFilter = state.activeFilter === 'All' || v.subreddit === state.activeFilter;
      var matchesSearch = !query || (v.title && v.title.toLowerCase().indexOf(query) !== -1);
      return matchesFilter && matchesSearch;
    });
  }

  function createVideoCardHtml(video) {
    var totalParts = getTotalParts(video.story_id);
    var partLabel = '';
    if (totalParts > 1 && video.part) {
      partLabel = '<span class="badge badge-part">Part ' + video.part + '/' + totalParts + '</span>';
    }

    var newBadge = isNew(video.date) ? '<span class="badge badge-new">NEW</span>' : '';

    var thumbUrl = 'https://img.youtube.com/vi/' + video.id + '/mqdefault.jpg';

    return '<div class="video-card" data-video-id="' + escapeHtml(video.id) + '">' +
      '<div class="video-card__thumb">' +
        '<img src="' + thumbUrl + '" alt="' + escapeHtml(video.title) + '" loading="lazy"' +
        ' onerror="this.src=\'https://img.youtube.com/vi/' + video.id + '/hqdefault.jpg\'">' +
        '<div class="video-card__play"><svg viewBox="0 0 24 24" width="24" height="24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>' +
        '<span class="badge badge-subreddit">' + escapeHtml(video.subreddit || '') + '</span>' +
        newBadge +
        partLabel +
      '</div>' +
      '<div class="video-card__info">' +
        '<h3 class="video-card__title">' + escapeHtml(video.title || '') + '</h3>' +
        '<div class="video-card__meta">' +
          '<span>' + formatNumber(video.views) + ' views</span>' +
          '<span>' + formatNumber(video.likes) + ' likes</span>' +
          '<span>' + relativeDate(video.date) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderVideoCards() {
    var container = document.querySelector('.video-grid, #video-grid');
    if (!container) return;

    if (!state.dataLoaded) {
      // Show skeleton cards
      var skeletonHtml = '';
      for (var i = 0; i < CONFIG.videosPerPage; i++) {
        skeletonHtml += '<div class="video-card skeleton-card"><div class="skeleton-thumb"></div><div class="skeleton-body"><div class="skeleton-line short"></div><div class="skeleton-line"></div><div class="skeleton-line medium"></div></div></div>';
      }
      container.innerHTML = skeletonHtml;
      return;
    }

    if (state.filteredVideos.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Videos coming soon! Check back after our first upload.</p></div>';
      updateLoadMoreButton();
      return;
    }

    var visible = state.filteredVideos.slice(0, state.visibleCount);
    var html = '';
    visible.forEach(function (v) {
      html += createVideoCardHtml(v);
    });
    container.innerHTML = html;

    // Attach click events
    container.querySelectorAll('.video-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var videoId = this.getAttribute('data-video-id');
        var video = state.videos.find(function (v) { return v.id === videoId; });
        if (video) openVideoModal(video);
      });
    });

    updateLoadMoreButton();
  }

  function updateLoadMoreButton() {
    var btn = document.querySelector('.load-more-btn, #load-more');
    if (!btn) return;

    if (state.visibleCount >= state.filteredVideos.length) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      btn.textContent = 'Load More (' + (state.filteredVideos.length - state.visibleCount) + ' remaining)';
    }
  }

  function initLoadMore() {
    var btn = document.querySelector('.load-more-btn, #load-more');
    if (!btn) return;

    btn.addEventListener('click', function () {
      state.visibleCount += CONFIG.videosPerPage;
      renderVideoCards();
    });
  }

  function initSearch() {
    var input = document.querySelector('.search-input, #video-search');
    if (!input) return;

    input.addEventListener('input', debounce(function () {
      state.searchQuery = input.value;
      state.visibleCount = CONFIG.videosPerPage;
      applyFilters();
      renderVideoCards();
    }, CONFIG.debounceMs));
  }

  // ───────────────────────────────────────────────
  // 5. Video Modal
  // ───────────────────────────────────────────────

  function createModal() {
    if (document.getElementById('video-modal')) return;

    var modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'video-modal';
    modal.innerHTML =
      '<div class="video-modal-backdrop"></div>' +
      '<div class="video-modal-content">' +
        '<button class="video-modal-close" aria-label="Close">&times;</button>' +
        '<div class="video-modal-embed"></div>' +
        '<div class="video-modal-info"></div>' +
        '<div class="video-modal-parts"></div>' +
      '</div>';

    document.body.appendChild(modal);

    modal.querySelector('.video-modal-backdrop').addEventListener('click', closeVideoModal);
    modal.querySelector('.video-modal-close').addEventListener('click', closeVideoModal);
  }

  function openVideoModal(video) {
    createModal();

    var modal = document.getElementById('video-modal');
    var embedContainer = modal.querySelector('.video-modal-embed');
    var infoContainer = modal.querySelector('.video-modal-info');
    var partsContainer = modal.querySelector('.video-modal-parts');

    // Embed iframe
    embedContainer.innerHTML =
      '<iframe src="' + video.embed_url + '?autoplay=1" ' +
      'allow="autoplay; encrypted-media" allowfullscreen ' +
      'frameborder="0" style="width:100%;aspect-ratio:9/16;max-height:70vh;border-radius:12px;"></iframe>';

    // Info
    infoContainer.innerHTML =
      '<h3>' + escapeHtml(video.title || '') + '</h3>' +
      '<div class="video-modal-meta">' +
        '<span class="subreddit-badge">' + escapeHtml(video.subreddit || '') + '</span>' +
        '<span>' + formatNumber(video.views) + ' views</span>' +
        '<span>' + relativeDate(video.date) + '</span>' +
      '</div>';

    // Other parts
    var parts = getStoryParts(video.story_id);
    if (parts.length > 1) {
      var partsHtml = '<div class="modal-parts-label">Other parts of this story:</div><div class="modal-parts-list">';
      parts.forEach(function (p) {
        var activeClass = p.id === video.id ? ' active' : '';
        partsHtml += '<button class="modal-part-btn' + activeClass + '" data-video-id="' + p.id + '">Part ' + (p.part || '?') + '</button>';
      });
      partsHtml += '</div>';
      partsContainer.innerHTML = partsHtml;

      partsContainer.querySelectorAll('.modal-part-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var vid = state.videos.find(function (v) { return v.id === btn.getAttribute('data-video-id'); });
          if (vid) openVideoModal(vid);
        });
      });
    } else {
      partsContainer.innerHTML = '';
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    var modal = document.getElementById('video-modal');
    if (!modal) return;

    modal.classList.remove('open');
    document.body.style.overflow = '';

    // Stop video
    var embed = modal.querySelector('.video-modal-embed');
    if (embed) embed.innerHTML = '';
  }

  // ───────────────────────────────────────────────
  // 6. Featured Section
  // ───────────────────────────────────────────────

  function renderFeatured() {
    var container = document.querySelector('.featured-player, #featured-player');
    if (!container || !state.featuredVideo) return;

    var video = state.featuredVideo;

    var embedEl = container.querySelector('.featured-embed, #featured-embed');
    if (embedEl) {
      embedEl.innerHTML =
        '<iframe src="' + video.embed_url + '" ' +
        'allow="encrypted-media" allowfullscreen ' +
        'frameborder="0" style="width:100%;aspect-ratio:9/16;max-height:70vh;border-radius:12px;"></iframe>';
    }

    var titleEl = container.querySelector('.featured-title');
    if (titleEl) {
      titleEl.textContent = video.title || '';
    }

    var badgeEl = container.querySelector('.featured-badge');
    if (badgeEl) {
      badgeEl.textContent = video.subreddit || '';
    }

    var newEl = container.querySelector('.featured-new');
    if (newEl) {
      newEl.style.display = isNew(video.date) ? '' : 'none';
    }

    renderStoryCarousel();
  }

  // ───────────────────────────────────────────────
  // 7. Story Carousel
  // ───────────────────────────────────────────────

  function renderStoryCarousel() {
    var container = document.querySelector('.story-carousel, #story-carousel');
    if (!container) return;

    var parts = state.featuredStoryParts;
    if (parts.length <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = '';

    var html = '<div class="carousel-scroll">';
    parts.forEach(function (p) {
      var activeClass = state.featuredVideo && p.id === state.featuredVideo.id ? ' active' : '';
      var thumbUrl = 'https://img.youtube.com/vi/' + p.id + '/mqdefault.jpg';
      html +=
        '<div class="carousel-card' + activeClass + '" data-video-id="' + p.id + '">' +
          '<img src="' + thumbUrl + '" alt="Part ' + (p.part || '') + '" loading="lazy">' +
          '<span class="carousel-part-label">Part ' + (p.part || '?') + '</span>' +
        '</div>';
    });
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.carousel-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var videoId = this.getAttribute('data-video-id');
        var video = state.videos.find(function (v) { return v.id === videoId; });
        if (video) {
          state.featuredVideo = video;
          renderFeatured();
        }
      });
    });
  }

  // ───────────────────────────────────────────────
  // 8. Subscribe Form (Buttondown)
  // ───────────────────────────────────────────────

  function initSubscribeForm() {
    var form = document.querySelector('.subscribe-form, #subscribe-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      var emailInput = form.querySelector('input[type="email"]');
      var submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');

      if (!emailInput || !emailInput.value || !emailInput.validity.valid) {
        e.preventDefault();
        if (emailInput) emailInput.classList.add('invalid');
        return;
      }

      // Add loading state (form will navigate to Buttondown, so this is brief)
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute('data-original-text', submitBtn.textContent);
        submitBtn.textContent = 'Subscribing...';
      }

      // The form naturally submits to Buttondown via action attribute
      // No need to prevent default — let it POST
    });
  }

  // ───────────────────────────────────────────────
  // 9. Smooth Scroll
  // ───────────────────────────────────────────────

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        if (targetId === '#') return;

        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Close mobile nav if open
          var mobileNav = document.querySelector('.mobile-nav, #mobile-nav');
          if (mobileNav) mobileNav.classList.remove('open');
          document.body.classList.remove('nav-open');
        }
      });
    });

    // Scroll indicator
    var scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator) {
      scrollIndicator.addEventListener('click', function () {
        var hero = document.querySelector('.hero, #hero');
        if (hero && hero.nextElementSibling) {
          hero.nextElementSibling.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  // ───────────────────────────────────────────────
  // 10. Mobile Navigation
  // ───────────────────────────────────────────────

  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var navLinks = document.querySelector('.nav-links');
    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      toggle.classList.toggle('active');
      document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        document.body.classList.remove('nav-open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ───────────────────────────────────────────────
  // 11. Custom Cursor (desktop only)
  // ───────────────────────────────────────────────

  function initCustomCursor() {
    // Only on devices with fine pointer (no touch)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mouseX = 0, mouseY = 0;
    var ringX = 0, ringY = 0;

    document.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = 'translate(' + mouseX + 'px, ' + mouseY + 'px)';
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.transform = 'translate(' + ringX + 'px, ' + ringY + 'px)';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Scale on hover over interactive elements
    var interactiveSelector = 'a, button, .video-card, .filter-pill, .carousel-card, input, [role="button"]';

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest(interactiveSelector)) {
        dot.classList.add('cursor-hover');
        ring.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', function (e) {
      if (e.target.closest(interactiveSelector)) {
        dot.classList.remove('cursor-hover');
        ring.classList.remove('cursor-hover');
      }
    });
  }

  // ───────────────────────────────────────────────
  // 12. Parallax (subtle)
  // ───────────────────────────────────────────────

  function initParallax() {
    var orbs = document.querySelectorAll('.hero-orb, .orb');
    if (!orbs.length) return;

    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          var scrollY = window.pageYOffset;
          orbs.forEach(function (orb, i) {
            var speed = CONFIG.parallaxFactor * (i % 2 === 0 ? 1 : -1) * (0.8 + i * 0.1);
            orb.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ───────────────────────────────────────────────
  // 13. Navbar Scroll Effect
  // ───────────────────────────────────────────────

  function initNavbarScroll() {
    var nav = document.querySelector('nav, .navbar, #navbar, header');
    if (!nav) return;

    var hero = document.querySelector('.hero, #hero');
    var threshold = hero ? hero.offsetHeight : 300;

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          if (window.pageYOffset > threshold * 0.5) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ───────────────────────────────────────────────
  // 14. GSAP ScrollTrigger Integration
  // ───────────────────────────────────────────────

  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Section reveals
    document.querySelectorAll('.reveal').forEach(function (el) {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
      });
    });

    // Parallax on hero orbs
    document.querySelectorAll('.hero-orb, .orb').forEach(function (orb, i) {
      gsap.to(orb, {
        scrollTrigger: {
          trigger: '.hero, #hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        y: (i % 2 === 0 ? 100 : -80),
        ease: 'none',
      });
    });
  }

  // ───────────────────────────────────────────────
  // 15. Skeleton / Loading States
  // ───────────────────────────────────────────────

  function showSkeletons() {
    // Video grid skeletons
    renderVideoCards(); // Will render skeleton state since dataLoaded is false

    // Stats skeletons
    var statEls = document.querySelectorAll('[data-target]');
    statEls.forEach(function (el) {
      el.classList.add('skeleton');
      el.textContent = '';
    });
  }

  // ───────────────────────────────────────────────
  // Escape key handler
  // ───────────────────────────────────────────────

  function initKeyboardHandlers() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeVideoModal();
      }
    });
  }

  // ───────────────────────────────────────────────
  // Render All (called after data loads)
  // ───────────────────────────────────────────────

  function renderAll() {
    renderStats();
    renderFilterPills();
    renderVideoCards();
    renderFeatured();
    initStatsObserver();
    // Re-init scroll reveal for any dynamically added .reveal elements
    initScrollReveal();
  }

  // ───────────────────────────────────────────────
  // Init
  // ───────────────────────────────────────────────

  function init() {
    // Show loading states immediately
    showSkeletons();

    // Features that don't depend on data
    initTypingEffect();
    initScrollReveal();
    initSmoothScroll();
    initMobileNav();
    initCustomCursor();
    initParallax();
    initNavbarScroll();
    initSubscribeForm();
    initKeyboardHandlers();
    initLoadMore();
    initSearch();

    // GSAP (if available)
    initGSAP();

    // Load data then render
    loadData();
  }

  // Start on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
