<?php

namespace Yannisme\Melon\Content;

use Flarum\Frontend\Document;
use Flarum\Settings\SettingsRepositoryInterface;
use Psr\Http\Message\ServerRequestInterface as Request;

class InjectModuleClasses
{
    protected $settings;

    public function __construct(SettingsRepositoryInterface $settings)
    {
        $this->settings = $settings;
    }

    public function __invoke(Document $document, Request $request)
    {
        $classList = [];
        $cssRules = [];

        // Brand module
        if ((bool) $this->settings->get('melon.brand_enabled', true)) {
            $classList[] = 'melon-brand--active';

            $primary = $this->settings->get('melon.primary_color', '#4ade80');
            $headerBg = $this->settings->get('melon.header_bg', '#f0fdf4');
            $headerText = $this->settings->get('melon.header_text_color', '#166534');
            $radius = $this->settings->get('melon.border_radius', '12');

            $primaryDark = $this->darkenColor($primary ?: '#4ade80', 15);

            $cssRules[] = sprintf(
                ':root{--melon-primary:%s;--melon-primary-dark:%s;--melon-header-bg:%s;--melon-header-text:%s;--melon-radius:%spx}',
                $primary ?: '#4ade80',
                $primaryDark,
                $headerBg ?: '#f0fdf4',
                $headerText ?: '#166534',
                $radius ?: '12'
            );
        }

        // Dark mode module - override Flarum's own CSS variables
        if ((bool) $this->settings->get('melon.dark_enabled', false)) {
            $classList[] = 'melon-dark--active';

            $darkBg = $this->settings->get('melon.dark_bg', '#0f172a');
            $darkSurface = $this->settings->get('melon.dark_surface', '#1e293b');
            $darkText = $this->settings->get('melon.dark_text', '#e2e8f0');
            $primary = $this->settings->get('melon.primary_color', '#4ade80');

            // Override Flarum core CSS variables for full dark mode coverage
            $cssRules[] = sprintf(
                ':root{--melon-dark-bg:%s;--melon-dark-surface:%s;--melon-dark-text:%s;--melon-card-bg:%s;--body-bg:%s;--body-bg-dark:%s;--control-bg:%s;--control-bg-light:%s;--header-bg:%s;--header-color:%s;--text-color:%s;--heading-color:%s;--text-secondary-color:%s;--control-color:%s;--muted-color:%s;--muted-more-color:%s;--muted-color-dark:%s;--primary-color:%s;--shadow-color:rgba(0,0,0,0.3);--overlay-bg:rgba(0,0,0,0.5);--border-color:rgba(255,255,255,0.1);--form-control-bg:%s;--form-control-color:%s;--discussion-list-item-bg-hover:%s}',
                $darkBg ?: '#0f172a',
                $darkSurface ?: '#1e293b',
                $darkText ?: '#e2e8f0',
                $darkSurface ?: '#1e293b',
                $darkBg ?: '#0f172a',
                $darkBg ?: '#0f172a',
                $darkSurface ?: '#1e293b',
                $darkSurface ?: '#1e293b',
                $darkSurface ?: '#1e293b',
                $darkText ?: '#e2e8f0',
                $darkText ?: '#e2e8f0',
                $darkText ?: '#e2e8f0',
                $darkText ?: '#e2e8f0',
                'rgba(226,232,240,0.7)',
                'rgba(226,232,240,0.5)',
                'rgba(226,232,240,0.3)',
                'rgba(226,232,240,0.2)',
                $primary ?: '#4ade80',
                $darkSurface ?: '#1e293b',
                $darkText ?: '#e2e8f0',
                $darkSurface ?: '#1e293b'
            );
        }

        // Layout module
        if ((bool) $this->settings->get('melon.layout_enabled', false)) {
            $classList[] = 'melon-layout--active';

            $cardStyle = $this->settings->get('melon.card_style', 'rounded');
            $classList[] = 'melon-layout--' . ($cardStyle ?: 'rounded');

            if ((bool) $this->settings->get('melon.compact_mode', false)) {
                $classList[] = 'melon-layout--compact';
            }

            if ((bool) $this->settings->get('melon.hide_sidebar', false)) {
                $classList[] = 'melon-layout--no-sidebar';
            }

            $avatarSize = $this->settings->get('melon.avatar_size', '44');

            $cssRules[] = sprintf(
                ':root{--melon-avatar-size:%spx}',
                $avatarSize ?: '44'
            );
        }

        // CSS parameters
        $cssParams = [
            'css_disc_title_size' => '--melon-disc-title-size',
            'css_disc_title_weight' => '--melon-disc-title-weight',
            'css_disc_meta_size' => '--melon-disc-meta-size',
            'css_disc_meta_gap' => '--melon-disc-meta-gap',
            'css_disc_tag_size' => '--melon-disc-tag-size',
            'css_disc_tag_radius' => '--melon-disc-tag-radius',
            'css_disc_post_gap' => '--melon-disc-post-gap',
            'css_disc_avatar_size' => '--melon-disc-avatar-size',
            'css_disc_page_max_width' => '--melon-disc-page-max-width',
            'css_disc_sidebar_width' => '--melon-disc-sidebar-width',
            'css_disc_floor_num_size' => '--melon-disc-floor-num-size',
            'css_disc_soft_deleted_opacity' => '--melon-disc-soft-deleted-opacity',
        ];
        $paramRules = [];
        foreach ($cssParams as $key => $var) {
            $val = $this->settings->get('melon.' . $key, '');
            if ($val !== '') {
                $unit = in_array($key, ['css_disc_soft_deleted_opacity']) ? '' : 'px';
                $paramRules[] = $var . ':' . $val . $unit;
            }
        }
        if (!empty($paramRules)) {
            $cssRules[] = ':root{' . implode(';', $paramRules) . '}';
        }

        // Page width settings
        $pageWidths = [
            'homepage_width' => '--melon-homepage-width',
            'tags_page_width' => '--melon-tags-page-width',
            'tag_disc_page_width' => '--melon-tag-disc-page-width',
            'disc_page_width' => '--melon-disc-page-width',
        ];
        $widthRules = [];
        foreach ($pageWidths as $key => $var) {
            $val = $this->settings->get('melon.' . $key, '');
            if ($val !== '') {
                $widthRules[] = $var . ':' . intval($val) . 'px';
            }
        }
        if (!empty($widthRules)) {
            $cssRules[] = ':root{' . implode(';', $widthRules) . '}';
        }

        // Inject all CSS variables in a single style tag
        if (!empty($cssRules)) {
            $document->head[] = '<style>' . implode('', $cssRules) . '</style>';
        }

        // Category cards module
        $needsJS = false;

        // Determine if any JS-dependent module is active
        if ((bool) $this->settings->get('melon.category_cards_enabled', false) ||
            (bool) $this->settings->get('melon.tags_cloud_enabled', false) ||
            (bool) $this->settings->get('melon.tag_discussions_enabled', false) ||
            (bool) $this->settings->get('melon.discussion_page_enabled', false)) {
            $needsJS = true;
        }

        // Tags Cloud module
        if ((bool) $this->settings->get('melon.tags_cloud_enabled', false)) {
            $classList[] = 'melon-tags-cloud--active';
            if ((bool) $this->settings->get('melon.tags_cloud_show_titles', true)) {
                $classList[] = 'melon-tags-cloud-titles--active';
            }
        }

        // Tag Discussions module
        if ((bool) $this->settings->get('melon.tag_discussions_enabled', false)) {
            $classList[] = 'melon-tag-disc--active';
            if ((bool) $this->settings->get('melon.tag_discussions_show_excerpt', true)) {
                $classList[] = 'melon-tag-disc-excerpt--active';
            }
            if ((bool) $this->settings->get('melon.tag_discussions_show_likes', true)) {
                $classList[] = 'melon-tag-disc-likes--active';
            }
            if ((bool) $this->settings->get('melon.tag_discussions_show_replies', true)) {
                $classList[] = 'melon-tag-disc-replies--active';
            }
        }

        // Discussion Page module
        if ((bool) $this->settings->get('melon.discussion_page_enabled', false)) {
            $classList[] = 'melon-disc-page--active';
            if ((bool) $this->settings->get('melon.discussion_page_floor_jump', true)) {
                $classList[] = 'melon-disc-floor-jump--active';
            }
            if ((bool) $this->settings->get('melon.discussion_page_participants', true)) {
                $classList[] = 'melon-disc-participants--active';
            }
            if ((bool) $this->settings->get('melon.discussion_page_events', true)) {
                $classList[] = 'melon-disc-events--active';
            }
            if ((bool) $this->settings->get('melon.discussion_page_floor_number', true)) {
                $classList[] = 'melon-disc-floor-num--active';
            }
            if ((bool) $this->settings->get('melon.discussion_page_header_time', true)) {
                $classList[] = 'melon-disc-header-time--active';
            }
        }

        if ($needsJS) {
            if ((bool) $this->settings->get('melon.category_cards_enabled', false)) {
                $classList[] = 'melon-cards--active';
            }

            // Anti-flash: only add on pages where the corresponding melon module is enabled
            $path = $request->getUri()->getPath();
            $isHomepage = ($path === '/' || $path === '' || $path === '/index.php');
            $isTagsPage = ($path === '/tags' || $path === '/tags/');
            $isTagPage = (bool) preg_match('#^/t/[^/]+#', $path);
            $isDiscPage = (bool) preg_match('#^/d/\d+#', $path);
            // If default route is /tags, treat homepage as tags page
            $defaultRoute = $this->settings->get('default_route', '/all');
            if ($defaultRoute === '/tags') {
                $isTagsPage = $isTagsPage || $isHomepage;
            }

            // Homepage: only anti-flash if category_cards_enabled
            if ($isHomepage && (bool) $this->settings->get('melon.category_cards_enabled', false)) {
                $document->head[] = '<script>document.documentElement.classList.add("melon-anti-flash")</script>';
            }
            // Tags page: only anti-flash if tags_cloud_enabled
            if ($isTagsPage && (bool) $this->settings->get('melon.tags_cloud_enabled', false)) {
                $document->head[] = '<script>document.documentElement.classList.add("melon-anti-flash")</script>';
            }
            // Tag page (/t/xxx): only anti-flash if tag_discussions_enabled
            if ($isTagPage && (bool) $this->settings->get('melon.tag_discussions_enabled', false)) {
                $document->head[] = '<script>document.documentElement.classList.add("melon-anti-flash")</script>';
            }
            // Discussion page: only anti-flash if discussion_page_enabled
            if ($isDiscPage && (bool) $this->settings->get('melon.discussion_page_enabled', false)) {
                $document->head[] = '<script>document.documentElement.classList.add("melon-anti-flash")</script>';
            }
        }

        // Inject settings for JS (JS files are loaded via Flarum's Frontend extension)
        if ($needsJS) {
            $melonSettings = [
                'default_route' => $this->settings->get('default_route', '/all'),
                'homepage_disc_count' => $this->settings->get('melon.homepage_disc_count', ''),
                'homepage_disc_per_page' => $this->settings->get('melon.homepage_disc_per_page', ''),
                'homepage_custom_link_url' => $this->settings->get('melon.homepage_custom_link_url', ''),
                'homepage_custom_link_text' => $this->settings->get('melon.homepage_custom_link_text', ''),
                'homepage_show_all_categories' => $this->settings->get('melon.homepage_show_all_categories', ''),
                'homepage_featured_tags' => $this->settings->get('melon.homepage_featured_tags', ''),
            ];
            $document->foot[] = '<script>window.__melon_settings=' . json_encode($melonSettings) . ';</script>';
        }

        // Flarum 2.0: Use extraAttributes['class'] to add HTML classes
        foreach ($classList as $class) {
            $document->extraAttributes['class'][] = $class;
        }
    }

    protected function darkenColor(string $hex, int $percent): string
    {
        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        $r = max(0, (int) hexdec(substr($hex, 0, 2)) * (100 - $percent) / 100);
        $g = max(0, (int) hexdec(substr($hex, 2, 2)) * (100 - $percent) / 100);
        $b = max(0, (int) hexdec(substr($hex, 4, 2)) * (100 - $percent) / 100);

        return '#' . str_pad(dechex($r), 2, '0', STR_PAD_LEFT)
                   . str_pad(dechex($g), 2, '0', STR_PAD_LEFT)
                   . str_pad(dechex($b), 2, '0', STR_PAD_LEFT);
    }
}
