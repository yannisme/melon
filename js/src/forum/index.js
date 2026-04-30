import '../../melon-utils.js';
import '../../category-cards';
import '../../tags';
import '../../tag-discussions';

// Code block copy button
(function initCopyButtons() {
  function getCodeText(block) {
    var code = block;
    if (block.tagName === 'PRE') {
      code = block.querySelector('code') || block;
    }
    var clone = code.cloneNode(true);
    clone.querySelectorAll('script, .melon-copy-btn').forEach(function(s) { s.remove(); });
    return clone.textContent;
  }

  function scan() {
    try {
      if (app && app.data && app.data.settings && app.data.settings['melon.code_copy_button'] === '0') return;
    } catch(e) {}
    try {
      document.querySelectorAll('pre:not([data-mc]), code[data-highlighted]:not([data-mc])').forEach(function(block) {
        // Skip if already inside a melon-code-container
        if (block.closest('.melon-code-container')) return;

        block.setAttribute('data-mc', '1');

        // For <code> without <pre> wrapper, wrap it first
        if (block.tagName === 'CODE' && (!block.parentElement || block.parentElement.tagName !== 'PRE')) {
          var wrapper = document.createElement('pre');
          wrapper.style.cssText = 'overflow:hidden;background:var(--control-bg,#f1f5f9);border-radius:8px;padding:16px;border:1px solid var(--border-color,#e2e8f0);margin:12px 0;';
          block.parentNode.insertBefore(wrapper, block);
          wrapper.appendChild(block);
        }

        // Create a container that wraps the code block + button
        var container = document.createElement('div');
        container.className = 'melon-code-container';
        block.parentNode.insertBefore(container, block);
        container.appendChild(block);

        var btn = document.createElement('button');
        btn.className = 'melon-copy-btn';
        btn.textContent = '复制';
        btn.type = 'button';
        btn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          var text = getCodeText(block);
          var ok = function() {
            btn.textContent = '已复制';
            btn.classList.add('melon-copy-btn--done');
            setTimeout(function() { btn.textContent = '复制'; btn.classList.remove('melon-copy-btn--done'); }, 2000);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(ok);
          } else {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.cssText = 'position:fixed;left:-9999px;top:0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); } catch(e) {}
            document.body.removeChild(ta);
            ok();
          }
        };
        container.appendChild(btn);
      });
    } catch(e) {}
  }

  var count = 0;
  var timer = setInterval(function() {
    scan();
    count++;
    if (count >= 10) clearInterval(timer);
  }, 500);

  window.addEventListener('popstate', function() { count = 0; timer = setInterval(function() { scan(); count++; if (count >= 10) clearInterval(timer); }, 500); });
})();
