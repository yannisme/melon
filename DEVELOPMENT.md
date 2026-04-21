# Melon Theme - Development Memory Node

**Date**: 2026-04-21
**Version**: Pre-release (development stage)

---

## Project Overview

Melon is a modular Flarum 2.0 theme (`yannisme/melon`) with 4 independently toggleable page layout modules. It uses a hybrid PHP + JS architecture where PHP handles server-side class injection and CSS variables, while JS handles client-side DOM rendering via `app.initializers.add()`.

## Key Architecture Decisions

### JS Module System
- Forum JS files are **NOT** plain IIFE scripts. They use `app.initializers.add('yannisme-melon-xxx', function(app) { ... })` format.
- Must be bundled via `flarum-webpack-config` (not raw `->js()` registration or inline injection).
- Webpack entry: `js/src/forum/index.js` imports all 3 JS modules.
- Output: `js/dist/forum.js` registered in `extend.php` via `->js(__DIR__.'/js/dist/forum.js')`.
- **Do NOT use `->jsDirectory()` unless you have actual async chunk output directories.**

### Anti-flash System
- **PHP side** (`InjectModuleClasses.php`): Adds `melon-anti-flash` class via inline `<script>` in `<head>`, but **only** when the corresponding module is enabled:
  - Homepage → only if `category_cards_enabled`
  - Tags page → only if `tags_cloud_enabled`
  - Tag page (`/t/xxx`) → only if `tag_discussions_enabled`
  - Discussion page (`/d/xxx`) → only if `discussion_page_enabled`
- **CSS side**: `forum.css` has `html.melon-anti-flash .App-content { visibility: hidden !important; }`. `discussion-page.css` has `html.melon-disc-page--active .DiscussionPage .Hero/Page-container { opacity: 0; }` (must match specificity with restore rule).
- **JS side**: Each module removes `melon-anti-flash` after rendering. Safety nets at 300ms and 2s force-remove it.

### SPA Navigation
- All 3 JS modules monkey-patch `history.pushState/replaceState` and dispatch `locationchange` events.
- Each module checks its own class (`melon-cards--active`, etc.) before adding anti-flash on SPA navigation.
- `category-cards.js` handles homepage SPA navigation with retry (20ms, 100ms, 300ms).
- `initDiscussionPage()` tracks `_discLastPath` to detect navigation between different discussions.

### CSS Specificity Pitfall
- When adding conditional prefixes to CSS selectors, **always match specificity** between hide and restore rules. Example: if hide uses `html.melon-disc-page--active .DiscussionPage .Hero` (0,3,1), restore must use at least `html.melon-disc-page--active .melon-disc-active .Hero` (0,4,1).

## Module Breakdown

| JS File | Initializer Name | Manages |
|---------|-----------------|---------|
| `category-cards.js` | `yannisme-melon-category-cards` | Homepage layout + Discussion content page |
| `tags.js` | `yannisme-melon-tags` | Tags cloud page |
| `tag-discussions.js` | `yannisme-melon-tag-discussions` | Discussion list page (`/t/{tag}`) |

## Settings (admin panel)

All settings are prefixed with `melon.` and registered in `extend.php` via `->serializeToForum()` and `->default()`.

Key setting groups:
- **Brand**: `brand_enabled`, `primary_color`, `header_bg`, `header_text_color`, `border_radius`
- **Dark**: `dark_enabled`, `dark_bg`, `dark_surface`, `dark_text`
- **Layout**: `layout_enabled`, `card_style`, `compact_mode`, `hide_sidebar`, `avatar_size`
- **Homepage**: `category_cards_enabled`, `homepage_disc_count`, `homepage_disc_per_page`, `homepage_show_all_categories`, `homepage_featured_tags`, `homepage_custom_link_url`, `homepage_custom_link_text`
- **Tags**: `tags_cloud_enabled`, `tags_cloud_show_titles`
- **Discussion List**: `tag_discussions_enabled`, `tag_discussions_show_excerpt`, `tag_discussions_show_likes`, `tag_discussions_show_replies`
- **Discussion Content**: `discussion_page_enabled`, `discussion_page_floor_jump`, `discussion_page_participants`, `discussion_page_events`, `discussion_page_floor_number`, `discussion_page_header_time`
- **CSS Params**: `css_disc_title_size`, `css_disc_title_weight`, `css_disc_meta_size`, `css_disc_meta_gap`, `css_disc_tag_size`, `css_disc_tag_radius`, `css_disc_post_gap`, `css_disc_avatar_size`, `css_disc_page_max_width`, `css_disc_sidebar_width`, `css_disc_floor_num_size`, `css_disc_soft_deleted_opacity`

## Known Issues & Resolutions

1. **Blank page when only some modules enabled** → Fixed: anti-flash is now strictly conditional per-module
2. **SPA navigation blank** → Fixed: `_discRendered` reset on navigation, retry mechanism
3. **CSS specificity mismatch** → Fixed: matched specificity between hide/restore rules
4. **JS source exposed in HTML** → Fixed: moved to `flarum-webpack-config` bundling
5. **`jsDirectory` permission error** → Fixed: removed `->jsDirectory()` (not needed without async chunks)

## Deployment Checklist

1. Run `npm run build` in `js/` directory
2. Upload entire `melon/` directory to `vendor/yannisme/melon/`
3. Run `php flarum cache:clear`
