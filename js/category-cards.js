/* Melon Theme - Enhanced Homepage Layout */
app.initializers.add('yannisme-melon-category-cards', function(app) {
  'use strict';

  var rendered = false;


  // Cache div for esc() to avoid creating one per call
  var _escDiv = document.createElement('div');

  function melonT(key, params) {
    try {
      if (window.app && window.app.translator) {
        var str = app.translator.trans('yannisme-melon.forum.' + key);
        // Manual parameter replacement to avoid ICU number formatting (e.g. "9, categories")
        if (params && typeof str === 'string') {
          Object.keys(params).forEach(function(k) {
            str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
          });
        }
        return str;
      }
    } catch(e) {}
    return key;
  }

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
          // Retry tryRender multiple times for SPA navigation (DOM may not be ready yet)
          setTimeout(function() { tryRender(); }, 20);
          setTimeout(function() { tryRender(); }, 100);
          setTimeout(function() { tryRender(); }, 300);
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
    // Restore hidden elements (remove melon-hidden class)
    document.querySelectorAll('.melon-hidden').forEach(function(el) {
      el.classList.remove('melon-hidden');
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
            if (attrs.position !== null && !attrs.isChild && attrs.slug !== 'untagged') {
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
          return t.attributes.position !== null && !t.attributes.isChild && t.attributes.slug !== 'untagged';
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

    if (window.app && app.store) {
      try {
        var storeDiscs = app.store.all('discussions');
        if (storeDiscs && storeDiscs.length > 0) {
          // If store has very few discussions, it might be stale from a tag page visit.
          // Fetch fresh data from API to ensure we have all discussions.
          if (storeDiscs.length < 3) {
            fetchHomepageDiscussions(container, tags, allTags);
            return;
          }

          var discussions = [];

          storeDiscs.forEach(function(model) {
            var d = model.data;
            if (!d) return;

            // Use Flarum model's isHidden() method if available, else check attributes
            var isHidden = false;
            if (typeof model.isHidden === 'function') {
              isHidden = model.isHidden();
            } else if (d.attributes.isHidden !== undefined) {
              isHidden = d.attributes.isHidden;
            } else if (d.attributes.hiddenAt) {
              isHidden = !!d.attributes.hiddenAt;
            }

            // Get likes from firstPost
            d._likesCount = 0;
            if (d.relationships && d.relationships.firstPost && d.relationships.firstPost.data) {
              var fp = app.store.getById('posts', d.relationships.firstPost.data.id);
              if (fp && fp.data && fp.data.attributes) d._likesCount = fp.data.attributes.likesCount || 0;
            }

            // Get author name
            if (d.relationships && d.relationships.user && d.relationships.user.data) {
              var u = app.store.getById('users', d.relationships.user.data.id);
              if (u && u.data && u.data.attributes) d._authorName = u.data.attributes.displayName || u.data.attributes.username;
            }

            // Override isHidden in attributes so renderHomepage can read it
            d.attributes.isHidden = isHidden;

            discussions.push(d);
          });

          discussions.sort(function(a, b) {
            return new Date(b.attributes.createdAt || 0) - new Date(a.attributes.createdAt || 0);
          });

          renderHomepage(container, tags, discussions, {}, allTags);
          return;
        }
      } catch(e) {
        console.error('[Melon] Store build failed:', e);
      }
    }

    // Fallback: REST API (won't include hidden posts, but better than nothing)
    buildFromRESTAPI(container, tags);
  }

  // Fallback: REST API
  function buildFromRESTAPI(container, tags) {
    var allTags = {};
    tags.forEach(function(t) { allTags[t.id] = t; });

    // Read max count from settings to request enough data from API
    var apiLimit = 99;
    try {
      var ms = window.__melon_settings || {};
      if (ms.homepage_disc_count) apiLimit = Math.min(99, Math.max(1, parseInt(ms.homepage_disc_count, 10) || 99));
    } catch(e) {}

    fetch('/api/discussions?sort=-createdAt&page[size]=' + apiLimit)
    .then(function(r) { return r.json(); })
    .then(function(discData) {
      if (!discData || !discData.data) return;
      var discussions = discData.data;
      var users = {};
      var posts = {};
      if (discData.included) {
        discData.included.forEach(function(item) {
          if (item.type === 'users') users[item.id] = item.attributes;
          if (item.type === 'tags') allTags[item.id] = item;
          if (item.type === 'posts') posts[item.id] = item.attributes;
        });
      }
      discussions.forEach(function(disc) {
        if (disc.relationships.firstPost && disc.relationships.firstPost.data) {
          var fp = posts[disc.relationships.firstPost.data.id];
          if (fp) disc._likesCount = fp.likesCount || 0;
        }
      });
      renderHomepage(container, tags, discussions, users, allTags);
    })
    .catch(function(err) {
      console.error('[Melon] API fallback failed:', err);
      rendered = false;
      document.documentElement.classList.remove('melon-anti-flash');
    });
  }

  // Fetch all discussions via API (used when store is stale, e.g. after visiting a tag page)
  function fetchHomepageDiscussions(container, tags, allTags) {
    fetch('/api/discussions?include=tags,user,firstPost&sort=-createdAt')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.data) return;
      var discussions = data.data;
      var users = {};
      var posts = {};
      if (data.included) {
        data.included.forEach(function(item) {
          if (item.type === 'users') users[item.id] = item.attributes;
          if (item.type === 'posts') posts[item.id] = item.attributes;
        });
      }
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
      // Update store with fresh data
      if (window.app && app.store) {
        try {
          discussions.forEach(function(disc) {
            var existing = app.store.getById('discussions', disc.id);
            if (existing) existing.pushData(disc);
          });
        } catch(e) {}
      }
      renderHomepage(container, tags, discussions, users, allTags);
      hideDefaultIndexPage();
      document.documentElement.classList.remove('melon-anti-flash');
    })
    .catch(function(e) {
      console.warn('[Melon] API fetch failed, using store data:', e);
      // Fallback: render whatever is in store
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
    var isHidden = disc.attributes.isHidden || false;
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
    var timeStr = formatTime(lastPostedAt);
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
    h += esc(title);
    h += '    </div>';

    // Row 2: Meta info + tags + actions all in one line
    h += '    <div class="melon-disc-meta">';
    h += '      <span class="melon-disc-author">' + esc(displayName) + '</span>';
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
          tagContent = '<i class="' + esc(icon) + '" style="margin-right:3px;font-size:10px"></i>' + esc(n);
        } else {
          tagContent = esc(n);
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
        } else {
          h += '          <span class="melon-disc-action-danger" onclick="event.stopPropagation();event.preventDefault();melonDeleteDiscussion(' + disc.id + ')"><i class="fas fa-trash"></i> ' + melonT('delete') + '</span>';
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
    html += '    <h1 class="melon-hero-title">' + esc(welcomeTitle) + '</h1>';
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
      var emojiMap = {
        'general': '💬', 'discussion': '💬', '讨论': '💬', '综合': '💬',
        'help': '🤝', 'support': '🤝', '帮助': '🤝', '问答': '🤝',
        'tutorial': '📚', 'tutorials': '📚', '教程': '📚', '指南': '📚',
        'showcase': '✨', 'project': '✨', 'projects': '✨', '项目': '✨', '展示': '✨',
        'news': '📰', 'blog': '📰', '新闻': '📰', '公告': '📰',
        'feedback': '💭', 'suggestion': '💭', '建议': '💭', '反馈': '💭',
        'off-topic': '☕', 'chit-chat': '☕', '闲聊': '☕', '水区': '☕',
        'development': '💻', 'dev': '💻', '开发': '💻', 'coding': '💻',
        'design': '🎨', '设计': '🎨',
        'games': '🎮', 'gaming': '🎮', '游戏': '🎮',
        'javascript': '🟨', 'js': '🟨', 'python': '🐍', 'php': '🐘',
        'css': '🎨', 'html': '🟧', 'react': '⚛️', 'vue': '💚',
        'node': '🟩', 'nodejs': '🟩', 'linux': '🐧', 'android': '🤖',
      };

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
          iconHtml = '<i class="' + esc(tagIcon) + '" style="font-size:22px;color:' + (tagColor || 'inherit') + '"></i>';
        } else {
          var emoji = emojiMap[slug.toLowerCase()] || emojiMap[name.toLowerCase()] || '🏷️';
          iconHtml = emoji;
        }

        html += '<a href="/t/' + slug + '" class="melon-cta-card">';
        html += '  <div class="melon-cta-icon">' + iconHtml + '</div>';
        html += '  <div class="melon-cta-info">';
        html += '    <b class="melon-cta-title">' + esc(name) + '</b>';
        html += '    <span class="melon-cta-desc">' + esc(desc || melonT('topics_count', {count: count})) + '</span>';
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
        html += '    <h3 class="melon-card-name">' + esc(name) + '</h3>';
        html += '    <p class="melon-card-desc">' + esc(desc || melonT('no_description')) + '</p>';
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
        html += '    <a href="' + esc(customUrl) + '" class="melon-section-more">' + esc(customText) + ' <i class="fas fa-arrow-right"></i></a>';
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

  function formatTime(dateStr) {
    if (!dateStr) return '';
    var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return melonT('time_just_now');
    if (diff < 3600) return melonT('time_minutes_ago', {count: Math.floor(diff / 60)});
    if (diff < 86400) return melonT('time_hours_ago', {count: Math.floor(diff / 3600)});
    if (diff < 2592000) return melonT('time_days_ago', {count: Math.floor(diff / 86400)});
    return new Date(dateStr).toLocaleDateString('zh-CN');
  }

  function esc(str) {
    _escDiv.textContent = str;
    return _escDiv.innerHTML;
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
      return;
    }

    // Move menu to body so it's never clipped by parent overflow
    menu._originalParent = menu.parentNode;
    menu._originalNextSibling = menu.nextSibling;
    document.body.appendChild(menu);

    // Calculate position
    var rect = btnEl.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 4) + 'px';
    menu.style.left = Math.max(8, rect.right - 140) + 'px';
    menu.style.right = 'auto';
    menu.classList.add('melon-disc-actions-open');
  };

  function melonCloseMenu(menu) {
    menu.classList.remove('melon-disc-actions-open');
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

  // Re-render melon list after an operation
  function refreshAfterOperation() {
    // Close and remove any menus that were moved to body
    document.querySelectorAll('.melon-disc-actions-menu').forEach(function(m) {
      if (m._originalParent) {
        m.remove();
      }
    });
    // Simply re-trigger the full build pipeline
    // buildFromStoreEnhanced reads from Flarum store which we already updated
    var old = document.getElementById('melon-homepage');
    if (old) old.remove();
    rendered = false;
    if (hideObserver) { hideObserver.disconnect(); hideObserver = null; }

    var container = document.querySelector('.App-content') || document.querySelector('.container');
    if (container) {
      // Get tags from store
      var tags = getStoreTags();
      if (tags.length > 0) {
        buildFromStoreEnhanced(container, tags);
      } else {
        buildHomepage(container);
      }
    }
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
        return !t.attributes.isChild && t.attributes.slug !== 'untagged';
      });
      allTags.sort(function(a, b) { return (a.attributes.position || 999) - (b.attributes.position || 999); });

      // Build modal HTML
      var modalHtml = '<div class="melon-modal-overlay" id="melon-tag-modal">';
      modalHtml += '<div class="melon-modal">';
      modalHtml += '  <div class="melon-modal-header"><h3>' + melonT('edit_tags_title') + '</h3><span class="melon-modal-close" onclick="melonCloseTagModal()">&times;</span></div>';
      modalHtml += '  <div class="melon-modal-body">';
      allTags.forEach(function(tag) {
        var name = tag.attributes.name || '';
        var color = tag.attributes.color || '#999';
        var checked = currentTagIds.indexOf(tag.id) !== -1 || currentTagIds.indexOf(tag.attributes.name) !== -1 ? 'checked' : '';
        modalHtml += '<label class="melon-tag-option">';
        modalHtml += '  <input type="checkbox" value="' + tag.id + '" ' + checked + '>';
        modalHtml += '  <span class="melon-tag-color" style="background:' + color + '"></span>';
        modalHtml += '  <span>' + name + '</span>';
        modalHtml += '</label>';
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

  window.melonDeleteDiscussion = function(discId) {
    if (!confirm(melonT('delete_confirm'))) return;
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { isHidden: true } }
    }).then(function() {
      if (window.app && app.store) {
        var model = app.store.getById('discussions', discId);
        if (model && model.data) {
          model.data.attributes.isHidden = true;
          model.data.attributes.hiddenAt = new Date().toISOString();
        }
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Soft delete failed:', e);
      alert(melonT('delete_failed'));
    });
  };

  window.melonRestoreDiscussion = function(discId) {
    apiRequest('PATCH', '/api/discussions/' + discId, {
      data: { type: 'discussions', id: String(discId), attributes: { isHidden: false } }
    }).then(function() {
      if (window.app && app.store) {
        var model = app.store.getById('discussions', discId);
        if (model && model.data) {
          model.data.attributes.isHidden = false;
          model.data.attributes.hiddenAt = null;
        }
      }
      window.melonRefreshAfterOperation();
    }).catch(function(e) {
      console.error('[Melon] Restore failed:', e);
      alert(melonT('restore_failed'));
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
    setTimeout(function() { observer.disconnect(); renderDiscussionPage(); }, 1500);
  }

  function renderDiscussionPage() {
    if (_discRendered) return;
    var page = document.querySelector('.DiscussionPage');
    if (!page) return;
    if (!document.querySelector('.DiscussionPage .PostStream')) return;

    _discRendered = true;

    page.classList.add('melon-disc-active');
    discMoveEventsToSidebar(page);
    discRestructureHero(page);
    discCreateSidebar(page);
    discStylePosts(page);
    discObserveNewPosts(page);
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
    page._melonEvents = events;
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

    // Floor jump section — input box to jump to a specific floor
    // Get total post count from Flarum store (not just visible DOM items)
    var allStreamItems = page.querySelectorAll('.PostStream-item');
    var visibleCount = 0;
    allStreamItems.forEach(function(item) {
      if (item.style.display !== 'none' && !item.querySelector('.ReplyPlaceholder, .Composer')) visibleCount++;
    });
    var totalFloors = visibleCount;
    try {
      var discId = window.location.pathname.match(/^\/d\/(\d+)/);
      if (discId && window.app && app.store) {
        var discModel = app.store.getById('discussions', discId[1]);
        if (discModel && discModel.data && discModel.data.attributes) {
          var commentCount = discModel.data.attributes.commentCount || 0;
          // commentCount = replies only, total posts = replies + 1 (first post)
          var apiTotal = commentCount + 1;
          if (apiTotal > totalFloors) totalFloors = apiTotal;
        }
      }
    } catch(e) {}
    if (totalFloors > 0 && document.documentElement.classList.contains('melon-disc-floor-jump--active')) {
      sidebar.appendChild(discMakeSection(melonT('floor_jump'), function(ct) {
        var jumpRow = document.createElement('div');
        jumpRow.className = 'melon-disc-floor-jump';

        var input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.max = String(totalFloors);
        input.placeholder = melonT('floor_number');
        input.className = 'melon-disc-floor-input';
        input.id = 'melon-disc-floor-input';

        var total = document.createElement('span');
        total.className = 'melon-disc-floor-total';
        total.textContent = '/ ' + totalFloors;

        var btn = document.createElement('button');
        btn.className = 'melon-disc-floor-btn';
        btn.type = 'button';
        btn.textContent = melonT('go');
        btn.addEventListener('click', function() {
          var val = parseInt(input.value, 10);
          if (val >= 1 && val <= totalFloors) {
            var target = document.getElementById('melon-disc-floor-' + val);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        });

        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            btn.click();
          }
        });

        jumpRow.appendChild(input);
        jumpRow.appendChild(total);
        jumpRow.appendChild(btn);
        ct.appendChild(jumpRow);
      }));
    }

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
    var events = page._melonEvents || [];
    if (events.length > 0 && document.documentElement.classList.contains('melon-disc-events--active')) {
      sidebar.appendChild(discMakeSection(melonT('events'), function(ct) {
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
      }));
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

  function discStylePosts(page, targetItems) {
    // No OP badge on first post

    // Add floor numbers to all visible posts (skip hidden EventPosts)
    var allItems = targetItems || page.querySelectorAll('.PostStream-item');
    var floorIndex = 0;
    allItems.forEach(function(item) {
      if (item.classList.contains('melon-disc-styled')) return;
      // Skip hidden EventPosts and ReplyPlaceholder
      if (item.style.display === 'none') return;
      if (item.querySelector('.ReplyPlaceholder, .Composer')) return;
      floorIndex++;
      item.classList.add('melon-disc-styled');
      item.setAttribute('data-melon-floor', String(floorIndex));

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

      // 1.5 Add floor number before avatar
      if (document.documentElement.classList.contains('melon-disc-floor-num--active')) {
        var floorNum = document.createElement('span');
        floorNum.className = 'melon-disc-floor-num';
        floorNum.textContent = '#' + floorIndex;
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
  }

  function discObserveNewPosts(page) {
    var stream = page.querySelector('.PostStream');
    if (!stream) return;
    var observer = new MutationObserver(function(mutations) {
      var newItems = [];
      mutations.forEach(function(mutation) {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1 && node.classList && node.classList.contains('PostStream-item')) {
            newItems.push(node);
          }
        });
      });
      if (newItems.length > 0) {
        discStylePosts(page, newItems);
      }
    });
    observer.observe(stream, { childList: true });
  }

  // Check if we're on a discussion page
  function checkDiscussionPage() {
    if (window.location.pathname.match(/^\/d\/\d+/)) {
      initDiscussionPage();
    } else {
      // Navigated away from discussion page — reset state
      if (_discRendered) {
        _discRendered = false;
        // Clean up old discussion page elements
        var oldPage = document.querySelector('.DiscussionPage.melon-disc-active');
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
          document.documentElement.classList.remove('melon-anti-flash');
        }
      } else {
        document.documentElement.classList.remove('melon-anti-flash');
      }
    }
  }, 300);

  // Second safety net: force remove anti-flash after 2s no matter what
  setTimeout(function() {
    document.documentElement.classList.remove('melon-anti-flash');
  }, 2000);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
