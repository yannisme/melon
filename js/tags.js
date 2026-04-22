/* Melon Theme - Tags Cloud Page */
app.initializers.add('yannisme-melon-tags', function(app) {
  'use strict';

  var tagsRendered = false;

  function isDefaultRouteTags() {
    try {
      var route = (window.__melon_settings && window.__melon_settings.default_route) || '';
      return route === '/tags';
    } catch(e) { return false; }
  }

  function isTagsPage(url) {
    return url === '/tags' || url === '/tags/' || (isDefaultRouteTags() && (url === '/' || url === ''));
  }

  function init() {

    if (isTagsPage(window.location.pathname)) {
      // Only render custom tags page if the module is enabled
      if (!document.documentElement.classList.contains('melon-tags-cloud--active')) {
        document.documentElement.classList.remove('melon-anti-flash');
        return;
      }
      document.documentElement.classList.add('melon-anti-flash');
    }

    tryRenderTags();

    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href) return;
      try {
        var resolved = new URL(href, window.location.origin).pathname;
        if (isTagsPage(resolved) && document.documentElement.classList.contains('melon-tags-cloud--active')) {
          document.documentElement.classList.add('melon-anti-flash');
        }
      } catch(ex) {}
    });

    window.addEventListener('locationchange', function() {
      var pathname = window.location.pathname;
      if (isTagsPage(pathname) && document.documentElement.classList.contains('melon-tags-cloud--active')) {
        cleanup();
        document.documentElement.classList.add('melon-anti-flash');
        // Wait for Flarum SPA to finish rendering before we render
        melonWaitForFlarumRender(function() { tryRenderTags(); });
      } else if (tagsRendered || document.getElementById('melon-tags-page')) {
        // Leaving tags page — cleanup residual content
        cleanup();
      } else {
        // Navigating to non-melon page — ensure anti-flash is removed
        document.documentElement.classList.remove('melon-anti-flash');
      }
    });

    // Handle bfcache restore
    window.addEventListener('pageshow', function(e) {
      if (e.persisted) {
        document.documentElement.classList.remove('melon-anti-flash');
        if (isTagsPage(window.location.pathname) && !document.getElementById('melon-tags-page')) {
          cleanup();
          document.documentElement.classList.add('melon-anti-flash');
          tryRenderTags();
        }
      }
    });
  }

  function cleanup() {
    tagsRendered = false;
    document.documentElement.classList.remove('melon-anti-flash');
    var old = document.getElementById('melon-tags-page');
    if (old) old.remove();
    // Restore hidden elements (remove melon-hidden class AND inline display:none)
    document.querySelectorAll('.melon-hidden').forEach(function(el) {
      el.classList.remove('melon-hidden');
    });
    document.querySelectorAll('[style*="display: none"]').forEach(function(el) {
      el.style.removeProperty('display');
    });
  }

  function tryRenderTags() {
    if (tagsRendered) return;
    if (!document.documentElement.classList.contains('melon-tags-cloud--active')) {
      document.documentElement.classList.remove('melon-anti-flash');
      return;
    }
    if (!isTagsPage(window.location.pathname)) return;

    var container = document.querySelector('.App-content')
      || document.querySelector('.TagsPage')
      || document.querySelector('.container');

    if (container) {
      buildTagsPage(container);
      return;
    }

    var observer = new MutationObserver(function(mutations, obs) {
      var c = document.querySelector('.App-content')
        || document.querySelector('.TagsPage')
        || document.querySelector('.container');
      if (c) { obs.disconnect(); buildTagsPage(c); }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    setTimeout(function() {
      observer.disconnect();
      if (!tagsRendered) {
        var c = document.querySelector('.App-content')
          || document.querySelector('.TagsPage')
          || document.querySelector('.container');
        if (c) buildTagsPage(c);
      }
    }, 2000);
  }

  function getAllStoreTags() {
    var tags = [];
    if (window.app && app.store) {
      try {
        var storeTags = app.store.all('tags');
        if (storeTags && storeTags.length > 0) {
          storeTags.forEach(function(model) {
            var t = model.data;
            if (!t) return;
            if (t.attributes.slug !== 'untagged') tags.push(t);
          });
        }
      } catch(e) {}
    }
    return tags;
  }

  function getPrimaryTags(allTags) {
    return allTags.filter(function(t) {
      return t.attributes.position !== null && !t.attributes.isChild;
    }).sort(function(a, b) {
      return (a.attributes.position || 0) - (b.attributes.position || 0);
    });
  }

  function getSecondaryTags(allTags) {
    return allTags.filter(function(t) {
      return t.attributes.position === null && !t.attributes.isChild;
    });
  }

  function getChildTags(allTags, parentId) {
    return allTags.filter(function(t) {
      if (!t.attributes.isChild) return false;
      var parent = t.relationships && t.relationships.parent && t.relationships.parent.data;
      return parent && parent.id === parentId;
    });
  }

  function buildTagsPage(container) {
    if (tagsRendered || document.getElementById('melon-tags-page')) return;
    tagsRendered = true;

    var allTags = getAllStoreTags();
    if (allTags.length === 0) {
      fetchTagsAndRender(container);
      return;
    }
    fetchDiscussionsAndRender(container, allTags);
  }

  function fetchTagsAndRender(container) {
    fetch('/api/tags')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.data) { tagsRendered = false; return; }
      fetchDiscussionsAndRender(container, data.data);
    })
    .catch(function() { tagsRendered = false; melonRemoveAntiFlash(); });
  }

  function fetchDiscussionsAndRender(container, allTags) {
    fetch('/api/discussions?include=tags,user&sort=-createdAt')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var discussions = (data && data.data) || [];
      var users = {};
      if (data && data.included) {
        data.included.forEach(function(item) {
          if (item.type === 'users') users[item.id] = item.attributes;
        });
      }
      discussions.forEach(function(d) {
        if (d.relationships && d.relationships.user && d.relationships.user.data) {
          var u = users[d.relationships.user.data.id];
          if (u) d._authorName = u.displayName || u.username;
        }
      });
      renderTagsPage(container, allTags, discussions);
    })
    .catch(function() {
      renderTagsPage(container, allTags, []);
    });
  }

  function renderTagsPage(container, allTags, discussions) {
    discussions = discussions || [];
    var primaryColor = '#4ade80';
    try {
      primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--melon-primary').trim() || primaryColor;
    } catch(e) {}

    var primaryTags = getPrimaryTags(allTags);
    var secondaryTags = getSecondaryTags(allTags);

    var html = '';

    // ── Page Header ──
    html += '<div class="melon-tags-header">';
    html += '  <h1 class="melon-tags-title">Tags</h1>';
    html += '  <p class="melon-tags-subtitle">' + melonT('tags_subtitle') + '</p>';
    html += '</div>';

    // ── Primary Tags Grid ──
    if (primaryTags.length > 0) {
      html += '<div class="melon-tags-section">';
      html += '  <h2 class="melon-tags-section-title">Primary Tags</h2>';
      html += '  <div class="melon-tags-grid">';

      primaryTags.forEach(function(tag) {
        var name = tag.attributes.name || '';
        var desc = tag.attributes.description || '';
        var slug = tag.attributes.slug || '';
        var color = tag.attributes.color || primaryColor;
        var count = tag.attributes.discussionCount || 0;
        var tagIcon = tag.attributes.icon || '';
        var childTags = getChildTags(allTags, tag.id);
        var discs = getTagDiscussionsFromApi(tag, allTags, discussions);

        // Icon
        var iconHtml;
        if (tagIcon) {
          iconHtml = '<i class="' + melonEsc(tagIcon) + '"></i>';
        } else {
          var emoji = window.melonEmojiMap[slug.toLowerCase()] || window.melonEmojiMap[name.toLowerCase()] || '🏷️';
          iconHtml = emoji;
        }

        html += '<div class="melon-tag-card">';
        // Card top: icon + name + count
        html += '  <a href="/t/' + slug + '" class="melon-tag-card-top">';
        html += '    <div class="melon-tag-card-icon" style="background:' + color + '22; color:' + color + '">' + iconHtml + '</div>';
        html += '    <div class="melon-tag-card-meta">';
        html += '      <h3 class="melon-tag-card-name" style="color:' + color + '">' + melonEsc(name) + '</h3>';
        html += '      <span class="melon-tag-card-count">' + melonT('topics_count', {count: count}) + '</span>';
        html += '    </div>';
        html += '  </a>';

        // Description
        if (desc) {
          html += '  <p class="melon-tag-card-desc">' + melonEsc(desc) + '</p>';
        }

        // Child tags
        if (childTags.length > 0) {
          html += '  <div class="melon-tag-card-children">';
          childTags.forEach(function(child) {
            var cName = child.attributes.name || '';
            var cSlug = child.attributes.slug || '';
            var cColor = child.attributes.color || color;
            var cIcon = child.attributes.icon || '';
            var cEmoji = window.melonEmojiMap[cSlug.toLowerCase()] || window.melonEmojiMap[cName.toLowerCase()] || '🏷️';
            var cCount = child.attributes.discussionCount || 0;
            if (cIcon) {
              html += '<a href="/t/' + cSlug + '" class="melon-tag-child"><i class="' + melonEsc(cIcon) + '"></i> ' + melonEsc(cName) + ' <span class="melon-tag-child-count">' + cCount + '</span></a>';
            } else {
              html += '<a href="/t/' + cSlug + '" class="melon-tag-child">' + cEmoji + ' ' + melonEsc(cName) + ' <span class="melon-tag-child-count">' + cCount + '</span></a>';
            }
          });
          html += '  </div>';
        }

        // Latest discussions
        if (discs.length > 0 && document.documentElement.classList.contains('melon-tags-cloud-titles--active')) {
          html += '  <div class="melon-tag-card-discs">';
          html += '    <div class="melon-tag-card-discs-label">' + melonT('latest_discussions') + '</div>';
          discs.forEach(function(disc) {
            html += '<a href="/d/' + disc.id + '-' + disc.slug + '" class="melon-tag-disc-item">';
            html += '  <span class="melon-tag-disc-title">' + melonEsc(disc.title) + '</span>';
            html += '  <span class="melon-tag-disc-meta">' + melonEsc(disc.author) + ' · ' + melonFormatTime(disc.createdAt) + '</span>';
            html += '</a>';
          });
          html += '  </div>';
        }

        html += '</div>';
      });

      html += '  </div></div>';
    }

    // ── Secondary Tags ──
    if (secondaryTags.length > 0) {
      html += '<div class="melon-tags-section">';
      html += '  <h2 class="melon-tags-section-title">Secondary Tags</h2>';
      html += '  <div class="melon-tags-secondary-grid">';

      secondaryTags.forEach(function(tag) {
        var name = tag.attributes.name || '';
        var slug = tag.attributes.slug || '';
        var color = tag.attributes.color || primaryColor;
        var count = tag.attributes.discussionCount || 0;
        var tagIcon = tag.attributes.icon || '';

        var iconHtml;
        if (tagIcon) {
          iconHtml = '<i class="' + melonEsc(tagIcon) + '"></i>';
        } else {
          var emoji = window.melonEmojiMap[slug.toLowerCase()] || window.melonEmojiMap[name.toLowerCase()] || '🏷️';
          iconHtml = emoji;
        }

        html += '<a href="/t/' + slug + '" class="melon-secondary-card">';
        html += '  <div class="melon-secondary-card-icon" style="background:' + color + '22; color:' + color + '">' + iconHtml + '</div>';
        html += '  <div class="melon-secondary-card-meta">';
        html += '    <span class="melon-secondary-card-name">' + melonEsc(name) + '</span>';
        html += '    <span class="melon-secondary-card-count">' + count + '</span>';
        html += '  </div>';
        html += '</a>';
      });

      html += '  </div></div>';
    }

    // Create wrapper and insert
    var wrapper = document.createElement('div');
    wrapper.id = 'melon-tags-page';
    wrapper.className = 'melon-tags-page';
    wrapper.innerHTML = html;

    // Insert into container
    container.insertBefore(wrapper, container.firstChild);

    // Hide default content
    hideDefaultTagsPage();

    document.documentElement.classList.remove('melon-anti-flash');
  }

  function getTagDiscussionsFromApi(tag, allTags, discussions) {
    var tagIds = [tag.id];
    var childTags = getChildTags(allTags, tag.id);
    childTags.forEach(function(child) { tagIds.push(child.id); });

    var tagDiscs = discussions.filter(function(d) {
      if (d.attributes && d.attributes.isHidden) return false;
      if (!d.relationships || !d.relationships.tags || !d.relationships.tags.data) return false;
      return d.relationships.tags.data.some(function(t) {
        return tagIds.indexOf(t.id) !== -1;
      });
    });

    tagDiscs.sort(function(a, b) {
      return new Date(b.attributes.createdAt) - new Date(a.attributes.createdAt);
    });

    return tagDiscs.slice(0, 3).map(function(d) {
      return {
        id: d.id,
        title: d.attributes.title,
        slug: d.attributes.slug,
        createdAt: d.attributes.createdAt,
        author: d._authorName || 'Unknown'
      };
    });
  }

  function hideDefaultTagsPage() {
    var container = document.querySelector('.App-content') || document.querySelector('.container');
    if (!container) return;

    Array.from(container.children).forEach(function(child) {
      if (child.id === 'melon-tags-page') return;
      if (child.querySelector && child.querySelector('#melon-tags-page')) {
        Array.from(child.children).forEach(function(gc) {
          if (gc.id !== 'melon-tags-page') gc.classList.add('melon-hidden');
        });
      } else {
        child.classList.add('melon-hidden');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
