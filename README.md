# Melon

A fresh, modular Flarum 2.0 theme with brand customization, dark mode, and multiple page layout options.

## Features

### Brand Customization
- Primary color, header background & text color
- Border radius control
- Card styles (rounded / flat / shadow)

### Dark Mode
- Customizable dark background, surface, and text colors

### Layout Optimization
- Compact mode
- Sidebar toggle
- Avatar size control

### Modular Page Layouts (each can be enabled independently)

| Module | Page | Description |
|--------|------|-------------|
| **Homepage Layout** | `/` | Category card grid with recent discussions, featured tags, and custom links |
| **Tags Page** | `/tags` | Tag cloud with category cards and popular discussion titles |
| **Discussion List Page** | `/t/{tag}` | Blog-style discussion list with excerpt, likes, replies, sort options, and infinite scroll |
| **Discussion Content Page** | `/d/{id}` | Timeline layout with sidebar (floor jump, participants, events), floor numbers, and CSS parameter tuning |

## Installation

```bash
composer require yannisme/melon
```

Then enable the extension in the Flarum admin panel.

## License

MIT
