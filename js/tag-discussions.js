/* Melon Theme - Tag Discussions Page (deno.com/blog style) */
app.initializers.add('yannisme-melon-tag-discussions', function(app) {
  'use strict';

  var rendered = false;
  var _escDiv = document.createElement('div');

  function melonT(key, params) {
    try {
      if (window.app && window.app.translator) {
        var result = app.translator.trans('yannisme-melon.forum.' + key);
        var str = (result && typeof result.toString === 'function') ? result.toString() : String(result);
        if (params && typeof str === 'string') {
          Object.keys(params).forEach(function(k) {
            str = str.split('%' + k + '%').join(String(params[k]));
          });
        }
        return str;
      }
    } catch(e) {}
    return key;
  }

  function isTagPage(url) {
    return /^\/t\/[^\/]+/.test(url);
  }

  function getTagSlug(url) {
    var m = url.match(/^\/t\/([^\/]+)/);
    return m ? m[1] : null;
  }

  // Toggle actions menu for tag discussions page
  window.melonToggleTagDiscMenu = function(btn) {
    var item = btn.closest('.melon-td-item');
    if (!item) return;
    var menu = item.querySelector('.melon-td-actions-menu');
    if (!menu) return;

    // Close all other menus
    document.querySelectorAll('.melon-td-actions-menu.melon-td-actions-open').forEach(function(m) {
      if (m !== menu) m.classList.remove('melon-td-actions-open');
    });

    var isOpen = menu.classList.contains('melon-td-actions-open');
    if (isOpen) {
      menu.classList.remove('melon-td-actions-open');
    } else {
      menu.classList.add('melon-td-actions-open');
      // Move to body to avoid clipping
      if (!menu._originalParent) {
        menu._originalParent = menu.parentNode;
        document.body.appendChild(menu);
        // Position near button
        var rect = btn.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
      }
    }
  };

  // Close menus on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.melon-td-actions') && !e.target.closest('.melon-td-actions-menu')) {
      document.querySelectorAll('.melon-td-actions-menu.melon-td-actions-open').forEach(function(m) {
        m.classList.remove('melon-td-actions-open');
      });
    }
  });

  // Override refreshAfterOperation when on tag discussion page
  var _origRefresh = window.melonRefreshAfterOperation;
  window.melonRefreshAfterOperation = function() {
    if (isTagPage(window.location.pathname)) {
      document.querySelectorAll('.melon-td-actions-menu').forEach(function(m) {
        if (m._originalParent) m.remove();
      });
      cleanup();
      waitForFlarumRender(function() { tryRender(); });
    } else if (_origRefresh) {
      _origRefresh();
    }
  };

  function init() {

    if (isTagPage(window.location.pathname)) {
      // Only render custom tag discussions page if the module is enabled
      if (!document.documentElement.classList.contains('melon-tag-disc--active')) {
        document.documentElement.classList.remove('melon-anti-flash');
        return;
      }
      document.documentElement.classList.add('melon-anti-flash');
    }

    tryRender();

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      try {
        var resolved = new URL(href, window.location.origin).pathname;
        if (isTagPage(resolved) && document.documentElement.classList.contains('melon-tag-disc--active')) {
          document.documentElement.classList.add('melon-anti-flash');
        }
      } catch(ex) {}
    });

    window.addEventListener('locationchange', function() {
      var pathname = window.location.pathname;
      if (isTagPage(pathname) && document.documentElement.classList.contains('melon-tag-disc--active')) {
        cleanup();
        document.documentElement.classList.add('melon-anti-flash');
        // Wait for Flarum SPA to finish rendering before we render
        waitForFlarumRender(function() {
          tryRender();
        });
      } else if (rendered || document.getElementById('melon-tag-disc-page')) {
        // Leaving a tag page — cleanup residual content
        cleanup();
      } else {
        // Navigating to non-melon page — ensure anti-flash is removed
        document.documentElement.classList.remove('melon-anti-flash');
      }
    });

    // Handle bfcache (back-forward cache) restore
    window.addEventListener('pageshow', function(e) {
      if (e.persisted) {
        // Page restored from bfcache — remove anti-flash and re-render if needed
        document.documentElement.classList.remove('melon-anti-flash');
        if (isTagPage(window.location.pathname) && !document.getElementById('melon-tag-disc-page')) {
          cleanup();
          document.documentElement.classList.add('melon-anti-flash');
          tryRender();
        }
      }
    });
  }

  function waitForFlarumRender(callback) {
    var container = document.querySelector('.App-content') || document.querySelector('.container');
    if (!container) {
      // No container yet, wait for it
      var obs = new MutationObserver(function(mutations, o) {
        var c = document.querySelector('.App-content') || document.querySelector('.container');
        if (c) { o.disconnect(); setTimeout(callback, 50); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function() { obs.disconnect(); callback(); }, 1000);
      return;
    }

    // Record current children to detect when Flarum replaces them
    var oldChildren = Array.from(container.children);
    var oldHash = oldChildren.map(function(c) { return c.outerHTML.substring(0, 100); }).join('|');

    // Check immediately if content already changed (rare race condition)
    var newHash = Array.from(container.children).map(function(c) { return c.outerHTML.substring(0, 100); }).join('|');
    if (oldHash !== newHash) {
      setTimeout(callback, 50);
      return;
    }

    // Wait for DOM change (Flarum Mithril re-render)
    var observer = new MutationObserver(function(mutations, obs) {
      var currentHash = Array.from(container.children).map(function(c) { return c.outerHTML.substring(0, 100); }).join('|');
      if (currentHash !== oldHash) {
        obs.disconnect();
        setTimeout(callback, 50);
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // Fallback
    setTimeout(function() {
      observer.disconnect();
      callback();
    }, 800);
  }

  var currentPage = 0;
  var isLoading = false;
  var hasMore = true;
  var currentSlug = '';
  var currentTagInfo = null;
  var currentChildTags = [];
  var loadMoreObserver = null;

  function cleanup() {
    rendered = false;
    currentPage = 0;
    isLoading = false;
    hasMore = true;
    currentSlug = '';
    currentTagInfo = null;
    currentChildTags = [];
    if (loadMoreObserver) { loadMoreObserver.disconnect(); loadMoreObserver = null; }
    currentSort = '-createdAt';
    document.documentElement.classList.remove('melon-anti-flash');
    var old = document.getElementById('melon-tag-disc-page');
    if (old) old.remove();
    // Restore hidden elements (remove melon-hidden class)
    document.querySelectorAll('.melon-hidden').forEach(function(el) {
      el.classList.remove('melon-hidden');
    });
  }

  function tryRender() {
    if (rendered) return;
    if (!document.documentElement.classList.contains('melon-tag-disc--active')) {
      document.documentElement.classList.remove('melon-anti-flash');
      return;
    }
    if (!isTagPage(window.location.pathname)) return;

    var container = document.querySelector('.App-content')
      || document.querySelector('.container');

    if (container) {
      buildPage(container);
      return;
    }

    var observer = new MutationObserver(function(mutations, obs) {
      var c = document.querySelector('.App-content') || document.querySelector('.container');
      if (c) { obs.disconnect(); buildPage(c); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(function() {
      observer.disconnect();
      if (!rendered) {
        var c = document.querySelector('.App-content') || document.querySelector('.container');
        if (c) buildPage(c);
      }
    }, 2000);
  }

  function buildPage(container) {
    if (rendered || document.getElementById('melon-tag-disc-page')) return;

    var slug = getTagSlug(window.location.pathname);
    if (!slug) return;
    currentSlug = slug;

    // Get tag info from store
    var tagInfo = null;
    currentChildTags = [];
    if (window.app && app.store) {
      try {
        var storeTags = app.store.all('tags');
        if (storeTags) {
          storeTags.forEach(function(model) {
            var t = model.data;
            if (t && t.attributes && t.attributes.slug === slug) {
              tagInfo = t;
            }
          });
          // Find child tags of current tag
          if (tagInfo) {
            var tagId = tagInfo.id;
            storeTags.forEach(function(model) {
              var t = model.data;
              if (!t || !t.relationships || !t.relationships.parent || !t.relationships.parent.data) return;
              if (t.relationships.parent.data.id === tagId) {
                currentChildTags.push(t);
              }
            });
          }
        }
      } catch(e) {}
    }
    currentTagInfo = tagInfo;

    // Render page structure first (header, child tags, filters, empty list)
    renderPage(container, tagInfo, [], slug, currentChildTags);

    // Then load first page of discussions
    fetchDiscussions(container, slug, 0);
  }

  function fetchDiscussions(container, slug, offset) {
    if (isLoading || !hasMore) return;
    isLoading = true;

    var page = document.getElementById('melon-tag-disc-page');
    var loader = page ? page.querySelector('.melon-td-loader') : null;
    if (loader) loader.style.display = '';

    var apiUrl = '/api/discussions?include=tags,user,firstPost&sort=' + currentSort + '&filter[tag]=' + slug + '&page[offset]=' + (offset * 20);
    fetch(apiUrl)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.data) { isLoading = false; return; }

      // Push data into Flarum store so model.save() works for follow/unfollow
      if (window.app && app.store && app.store.pushPayload) {
        try { app.store.pushPayload(data); } catch(e) {}
      }

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
          if (fp) {
            disc._excerpt = fp.contentHtml || fp.content || '';
            disc._likesCount = fp.likesCount || 0;
          }
        }
        if (disc.relationships.user && disc.relationships.user.data) {
          var u = users[disc.relationships.user.data.id];
          if (u) disc._authorName = u.displayName || u.username;
        }
      });

      // Check if there are more pages
      var links = data.links || {};
      hasMore = !!links.next;

      // Append discussions to list
      appendDiscussions(discussions, slug);

      currentPage = offset;
      isLoading = false;

      if (loader) loader.style.display = 'none';

      // Setup lazy load observer if not already
      if (!loadMoreObserver && hasMore) {
        setupLazyLoad();
      }
    })
    .catch(function() {
      isLoading = false;
      if (loader) loader.style.display = 'none';
    });
  }

  function appendDiscussions(discussions, slug) {
    var page = document.getElementById('melon-tag-disc-page');
    if (!page) return;
    var list = page.querySelector('.melon-td-list');
    if (!list) return;

    var primaryColor = '#4ade80';
    try { primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--melon-primary').trim() || primaryColor; } catch(e) {}

    var isAdmin = false;
    try { isAdmin = window.app && app.session && app.session.user && app.session.user.attribute('isAdmin'); } catch(e) {}

    discussions.forEach(function(disc) {
      var title = disc.attributes.title || melonT('no_title');
      var discSlug = disc.attributes.slug || '';
      var createdAt = disc.attributes.createdAt || disc.attributes.createdAtTime;
      var replyCount = disc.attributes.replyCount || 0;
      var commentCount = disc.attributes.commentCount || 0;
      if (commentCount > 0) replyCount = commentCount;
      var likesCount = disc._likesCount || 0;
      var viewCount = disc.attributes.viewCount || 0;
      var isSticky = disc.attributes.isSticky || false;
      var isLocked = disc.attributes.isLocked || false;
      var isFollowing = ('subscription' in disc.attributes) && disc.attributes.subscription === 'follow';
      var isHidden = disc.attributes.isHidden || false;

      // Get tags
      var discTags = [];
      if (disc.relationships && disc.relationships.tags && disc.relationships.tags.data) {
        disc.relationships.tags.data.forEach(function(t) {
          try {
            var tm = app.store.getById('tags', t.id);
            if (tm) {
              discTags.push({ name: tm.data.attributes.name, slug: tm.data.attributes.slug, color: tm.data.attributes.color });
            }
          } catch(e) {}
        });
      }

      // Strip HTML tags from excerpt
      var plainExcerpt = '';
      if (disc._excerpt) {
        plainExcerpt = disc._excerpt.replace(/<[^>]*>/g, '').trim();
        if (plainExcerpt.length > 100) plainExcerpt = plainExcerpt.substring(0, 100) + '...';
      }

      var author = disc._authorName || disc.attributes.authorName || melonT('anonymous');
      var tagColor = (discTags.length > 0) ? discTags[0].color : primaryColor;

      var html = '';
      html += '<div class="melon-td-item' + (isSticky ? ' melon-td-sticky' : '') + (isFollowing ? ' melon-td-following' : '') + (isHidden ? ' melon-td-hidden' : '') + '" data-id="' + disc.id + '">';
      // Row 1: Title + menu
      html += '  <div class="melon-td-item-row1">';
      html += '    <a href="/d/' + disc.id + '-' + discSlug + '" class="melon-td-item-title-link">';
      if (isSticky) html += '<span class="melon-td-badge melon-td-badge-sticky">' + melonT('badge_sticky') + '</span>';
      if (isLocked) html += '<span class="melon-td-badge melon-td-badge-locked">' + melonT('badge_locked') + '</span>';
      html += '      <h3 class="melon-td-item-title">' + esc(title) + '</h3>';
      html += '    </a>';
      // Menu button (right side, independent)
      var canAct = (window.app && app.session && app.session.user);
      if (canAct) {
        html += '    <span class="melon-td-actions">';
        html += '      <span class="melon-td-actions-btn" onclick="event.stopPropagation();event.preventDefault();melonToggleTagDiscMenu(this)">⋯</span>';
        html += '      <span class="melon-td-actions-menu" data-menu-for="' + disc.id + '">';
        // Follow - only show if subscriptions extension is enabled
        if ('subscription' in disc.attributes) {
          html += '        <span onclick="event.stopPropagation();melonToggleFollow(' + disc.id + ',this)"><i class="fas fa-bell' + (isFollowing ? '' : '-slash') + '"></i> ' + (isFollowing ? melonT('unfollow') : melonT('follow')) + '</span>';
        }
        if (isAdmin) {
          html += '        <span onclick="event.stopPropagation();melonToggleSticky(' + disc.id + ',' + !isSticky + ')"><i class="fas fa-thumbtack"></i> ' + (isSticky ? melonT('unpin') : melonT('pin')) + '</span>';
          html += '        <span onclick="event.stopPropagation();melonToggleLock(' + disc.id + ',' + !isLocked + ')"><i class="fas fa-lock"></i> ' + (isLocked ? melonT('unlock') : melonT('lock')) + '</span>';
          html += '        <span onclick="event.stopPropagation();melonRenameDiscussion(' + disc.id + ')"><i class="fas fa-pen"></i> ' + melonT('rename') + '</span>';
          html += '        <span onclick="event.stopPropagation();melonEditTags(' + disc.id + ')"><i class="fas fa-tags"></i> ' + melonT('edit_tags') + '</span>';
          if (disc.attributes.isHidden) {
            html += '      <span onclick="event.stopPropagation();melonRestoreDiscussion(' + disc.id + ')"><i class="fas fa-undo"></i> ' + melonT('restore') + '</span>';
          } else {
            html += '      <span class="melon-td-action-danger" onclick="event.stopPropagation();melonDeleteDiscussion(' + disc.id + ')"><i class="fas fa-trash"></i> ' + melonT('delete') + '</span>';
          }
        }
        html += '      </span>';
        html += '    </span>';
      }
      html += '  </div>';
      // Row 2: Excerpt
      if (plainExcerpt && document.documentElement.classList.contains('melon-tag-disc-excerpt--active')) {
        html += '  <p class="melon-td-item-excerpt">' + esc(plainExcerpt) + '</p>';
      }
      // Row 3: Meta
      html += '  <div class="melon-td-item-meta">';
      html += '    <span class="melon-td-item-author">' + esc(author) + '</span>';
      html += '    <span class="melon-td-item-dot">·</span>';
      html += '    <span class="melon-td-item-time">' + formatTime(createdAt) + '</span>';
      if (discTags.length > 0) {
        discTags.forEach(function(dt) {
          html += '    <a href="/t/' + dt.slug + '" class="melon-td-item-tag" style="color:' + (dt.color || tagColor) + '" onclick="event.stopPropagation()">' + esc(dt.name) + '</a>';
        });
      }
      if (replyCount > 0 && document.documentElement.classList.contains('melon-tag-disc-replies--active')) {
        html += '    <span class="melon-td-item-dot">·</span>';
        html += '    <span class="melon-td-item-stat"><i class="far fa-comment"></i> ' + replyCount + '</span>';
      }
      if (likesCount > 0 && document.documentElement.classList.contains('melon-tag-disc-likes--active')) {
        html += '    <span class="melon-td-item-dot">·</span>';
        html += '    <span class="melon-td-item-stat"><i class="far fa-heart"></i> ' + likesCount + '</span>';
      }
      html += '  </div>';
      html += '</div>';

      list.insertAdjacentHTML('beforeend', html);
    });
  }

  function setupLazyLoad() {
    var sentinel = document.getElementById('melon-td-sentinel');
    if (!sentinel) return;

    loadMoreObserver = new IntersectionObserver(function(entries) {
      if (entries[0].isIntersecting && !isLoading && hasMore) {
        fetchDiscussions(
          document.querySelector('.App-content') || document.querySelector('.container'),
          currentSlug,
          currentPage + 1
        );
      }
    }, { rootMargin: '200px' });

    loadMoreObserver.observe(sentinel);
  }

  function renderPage(container, tagInfo, discussions, slug, childTags) {
    var html = '';
    var primaryColor = '#4ade80';
    try {
      primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--melon-primary').trim() || primaryColor;
    } catch(e) {}

    var tagName = (tagInfo && tagInfo.attributes && tagInfo.attributes.name) || slug;
    var tagDesc = (tagInfo && tagInfo.attributes && tagInfo.attributes.description) || '';
    var tagColor = (tagInfo && tagInfo.attributes && tagInfo.attributes.color) || primaryColor;
    var tagIcon = (tagInfo && tagInfo.attributes && tagInfo.attributes.icon) || '';
    var tagCount = (tagInfo && tagInfo.attributes && tagInfo.attributes.discussionCount) || discussions.length;

    var emojiMap = {
      'general': '💬', 'discussion': '💬',
      'help': '🤝', 'support': '🤝',
      'tutorial': '📚', 'tutorials': '📚',
      'news': '📰', 'blog': '📰', '公告': '📰',
      'off-topic': '☕', 'chit-chat': '☕',
      'development': '💻', 'dev': '💻',
      'design': '🎨',
      'games': '🎮', 'gaming': '🎮',
    };

    var iconHtml;
    if (tagIcon) {
      iconHtml = '<i class="' + esc(tagIcon) + '"></i>';
    } else {
      var emoji = emojiMap[slug.toLowerCase()] || emojiMap[tagName.toLowerCase()] || '🏷️';
      iconHtml = emoji;
    }

    // ── Header ──
    html += '<div class="melon-td-header">';
    html += '  <a href="javascript:history.back()" class="melon-td-back" title="' + melonT('back') + '"><i class="fas fa-arrow-left"></i> ' + melonT('back') + '</a>';
    html += '  <div class="melon-td-header-inner">';
    html += '    <div class="melon-td-tag-icon" style="background:' + tagColor + '22; color:' + tagColor + '">' + iconHtml + '</div>';
    html += '    <div class="melon-td-header-text">';
    html += '      <h1 class="melon-td-title">' + esc(tagName) + '</h1>';
    if (tagDesc) {
      html += '      <p class="melon-td-desc">' + esc(tagDesc) + '</p>';
    }
    html += '    </div>';
    html += '    <span class="melon-td-count">' + melonT('topics_count', {count: tagCount}) + '</span>';
    // New discussion button (use data attribute, bind event later)
    var canPost = (window.app && app.session && app.session.user);
    if (canPost) {
      html += '    <button class="melon-td-new-btn" data-tag-slug="' + esc(slug) + '"><i class="fas fa-pen-to-square"></i> ' + melonT('new_discussion') + '</button>';
    }
    html += '  </div>';
    html += '</div>';

    // ── Child Tags ──
    if (childTags && childTags.length > 0) {
      html += '<div class="melon-td-children">';
      childTags.forEach(function(ct) {
        var ctName = ct.attributes.name || '';
        var ctSlug = ct.attributes.slug || '';
        var ctColor = ct.attributes.color || primaryColor;
        var ctCount = ct.attributes.discussionCount || 0;
        var ctDesc = ct.attributes.description || '';
        var ctIcon = ct.attributes.icon || '';
        var ctEmoji = emojiMap[ctSlug.toLowerCase()] || emojiMap[ctName.toLowerCase()] || '🏷️';
        var ctIconHtml = ctIcon ? '<i class="' + esc(ctIcon) + '"></i>' : ctEmoji;
        html += '<a href="/t/' + ctSlug + '" class="melon-td-child">';
        html += '  <span class="melon-td-child-icon" style="background:' + ctColor + '22; color:' + ctColor + '">' + ctIconHtml + '</span>';
        html += '  <span class="melon-td-child-info">';
        html += '    <span class="melon-td-child-name">' + esc(ctName) + '</span>';
        if (ctDesc) html += '    <span class="melon-td-child-desc">' + esc(ctDesc) + '</span>';
        html += '  </span>';
        html += '  <span class="melon-td-child-count">' + ctCount + '</span>';
        html += '</a>';
      });
      html += '</div>';
    }

    // ── Filter bar ──
    html += '<div class="melon-td-filters">';
    html += '  <span class="melon-td-filter-label">' + melonT('sort_label') + '</span>';
    html += '  <button class="melon-td-filter-btn melon-td-filter-active" data-sort="latest">' + melonT('sort_latest') + '</button>';
    html += '  <button class="melon-td-filter-btn" data-sort="recent-reply">' + melonT('sort_recent_reply') + '</button>';
    html += '  <button class="melon-td-filter-btn" data-sort="top">' + melonT('sort_top') + '</button>';
    html += '</div>';

    // ── Discussion List ──
    html += '<div class="melon-td-list">';
    html += '</div>';

    // ── Lazy Load Sentinel & Loader ──
    html += '<div id="melon-td-sentinel" style="height:1px"></div>';
    html += '<div class="melon-td-loader" style="display:none;text-align:center;padding:20px 0;color:var(--muted-color,#9ca3af);font-size:13px"><i class="fas fa-spinner fa-spin"></i> ' + melonT('loading') + '</div>';

    // Create wrapper
    var wrapper = document.createElement('div');
    wrapper.id = 'melon-tag-disc-page';
    wrapper.className = 'melon-tag-disc-page';
    wrapper.innerHTML = html;

    container.insertBefore(wrapper, container.firstChild);

    // Hide default content
    hideDefaultContent();

    rendered = true;
    document.documentElement.classList.remove('melon-anti-flash');

    // Filter button click handlers
    wrapper.querySelectorAll('.melon-td-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        wrapper.querySelectorAll('.melon-td-filter-btn').forEach(function(b) {
          b.classList.remove('melon-td-filter-active');
        });
        btn.classList.add('melon-td-filter-active');
        var sort = btn.getAttribute('data-sort');
        // Reload from API with new sort order
        reloadWithSort(sort);
      });
    });

    // New discussion button
    var newBtn = wrapper.querySelector('.melon-td-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var tagSlug = this.getAttribute('data-tag-slug');
        window.melonNewDiscussion(tagSlug);
      });
    }
  }

  var currentSort = '-createdAt';

  function reloadWithSort(sort) {
    var sortMap = {
      'latest': '-createdAt',
      'recent-reply': '-lastPostedAt',
      'top': '-commentCount'
    };
    currentSort = sortMap[sort] || '-createdAt';

    // Reset pagination state
    currentPage = 0;
    hasMore = true;
    isLoading = false;
    if (loadMoreObserver) { loadMoreObserver.disconnect(); loadMoreObserver = null; }

    // Clear list
    var page = document.getElementById('melon-tag-disc-page');
    var list = page ? page.querySelector('.melon-td-list') : null;
    if (list) list.innerHTML = '';

    // Reload first page
    fetchDiscussions(
      document.querySelector('.App-content') || document.querySelector('.container'),
      currentSlug,
      0
    );
  }

  function hideDefaultContent() {
    var container = document.querySelector('.App-content') || document.querySelector('.container');
    if (!container) return;

    Array.from(container.children).forEach(function(child) {
      if (child.id === 'melon-tag-disc-page') return;
      // Don't hide Flarum's composer, modals, or drawers
      if (child.id === 'composer' || child.id === 'modal' || child.classList.contains('App-composer') || child.classList.contains('App-modal') || child.classList.contains('App-drawer')) return;
      if (child.querySelector && child.querySelector('#melon-tag-disc-page')) {
        Array.from(child.children).forEach(function(gc) {
          if (gc.id !== 'melon-tag-disc-page') gc.classList.add('melon-hidden');
        });
      } else {
        child.classList.add('melon-hidden');
      }
    });
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

  // Follow/unfollow a discussion (Flarum 2.0: use model.save() like the subscriptions extension does)
  // ── New Discussion ──
  window.melonNewDiscussion = function(tagSlug) {
    if (!window.app || !app.session || !app.session.user) return;

    // Strategy 1: Find and click Flarum's own "Start a Discussion" button
    // (it exists in the DOM but may be hidden by melon)
    var flarumNewBtn = document.querySelector('.IndexPage-newDiscussion, .Button--primary.IndexPage-newDiscussion');
    if (flarumNewBtn) {
      flarumNewBtn.click();
      return;
    }

    // Strategy 2: Use app.composer.load with the module from flarum.core
    try {
      // Access the module through flarum.core exports
      var DC = flarum.core['forum/components/DiscussionComposer'];
      if (!DC) {
        // Try alternate access patterns
        var mods = flarum.core;
        var keys = Object.keys(mods);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('DiscussionComposer') !== -1) {
            DC = mods[keys[i]];
            break;
          }
        }
      }
      if (DC) {
        app.composer.load(DC, { user: app.session.user });
        app.composer.show();
        return;
      }
    } catch(e) {}

    // Strategy 3: SPA navigation
    try {
      app.history.push('/d/new');
    } catch(e) {}
  };

  window.melonToggleFollow = function(discId, menuItem) {
    if (!window.app || !app.session || !app.session.user) return;

    var model = null;
    try { model = app.store.getById('discussions', discId); } catch(e) {}
    if (!model) {
      console.error('[Melon TagDisc] Discussion model not found in store:', discId);
      return;
    }

    var isFollowing = menuItem && menuItem.textContent.indexOf(melonT('unfollow')) !== -1;
    var newSubscription = isFollowing ? null : 'follow';

    model.save({ subscription: newSubscription }).then(function() {
      // Update menu item text
      if (menuItem) {
        if (isFollowing) {
          menuItem.innerHTML = '<i class="fas fa-bell-slash"></i> ' + melonT('follow');
        } else {
          menuItem.innerHTML = '<i class="fas fa-bell"></i> ' + melonT('unfollow');
        }
      }
      // Update list item visual state
      var item = document.querySelector('.melon-td-item[data-id="' + discId + '"]');
      if (item) {
        if (isFollowing) {
          item.classList.remove('melon-td-following');
        } else {
          item.classList.add('melon-td-following');
        }
      }
    }).catch(function(e) {
      console.error('[Melon TagDisc] Toggle follow failed:', e);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
