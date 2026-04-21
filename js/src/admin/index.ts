import app from 'flarum/admin/app';

app.initializers.add('yannisme/melon', () => {
  try {
  app.registry
    .for('yannisme-melon')

    // Brand Module
    .registerSetting({
      setting: 'melon.brand_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.brand_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.brand_enabled_help'),
      type: 'boolean',
    }, 100)
    .registerSetting({
      setting: 'melon.primary_color',
      label: app.translator.trans('yannisme-melon.admin.settings.primary_color_label'),
      type: 'color-preview',
      placeholder: '#4ade80',
    }, 90)
    .registerSetting({
      setting: 'melon.header_bg',
      label: app.translator.trans('yannisme-melon.admin.settings.header_bg_label'),
      type: 'color-preview',
      placeholder: '#f0fdf4',
    }, 80)
    .registerSetting({
      setting: 'melon.header_text_color',
      label: app.translator.trans('yannisme-melon.admin.settings.header_text_color_label'),
      type: 'color-preview',
      placeholder: '#166534',
    }, 70)
    .registerSetting({
      setting: 'melon.border_radius',
      label: app.translator.trans('yannisme-melon.admin.settings.border_radius_label'),
      type: 'number',
      placeholder: '12',
    }, 60)

    // Dark Mode Module
    .registerSetting({
      setting: 'melon.dark_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.dark_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.dark_enabled_help'),
      type: 'boolean',
    }, 50)
    .registerSetting({
      setting: 'melon.dark_bg',
      label: app.translator.trans('yannisme-melon.admin.settings.dark_bg_label'),
      type: 'color-preview',
      placeholder: '#0f172a',
    }, 40)
    .registerSetting({
      setting: 'melon.dark_surface',
      label: app.translator.trans('yannisme-melon.admin.settings.dark_surface_label'),
      type: 'color-preview',
      placeholder: '#1e293b',
    }, 35)
    .registerSetting({
      setting: 'melon.dark_text',
      label: app.translator.trans('yannisme-melon.admin.settings.dark_text_label'),
      type: 'color-preview',
      placeholder: '#e2e8f0',
    }, 30)

    // Layout Module
    .registerSetting({
      setting: 'melon.layout_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.layout_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.layout_enabled_help'),
      type: 'boolean',
    }, 20)
    // Standalone layout settings (outside collapsible sections, highest priority)
    .registerSetting({
      setting: 'melon.card_style',
      label: app.translator.trans('yannisme-melon.admin.settings.card_style_label'),
      type: 'select',
      options: {
        rounded: app.translator.trans('yannisme-melon.admin.settings.card_style_rounded'),
        flat: app.translator.trans('yannisme-melon.admin.settings.card_style_flat'),
        shadow: app.translator.trans('yannisme-melon.admin.settings.card_style_shadow'),
      },
      default: 'rounded',
    }, 300)
    .registerSetting({
      setting: 'melon.compact_mode',
      label: app.translator.trans('yannisme-melon.admin.settings.compact_mode_label'),
      type: 'boolean',
    }, 290)
    .registerSetting({
      setting: 'melon.hide_sidebar',
      label: app.translator.trans('yannisme-melon.admin.settings.hide_sidebar_label'),
      type: 'boolean',
    }, 280)
    // Page width settings (under Layout module)
    .registerSetting({
      setting: 'melon.homepage_width',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_width_help'),
      type: 'number',
      placeholder: '1200',
    }, 9)
    .registerSetting({
      setting: 'melon.tags_page_width',
      label: app.translator.trans('yannisme-melon.admin.settings.tags_page_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tags_page_width_help'),
      type: 'number',
      placeholder: '1200',
    }, 9)
    .registerSetting({
      setting: 'melon.tag_disc_page_width',
      label: app.translator.trans('yannisme-melon.admin.settings.tag_disc_page_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tag_disc_page_width_help'),
      type: 'number',
      placeholder: '1200',
    }, 9)
    .registerSetting({
      setting: 'melon.disc_page_width',
      label: app.translator.trans('yannisme-melon.admin.settings.disc_page_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.disc_page_width_help'),
      type: 'number',
      placeholder: '1200',
    }, 9)

    // Category Cards Module
    .registerSetting({
      setting: 'melon.category_cards_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.category_cards_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.category_cards_enabled_help'),
      type: 'boolean',
    }, 8)
    .registerSetting({
      setting: 'melon.homepage_show_all_categories',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_show_all_categories_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_show_all_categories_help'),
      type: 'boolean',
    }, 7)
    .registerSetting({
      setting: 'melon.homepage_featured_tags',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_featured_tags_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_featured_tags_help'),
      type: 'text',
      placeholder: '1,2,3,4',
    }, 6)
    .registerSetting({
      setting: 'melon.homepage_disc_count',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_disc_count_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_disc_count_help'),
      type: 'number',
      placeholder: '10',
    }, 5)
    .registerSetting({
      setting: 'melon.homepage_disc_per_page',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_disc_per_page_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_disc_per_page_help'),
      type: 'number',
      placeholder: '10',
    }, 4)
    .registerSetting({
      setting: 'melon.homepage_custom_link_url',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_custom_link_url_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_custom_link_url_help'),
      type: 'text',
      placeholder: '/tags',
    }, 3)
    .registerSetting({
      setting: 'melon.homepage_custom_link_text',
      label: app.translator.trans('yannisme-melon.admin.settings.homepage_custom_link_text_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.homepage_custom_link_text_help'),
      type: 'text',
      placeholder: 'View All',
    }, 2)

    // Tags Cloud Module
    .registerSetting({
      setting: 'melon.tags_cloud_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.tags_cloud_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tags_cloud_enabled_help'),
      type: 'boolean',
    }, 1)
    .registerSetting({
      setting: 'melon.tags_cloud_show_titles',
      label: app.translator.trans('yannisme-melon.admin.settings.tags_cloud_show_titles_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tags_cloud_show_titles_help'),
      type: 'boolean',
    }, 0)

    // Tag Discussions Module
    .registerSetting({
      setting: 'melon.tag_discussions_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_enabled_help'),
      type: 'boolean',
    }, -1)
    .registerSetting({
      setting: 'melon.tag_discussions_show_excerpt',
      label: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_excerpt_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_excerpt_help'),
      type: 'boolean',
    }, -2)
    .registerSetting({
      setting: 'melon.tag_discussions_show_likes',
      label: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_likes_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_likes_help'),
      type: 'boolean',
    }, -3)
    .registerSetting({
      setting: 'melon.tag_discussions_show_replies',
      label: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_replies_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.tag_discussions_show_replies_help'),
      type: 'boolean',
    }, -4)

    // Discussion Page Module
    .registerSetting({
      setting: 'melon.discussion_page_enabled',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_enabled_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_enabled_help'),
      type: 'boolean',
    }, -10)
    .registerSetting({
      setting: 'melon.avatar_size',
      label: app.translator.trans('yannisme-melon.admin.settings.avatar_size_label'),
      type: 'number',
      placeholder: '44',
    }, -11)
    .registerSetting({
      setting: 'melon.discussion_page_floor_jump',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_floor_jump_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_floor_jump_help'),
      type: 'boolean',
      default: true,
    }, -12)
    .registerSetting({
      setting: 'melon.discussion_page_participants',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_participants_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_participants_help'),
      type: 'boolean',
      default: true,
    }, -13)
    .registerSetting({
      setting: 'melon.discussion_page_events',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_events_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_events_help'),
      type: 'boolean',
      default: true,
    }, -14)
    .registerSetting({
      setting: 'melon.discussion_page_floor_number',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_floor_number_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_floor_number_help'),
      type: 'boolean',
      default: true,
    }, -15)
    .registerSetting({
      setting: 'melon.discussion_page_header_time',
      label: app.translator.trans('yannisme-melon.admin.settings.discussion_page_header_time_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.discussion_page_header_time_help'),
      type: 'boolean',
      default: true,
    }, -16)

    // CSS Parameters Module
    .registerSetting({
      setting: 'melon.css_disc_title_size',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_title_size_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_title_size_help'),
      type: 'number',
      placeholder: '15px',
    }, -20)
    .registerSetting({
      setting: 'melon.css_disc_title_weight',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_title_weight_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_title_weight_help'),
      type: 'number',
      placeholder: '600',
    }, -21)
    .registerSetting({
      setting: 'melon.css_disc_meta_size',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_meta_size_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_meta_size_help'),
      type: 'number',
      placeholder: '12px',
    }, -22)
    .registerSetting({
      setting: 'melon.css_disc_meta_gap',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_meta_gap_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_meta_gap_help'),
      type: 'number',
      placeholder: '6px',
    }, -23)
    .registerSetting({
      setting: 'melon.css_disc_tag_size',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_tag_size_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_tag_size_help'),
      type: 'number',
      placeholder: '11px',
    }, -24)
    .registerSetting({
      setting: 'melon.css_disc_tag_radius',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_tag_radius_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_tag_radius_help'),
      type: 'number',
      placeholder: '4px',
    }, -25)
    .registerSetting({
      setting: 'melon.css_disc_post_gap',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_post_gap_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_post_gap_help'),
      type: 'number',
      placeholder: '16px',
    }, -26)
    .registerSetting({
      setting: 'melon.css_disc_avatar_size',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_avatar_size_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_avatar_size_help'),
      type: 'number',
      placeholder: '36px',
    }, -27)
    .registerSetting({
      setting: 'melon.css_disc_page_max_width',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_page_max_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_page_max_width_help'),
      type: 'number',
      placeholder: '960px',
    }, -28)
    .registerSetting({
      setting: 'melon.css_disc_sidebar_width',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_sidebar_width_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_sidebar_width_help'),
      type: 'number',
      placeholder: '280px',
    }, -29)
    .registerSetting({
      setting: 'melon.css_disc_floor_num_size',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_floor_num_size_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_floor_num_size_help'),
      type: 'number',
      placeholder: '12px',
    }, -30)
    .registerSetting({
      setting: 'melon.css_disc_soft_deleted_opacity',
      label: app.translator.trans('yannisme-melon.admin.settings.css_disc_soft_deleted_opacity_label'),
      help: app.translator.trans('yannisme-melon.admin.settings.css_disc_soft_deleted_opacity_help'),
      type: 'number',
      placeholder: '0.45',
    }, -31);

  // Collapsible sections
  const t = (key: string) => app.translator.trans(`yannisme-melon.admin.settings.${key}`);
    const modules = [
      { key: 'brand_enabled', title: t('section_brand_title') },
      { key: 'dark_enabled', title: t('section_dark_title') },
      { key: 'layout_enabled', title: t('section_layout_title') },
      { key: 'category_cards_enabled', title: t('section_homepage_title') },
      { key: 'tags_cloud_enabled', title: t('section_tags_title') },
      { key: 'tag_discussions_enabled', title: t('section_discussion_list_title') },
      { key: 'discussion_page_enabled', title: t('section_discussion_page_title') },
      { key: 'css_disc_title_size', title: t('section_css_title'), desc: t('section_css_desc') },
    ];

  function applyCollapsible() {
    // Find all setting rows by their label text content
    const allLabels = document.querySelectorAll('label');
    if (allLabels.length === 0) return;

    // Map label text to setting key
    const labelToKey: Record<string, string> = {
      'Enable Brand Customization': 'brand_enabled',
      'Primary Color': 'primary_color',
      'Header Background': 'header_bg',
      'Header Text Color': 'header_text_color',
      'Border Radius (px)': 'border_radius',
      'Enable Dark Mode': 'dark_enabled',
      'Dark Background': 'dark_bg',
      'Dark Surface': 'dark_surface',
      'Dark Text Color': 'dark_text',
      'Enable Layout Optimization': 'layout_enabled',
      'Card Style': 'card_style',
      'Compact Mode': 'compact_mode',
      'Hide Sidebar': 'hide_sidebar',
      'Avatar Size (px)': 'avatar_size',
      'Discussion Count': 'homepage_disc_count',
      'Discussions Per Page': 'homepage_disc_per_page',
      'Show All Categories': 'homepage_show_all_categories',
      'Featured Tag IDs': 'homepage_featured_tags',
      'Custom Link URL': 'homepage_custom_link_url',
      'Custom Link Text': 'homepage_custom_link_text',
      'Homepage Width (px)': 'homepage_width',
      'Tags Page Width (px)': 'tags_page_width',
      'Discussion List Width (px)': 'tag_disc_page_width',
      'Discussion Page Width (px)': 'disc_page_width',
      'Enable Homepage Layout': 'category_cards_enabled',
      'Enable Tags Page': 'tags_cloud_enabled',
      'Show Category Titles': 'tags_cloud_show_titles',
      'Enable Discussion List Page': 'tag_discussions_enabled',
      'Show Excerpt': 'tag_discussions_show_excerpt',
      'Show Likes': 'tag_discussions_show_likes',
      'Show Replies': 'tag_discussions_show_replies',
      'Enable Discussion Content Page': 'discussion_page_enabled',
      'Floor Jump': 'discussion_page_floor_jump',
      'Participants': 'discussion_page_participants',
      'Events Sidebar': 'discussion_page_events',
      'Floor Number': 'discussion_page_floor_number',
      'Header Time': 'discussion_page_header_time',
      'Title Font Size': 'css_disc_title_size',
      'Title Font Weight': 'css_disc_title_weight',
      'Meta Font Size': 'css_disc_meta_size',
      'Meta Gap': 'css_disc_meta_gap',
      'Tag Font Size': 'css_disc_tag_size',
      'Tag Border Radius': 'css_disc_tag_radius',
      'Post Gap': 'css_disc_post_gap',
      'Avatar Size': 'css_disc_avatar_size',
      'Page Max Width': 'css_disc_page_max_width',
      'Sidebar Width': 'css_disc_sidebar_width',
      'Floor Number Font Size': 'css_disc_floor_num_size',
      'Soft Deleted Opacity': 'css_disc_soft_deleted_opacity',
    };

    const seen = new Set();
    const groupMap: Array<{ el: Element; name: string; input: Element }> = [];
    allLabels.forEach((label: Element) => {
      const text = (label.textContent || '').trim();
      let key = labelToKey[text] || '';
      // Also match by translation key pattern for untranslated labels
      if (!key && text.indexOf('yannisme-melon.admin.settings.') !== -1) {
        const m = text.match(/\.(\w+)$/);
        if (m) key = m[1];
      }
      if (!key) return;

      // Find the input inside or next to this label
      const wrapper = label.closest('.Form-group') || label.parentElement?.parentElement || label.parentElement;
      if (!wrapper || seen.has(wrapper)) return;
      seen.add(wrapper);
      const input = wrapper.querySelector('input, select') || label.querySelector('input, select');
      if (!input) return;
      groupMap.push({ el: wrapper, name: key, input });
    });
    if (groupMap.length === 0) return;

    return applyCollapsibleWithGroups(groupMap);
  }

  function applyCollapsibleWithGroups(groupMap: Array<{ el: Element; name: string; input: Element }>) {

    modules.forEach((mod) => {
      const searchKey = mod.key.replace(/\./g, '_');
      let modIdx = -1;
      for (let i = 0; i < groupMap.length; i++) {
        const n = groupMap[i].name;
        if (n === searchKey || n.indexOf(searchKey) !== -1 || n.indexOf(mod.key) !== -1) {
          modIdx = i;
          break;
        }
      }
      if (modIdx === -1) return;

      // Find end
      let endIdx = groupMap.length;
      for (let m = 0; m < modules.length; m++) {
        const mKey = modules[m].key.replace(/\./g, '_');
        if (mKey === searchKey) continue;
        for (let n = modIdx + 1; n < groupMap.length; n++) {
          const nn = groupMap[n].name;
          if (nn === mKey || nn.indexOf(mKey) !== -1 || nn.indexOf(modules[m].key) !== -1) {
            endIdx = n;
            break;
          }
        }
        if (endIdx < groupMap.length) break;
      }

      // Already wrapped?
      if (groupMap[modIdx].el.parentElement?.classList.contains('melon-collapsible-body')) return;

      const isToggle = mod.key.indexOf('_enabled') !== -1;
      const isOpen = isToggle ? (groupMap[modIdx].input as HTMLInputElement).checked : !!(mod as any).openByDefault;

      // Description: prefer module desc, fallback to help text from toggle row
      let helpText = (mod as any).desc || '';
      if (!helpText && isToggle) {
        const helpEl = groupMap[modIdx].el.querySelector('.helpText, .Form-help, [class*="help"]');
        if (helpEl) helpText = helpEl.textContent?.trim() || '';
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'melon-collapsible-wrapper';

      // === Header row: title ····· toggle ===
      const header = document.createElement('div');
      header.className = 'melon-collapsible-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'melon-collapsible-title';
      titleSpan.textContent = mod.title;
      header.appendChild(titleSpan);

      // Dotted separator (flex-grow spacer)
      const dots = document.createElement('span');
      dots.className = 'melon-collapsible-dots';
      dots.setAttribute('aria-hidden', 'true');
      header.appendChild(dots);

      // Right side: toggle switch + arrow
      const rightDiv = document.createElement('div');
      rightDiv.className = 'melon-collapsible-right';

      if (isToggle) {
        const toggleInput = groupMap[modIdx].input as HTMLInputElement;
        const checked = toggleInput.checked ? ' checked' : '';
        rightDiv.innerHTML = '<label class="melon-collapsible-toggle"><input type="checkbox"' + checked + ' /><span class="melon-collapsible-toggle-track"><span class="melon-collapsible-toggle-thumb"></span></span></label><span class="melon-collapsible-arrow">&#9660;</span>';
      } else {
        rightDiv.innerHTML = '<span class="melon-collapsible-arrow">&#9660;</span>';
      }
      header.appendChild(rightDiv);

      // === Description row (help text) ===
      let descRow: HTMLDivElement | null = null;
      if (helpText) {
        descRow = document.createElement('div');
        descRow.className = 'melon-collapsible-desc';
        descRow.textContent = helpText;
      }

      // === Separator ===
      const separator = document.createElement('div');
      separator.className = 'melon-collapsible-sep';

      // === Body ===
      const body = document.createElement('div');
      body.className = 'melon-collapsible-body' + (isOpen ? ' melon-collapsible-open' : '');

      const parent = groupMap[modIdx].el.parentElement!;
      parent.insertBefore(wrapper, groupMap[modIdx].el);
      wrapper.appendChild(header);
      if (descRow) wrapper.appendChild(descRow);
      wrapper.appendChild(separator);
      wrapper.appendChild(body);

      for (let j = modIdx; j < endIdx; j++) {
        body.appendChild(groupMap[j].el);
      }

      // Hide the original toggle input row inside the body (we have one in the header now)
      if (isToggle) {
        const origRow = groupMap[modIdx].el;
        origRow.classList.add('melon-collapsible-hidden-toggle');
      }

      // Click on header (but not on toggle) toggles collapse
      header.addEventListener('click', (e: Event) => {
        if ((e.target as Element).closest('.melon-collapsible-toggle')) return;
        const open = body.classList.toggle('melon-collapsible-open');
        header.classList.toggle('melon-collapsible-open', open);
      });

      // Click on toggle switch
      if (isToggle) {
        const toggleLabel = header.querySelector('.melon-collapsible-toggle') as HTMLLabelElement;
        const toggleInput = toggleLabel?.querySelector('input') as HTMLInputElement;
        if (toggleLabel && toggleInput) {
          toggleLabel.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            const realInput = groupMap[modIdx].input as HTMLInputElement;
            realInput.checked = toggleInput.checked;
            realInput.dispatchEvent(new Event('change', { bubbles: true }));
            if (toggleInput.checked) {
              body.classList.add('melon-collapsible-open');
              header.classList.add('melon-collapsible-open');
            }
          });
          const realInput = groupMap[modIdx].input as HTMLInputElement;
          realInput.addEventListener('change', () => {
            toggleInput.checked = realInput.checked;
            if (realInput.checked) {
              body.classList.add('melon-collapsible-open');
              header.classList.add('melon-collapsible-open');
            }
          });
        }
      }
    });
  }

  // Inject collapsible CSS (light + dark mode)
  const style = document.createElement('style');
  style.textContent = [
    // Wrapper
    '.melon-collapsible-wrapper{margin-bottom:16px;border:1px solid var(--control-bg,#e2e8f0);border-radius:10px;overflow:hidden;background:var(--melon-admin-bg,#fff)}',

    // Header row: title ····· toggle
    '.melon-collapsible-header{display:flex;align-items:center;padding:12px 16px;cursor:pointer;user-select:none;transition:background .15s ease}',
    '.melon-collapsible-header:hover{background:var(--melon-admin-hover,#f8fafc)}',

    // Title
    '.melon-collapsible-title{font-size:14px;font-weight:600;color:var(--melon-admin-text,#1e293b);white-space:nowrap;flex-shrink:0}',

    // Dotted separator (flex-grow)
    '.melon-collapsible-dots{flex:1;min-width:20px;margin:0 10px;border-bottom:2px dotted var(--melon-admin-border,#cbd5e1);align-self:center;height:0}',

    // Right side container
    '.melon-collapsible-right{display:flex;align-items:center;gap:10px;flex-shrink:0}',

    // Arrow
    '.melon-collapsible-arrow{font-size:11px;color:var(--melon-admin-muted,#94a3b8);transition:transform .3s cubic-bezier(.4,0,.2,1);flex-shrink:0}',
    '.melon-collapsible-header.melon-collapsible-open .melon-collapsible-arrow{transform:rotate(180deg)}',

    // Description row
    '.melon-collapsible-desc{padding:0 16px 8px;font-size:12px;color:var(--melon-admin-muted,#64748b);line-height:1.5}',

    // Separator line
    '.melon-collapsible-sep{height:1px;background:var(--melon-admin-border,#e2e8f0);margin:0 16px}',

    // Body
    '.melon-collapsible-body{max-height:0;overflow:hidden;transition:max-height .35s cubic-bezier(.4,0,.2,1);padding:0 16px}',
    '.melon-collapsible-body.melon-collapsible-open{max-height:2000px;transition:max-height .5s cubic-bezier(.4,0,.2,1);padding:12px 16px}',

    // Body inner form items - vertical layout: label, help, input stacked
    '.melon-collapsible-body>.Form-group{display:flex;flex-direction:column;padding:12px 0;border-bottom:1px solid var(--melon-admin-sep,#f1f5f9);gap:4px}',
    '.melon-collapsible-body>.Form-group:last-child{border-bottom:none;padding-bottom:0}',
    '.melon-collapsible-body>.Form-group:first-child{padding-top:0}',
    '.melon-collapsible-body>.Form-group>label{font-size:13px;font-weight:600;color:var(--melon-admin-text,#1e293b);text-align:left}',
    '.melon-collapsible-body>.Form-group .helpText{font-size:11px;color:var(--melon-admin-muted,#94a3b8);padding-left:0;text-align:left;margin:0}',

    // Checkbox/switch items in body - label and switch on same row, helpText below
    '.melon-collapsible-body>.Form-group .Checkbox{margin:0}',
    '.melon-collapsible-body>.Form-group:has(.Checkbox){flex-direction:row;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px}',
    '.melon-collapsible-body>.Form-group:has(.Checkbox)>label{flex:1;min-width:0}',
    '.melon-collapsible-body>.Form-group:has(.Checkbox) .Checkbox{flex-shrink:0}',
    '.melon-collapsible-body>.Form-group:has(.Checkbox) .helpText{flex-basis:100%;order:3}',

    // ColorInput: keep text input and color preview on same row
    '.melon-collapsible-body>.Form-group:has(input[type="color"]) .Form-group{flex-direction:row;align-items:center;gap:8px}',
    '.melon-collapsible-body>.Form-group:has(input[type="color"]) .ColorInput-preview{flex-shrink:0}',
    '.melon-collapsible-body>.Form-group:has(input[type="color"]) input[type="text"]{flex:1;max-width:180px;padding:6px 10px;border:1px solid var(--control-bg,#e2e8f0);border-radius:6px;font-size:13px;box-sizing:border-box;background:var(--melon-admin-input-bg,#fff);color:var(--melon-admin-text,#334155)}',
    '.melon-collapsible-body>.Form-group:has(input[type="color"]) input[type="color"]{width:36px;height:30px;padding:2px;border:1px solid var(--control-bg,#e2e8f0);border-radius:6px;cursor:pointer;flex-shrink:0}',

    // Select dropdown in body
    '.melon-collapsible-body>.Form-group select{width:100%;min-width:200px;padding:6px 10px;border:1px solid var(--control-bg,#e2e8f0);border-radius:6px;font-size:13px;background:var(--melon-admin-input-bg,#fff);color:var(--melon-admin-text,#334155);cursor:pointer;box-sizing:border-box}',

    // Number input in body
    '.melon-collapsible-body>.Form-group input[type="number"]{width:100%;max-width:240px;padding:6px 10px;border:1px solid var(--control-bg,#e2e8f0);border-radius:6px;font-size:13px;box-sizing:border-box;background:var(--melon-admin-input-bg,#fff);color:var(--melon-admin-text,#334155)}',

    // Hide original toggle row inside body
    '.melon-collapsible-hidden-toggle{display:none !important}',

    // Toggle switch
    '.melon-collapsible-toggle{position:relative;display:inline-block;width:36px;height:20px;flex-shrink:0;cursor:pointer}',
    '.melon-collapsible-toggle input{opacity:0;width:0;height:0;position:absolute}',
    '.melon-collapsible-toggle-track{position:absolute;inset:0;background:var(--melon-admin-track,#cbd5e1);border-radius:20px;transition:background .25s ease}',
    '.melon-collapsible-toggle input:checked+.melon-collapsible-toggle-track{background:#4ade80}',
    '.melon-collapsible-toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .25s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 3px rgba(0,0,0,.15)}',
    '.melon-collapsible-toggle input:checked+.melon-collapsible-toggle-track .melon-collapsible-toggle-thumb{transform:translateX(16px)}',

    // Dark mode overrides
    'html.dark .melon-collapsible-wrapper{background:#1e293b;border-color:#334155}',
    'html.dark .melon-collapsible-header:hover{background:#334155}',
    'html.dark .melon-collapsible-title{color:#e2e8f0}',
    'html.dark .melon-collapsible-dots{border-color:#475569}',
    'html.dark .melon-collapsible-arrow{color:#64748b}',
    'html.dark .melon-collapsible-desc{color:#94a3b8}',
    'html.dark .melon-collapsible-sep{background:#334155}',
    'html.dark .melon-collapsible-body>.Form-group{border-color:#334155}',
    'html.dark .melon-collapsible-body>.Form-group>label{color:#e2e8f0}',
    'html.dark .melon-collapsible-body>.Form-group .helpText{color:#64748b}',
    'html.dark .melon-collapsible-body>.Form-group:has(input[type="color"]) input[type="text"]{background:#0f172a;border-color:#475569;color:#e2e8f0}',
    'html.dark .melon-collapsible-body>.Form-group:has(input[type="color"]) input[type="color"]{border-color:#475569}',
    'html.dark .melon-collapsible-body>.Form-group select{background:#0f172a;border-color:#475569;color:#e2e8f0}',
    'html.dark .melon-collapsible-body>.Form-group input[type="number"]{background:#0f172a;border-color:#475569;color:#e2e8f0}',
    'html.dark .melon-collapsible-toggle-track{background:#475569}',
  ].join('');
  document.head.appendChild(style);

  // Run after Mithril renders
  setTimeout(applyCollapsible, 500);
  setTimeout(applyCollapsible, 1500);

  // Watch for SPA navigation: re-apply when Mithril re-renders the settings page
  const container = document.querySelector('.AdminContent, .container, #app, main') || document.body;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Only re-apply if there are labels but no collapsible wrappers (page was re-rendered)
      const labels = document.querySelectorAll('label');
      const wrappers = document.querySelectorAll('.melon-collapsible-wrapper');
      if (labels.length > 0 && wrappers.length === 0) {
        applyCollapsible();
      }
    }, 300);
  });
  observer.observe(container, { childList: true, subtree: true });
  } catch (e) {
    console.error('[yannisme/melon] Initialization error:', e);
  }
});
