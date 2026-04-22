// Shared Melon utilities - used by category-cards.js, tag-discussions.js, tags.js
window._escDiv = document.createElement('div');

// ── Shared: Wait for Flarum SPA (Mithril) to finish rendering ──
// Used by tags.js and tag-discussions.js after SPA navigation
window.melonWaitForFlarumRender = function(callback) {
  var container = document.querySelector('.App-content') || document.querySelector('.container');
  if (!container) {
    // No container yet — wait for it to appear
    var obs = new MutationObserver(function(mutations, o) {
      var c = document.querySelector('.App-content') || document.querySelector('.container');
      if (c) { o.disconnect(); setTimeout(callback, 30); }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function() { obs.disconnect(); callback(); }, 1200);
    return;
  }

  // Record current DOM snapshot
  var oldChildren = Array.from(container.children);
  var oldHash = oldChildren.map(function(c) { return c.outerHTML.substring(0, 200); }).join('|');

  // Check immediately if content already changed (race condition)
  var newHash = Array.from(container.children).map(function(c) { return c.outerHTML.substring(0, 200); }).join('|');
  if (oldHash !== newHash) {
    setTimeout(callback, 30);
    return;
  }

  // Wait for DOM change (Flarum Mithril re-render)
  var observer = new MutationObserver(function(mutations, obs) {
    var currentHash = Array.from(container.children).map(function(c) { return c.outerHTML.substring(0, 200); }).join('|');
    if (currentHash !== oldHash) {
      obs.disconnect();
      setTimeout(callback, 30);
    }
  });
  observer.observe(container, { childList: true, subtree: true });

  // Fallback: if no DOM change detected within 1s, proceed anyway
  setTimeout(function() {
    observer.disconnect();
    callback();
  }, 1000);
};

// ── Shared: Safely remove anti-flash with guaranteed execution ──
window.melonRemoveAntiFlash = function() {
  document.documentElement.classList.remove('melon-anti-flash');
};

window.melonT = function(key, params) {
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
};

window.melonEsc = function(str) {
  if (!str) return '';
  window._escDiv.textContent = str;
  return window._escDiv.innerHTML;
};

window.melonFormatTime = function(dateStr) {
  if (!dateStr) return '';
  var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return window.melonT('time_just_now');
  if (diff < 3600) return window.melonT('time_minutes_ago', {count: Math.floor(diff / 60)});
  if (diff < 86400) return window.melonT('time_hours_ago', {count: Math.floor(diff / 3600)});
  if (diff < 2592000) return window.melonT('time_days_ago', {count: Math.floor(diff / 86400)});
  return new Date(dateStr).toLocaleDateString('zh-CN');
};

window.melonEmojiMap = {
  '讨论': '💬', 'help': '❓', '教程': '📖', '教程': '📖', '公告': '📢', 'bug': '🐛',
  'feature': '✨', 'general': '💬', 'feedback': '💭', 'introduction': '👋',
  'off-topic': '☕', 'support': '🛠️', 'development': '💻', 'news': '📰',
  'resources': '📚', 'showcase': '🎨', 'discussion': '💬', 'question': '❓',
  'tutorial': '📖', 'guide': '🗺️', 'announcement': '📢', 'bug-report': '🐛',
  'feature-request': '✨', 'feedback-suggestion': '💭', 'introduce-yourself': '👋',
  'random': '🎲', 'chit-chat': '☕', 'help-support': '🛠️', 'dev-development': '💻',
  'news-updates': '📰', 'links-resources': '📚', 'showcase-share': '🎨',
};

// Unified isHidden detection for a discussion (checks both discussion model and first post model)
window.melonIsDiscussionHidden = function(discData) {
  // Check raw attributes first
  if (discData.attributes && (discData.attributes.hiddenAt || discData.attributes.hidden_at)) return true;
  // Check Flarum model's isHidden() method
  if (window.app && app.store) {
    var model = app.store.getById('discussions', String(discData.id));
    if (model && typeof model.isHidden === 'function' && model.isHidden()) return true;
    // Check first post's hidden state
    if (discData.relationships && discData.relationships.firstPost && discData.relationships.firstPost.data) {
      var fpModel = app.store.getById('posts', String(discData.relationships.firstPost.data.id));
      if (fpModel) {
        if (typeof fpModel.isHidden === 'function' && fpModel.isHidden()) return true;
        var fpD = fpModel.data || fpModel;
        if (fpD.attributes && (fpD.attributes.hiddenAt || fpD.attributes.hidden_at)) return true;
      }
    }
  }
  return false;
};

// Soft-delete visibility filter for discussions array
window.melonFilterHiddenDiscussions = function(discussions) {
  try {
    var currentUserId = null;
    var isAdmin = false;
    if (window.app && app.session && app.session.user) {
      currentUserId = String(app.session.user.id() || app.session.user.id);
      isAdmin = !!(app.session.user.attribute && app.session.user.attribute('isAdmin'));
    }
    if (currentUserId && !isAdmin) {
      return discussions.filter(function(disc) {
        if (!window.melonIsDiscussionHidden(disc)) return true;
        var authorId = null;
        if (disc.relationships && disc.relationships.user && disc.relationships.user.data) {
          authorId = String(disc.relationships.user.data.id);
        }
        return authorId === currentUserId;
      });
    } else if (!currentUserId) {
      return discussions.filter(function(disc) {
        return !window.melonIsDiscussionHidden(disc);
      });
    }
  } catch(e) {}
  return discussions;
};
