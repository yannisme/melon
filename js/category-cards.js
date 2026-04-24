/* Melon Theme - Enhanced Homepage Layout */
app.initializers.add('yannisme-melon-category-cards', function(app) {
  'use strict';

  var rendered = false;

  // Continuously hide Flarum's loading/error indicators while melon homepage is active.
  // Uses MutationObserver to catch elements added after SPA navigation.
  var _flarumLoadingObserver = null;
  function _hideFlarumLoading() {
    var selectors = '.LoadingIndicator, .Alert, .ErrorAlert, .flarum-loading, .flarum-loading-error';
    var containers = document.querySelectorAll('.App-content, .IndexPage > .container');
    containers.forEach(function(ct) {
      ct.querySelectorAll(':scope > ' + selectors).forEach(function(el) {
        el.style.display = 'none';
      });
    });
  }
  function _startFlarumLoadingWatcher() {
    if (_flarumLoadingObserver) return;
    _flarumLoadingObserver = new MutationObserver(function() {
      if (!document.documentElement.classList.contains('melon-cards--active')) return;
      _hideFlarumLoading();
    });
    var appContent = document.querySelector('.App-content') || document.documentElement;
    _flarumLoadingObserver.observe(appContent, { childList: true, subtree: true });
  }
  // Start watching immediately
  _startFlarumLoadingWatcher();

  function init() {
    // Immediately hide default Flarum homepage content to prevent flash
    // This runs before any rendering, so there's no flicker
    if (isHomepage(window.location.pathname)) {
      document.documentElement.classList.add('melon-anti-flash');
    }

    tryRender();

    // Track SPA navigation - intercept clicks on links to homepage
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      // Normalize href
      var resolved = new URL(href, window.location.origin).pathname;
      if (isHomepage(resolved) && !isHomepage(window.location.pathname)
          && document.documentElement.classList.contains('melon-cards--active')) {
        // Only hide when navigating TO homepage from elsewhere
        document.documentElement.classList.add('melon-anti-flash');
      }
    });

    // Monkey-patch history methods to detect SPA navigation
    var lastUrl = window.location.pathname;
    var _pushState = history.pushState;
    var _replaceState = history.replaceState;
    history.pushState = function() { _pushState.apply(this, arguments); window.dispatchEvent(new Event('locationchange')); };
    history.replaceState = function() { _replaceState.apply(this, arguments); window.dispatchEvent(new Event('locationchange')); };
    window.addEventListener('popstate', function() { window.dispatchEvent(new Event('locationchange')); });

    window.addEventListener('locationchange', function() {
      var pathname = window.location.pathname;
      if (pathname !== lastUrl) {
        var oldUrl = lastUrl;
        lastUrl = pathname;
        // Only cleanup if we were on homepage (don't interfere with tag-disc pages)
        if (isHomepage(oldUrl) || document.getElementById('melon-homepage')) {
          cleanup();
        }
        if (isRealHomepage(lastUrl) && document.documentElement.classList.contains('melon-cards--active')) {
          // Reset render state for SPA navigation to homepage
          rendered = false;
          // Clean up old homepage element if exists (from previous visit)
          var oldHome = document.getElementById('melon-homepage');
          if (oldHome) oldHome.remove();
          document.documentElement.classList.add('melon-anti-flash');
          // Hide any existing Flarum loading/error content immediately
          _hideFlarumLoading();
          // Use shared waitForFlarumRender instead of multiple setTimeout
          melonWaitForFlarumRender(function() { tryRender(); });
        } else {
          // Navigating away from melon-managed pages — ensure anti-flash is removed
          document.documentElement.classList.remove('melon-anti-flash');
        }
        // Also check for discussion page navigation
        checkDiscussionPage();
      }
    });

    // Handle bfcache (back-forward cache) restore
    window.addEventListener('pageshow', function(e) {
      if (e.persisted) {
        document.documentElement.classList.remove('melon-anti-flash');
        if (isHomepage(window.location.pathname) && !document.getElementById('melon-homepage')) {
          cleanup();
          document.documentElement.classList.add('melon-anti-flash');
          tryRender();
        }
      }
    });
  }

  // Detect if the default route is tags page
  function isDefaultRouteTags() {
    try {
      var route = (window.__melon_settings && window.__melon_settings.default_route) || '';
      return route === '/tags';
    } catch(e) { return false; }
  }

  function isHomepage(url) {
    return url === '/' || url === '';
  }

  // True homepage = URL is / AND default route is NOT /tags
  function isRealHomepage(url) {
    return isHomepage(url) && !isDefaultRouteTags();
  }

  function cleanup() {
    rendered = false;
    document.documentElement.classList.remove('melon-anti-flash');
    if (hideObserver) { hideObserver.disconnect(); hideObserver = null; }
    var old = document.getElementById('melon-homepage');
    if (old) old.remove();
    // Also clean up other pages' residue (from SPA navigation)
    var oldTags = document.getElementById('melon-tags-page');
    if (oldTags) oldTags.remove();
    var oldTagDisc = document.getElementById('melon-tag-disc-page');
    if (oldTagDisc) oldTagDisc.remove();
    // Restore hidden elements (remove melon-hidden class AND inline display:none)
    document.querySelectorAll('.melon-hidden').forEach(function(el) {
      el.classList.remove('melon-hidden');
    });
    // Also restore any elements that had inline display:none set by older code
    document.querySelectorAll('[style*="display: none"]').forEach(function(el) {
      el.style.removeProperty('display');
    });
  }

  function tryRender() {
    if (rendered) return;
    if (!document.documentElement.classList.contains('melon-cards--active')) {
      document.documentElement.classList.remove('melon-anti-flash');
      return;
    }

    var pathname = window.location.pathname;

    // Only render on index page (not on tag pages like /t/general)
    if (!isRealHomepage(pathname)) return;

    // Check if container already exists (for re-renders after operations)
    var existingContainer = document.querySelector('.App-content')
      || document.querySelector('.IndexPage')
      || document.querySelector('.container');

    if (existingContainer) {
      buildHomepage(existingContainer);
      return;
    }

    // Use MutationObserver for first-time DOM detection
    var observer = new MutationObserver(function(mutations, obs) {
      var container = document.querySelector('.App-content')
        || document.querySelector('.IndexPage')
        || document.querySelector('.container');
      if (container) {
        obs.disconnect();
        buildHomepage(container);
      }
    });
    observer.observe(document.querySelector('.App-content') || document.documentElement, { childList: true, subtree: true });

    // Fallback: if observer doesn't fire within 2s, try anyway
    setTimeout(function() {
      observer.disconnect();
      if (!rendered) {
        var container = document.querySelector('.App-content')
          || document.querySelector('.IndexPage')
          || document.querySelector('.container');
        if (container) {
          buildHomepage(container);
        }
      }
    }, 1000);
  }

  // Shared function to get sorted tags from Flarum store
  function getStoreTags() {
    var tags = [];
    if (window.app && app.store) {
      try {
        var storeTags = app.store.all('tags');
        if (storeTags && storeTags.length > 0) {
          storeTags.forEach(function(model) {
            var t = model.data;
            if (!t) return;
            var attrs = t.attributes || {};
            if (attrs.slug !== 'untagged') {
              tags.push(t);
            }
          });
          tags.sort(function(a, b) { return (a.attributes.position || 0) - (b.attributes.position || 0); });
        }
      } catch(e) {}
    }
    return tags;
  }

  function buildHomepage(container) {
    if (rendered || document.getElementById('melon-homepage')) return;
    rendered = true;

    // Try to get tags from Flarum store first (zero network delay)
    var tags = getStoreTags();

    if (tags.length > 0) {
      // Tags from store - build immediately, no API call needed
      buildFromStoreEnhanced(container, tags);
    } else {
      // Fallback: fetch tags via API
      fetch('/api/tags')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.data) return;
        tags = data.data.filter(function(t) {
          return t.attributes.slug !== 'untagged';
        });
        tags.sort(function(a, b) { return (a.attributes.position || 0) - (b.attributes.position || 0); });
        buildFromStoreEnhanced(container, tags);
      })
      .catch(function(err) {
        rendered = false;
        console.error('[Melon] Build failed:', err);
        document.documentElement.classList.remove('melon-anti-flash');
      });
    }
  }

  // Build from Flarum store with proper isHidden detection
  function buildFromStoreEnhanced(container, tags) {
    var allTags = {};
    tags.forEach(function(t) { allTags[t.id] = t; });

    // Always fetch fresh discussions from API to avoid stale store data
    // (e.g. after visiting a tag page, store only contains that tag's discussions)
    fetchHomepageDiscussions(container, tags, allTags);
  }

  // Fetch all discussions via API (used when store is stale, e.g. after visiting a tag page)
  function fetchHomepageDiscussions(container, tags, allTags) {
    if (window.app && app.store && app.store.find) {
      // Use Flarum's store.find to properly authenticate the request
      app.store.find('discussions', {
        include: 'tags,user,firstPost,tags.parent',
        sort: '-createdAt'
      }).then(function() {
        renderDiscussionsFromStore(container, tags);
      }).catch(function(err) {
        console.error('[Melon] store.find failed:', err);
        rendered = false;
        document.documentElement.classList.remove('melon-anti-flash');
      });
      return;
    }
    // Fallback: raw fetch without auth
    var apiUrl = '/api/discussions?include=tags,user,firstPost&sort=-createdAt';
    fetch(apiUrl, { credentials: 'same-origin' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.data) return;
      // Push data into store so models work
      if (window.app && app.store && app.store.pushPayload) {
        try { app.store.pushPayload(data); } catch(e) {}
      }
      renderDiscussionsFromStore(container, tags);
    })
    .catch(function(e) {
      console.warn('[Melon] API fetch failed, using store data:', e);
      buildFromStoreEnhanced(container, tags);
    });
  }

  // Render a single discussion item HTML
  function renderDiscItem(disc, allTags, users) {
    var title = disc.attributes.title || '';
    var slug = disc.attributes.slug || '';
    var commentCount = disc.attributes.commentCount || 0;
    var lastPostedAt = disc.attributes.lastPostedAt || disc.attributes.createdAt || '';
    var isSticky = disc.attributes.isSticky || false;
    var isLocked = disc.attributes.isLocked || false;
    // Flarum uses hidden_at field (not isHidden) to indicate soft-deleted discussions
    var isHidden = !!(disc.attributes.hiddenAt || disc.attributes.hidden_at);
    var canSticky = disc.attributes.canSticky || false;
    var canLock = disc.attributes.canLock || false;
    var canRename = disc.attributes.canRename || false;
    var canDelete = disc.attributes.canDelete || false;
    var canTag = disc.attributes.canTag || false;
    var discTags = [];

    if (disc.relationships && disc.relationships.tags && disc.relationships.tags.data) {
      disc.relationships.tags.data.forEach(function(ref) {
        var tag = allTags[ref.id];
        if (tag) discTags.push(tag);
      });
    }

    var userId = disc.relationships.user ? disc.relationships.user.data.id : null;
    var user = userId ? users[userId] : null;
    var displayName = disc._authorName || (user ? (user.displayName || user.username) : melonT('anonymous'));
    var timeStr = melonFormatTime(lastPostedAt);
    var likesCount = disc._likesCount || 0;

    var itemClass = 'melon-disc-item';
    if (isSticky) itemClass += ' melon-disc-sticky';
    if (isLocked) itemClass += ' melon-disc-locked';
    if (isHidden) itemClass += ' melon-disc-soft-deleted';

    var h = '';
    h += '<div class="' + itemClass + '" data-disc-id="' + disc.id + '">';
    h += '  <a href="/d/' + disc.id + '-' + slug + '" class="melon-disc-link">';

    // Row 1: Title (with status icons inline)
    h += '    <div class="melon-disc-title">';
    if (isSticky) h += '<i class="fas fa-thumbtack melon-disc-sticky-icon"></i> ';
    if (isLocked) h += '<i class="fas fa-lock melon-disc-locked-icon"></i> ';
    if (isHidden) h += '<i class="fas fa-trash-alt melon-disc-hidden-icon"></i> ';
    h += melonEsc(title);
    h += '    </div>';

    // Row 2: Meta info + tags + actions all in one line
    h += '    <div class="melon-disc-meta">';
    h += '      <span class="melon-disc-author">' + melonEsc(displayName) + '</span>';
    h += '      <span class="melon-disc-sep">·</span>';
    h += '      <span class="melon-disc-time">' + timeStr + '</span>';
    if (commentCount > 0) {
      h += '      <span class="melon-disc-sep">·</span>';
      h += '      <span class="melon-disc-replies"><i class="far fa-comment"></i> ' + commentCount + '</span>';
    }
    if (likesCount > 0) {
      h += '      <span class="melon-disc-sep">·</span>';
      h += '      <span class="melon-disc-likes"><i class="far fa-heart"></i> ' + likesCount + '</span>';
    }
    if (discTags.length > 0) {
      discTags.forEach(function(t) {
        var c = t.attributes ? (t.attributes.color || '#999') : '#999';
        var n = t.attributes ? t.attributes.name : '';
        var s = t.attributes ? t.attributes.slug : '';
        var icon = t.attributes ? (t.attributes.icon || '') : '';
        var tagContent = '';
        if (icon) {
          tagContent = '<i class="' + melonEsc(icon) + '" style="margin-right:3px;font-size:10px"></i>' + melonEsc(n);
        } else {
          tagContent = melonEsc(n);
        }
        h += '      <a href="/t/' + s + '" class="melon-disc-tag" style="background:' + c + '18;color:' + c + '" onclick="event.stopPropagation()">' + tagContent + '</a>';
      });
    }

    // Actions at the far right of meta row
    if (canSticky || canLock || canRename || canDelete) {
      h += '      <span class="melon-disc-actions">';
      h += '        <span class="melon-disc-actions-btn" onclick="event.stopPropagation();event.preventDefault();melonToggleActionsMenu(this)">';
      h += '          <i class="fas fa-ellipsis-v"></i>';
      h += '        </span>';
      h += '        <span class="melon-disc-actions-menu" data-menu-for="' + disc.id + '">';
      if (canSticky) {
        h += '          <span onclick="event.stopPropagation();event.preventDefault();melonToggleSticky(' + disc.id + ',' + !isSticky + ')"><i class="fas fa-thumbtack"></i> ' + (isSticky ? melonT('unpin') : melonT('pin')) + '</span>';
      }
      if (canLock) {
        h += '          <span onclick="event.stopPropagation();event.preventDefault();melonToggleLock(' + disc.id + ',' + !isLocked + ')"><i class="fas fa-lock"></i> ' + (isLocked ? melonT('unlock') : melonT('lock')) + '</span>';
      }
      if (canRename) {
        h += '          <span onclick="event.stopPropagation();event.preventDefault();melonRenameDiscussion(' + disc.id + ')"><i class="fas fa-pen"></i> ' + melonT('rename') + '</span>';
      }
      if (canTag) {
        h += '          <span onclick="event.stopPropagation();event.preventDefault();melonEditTags(' + disc.id + ')"><i class="fas fa-tags"></i> ' + melonT('edit_tags') + '</span>';
      }
      if (canDelete) {
        if (isHidden) {
          h += '          <span onclick="event.stopPropagation();event.preventDefault();melonRestoreDiscussion(' + disc.id + ')"><i class="fas fa-undo"></i> ' + melonT('restore') + '</span>';
          h += '          <span class="melon-disc-action-danger" onclick="event.stopPropagation();event.preventDefault();melonPermanentDeleteDiscussion(' + disc.id + ')"><i class="fas fa-trash"></i> ' + melonT('permanent_delete') + '</span>';
        } else {
          h += '          <span class="melon-disc-action-danger" onclick="event.stopPropagation();event.preventDefault();melonSoftDeleteDiscussion(' + disc.id + ')"><i class="fas fa-trash"></i> ' + melonT('delete') + '</span>';
        }
      }
      h += '        </span>';
      h += '      </span>';
    }

    h += '    </div>'; // end meta
    h += '  </a>';
    h += '</div>';
    return h;
  }

  // Pagination
  function initPagination(data) {
    var listEl = document.getElementById('melon-disc-list');
    var btnsEl = document.getElementById('melon-pagination-btns');
    var infoEl = document.getElementById('melon-pagination-info');
    if (!listEl || !btnsEl || !infoEl) return;

    function renderPage(page) {
      data.currentPage = page;
      var start = (page - 1) * data.perPage;
      var end = Math.min(start + data.perPage, data.allDiscs.length);
      var pageDiscs = data.allDiscs.slice(start, end);

      var h = '';
      pageDiscs.forEach(function(disc) {
        h += renderDiscItem(disc, data.allTags, data.users);
      });
      listEl.innerHTML = h;

      // Update info
      infoEl.textContent = melonT('page_info', {current: page, total: data.totalPages});

      // Update buttons
      var btns = '';
      btns += '<button class="melon-page-btn' + (page <= 1 ? ' melon-page-btn-disabled' : '') + '" data-page="' + (page - 1) + '"><i class="fas fa-chevron-left"></i></button>';
      for (var i = 1; i <= data.totalPages; i++) {
        if (data.totalPages <= 7 || Math.abs(i - page) <= 1 || i === 1 || i === data.totalPages) {
          btns += '<button class="melon-page-btn' + (i === page ? ' melon-page-btn-active' : '') + '" data-page="' + i + '">' + i + '</button>';
        } else if (i === page - 2 || i === page + 2) {
          btns += '<span class="melon-page-dots">...</span>';
        }
      }
      btns += '<button class="melon-page-btn' + (page >= data.totalPages ? ' melon-page-btn-disabled' : '') + '" data-page="' + (page + 1) + '"><i class="fas fa-chevron-right"></i></button>';
      btnsEl.innerHTML = btns;

      // Scroll to top of discussion list
      listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    btnsEl.addEventListener('click', function(e) {
      var btn = e.target.closest('.melon-page-btn');
      if (!btn || btn.classList.contains('melon-page-btn-disabled')) return;
      var page = parseInt(btn.getAttribute('data-page'), 10);
      if (page >= 1 && page <= data.totalPages) {
        renderPage(page);
      }
    });

    renderPage(1);
  }

  function renderHomepage(container, tags, discussions, users, allTags) {
    // Filter soft-deleted discussions based on user permissions
    discussions = window.melonFilterHiddenDiscussions(discussions);

    var html = '';
    var primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--melon-primary').trim() || '#4ade80';

    // Read texts from Flarum settings (app.forum)
    var forumTitle = melonT('community');
    var welcomeTitle = '';
    var welcomeMessage = '';
    try {
      if (window.app && app.forum && app.forum.attribute) {
        forumTitle = app.forum.attribute('title') || forumTitle;
        welcomeTitle = app.forum.attribute('welcomeTitle') || forumTitle;
        welcomeMessage = app.forum.attribute('welcomeMessage') || '';
      }
    } catch(e) {}

    // ── Hero Section ──
    html += '<div class="melon-hero">';
    html += '  <div class="melon-hero-content">';
    html += '    <h1 class="melon-hero-title">' + melonEsc(welcomeTitle) + '</h1>';
    if (welcomeMessage) {
      html += '    <p class="melon-hero-subtitle">' + welcomeMessage + '</p>';
    }
    html += '    <div class="melon-hero-actions" id="melon-hero-actions">';
    html += '      <a href="/tags" class="melon-btn melon-btn-outline">' + melonT('browse_categories') + '</a>';
    html += '    </div>';
    html += '  </div>';
    html += '</div>';

    // ── CTA Category Cards ──
    if (tags.length > 0) {
      // Read featured tags from settings
      var ctaTags = tags;
      try {
        var msCta = window.__melon_settings || {};
        var featuredIds = msCta.homepage_featured_tags || '';
        if (featuredIds) {
          var idArr = featuredIds.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
          if (idArr.length > 0) {
            var tagMap = {};
            tags.forEach(function(t) { tagMap[t.id] = t; });
            ctaTags = idArr.map(function(id) { return tagMap[id]; }).filter(Boolean);
          }
        } else {
          ctaTags = tags.slice(0, 4);
        }
      } catch(e) {
        ctaTags = tags.slice(0, 4);
      }
      html += '<div class="melon-section"><div class="melon-cards-cta">';
      ctaTags.forEach(function(tag) {
        var name = tag.attributes.name || '';
        var desc = tag.attributes.description || '';
        var slug = tag.attributes.slug || '';
        var count = tag.attributes.discussionCount || 0;
        var tagIcon = tag.attributes.icon || '';
        var tagColor = tag.attributes.color || '';

        // Use tag's own icon if set, otherwise fallback to emoji map
        var iconHtml;
        if (tagIcon) {
          // Flarum icon is a Font Awesome class like "fa-regular fa-message" or "fas fa-code"
          iconHtml = '<i class="' + melonEsc(tagIcon) + '" style="font-size:22px;color:' + (tagColor || 'inherit') + '"></i>';
        } else {
          var emoji = window.melonEmojiMap[slug.toLowerCase()] || window.melonEmojiMap[name.toLowerCase()] || '🏷️';
          iconHtml = emoji;
        }

        html += '<a href="/t/' + slug + '" class="melon-cta-card">';
        html += '  <div class="melon-cta-icon">' + iconHtml + '</div>';
        html += '  <div class="melon-cta-info">';
        html += '    <b class="melon-cta-title">' + melonEsc(name) + '</b>';
        html += '    <span class="melon-cta-desc">' + melonEsc(desc || melonT('topics_count', {count: count})) + '</span>';
        html += '  </div>';
        html += '  <span class="melon-cta-arrow"><i class="fas fa-chevron-right"></i></span>';
        html += '</a>';
      });
      html += '</div>';
      html += '</div>';
    }

    // ── All Categories Grid ──
    var showAllCats = false;
    try {
      var msGrid = window.__melon_settings || {};
      showAllCats = !!msGrid.homepage_show_all_categories;
    } catch(e) {}
    if (showAllCats && tags.length > 0) {
      html += '<div class="melon-section">';
      html += '  <div class="melon-section-header"><h2 class="melon-section-title">' + melonT('all_categories') + '</h2><a href="/tags" class="melon-section-more">' + melonT('view_all_categories') + ' <i class="fas fa-arrow-right"></i></a></div>';
      html += '  <div class="melon-cards-grid">';
      tags.forEach(function(tag) {
        var name = tag.attributes.name || '';
        var desc = tag.attributes.description || '';
        var slug = tag.attributes.slug || '';
        var color = tag.attributes.color || primaryColor;
        var count = tag.attributes.discussionCount || 0;

        html += '<a href="/t/' + slug + '" class="melon-card">';
        html += '  <div class="melon-card-icon" style="background:' + color + '"><i class="fas fa-comments"></i></div>';
        html += '  <div class="melon-card-body">';
        html += '    <h3 class="melon-card-name">' + melonEsc(name) + '</h3>';
        html += '    <p class="melon-card-desc">' + melonEsc(desc || melonT('no_description')) + '</p>';
        html += '  </div>';
        html += '  <div class="melon-card-stat"><strong>' + count + '</strong><span>' + melonT('topic') + '</span></div>';
        html += '</a>';
      });
      html += '  </div></div>';
    }

    // ── Recent Discussions ──
    var allDiscs = discussions;
    var totalPages = 1;
    var perPage = 10;
    if (discussions.length > 0) {
      // Read pagination settings
      var maxCount = 99;
      var perPage = 10;
      try {
        var ms = window.__melon_settings || {};
        var rawCount = ms.homepage_disc_count;
        var rawPerPage = ms.homepage_disc_per_page;
        if (rawCount) maxCount = Math.min(99, Math.max(1, parseInt(rawCount, 10) || 99));
        if (rawPerPage) perPage = Math.min(maxCount, Math.max(1, parseInt(rawPerPage, 10) || 10));
      } catch(e) {}
      // Clamp discussions to maxCount
      var allDiscs = discussions.slice(0, maxCount);
      var totalPages = Math.ceil(allDiscs.length / perPage);
      var currentPage = 1;
      var pagedDiscs = allDiscs.slice(0, perPage);

      html += '<div class="melon-section">';
      html += '  <div class="melon-section-header">';
      html += '    <h2 class="melon-section-title">' + melonT('recent_discussions') + '</h2>';
      // Custom link from settings
      var ms2 = window.__melon_settings || {};
      var customUrl = ms2.homepage_custom_link_url || '';
      var customText = ms2.homepage_custom_link_text || '';
      if (customUrl && customText) {
        html += '    <a href="' + melonEsc(customUrl) + '" class="melon-section-more">' + melonEsc(customText) + ' <i class="fas fa-arrow-right"></i></a>';
      }
      html += '  </div>';
      html += '  <div class="melon-disc-list" id="melon-disc-list">';

      pagedDiscs.forEach(function(disc) {
        html += renderDiscItem(disc, allTags, users);
      });

      html += '  </div>'; // end melon-disc-list

      // Pagination
      if (totalPages > 1) {
        html += '  <div class="melon-pagination" id="melon-disc-pagination">';
        html += '    <span class="melon-pagination-info" id="melon-pagination-info"></span>';
        html += '    <div class="melon-pagination-btns" id="melon-pagination-btns"></div>';
        html += '  </div>';
      }

      html += '</div>'; // end melon-section
    }

    // ── Stats Bar ──
    html += '<div class="melon-section">';
    html += '  <div class="melon-stats-bar">';
    html += '    <div class="melon-stats-item"><strong>' + tags.length + '</strong><span>' + melonT('categories_count', {count: tags.length}) + '</span></div>';
    html += '    <div class="melon-stats-item"><strong>' + discussions.length + '</strong><span>' + melonT('discussions_count', {count: discussions.length}) + '</span></div>';
    html += '  </div></div>';

    // Create wrapper
    var wrapper = document.createElement('div');
    wrapper.id = 'melon-homepage';
    wrapper.className = 'melon-homepage';
    wrapper.innerHTML = html;

    // Store pagination data on wrapper for use after DOM insertion
    if (totalPages > 1) {
      wrapper._paginationData = { allDiscs: allDiscs, perPage: perPage, totalPages: totalPages, currentPage: 1, allTags: allTags, users: users };
    }

    // Insert into App-content
    var target = document.querySelector('.App-content') || document.querySelector('.IndexPage') || document.body;
    if (target.firstChild) {
      target.insertBefore(wrapper, target.firstChild);
    } else {
      target.appendChild(wrapper);
    }

    // Hide ALL default Flarum IndexPage content via JS (more reliable than CSS :has())
    hideDefaultIndexPage();

    // Initialize pagination if needed
    if (wrapper._paginationData) {
      initPagination(wrapper._paginationData);
    }

    // Remove anti-flash class to show content (no more flicker)
    document.documentElement.classList.remove('melon-anti-flash');

    // Force scroll to top when homepage renders (prevent scroll position restoration)
    window.scrollTo(0, 0);
  }

  // Hide all default Flarum IndexPage elements when melon homepage is active
  var hideObserver = null;
  function hideDefaultIndexPage() {
    // Find the IndexPage element
    var indexPage = document.querySelector('.IndexPage');
    if (!indexPage) return;

    // Get all direct children of IndexPage (or .container inside it)
    var containers = indexPage.querySelectorAll(':scope > .container, :scope > .IndexPage-nav, :scope > .IndexPage-toolbar, :scope > .Hero, :scope > .WelcomeHero, :scope > .DiscussionList, :scope > .DiscussionListPagination, :scope > .Pagination, :scope > .IndexPage-search');
    containers.forEach(function(el) {
      if (!el.classList.contains('melon-homepage')) {
        el.classList.add('melon-hidden');
      }
    });

    // Also hide anything inside .container that's not melon-homepage
    var innerContainers = indexPage.querySelectorAll('.container');
    innerContainers.forEach(function(container) {
      Array.from(container.children).forEach(function(child) {
        if (!child.classList.contains('melon-homepage')) {
          child.classList.add('melon-hidden');
        }
      });
    });

    // Hide sidebar nav if present
    var nav = indexPage.querySelector('.IndexPage-nav');
    if (nav) nav.classList.add('melon-hidden');

    // Use MutationObserver to catch Mithril re-renders that restore default content
    if (!hideObserver) {
      var _hideRaf = 0;
      var _hideAutoDisconnect = null;
      hideObserver = new MutationObserver(function() {
        if (!document.getElementById('melon-homepage')) {
          hideObserver.disconnect();
          hideObserver = null;
          return;
        }
        if (_hideRaf) return;
        _hideRaf = requestAnimationFrame(function() {
          _hideRaf = 0;
          // Re-hide any default content that Mithril may have re-inserted
          var ip = document.querySelector('.IndexPage');
          if (!ip) return;
          var hidSomething = false;
          ip.querySelectorAll('.container').forEach(function(container) {
            Array.from(container.children).forEach(function(child) {
              if (!child.classList.contains('melon-homepage') && !child.classList.contains('melon-hidden')) {
                child.classList.add('melon-hidden');
                hidSomething = true;
              }
            });
          });
          ip.querySelectorAll(':scope > .container, :scope > .IndexPage-nav, :scope > .IndexPage-toolbar, :scope > .Hero, :scope > .WelcomeHero, :scope > .DiscussionList, :scope > .DiscussionListPagination, :scope > .Pagination').forEach(function(el) {
            if (!el.classList.contains('melon-homepage') && !el.classList.contains('melon-hidden')) {
              el.classList.add('melon-hidden');
              hidSomething = true;
            }
          });
          // Auto-disconnect after 5s of successful hiding
          if (hidSomething) {
            if (_hideAutoDisconnect) clearTimeout(_hideAutoDisconnect);
            _hideAutoDisconnect = setTimeout(function() {
              if (hideObserver) { hideObserver.disconnect(); hideObserver = null; }
            }, 5000);
          }
        });
      });
      hideObserver.observe(document.querySelector('.App-content') || document.body, { childList: true, subtree: true });
    }
  }

  // ── Global action functions (called from onclick) ──

  function getCsrfToken() {
    // Try Flarum's session first
    if (window.app && window.app.session && window.app.session.csrfToken) {
      return app.session.csrfToken;
    }
    // Fallback: get from cookie
    var match = document.cookie.match(/flarum_csrf_token=([^;]+)/);
    return match ? match[1] : '';
  }

  function apiRequest(method, url, body) {
    // Use Flarum's app.request for proper authentication
    if (window.app && app.request) {
      return app.request({
        method: method,
        url: url,
        body: body
      }).then(function(result) {
        // app.request returns the payload
        if (result && result.payload) return result.payload;
        return result;
      });
    }
    // Fallback: raw fetch
    var headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      'X-CSRF-Token': getCsrfToken(),
    };
    return fetch(url, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
      return r.json();
    });
  }

  // Toggle actions menu - move to body to avoid any overflow clipping
  var _activeMenuBtn = null; // Track the button that opened the menu
  window.melonToggleActionsMenu = function(btnEl) {
    // Close any other open menus first
    document.querySelectorAll('.melon-disc-actions-menu.melon-disc-actions-open').forEach(function(m) {
      melonCloseMenu(m);
    });

    var menu = btnEl.nextElementSibling;
    if (!menu) return;

    var isOpen = menu.classList.contains('melon-disc-actions-open');
    if (isOpen) {
      melonCloseMenu(menu);
      _activeMenuBtn = null;
      return;
    }

    // Move menu to body so it's never clipped by parent overflow
    menu._originalParent = menu.parentNode;
    menu._originalNextSibling = menu.nextSibling;
    document.body.appendChild(menu);

    // Calculate position
    _activeMenuBtn = btnEl;
    _positionMenu(menu, btnEl);
    menu.classList.add('melon-disc-actions-open');
  };

  function _positionMenu(menu, btnEl) {
    var rect = btnEl.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(8, rect.right - 140) + 'px';
    menu.style.right = 'auto';
  }

  // Update menu position on scroll
  var _scrollTimer = null;
  window.addEventListener('scroll', function() {
    if (_activeMenuBtn) {
      var openMenu = document.querySelector('.melon-disc-actions-menu.melon-disc-actions-open');
      if (openMenu) {
        if (_scrollTimer) clearTimeout(_scrollTimer);
        _scrollTimer = setTimeout(function() {
          _positionMenu(openMenu, _activeMenuBtn);
        }, 10);
      }
    }
  }, true); // Use capture to catch all scroll events

  function melonCloseMenu(menu) {
    menu.classList.remove('melon-disc-actions-open');
    _activeMenuBtn = null;
    // Move back to original parent if it was moved to body
    if (menu._originalParent) {
      if (menu._originalNextSibling) {
        menu._originalParent.insertBefore(menu, menu._originalNextSibling);
      } else {
        menu._originalParent.appendChild(menu);
      }
      menu._originalParent = null;
      menu._originalNextSibling = null;
    }
    menu.style.position = '';
    menu.style.top = '';
    menu.style.left = '';
    menu.style.right = '';
  }

  // Close menus when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.melon-disc-actions') && !e.target.closest('.melon-disc-actions-menu')) {
      document.querySelectorAll('.melon-disc-actions-menu.melon-disc-actions-open').forEach(function(m) {
        melonCloseMenu(m);
      });
    }
  });

  // Re-render melon list after an operation (local refresh, no API call)
  function refreshAfterOperation() {
    // Close and remove any menus that were moved to body
    document.querySelectorAll('.melon-disc-actions-menu').forEach(function(m) {
      if (m._originalParent) {
        m.remove();
      }
    });
    // Re-render from store directly (no API fetch needed since we already updated store)
    var old = document.getElementById('melon-homepage');
    if (old) old.remove();
    rendered = false;
    if (hideObserver) { hideObserver.disconnect(); hideObserver = null; }

    var container = document.querySelector('.App-content') || document.querySelector('.container');
    if (container) {
      var tags = getStoreTags();
      if (tags.length > 0) {
        // Render directly from store (skip API fetch)
        renderDiscussionsFromStore(container, tags);
      } else {
        buildHomepage(container);
      }
    }
  }

  // Render homepage from store data without API call
  function renderDiscussionsFromStore(container, tags) {
    if (!window.app || !app.store) {
      buildFromStoreEnhanced(container, tags);
      return;
    }
    var allTags = {};
    tags.forEach(function(t) { allTags[t.id] = t; });
    var models = app.store.all('discussions');
    if (!models || models.length === 0) {
      buildFromStoreEnhanced(container, tags);
      return;
    }
    var discussions = [];
    var users = {};
    var posts = {};
    models.forEach(function(model) {
      var d = model.data || model;
      if (!d || !d.attributes) return;
      d.attributes.hiddenAt = window.melonIsDiscussionHidden(d) ? (d.attributes.hiddenAt || new Date().toISOString()) : null;
      discussions.push(d);
      if (d.relationships && d.relationships.user && d.relationships.user.data) {
        var uid = d.relationships.user.data.id;
        var uModel = app.store.getById('users', uid);
        if (uModel && uModel.data && uModel.data.attributes) {
          users[uid] = uModel.data.attributes;
        }
      }
      if (d.relationships && d.relationships.firstPost && d.relationships.firstPost.data) {
        var fpid = d.relationships.firstPost.data.id;
        var fpModel = app.store.getById('posts', fpid);
        if (fpModel && fpModel.data && fpModel.data.attributes) {
          posts[fpid] = fpModel.data.attributes;
        }
      }
    });
    discussions.forEach(function(disc) {
      if (disc.relationships.firstPost && disc.relationships.firstPost.data) {
        var fp = posts[disc.relationships.firstPost.data.id];
        if (fp) disc._likesCount = fp.likesCount || 0;
      }
      if (disc.relationships.user && disc.relationships.user.data) {
        var u = users[disc.relationships.user.data.id];
        if (u) disc._authorName = u.displayName || u.username;
      }
    });
    discussions.sort(function(a, b) {
      return new Date(b.attributes.createdAt || 0) - new Date(a.attributes.createdAt || 0);
    });
    renderHomepage(container, tags, discussions, users, allTags);
    hideDefaultIndexPage();
    document.documentElement.classList.remove('melon-anti-flash');
  }
  // Expose globally so tag-discussions.js can override it
  window.melonRefreshAfterOperation = refreshAfterOperation;

  window.melonToggleSticky = function(discId, sticky) {
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { isSticky: sticky } }
    }).then(function() {
      // Update store directly
      if (window.app && app.store) {
        var model = app.store.getById('discussions', discId);
        if (model && model.data) model.data.attributes.isSticky = sticky;
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Toggle sticky failed:', e);
      alert(melonT('operation_failed'));
    });
  };

  window.melonToggleLock = function(discId, locked) {
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { isLocked: locked } }
    }).then(function() {
      if (window.app && app.store) {
        var model = app.store.getById('discussions', discId);
        if (model && model.data) model.data.attributes.isLocked = locked;
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Toggle lock failed:', e);
      alert(melonT('operation_failed'));
    });
  };

  window.melonRenameDiscussion = function(discId) {
    var item = document.querySelector('[data-disc-id="' + discId + '"]');
    if (!item) return;
    var titleEl = item.querySelector('.melon-disc-title');
    var currentTitle = titleEl ? titleEl.textContent.replace(/^[📌🔒]\s*/, '') : '';
    var newTitle = prompt(melonT('rename_prompt'), currentTitle);
    if (newTitle === null || newTitle.trim() === '' || newTitle.trim() === currentTitle) return;
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { title: newTitle.trim() } }
    }).then(function() {
      if (window.app && app.store) {
        var model = app.store.getById('discussions', discId);
        if (model && model.data) model.data.attributes.title = newTitle.trim();
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Rename failed:', e);
      alert(melonT('rename_failed'));
    });
  };

  window.melonEditTags = function(discId) {
    // Close any open menus first
    document.querySelectorAll('.melon-disc-actions-open, .melon-td-actions-open').forEach(function(el) {
      el.classList.remove('melon-disc-actions-open');
      el.classList.remove('melon-td-actions-open');
    });

    // Remove existing modal if any
    var existingModal = document.getElementById('melon-tag-modal');
    if (existingModal) { existingModal.remove(); document.body.style.overflow = ''; }

    // Fetch all available tags
    fetch('/api/tags')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.data) return;

      // Get current discussion's tags - try both homepage and tag-disc page selectors
      var item = document.querySelector('[data-disc-id="' + discId + '"]')
        || document.querySelector('.melon-td-item[data-id="' + discId + '"]');
      var currentTagIds = [];
      if (item) {
        // Try to get tag IDs from the discussion's relationships in store
        if (window.app && app.store) {
          var model = app.store.getById('discussions', discId);
          if (model && model.data && model.data.relationships && model.data.relationships.tags && model.data.relationships.tags.data) {
            currentTagIds = model.data.relationships.tags.data.map(function(t) { return t.id; });
          }
        }
        // Fallback: read from DOM tag elements
        if (currentTagIds.length === 0) {
          item.querySelectorAll('.melon-disc-tag, .melon-td-item-tag').forEach(function(el) {
            currentTagIds.push(el.getAttribute('data-tag-id') || el.textContent.trim());
          });
        }
      }

      var allTags = data.data.filter(function(t) {
        return t.attributes.slug !== 'untagged';
      });
      // Separate primary and child tags
      var primaryTags = allTags.filter(function(t) { return !t.attributes.isChild; });
      var childTags = allTags.filter(function(t) { return t.attributes.isChild; });
      primaryTags.sort(function(a, b) { return (a.attributes.position || 999) - (b.attributes.position || 999); });
      childTags.sort(function(a, b) { return (a.attributes.position || 999) - (b.attributes.position || 999); });

      // Build modal HTML
      var modalHtml = '<div class="melon-modal-overlay" id="melon-tag-modal">';
      modalHtml += '<div class="melon-modal">';
      modalHtml += '  <div class="melon-modal-header"><h3>' + melonT('edit_tags_title') + '</h3><span class="melon-modal-close" onclick="melonCloseTagModal()">&times;</span></div>';
      modalHtml += '  <div class="melon-modal-body">';
      function renderTagOption(tag, indent) {
        var name = tag.attributes.name || '';
        var color = tag.attributes.color || '#999';
        var checked = currentTagIds.indexOf(tag.id) !== -1 || currentTagIds.indexOf(tag.attributes.name) !== -1 ? 'checked' : '';
        var style = indent ? ' style="padding-left:28px"' : '';
        modalHtml += '<label class="melon-tag-option"' + style + '>';
        modalHtml += '  <input type="checkbox" value="' + tag.id + '" ' + checked + '>';
        modalHtml += '  <span class="melon-tag-color" style="background:' + color + '"></span>';
        modalHtml += '  <span>' + name + '</span>';
        modalHtml += '</label>';
      }
      primaryTags.forEach(function(tag) {
        renderTagOption(tag, false);
        // Render child tags under this primary tag
        childTags.forEach(function(child) {
          var parent = child.relationships && child.relationships.parent && child.relationships.parent.data;
          if (parent && parent.id === tag.id) {
            renderTagOption(child, true);
          }
        });
      });
      // Also render orphan child tags (no matching parent)
      childTags.forEach(function(child) {
        var parent = child.relationships && child.relationships.parent && child.relationships.parent.data;
        if (!parent || !primaryTags.some(function(p) { return p.id === parent.id; })) {
          renderTagOption(child, false);
        }
      });
      modalHtml += '  </div>';
      modalHtml += '  <div class="melon-modal-footer">';
      modalHtml += '    <button class="melon-modal-btn melon-modal-cancel" onclick="melonCloseTagModal()">' + melonT('cancel') + '</button>';
      modalHtml += '    <button class="melon-modal-btn melon-modal-save" onclick="melonSaveTags(' + discId + ')">' + melonT('save') + '</button>';
      modalHtml += '  </div>';
      modalHtml += '</div></div>';

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    })
    .catch(function(e) {
      console.error('[Melon] Failed to load tags:', e);
      alert(melonT('load_tags_failed'));
    });
  };

  window.melonCloseTagModal = function() {
    var modal = document.getElementById('melon-tag-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
  };

  window.melonSaveTags = function(discId) {
    var checkboxes = document.querySelectorAll('#melon-tag-modal input[type="checkbox"]:checked');
    var tagIds = [];
    checkboxes.forEach(function(cb) { tagIds.push(cb.value); });

    // Include attributes to avoid Flarum subscriptions extension bug
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: {
        type: 'discussions',
        id: String(discId),
        attributes: {},
        relationships: {
          tags: {
            data: tagIds.map(function(id) {
              return { type: 'tags', id: String(id) };
            })
          }
        }
      }
    }).then(function() {
      melonCloseTagModal();
      setTimeout(function() { window.melonRefreshAfterOperation(); }, 300);
    }).catch(function(e) {
      console.error('[Melon] Save tags failed:', e);
      alert(melonT('save_tags_failed'));
    });
  };

  // Soft delete (hide) a discussion and its first post
  window.melonSoftDeleteDiscussion = function(discId) {
    if (!confirm(melonT('delete_confirm'))) return;
    if (window.app && app.store) {
      var model = app.store.getById('discussions', String(discId));
      if (model && typeof model.save === 'function') {
        var promises = [model.save({ isHidden: true })];
        // Also hide the first post so Flarum shows native hidden state in discussion page
        var discData = model.data || model;
        if (discData.relationships && discData.relationships.firstPost && discData.relationships.firstPost.data) {
          var fpModel = app.store.getById('posts', String(discData.relationships.firstPost.data.id));
          if (fpModel && typeof fpModel.save === 'function') {
            var fpHidden = false;
            if (typeof fpModel.isHidden === 'function') fpHidden = fpModel.isHidden();
            else {
              var fpD = fpModel.data || fpModel;
              fpHidden = !!(fpD.attributes && (fpD.attributes.hiddenAt || fpD.attributes.hidden_at));
            }
            if (!fpHidden) promises.push(fpModel.save({ isHidden: true }));
          }
        }
        Promise.all(promises).then(function() {
          window.melonRefreshAfterOperation();
        }).catch(function(e) {
          console.error('[Melon] Soft delete failed:', e);
          alert(melonT('delete_failed'));
        });
        return;
      }
    }
    apiRequest('DELETE', '/api/discussions/' + discId).then(function() {
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Soft delete failed:', e);
      alert(melonT('delete_failed'));
    });
  };

  // Restore a soft-deleted discussion (and its first post)
  window.melonRestoreDiscussion = function(discId) {
    if (window.app && app.store) {
      var model = app.store.getById('discussions', String(discId));
      if (model && typeof model.save === 'function') {
        var promises = [model.save({ isHidden: false })];
        // Also restore the first post if it was hidden
        var discData = model.data || model;
        if (discData.relationships && discData.relationships.firstPost && discData.relationships.firstPost.data) {
          var fpModel = app.store.getById('posts', String(discData.relationships.firstPost.data.id));
          if (fpModel && typeof fpModel.save === 'function') {
            var fpHidden = false;
            if (typeof fpModel.isHidden === 'function') fpHidden = fpModel.isHidden();
            else {
              var fpD = fpModel.data || fpModel;
              fpHidden = !!(fpD.attributes && (fpD.attributes.hiddenAt || fpD.attributes.hidden_at));
            }
            if (fpHidden) promises.push(fpModel.save({ isHidden: false }));
          }
        }
        Promise.all(promises).then(function() {
          window.melonRefreshAfterOperation();
        }).catch(function(e) {
          console.error('[Melon] Restore failed:', e);
          alert(melonT('restore_failed'));
        });
        return;
      }
    }
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { hiddenAt: null } }
    }).then(function() {
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Restore failed:', e);
      alert(melonT('restore_failed'));
    });
  };

  // Permanently delete a discussion (hard delete)
  window.melonPermanentDeleteDiscussion = function(discId) {
    if (!confirm(melonT('permanent_delete_confirm'))) return;
    apiRequest('DELETE', '/api/discussions/' + discId).then(function() {
      // Remove from store completely
      if (window.app && app.store) {
        try { app.store.remove('discussions', String(discId)); } catch(e) {}
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Permanent delete failed:', e);
      alert(melonT('delete_failed'));
    });
  };

  // ── Discussion Page: Timeline Layout ──
  var _discRendered = false;
  var _discLastId = '';  // Track discussion ID (not full path) to ignore scroll-spy hash changes

  function _getDiscId(pathname) {
    var m = pathname && pathname.match(/^\/d\/(\d+)/);
    return m ? m[1] : '';
  }

  function initDiscussionPage() {
    // Only render custom discussion page if the module is enabled
    if (!document.documentElement.classList.contains('melon-disc-page--active')) {
      // Still remove anti-flash so the page is visible with default Flarum layout
      document.documentElement.classList.remove('melon-anti-flash');
      return;
    }
    if (!window.location.pathname.match(/^\/d\/\d+/)) return;

    // If already rendered for THIS discussion (ignore scroll-spy floor number changes)
    var discId = _getDiscId(window.location.pathname);
    if (_discRendered && _discLastId === discId) return;

    // Reset for new discussion (SPA navigation between discussions)
    _discRendered = false;
    _discLastId = discId;
    // Clean up old discussion page elements from previous discussion
    var oldPage = document.querySelector('.DiscussionPage.melon-disc-active');
    if (oldPage) oldPage.classList.remove('melon-disc-active');
    var oldSidebar = document.querySelector('.melon-disc-sidebar');
    if (oldSidebar) oldSidebar.remove();
    var oldHeader = document.querySelector('.melon-disc-header');
    if (oldHeader) oldHeader.remove();

    var observer = new MutationObserver(function(mutations, obs) {
      var page = document.querySelector('.DiscussionPage');
      if (!page) return;
      var stream = page.querySelector('.PostStream');
      if (stream && stream.children.length > 0) {
        obs.disconnect();
        renderDiscussionPage();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Retry if first attempt times out (slow network)
    setTimeout(function() {
      observer.disconnect();
      renderDiscussionPage();
      // If still not rendered, retry once more after 1s
      if (!_discRendered) {
        setTimeout(function() { renderDiscussionPage(); }, 1000);
      }
    }, 1500);
  }

  function renderDiscussionPage() {
    if (_discRendered) return;
    var page = document.querySelector('.DiscussionPage');
    if (!page) return;

    _discRendered = true;

    // Ensure anti-flash is removed (safety for direct URL access)
    document.documentElement.classList.remove('melon-anti-flash');

    page.classList.add('melon-disc-active');
    discRestructureHero(page);
    discCreateSidebar(page);
    discMoveEventsToSidebar(page);
    discStylePosts(page);
    discApplyHiddenState(page);
    discObserveNewPosts(page);
    discWatchFirstPostHidden(page);
  }

  // Watch the first post's hidden state and sync it to the discussion model
  // This ensures that when Flarum natively hides/restores the first post,
  // the discussion model is also updated, keeping homepage and list in sync
  function discWatchFirstPostHidden(page) {
    try {
      if (!window.app || !app.store) return;
      var discId = _getDiscId(window.location.pathname);
      if (!discId) return;
      var discModel = app.store.getById('discussions', String(discId));
      if (!discModel) return;

      // Find the first post model
      var discData = discModel.data || discModel;
      var firstPostRel = discData.relationships && discData.relationships.firstPost;
      if (!firstPostRel || !firstPostRel.data) return;
      var postModel = app.store.getById('posts', String(firstPostRel.data.id));
      if (!postModel) return;

      // Helper to get post hidden state
      function getPostHidden(post) {
        return window.melonIsDiscussionHidden({ id: discId, relationships: { firstPost: { data: { id: (post.data || post).id } } } });
      }

      // Poll the first post's hidden state every 300ms
      var lastHidden = getPostHidden(postModel);
      var _watchInterval = setInterval(function() {
        var nowHidden = getPostHidden(postModel);
        if (nowHidden !== lastHidden) {
          lastHidden = nowHidden;
          // Sync: update discussion model's hiddenAt to match first post
          var discAttrs = discModel.data && discModel.data.attributes;
          if (discAttrs) {
            discAttrs.hiddenAt = nowHidden ? (discAttrs.hiddenAt || new Date().toISOString()) : null;
          }
          // Update the visual state on the discussion page
          if (nowHidden) {
            if (!page.querySelector('.melon-disc-hidden-banner')) {
              discApplyHiddenState(page);
            }
          } else {
            var b = page.querySelector('.melon-disc-hidden-banner');
            if (b) b.remove();
          }
        }
      }, 300);

      // Clean up when navigating away
      var _cleanup = function() {
        clearInterval(_watchInterval);
        window.removeEventListener('locationchange', _cleanup);
      };
      window.addEventListener('locationchange', _cleanup);
    } catch(e) {
      console.warn('[Melon] discWatchFirstPostHidden error:', e);
    }
  }

  // Apply soft-delete visual state to discussion page if the discussion or first post is hidden
  function discApplyHiddenState(page) {
    try {
      if (!window.app || !app.store) return;
      var discId = _getDiscId(window.location.pathname);
      if (!discId) return;
      var model = app.store.getById('discussions', String(discId));
      if (!model) return;

      // Check both discussion and first post hidden state
      var isHidden = window.melonIsDiscussionHidden({ id: discId, relationships: (model.data || model).relationships, attributes: (model.data || model).attributes });
      if (!isHidden) return;

      // Add soft-deleted banner before the first post
      var firstItem = page.querySelector('.PostStream-item');
      if (firstItem && !page.querySelector('.melon-disc-hidden-banner')) {
        var banner = document.createElement('div');
        banner.className = 'melon-disc-hidden-banner';
        var bannerText = '';
        try {
          bannerText = app.session.user.attribute('isAdmin')
            ? '🗑️ ' + (melonT ? melonT('discussion_soft_deleted') : 'This discussion has been soft-deleted')
            : '🗑️ ' + (melonT ? melonT('discussion_soft_deleted_author') : 'This discussion has been soft-deleted');
        } catch(e) {
          bannerText = '🗑️ This discussion has been soft-deleted';
        }
        banner.innerHTML = '<span>' + bannerText + '</span>';
        // Add restore button for admin or author
        var currentUserId = null;
        try { currentUserId = String(app.session.user.id() || app.session.user.id); } catch(e) {}
        var authorId = null;
        var discData = model.data || model;
        if (discData.relationships && discData.relationships.user && discData.relationships.user.data) {
          authorId = String(discData.relationships.user.data.id);
        }
        var isAdmin = false;
        try { isAdmin = app.session.user.attribute('isAdmin'); } catch(e) {}

        if (isAdmin || authorId === currentUserId) {
          var restoreBtn = document.createElement('button');
          restoreBtn.className = 'melon-disc-hidden-restore-btn';
          restoreBtn.textContent = melonT ? melonT('restore') : 'Restore';
          restoreBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (model.save && typeof model.save === 'function') {
              var promises = [model.save({ isHidden: false })];
              // Also restore the first post
              var fpRel = discData.relationships && discData.relationships.firstPost;
              if (fpRel && fpRel.data) {
                var fpM = app.store.getById('posts', String(fpRel.data.id));
                if (fpM && typeof fpM.save === 'function') {
                  promises.push(fpM.save({ isHidden: false }));
                }
              }
              Promise.all(promises).then(function() {
                var b = page.querySelector('.melon-disc-hidden-banner');
                if (b) b.remove();
              }).catch(function(err) {
                console.error('[Melon] Restore failed:', err);
              });
            }
          };
          banner.appendChild(restoreBtn);
        }
        firstItem.parentNode.insertBefore(banner, firstItem);
      }
    } catch(e) {
      console.warn('[Melon] discApplyHiddenState error:', e);
    }
  }

  // Collect EventPosts, hide from main stream, move to sidebar with controls
  function discMoveEventsToSidebar(page) {
    var events = [];
    page.querySelectorAll('.PostStream-item').forEach(function(item) {
      var ep = item.querySelector('.EventPost');
      if (ep) {
        var info = ep.querySelector('.EventPost-info');
        // Parse event DOM: extract description and time separately
        var desc = '';
        var time = '';
        if (info) {
          // Clone to safely manipulate
          var clone = info.cloneNode(true);
          // Flarum puts time in a .Datetime or time element
          var timeEl = clone.querySelector('.Datetime, time, .item-time');
          if (timeEl) {
            time = timeEl.textContent.trim();
            timeEl.parentNode.removeChild(timeEl);
          }
          desc = clone.textContent.trim().replace(/\s+/g, ' ');

          // For tag events: fix missing comma between concatenated tag names
          // "test1-2test2-1" → "test1-2, test2-1"
          // Split at: digit→letter boundary (2t) and lowercase→uppercase boundary (2G)
          if (desc.toLowerCase().indexOf('tag') !== -1) {
            desc = desc.replace(/(\d)([a-zA-Z\u4e00-\u9fff])/g, '$1, $2');
          }
        }

        // Detect event type for icon
        var icon = 'fas fa-circle-info';
        var textLower = desc.toLowerCase();
        if (textLower.indexOf('tag') !== -1 || textLower.indexOf('\u6807\u7B7E') !== -1) {
          icon = 'fas fa-tag';
        } else if (textLower.indexOf('like') !== -1 || textLower.indexOf('\u8D5E') !== -1) {
          icon = 'fas fa-thumbs-up';
        } else if (textLower.indexOf('reply') !== -1 || textLower.indexOf('\u56DE\u590D') !== -1) {
          icon = 'fas fa-reply';
        } else if (textLower.indexOf('renamed') !== -1 || textLower.indexOf('\u91CD\u547D\u540D') !== -1) {
          icon = 'fas fa-pencil';
        } else if (textLower.indexOf('deleted') !== -1 || textLower.indexOf('\u5220\u9664') !== -1) {
          icon = 'fas fa-trash';
        } else if (textLower.indexOf('stic') !== -1 || textLower.indexOf('\u7F6E\u9876') !== -1) {
          icon = 'fas fa-thumbtack';
        } else if (textLower.indexOf('lock') !== -1 || textLower.indexOf('\u9501\u5B9A') !== -1) {
          icon = 'fas fa-lock';
        }

        // Extract action controls
        var controlsHTML = '';
        var controls = ep.querySelector('.Post-actions') || ep.querySelector('.item-controls');
        if (controls) {
          controlsHTML = controls.innerHTML;
        }
        events.push({ text: desc, time: time, icon: icon, controlsHTML: controlsHTML });
        item.style.display = 'none';
      }
    });
    _discEvents = events;
  }

  // Get clean username from PostUser-name (Flarum puts avatar text "A" inside it)
  function discGetUserName(nameEl) {
    if (!nameEl) return '';
    // Try to find the actual username link (last <a> with href containing /u/)
    var links = nameEl.querySelectorAll('a[href*="/u/"]');
    if (links.length > 0) {
      return links[links.length - 1].textContent.trim();
    }
    // Fallback: get last text node, excluding badges
    var clone = nameEl.cloneNode(true);
    var badges = clone.querySelectorAll('.Badge, .PostUser-badges');
    badges.forEach(function(b) { b.parentNode.removeChild(b); });
    var allLinks = clone.querySelectorAll('a');
    if (allLinks.length > 0) {
      return allLinks[allLinks.length - 1].textContent.trim();
    }
    return clone.textContent.trim();
  }

  function discRestructureHero(page) {
    var hero = page.querySelector('.Hero');
    if (!hero) return;

    var title = hero.querySelector('.DiscussionHero-title') || hero.querySelector('h1, h2');
    var tags = hero.querySelectorAll('.TagLabel');

    var header = document.createElement('div');
    header.className = 'melon-disc-header';
    header.id = 'melon-disc-header';

    // Title row
    var titleRow = document.createElement('div');
    titleRow.className = 'melon-disc-title-row';

    if (title) {
      var titleEl = document.createElement('h1');
      titleEl.className = 'melon-disc-title';
      titleEl.textContent = title.textContent;
      titleRow.appendChild(titleEl);
    }

    var urlMatch = window.location.pathname.match(/\/d\/(\d+)/);
    if (urlMatch) {
      var numBadge = document.createElement('span');
      numBadge.className = 'melon-disc-number';
      numBadge.textContent = '#' + urlMatch[1];
      titleRow.appendChild(numBadge);
    }

    header.appendChild(titleRow);

    hero.style.display = 'none';

    var container = page.querySelector('.Page-container');
    if (container) {
      container.parentNode.insertBefore(header, container);
    } else {
      page.insertBefore(header, page.firstChild);
    }
  }

  function discCreateSidebar(page) {
    var container = page.querySelector('.Page-container');
    if (!container) return;

    var sidebar = document.createElement('aside');
    sidebar.className = 'melon-disc-sidebar';
    sidebar.id = 'melon-disc-sidebar';

    var firstPost = page.querySelector('.PostStream-item:first-child');
    var authorName = '', authorAvatar = '', authorHref = '';
    if (firstPost) {
      var nameEl = firstPost.querySelector('.PostUser-name');
      var avatarEl = firstPost.querySelector('.Avatar');
      if (nameEl) {
        authorName = discGetUserName(nameEl);
        // Get href from the username link
        var userLinks = nameEl.querySelectorAll('a[href*="/u/"]');
        authorHref = userLinks.length > 0 ? userLinks[userLinks.length - 1].href : '#';
      }
      if (avatarEl) authorAvatar = avatarEl.src || '';
    }

    // Floor jump is handled by native Flarum Scrubber (Page-sidebar)

    // Tags section — clickable links
    var heroTags = page.querySelectorAll('.Hero .TagLabel');
    if (heroTags.length > 0) {
      sidebar.appendChild(discMakeSection(melonT('tags'), function(ct) {
        heroTags.forEach(function(tag) {
          var pill = document.createElement('a');
          pill.className = 'melon-disc-sidebar-tag';
          pill.textContent = tag.textContent.trim();
          // Build tag URL from the tag's href or slug
          var tagHref = tag.getAttribute('href');
          if (tagHref) {
            pill.href = tagHref;
          } else {
            // Fallback: derive slug from tag name
            var slug = tag.textContent.trim().toLowerCase().replace(/\s+/g, '-');
            pill.href = '/t/' + slug;
          }
          ct.appendChild(pill);
        });
      }));
    }

    // Author section — avatar stack style (same as participants)
    if (authorName) {
      sidebar.appendChild(discMakeSection(melonT('author'), function(ct) {
        var avatarRow = document.createElement('div');
        avatarRow.className = 'melon-disc-sidebar-avatars';
        var wrapper = document.createElement('a');
        wrapper.href = authorHref;
        wrapper.className = 'melon-disc-sidebar-avatar-wrap';
        // Extract user ID from href (e.g. /u/admin → admin)
        var authorId = authorHref ? authorHref.replace(/\/+$/, '').split('/').pop() : authorName;
        wrapper.title = authorId;
        if (authorAvatar) {
          var img = document.createElement('img');
          img.src = authorAvatar; img.alt = authorName;
          img.className = 'melon-disc-sidebar-avatar';
          wrapper.appendChild(img);
        } else {
          var initial = discGetInitial(authorName);
          var avatarDiv = document.createElement('div');
          avatarDiv.className = 'melon-disc-sidebar-avatar-placeholder';
          avatarDiv.textContent = initial;
          wrapper.appendChild(avatarDiv);
        }
        avatarRow.appendChild(wrapper);
        ct.appendChild(avatarRow);
      }));
    }

    // Participants — with identity: expanded row; without: avatar stack + overflow
    var participants = [];
    var seenNames = {};
    page.querySelectorAll('.PostStream-item').forEach(function(item) {
      var nameEl = item.querySelector('.PostUser-name');
      if (!nameEl) return;
      var name = discGetUserName(nameEl);
      if (name && !seenNames[name]) {
        seenNames[name] = true;
        var avatar = item.querySelector('.Avatar');
        var userLinks = nameEl.querySelectorAll('a[href*="/u/"]');
        var badgesHTML = '';
        var badgesEl = item.querySelector('.PostUser-badges');
        if (badgesEl) {
          badgesHTML = badgesEl.innerHTML;
        }
        participants.push({
          name: name,
          href: userLinks.length > 0 ? userLinks[userLinks.length - 1].href : '#',
          avatar: avatar ? (avatar.src || '') : '',
          badgesHTML: badgesHTML
        });
      }
    });

    if (participants.length > 0 && document.documentElement.classList.contains('melon-disc-participants--active')) {
      sidebar.appendChild(discMakeSection(melonT('participants') + ' (' + participants.length + ')', function(ct) {
        // Separate: with identity vs without
        var withIdentity = participants.filter(function(p) { return p.badgesHTML; });
        var withoutIdentity = participants.filter(function(p) { return !p.badgesHTML; });

        // 1. Participants with identity — avatar + badges inline row
        withIdentity.forEach(function(p) {
          var row = document.createElement('div');
          row.className = 'melon-disc-sidebar-participant';

          // Wrap avatar in link with same style as author
          var wrapper = document.createElement('a');
          wrapper.href = p.href;
          wrapper.className = 'melon-disc-sidebar-avatar-wrap';
          // Extract user ID from href
          var userId = p.href ? p.href.replace(/\/+$/, '').split('/').pop() : p.name;
          wrapper.title = userId;
          if (p.avatar) {
            var img = document.createElement('img');
            img.src = p.avatar; img.alt = p.name;
            img.className = 'melon-disc-sidebar-avatar';
            wrapper.appendChild(img);
          } else {
            var initial = discGetInitial(p.name);
            var avatarDiv = document.createElement('div');
            avatarDiv.className = 'melon-disc-sidebar-avatar-placeholder';
            avatarDiv.textContent = initial;
            wrapper.appendChild(avatarDiv);
          }
          row.appendChild(wrapper);

          if (p.badgesHTML) {
            var badgesDiv = document.createElement('div');
            badgesDiv.className = 'melon-disc-sidebar-participant-badges';
            // Add title to badge elements before inserting HTML
            var tempDiv = document.createElement('div');
            tempDiv.innerHTML = p.badgesHTML;
            tempDiv.querySelectorAll('.Badge, img, span').forEach(function(b) {
              if (!b.getAttribute('title')) {
                var t = (b.textContent || b.alt || '').trim();
                if (t) b.setAttribute('title', t);
              }
            });
            badgesDiv.innerHTML = tempDiv.innerHTML;
            row.appendChild(badgesDiv);
          }

          ct.appendChild(row);
        });

        // 2. Participants without identity — avatar stack + overflow
        if (withoutIdentity.length > 0) {
          var avatarRow = document.createElement('div');
          avatarRow.className = 'melon-disc-sidebar-avatars';
          var maxShow = 5;
          var showList = withoutIdentity.slice(0, maxShow);
          var overflow = withoutIdentity.length - maxShow;
          showList.forEach(function(p, i) {
            var wrapper = document.createElement('a');
            wrapper.href = p.href;
            wrapper.className = 'melon-disc-sidebar-avatar-wrap';
            var uid = p.href ? p.href.replace(/\/+$/, '').split('/').pop() : p.name;
            wrapper.title = uid;
            wrapper.style.zIndex = String(i + 1);
            if (p.avatar) {
              var img = document.createElement('img');
              img.src = p.avatar; img.alt = p.name;
              img.className = 'melon-disc-sidebar-avatar';
              wrapper.appendChild(img);
            } else {
              var initial = discGetInitial(p.name);
              var avatarDiv = document.createElement('div');
              avatarDiv.className = 'melon-disc-sidebar-avatar-placeholder';
              avatarDiv.textContent = initial;
              wrapper.appendChild(avatarDiv);
            }
            avatarRow.appendChild(wrapper);
          });
          if (overflow > 0) {
            var badge = document.createElement('span');
            badge.className = 'melon-disc-sidebar-avatar-overflow';
            badge.textContent = '+' + overflow;
            avatarRow.appendChild(badge);
          }
          ct.appendChild(avatarRow);
        }
      }));
    }

    // Events section (moved from main stream, with controls)
    var events = _discEvents || [];
    if (events.length > 0 && document.documentElement.classList.contains('melon-disc-events--active')) {
      var evSection = discMakeSection(melonT('events'), function(ct) {
        events.forEach(function(ev) {
          var item = document.createElement('div');
          item.className = 'melon-disc-sidebar-event';
          // Row 1: icon + description only
          var row1 = document.createElement('div');
          row1.className = 'melon-disc-sidebar-event-row1';
          var iconEl = document.createElement('i');
          iconEl.className = ev.icon + ' melon-disc-sidebar-event-icon';
          row1.appendChild(iconEl);
          var textSpan = document.createElement('span');
          textSpan.className = 'melon-disc-sidebar-event-text';
          textSpan.textContent = ev.text;
          row1.appendChild(textSpan);
          item.appendChild(row1);
          // Row 2: time + controls
          if (ev.time || ev.controlsHTML) {
            var row2 = document.createElement('div');
            row2.className = 'melon-disc-sidebar-event-row2';
            if (ev.time) {
              var timeSpan = document.createElement('span');
              timeSpan.className = 'melon-disc-sidebar-event-time';
              timeSpan.textContent = ev.time;
              row2.appendChild(timeSpan);
            }
            if (ev.controlsHTML) {
              var ctrlWrap = document.createElement('div');
              ctrlWrap.className = 'melon-disc-sidebar-event-controls';
              ctrlWrap.innerHTML = ev.controlsHTML;
              row2.appendChild(ctrlWrap);
            }
            item.appendChild(row2);
          }
          ct.appendChild(item);
        });
      });
      evSection.classList.add('melon-disc-sidebar-events');
      sidebar.appendChild(evSection);
    }

    // Move DiscussionPage-nav into Melon sidebar (as last child)
    var nav = page.querySelector('.DiscussionPage-nav');
    if (nav) {
      sidebar.appendChild(nav);
    }

    container.appendChild(sidebar);
  }

  // Get display initial for avatar placeholder (handles Chinese names)
  function discGetInitial(name) {
    if (!name) return '?';
    // Chinese: take first character
    if (/[\u4e00-\u9fff]/.test(name.charAt(0))) {
      return name.charAt(0);
    }
    // English: take first uppercase letter
    var match = name.match(/[A-Z]/);
    return match ? match[0] : name.charAt(0).toUpperCase();
  }

  function discMakeSection(title, contentBuilder) {
    var section = document.createElement('div');
    section.className = 'melon-disc-sidebar-section';
    var label = document.createElement('h3');
    label.className = 'melon-disc-sidebar-label';
    label.textContent = title;
    section.appendChild(label);
    var content = document.createElement('div');
    content.className = 'melon-disc-sidebar-content';
    contentBuilder(content);
    section.appendChild(content);
    return section;
  }

  // Store observer and poll timer references for cleanup
  var _discPostObserver = null;
  var _discPostPollTimer = null;
  var _discPostStyleRAF = null;  // requestAnimationFrame ID for debouncing
  var _discEvents = [];  // Collected events (module-level, survives Mithril redraws)
  var _discLastPostCount = 0;  // Track post count to detect new/removed posts

  function discStylePosts(page, targetItems) {
    try {
    // Add floor numbers to all visible posts using Flarum's post number attribute
    // Also handle EventPosts (hide them and collect for sidebar)
    var allItems = targetItems || page.querySelectorAll('.PostStream-item');

    // Detect if post count changed (new posts loaded, or posts removed)
    var visibleCommentCount = 0;
    allItems.forEach(function(item) {
      if (item.style.display === 'none') return;
      if (item.querySelector('.ReplyPlaceholder, .Composer')) return;
      if (item.querySelector('.EventPost')) return;
      visibleCommentCount++;
    });
    var postCountChanged = (visibleCommentCount !== _discLastPostCount);
    _discLastPostCount = visibleCommentCount;

    // If post count changed, clear all floor data to force recalculation
    if (postCountChanged) {
      allItems.forEach(function(item) {
        item.removeAttribute('data-melon-floor');
      });
    }

    var newEvents = [];
    allItems.forEach(function(item) {
      // Skip hidden items
      if (item.style.display === 'none') return;
      // Skip ReplyPlaceholder and Composer
      if (item.querySelector('.ReplyPlaceholder, .Composer')) return;

      // Check if this is an EventPost
      var ep = item.querySelector('.EventPost');
      if (ep) {
        // Skip if already hidden (our modification is still intact)
        if (item.style.display === 'none' && item.classList.contains('melon-disc-styled')) return;
        // Parse event info
        var info = ep.querySelector('.EventPost-info');
        var desc = '';
        var time = '';
        if (info) {
          var clone = info.cloneNode(true);
          var timeEl = clone.querySelector('.Datetime, time, .item-time');
          if (timeEl) {
            time = timeEl.textContent.trim();
            timeEl.parentNode.removeChild(timeEl);
          }
          desc = clone.textContent.trim().replace(/\s+/g, ' ');
          if (desc.toLowerCase().indexOf('tag') !== -1) {
            desc = desc.replace(/(\d)([a-zA-Z\u4e00-\u9fff])/g, '$1, $2');
          }
        }
        var icon = 'fas fa-circle-info';
        var textLower = desc.toLowerCase();
        if (textLower.indexOf('tag') !== -1 || textLower.indexOf('\u6807\u7B7E') !== -1) {
          icon = 'fas fa-tag';
        } else if (textLower.indexOf('like') !== -1 || textLower.indexOf('\u8D5E') !== -1) {
          icon = 'fas fa-thumbs-up';
        } else if (textLower.indexOf('reply') !== -1 || textLower.indexOf('\u56DE\u590D') !== -1) {
          icon = 'fas fa-reply';
        } else if (textLower.indexOf('renamed') !== -1 || textLower.indexOf('\u91CD\u547D\u540D') !== -1) {
          icon = 'fas fa-pencil';
        } else if (textLower.indexOf('deleted') !== -1 || textLower.indexOf('\u5220\u9664') !== -1) {
          icon = 'fas fa-trash';
        } else if (textLower.indexOf('stic') !== -1 || textLower.indexOf('\u7F6E\u9876') !== -1) {
          icon = 'fas fa-thumbtack';
        } else if (textLower.indexOf('lock') !== -1 || textLower.indexOf('\u9501\u5B9A') !== -1) {
          icon = 'fas fa-lock';
        }
        var controlsHTML = '';
        var controls = ep.querySelector('.Post-actions') || ep.querySelector('.item-controls');
        if (controls) controlsHTML = controls.innerHTML;
        newEvents.push({ id: item.getAttribute('data-id'), text: desc, time: time, icon: icon, controlsHTML: controlsHTML });
        item.style.display = 'none';
        item.classList.add('melon-disc-styled');
        return; // Skip further processing for EventPosts
      }

      // Regular CommentPost processing
      // Quick skip: if already styled and all modifications are intact, skip.
      var currentFloor = item.getAttribute('data-melon-floor');
      if (currentFloor) {
        // Verify key styled elements are still present (Mithril may rebuild inner DOM)
        var stillOk = item.querySelector('.melon-disc-floor-num')
          && item.querySelector('.melon-disc-in-header')
          && item.querySelector('.melon-disc-header-info');
        if (stillOk) return;
        // Modifications lost — clear and reprocess
        item.removeAttribute('data-melon-floor');
      }

      // Calculate visible floor index (only count CommentPosts, skip EventPosts)
      // This ensures events don't consume floor numbers
      var floorIndex = 0;
      var allItems = page.querySelectorAll('.PostStream-item');
      for (var fi = 0; fi < allItems.length; fi++) {
        var fiItem = allItems[fi];
        if (fiItem.style.display === 'none') continue;
        if (fiItem.querySelector('.ReplyPlaceholder, .Composer')) continue;
        if (fiItem.querySelector('.EventPost')) continue;
        floorIndex++;
        if (fiItem === item) break;
      }
      if (floorIndex === 0) floorIndex = 1; // Safety fallback

      // Skip if floor number hasn't changed (postCountChanged already cleared stale data)
      if (currentFloor === String(floorIndex)) return;

      item.classList.add('melon-disc-styled');
      item.setAttribute('data-melon-floor', String(floorIndex));

      // Clean up any partial old modifications before re-styling
      var oldFloorNum = item.querySelector('.melon-disc-floor-num');
      if (oldFloorNum) oldFloorNum.remove();
      var oldAvatarInHeader = item.querySelector('.melon-disc-in-header');
      if (oldAvatarInHeader) {
        // Move avatar back to its original position (before .CommentPost)
        var commentPost = item.querySelector('.CommentPost') || item.querySelector('.Post');
        if (commentPost) {
          oldAvatarInHeader.classList.remove('melon-disc-in-header');
          item.insertBefore(oldAvatarInHeader, commentPost);
        }
      }

      var post = item.querySelector('.CommentPost') || item.querySelector('.Post');
      if (!post) return;

      var header = post.querySelector('.Post-header');
      if (!header) return;

      // 1. Move Post-avatar into header as first child
      var avatar = item.querySelector(':scope > .Post-avatar');
      if (avatar && header) {
        avatar.classList.add('melon-disc-in-header');
        header.insertBefore(avatar, header.firstChild);
      }

      // 1.5 Add floor label before avatar (only show for first 4 floors)
      if (document.documentElement.classList.contains('melon-disc-floor-num--active') && floorIndex <= 4) {
        var floorNum = document.createElement('span');
        floorNum.className = 'melon-disc-floor-num';
        // Read custom labels, colors and icons from admin settings
        var label = '', floorColor = '', floorIcon = '';
        try {
          // serializeToForum stores settings as camelCase keys in app.forum.attribute()
          var getSetting = function(dbKey) {
            // Convert melon.xxx_yyy to melonXxxYyy (e.g. melon.disc_floor_label_1 → melonDiscFloorLabel1)
            var jsKey = 'melon' + dbKey.replace(/^melon\./, '').split('_').map(function(s) {
              return s.charAt(0).toUpperCase() + s.slice(1);
            }).join('');
            return (app.forum && app.forum.attribute(jsKey)) || (app.data.settings && app.data.settings[dbKey]) || '';
          };
          label = getSetting('melon.disc_floor_label_' + floorIndex);
          floorColor = getSetting('melon.disc_floor_color_' + floorIndex);
          floorIcon = getSetting('melon.disc_floor_icon_' + floorIndex);
        } catch(e) {}
        // Build floor label content
        var floorContent = '';
        if (floorIcon && floorIcon.trim()) {
          if (floorIcon.trim().indexOf('http') === 0 || floorIcon.trim().indexOf('/') === 0) {
            // URL icon
            floorContent = '<img src="' + melonEsc(floorIcon.trim()) + '" style="width:14px;height:14px;margin-right:3px;vertical-align:middle" />';
          } else {
            // Font Awesome class
            floorContent = '<i class="' + melonEsc(floorIcon.trim()) + '" style="margin-right:3px;font-size:12px"></i>';
          }
        }
        if (label && label.trim()) {
          floorNum.innerHTML = floorContent + melonEsc(label.trim());
          if (floorIndex === 1) floorNum.classList.add('melon-disc-floor-op');
          else if (floorIndex === 2) floorNum.classList.add('melon-disc-floor-sofa');
          else if (floorIndex === 3) floorNum.classList.add('melon-disc-floor-floor');
        } else {
          floorNum.textContent = '#' + floorIndex;
        }
        // Apply custom color
        if (floorColor && floorColor.trim()) {
          floorNum.style.color = floorColor.trim();
          floorNum.style.background = floorColor.trim() + '18';
        }
        floorNum.id = 'melon-disc-floor-' + floorIndex;
        header.insertBefore(floorNum, header.firstChild);
      }

      var headerUl = header.querySelector(':scope > ul');
      if (!headerUl) return;

      // 2. Collect elements
      var userNameEl = null;
      var userBadgesEl = null;
      var timeEl = null;
      var otherLis = [];

      headerUl.querySelectorAll(':scope > li').forEach(function(li) {
        if (li.querySelector('.PostUser-name')) {
          userNameEl = li.querySelector('.PostUser-name');
          var badges = li.querySelector('.PostUser-badges');
          if (badges) userBadgesEl = badges;
        } else if (li.querySelector('.item-time, .Datetime, time')) {
          timeEl = li.querySelector('.item-time, .Datetime, time') || li;
        } else {
          otherLis.push(li);
        }
      });

      // 3. Rebuild header <ul>: simple row with name + time only
      headerUl.innerHTML = '';
      headerUl.className = 'melon-disc-header-info';

      // Username
      if (userNameEl) {
        var nameLi = document.createElement('li');
        nameLi.className = 'melon-disc-header-name';
        nameLi.appendChild(userNameEl);
        headerUl.appendChild(nameLi);
      }

      // Time — right aligned
      if (timeEl && document.documentElement.classList.contains('melon-disc-header-time--active')) {
        var timeLi = document.createElement('li');
        timeLi.className = 'melon-disc-header-time';
        timeLi.appendChild(timeEl);
        headerUl.appendChild(timeLi);
      }

      // Remaining items
      otherLis.forEach(function(li) {
        headerUl.appendChild(li);
      });

      // 4. No identity column inside post — badges go to sidebar instead
    });

    // If we found new EventPosts, add them to sidebar (deduplicate by data-id)
    if (newEvents.length > 0) {
      // Build a set of existing event IDs to prevent duplicates
      var existingIds = {};
      _discEvents.forEach(function(ev) { if (ev.id) existingIds[ev.id] = true; });
      var uniqueNew = [];
      newEvents.forEach(function(ev) {
        if (ev.id && existingIds[ev.id]) return; // Skip duplicate
        uniqueNew.push(ev);
        existingIds[ev.id] = true;
      });
      if (uniqueNew.length > 0) {
        _discEvents = _discEvents.concat(uniqueNew);
        discUpdateEventsSidebar(page);
      }
    }

    } catch(e) {
      console.warn('[Melon] discStylePosts error:', e);
    }
  }

  // Update the events section in sidebar with new events
  function discUpdateEventsSidebar(page) {
    if (!document.documentElement.classList.contains('melon-disc-events--active')) return;
    var events = _discEvents || [];
    if (events.length === 0) return;

    var sidebar = document.querySelector('.melon-disc-sidebar');
    if (!sidebar) return;

    // Find or create events section
    var eventsSection = sidebar.querySelector('.melon-disc-sidebar-events');
    if (eventsSection) {
      // Remove old content
      eventsSection.innerHTML = '';
    } else {
      // Create new section — insert before DiscussionPage-nav to maintain order
      var section = document.createElement('div');
      section.className = 'melon-disc-sidebar-section melon-disc-sidebar-events';
      var title = document.createElement('div');
      title.className = 'melon-disc-sidebar-label';
      title.textContent = melonT('events');
      section.appendChild(title);
      var content = document.createElement('div');
      content.className = 'melon-disc-sidebar-content';
      section.appendChild(content);
      var nav = sidebar.querySelector('.DiscussionPage-nav');
      if (nav) {
        sidebar.insertBefore(section, nav);
      } else {
        sidebar.appendChild(section);
      }
      eventsSection = content;
    }

    // Add all events
    events.forEach(function(ev) {
      var item = document.createElement('div');
      item.className = 'melon-disc-sidebar-event';
      var row1 = document.createElement('div');
      row1.className = 'melon-disc-sidebar-event-row1';
      var iconEl = document.createElement('i');
      iconEl.className = ev.icon + ' melon-disc-sidebar-event-icon';
      row1.appendChild(iconEl);
      var textSpan = document.createElement('span');
      textSpan.className = 'melon-disc-sidebar-event-text';
      textSpan.textContent = ev.text;
      row1.appendChild(textSpan);
      item.appendChild(row1);
      if (ev.time || ev.controlsHTML) {
        var row2 = document.createElement('div');
        row2.className = 'melon-disc-sidebar-event-row2';
        if (ev.time) {
          var timeSpan = document.createElement('span');
          timeSpan.className = 'melon-disc-sidebar-event-time';
          timeSpan.textContent = ev.time;
          row2.appendChild(timeSpan);
        }
        if (ev.controlsHTML) {
          var ctrlWrap = document.createElement('div');
          ctrlWrap.className = 'melon-disc-sidebar-event-controls';
          ctrlWrap.innerHTML = ev.controlsHTML;
          row2.appendChild(ctrlWrap);
        }
        item.appendChild(row2);
      }
      eventsSection.appendChild(item);
    });
  }

  function discObserveNewPosts(page) {
    var stream = page.querySelector('.PostStream');
    if (!stream) return;
    // Disconnect previous observer and poll timer if exists (prevent memory leak)
    if (_discPostObserver) {
      _discPostObserver.disconnect();
      _discPostObserver = null;
    }
    if (_discPostPollTimer) {
      clearInterval(_discPostPollTimer);
      _discPostPollTimer = null;
    }
    if (_discPostStyleRAF) {
      cancelAnimationFrame(_discPostStyleRAF);
      _discPostStyleRAF = null;
    }

    // Style any unstyled posts that exist right now
    discStylePosts(page);

    // MutationObserver: watch only for new posts added to PostStream.
    var stream = page.querySelector('.PostStream');
    if (stream) {
      _discPostObserver = new MutationObserver(function(mutations) {
        var hasNewContent = mutations.some(function(m) {
          return m.addedNodes.length > 0 || m.removedNodes.length > 0;
        });
        if (hasNewContent) startTempPoll();
      });
      _discPostObserver.observe(stream, { childList: true });
    }

    // Temporary polling: runs for ~3 seconds after trigger, then stops.
    // This handles the delay between new DOM nodes appearing and Mithril
    // fully rendering their content (avatars, headers, etc.).
    var _tempPollCount = 0;
    var _tempPollMax = 10; // 10 × 300ms = 3 seconds
    function startTempPoll() {
      if (_discPostPollTimer) return; // Already running
      _tempPollCount = 0;
      _discPostPollTimer = setInterval(function() {
        _tempPollCount++;
        if (!window.location.pathname.match(/^\/d\/\d+/)) {
          stopTempPoll();
          return;
        }
        var currentPage = document.querySelector('.DiscussionPage');
        if (!currentPage) return;
        if (!currentPage.classList.contains('melon-disc-active')) {
          currentPage.classList.add('melon-disc-active');
        }
        discStylePosts(currentPage);
        if (_tempPollCount >= _tempPollMax) stopTempPoll();
      }, 300);
    }
    function stopTempPoll() {
      if (_discPostPollTimer) {
        clearInterval(_discPostPollTimer);
        _discPostPollTimer = null;
      }
    }

    // Start initial temp poll to catch any late-rendering posts
    startTempPoll();

    // Hook into network activity to re-apply styles after Flarum's lazy-load API calls.
    function onNetworkComplete() {
      startTempPoll();
    }

    // Hook fetch — only intercept API calls to /api/posts (lazy-load)
    var _origFetch = window.fetch;
    if (_origFetch && !_origFetch._melonPatched) {
      window.fetch = function() {
        var promise = _origFetch.apply(this, arguments);
        var url = arguments[0] && typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url ? arguments[0].url : '');
        if (url.indexOf('/api/posts') !== -1 || url.indexOf('filter[discussion]') !== -1) {
          promise.then(onNetworkComplete).catch(function() {});
        }
        return promise;
      };
      window.fetch._melonPatched = true;
    }

    // Hook XMLHttpRequest — only intercept API calls to /api/posts
    var _origXHROpen = XMLHttpRequest.prototype.open;
    if (!_origXHROpen._melonPatched) {
      XMLHttpRequest.prototype.open = function() {
        var xhr = this;
        _origXHROpen.apply(this, arguments);
        var url = arguments[1] || '';
        if (url.indexOf('/api/posts') !== -1 || url.indexOf('filter[discussion]') !== -1) {
          xhr.addEventListener('load', onNetworkComplete);
        }
      };
      XMLHttpRequest.prototype.open._melonPatched = true;
    }
  }

  // Check if we're on a discussion page
  function checkDiscussionPage() {
    if (window.location.pathname.match(/^\/d\/\d+/)) {
      initDiscussionPage();
    } else {
      // Navigated away from discussion page — reset state
      if (_discRendered) {
        _discRendered = false;
        _discEvents = [];  // Clear collected events
        // Disconnect post observer and poll timer to prevent memory leak
        if (_discPostObserver) {
          _discPostObserver.disconnect();
          _discPostObserver = null;
        }
        if (_discPostPollTimer) {
          clearInterval(_discPostPollTimer);
          _discPostPollTimer = null;
        }
        if (_discPostStyleRAF) {
          cancelAnimationFrame(_discPostStyleRAF);
          _discPostStyleRAF = null;
        }
        // Clean up old discussion page elements
        var oldPage = document.querySelector('.DiscussionPage');
        if (oldPage) oldPage.classList.remove('melon-disc-active');
        var oldSidebar = document.querySelector('.melon-disc-sidebar');
        if (oldSidebar) oldSidebar.remove();
        var oldHeader = document.querySelector('.melon-disc-header');
        if (oldHeader) oldHeader.remove();
      }
    }
  }

  // Run on load
  checkDiscussionPage();

  // Safety net: remove anti-flash on pages not managed by any melon module
  // This prevents blank pages if a module's anti-flash removal is missed
  setTimeout(function() {
    if (document.documentElement.classList.contains('melon-anti-flash')) {
      var path = window.location.pathname;
      var isManaged =
        isRealHomepage(path) ||
        path === '/tags' || path === '/tags/' ||
        /^\/t\//.test(path) ||
        /^\/d\/\d+/.test(path);
      if (isManaged) {
        // Check if any relevant module is active
        var hasActiveModule =
          document.documentElement.classList.contains('melon-cards--active') ||
          document.documentElement.classList.contains('melon-tags-cloud--active') ||
          document.documentElement.classList.contains('melon-tag-disc--active') ||
          document.documentElement.classList.contains('melon-disc-page--active');
        if (!hasActiveModule) {
          melonRemoveAntiFlash();
        }
      } else {
        melonRemoveAntiFlash();
      }
    }
  }, 200);

  // Second safety net: force remove anti-flash after 800ms no matter what
  setTimeout(function() {
    melonRemoveAntiFlash();
  }, 800);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
