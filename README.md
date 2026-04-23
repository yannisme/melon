This is a new attempt built on **Flarum 2.x**. The community is currently using it. In the early stage, due to lack of compatibility with other extensions and potential bugs, your feedback and suggestions are very welcome to help make this theme more complete.

------

## Melon - 🍈

![GitHub](https://img.shields.io/github/license/yannisme/melon?style=flat-square) ![GitHub last commit](https://img.shields.io/github/last-commit/yannisme/melon?style=flat-square) ![GitHub release (latest by date)](https://img.shields.io/github/v/release/yannisme/melon?style=flat-square) ![Packagist Downloads](https://img.shields.io/packagist/dt/yannisme/melon?style=flat-square)

A clean, modular **Flarum 2.0** theme with customizable styles, dark mode, and multiple page layout options.

------

#### Features

##### 🎨 Customization

- Primary color, header background color, and text color
- Background color, surface color, and text color in dark mode
- Border radius control
- Sidebar toggle
- Post card style (rounded / flat / shadow)
- Compact mode for post lists
- Avatar size control inside posts

##### 🧩 Modular Page Layout (each module can be toggled independently)

| Module               | Page       | Description                                                  |
| :------------------- | :--------- | :----------------------------------------------------------- |
| **Home Layout**      | `/`        | Category card grid + recent discussions, featured tags, custom links |
| **Tags Page**        | `/tags`    | Tag cloud + category cards and popular post titles           |
| **Post List Page**   | `/t/{tag}` | Blog-style post list with excerpts, like count, reply count, sorting, and infinite scroll |
| **Post Detail Page** | `/d/{id}`  | Timeline layout, sidebar (floor jump, participants, events), floor numbers, CSS parameter tweaks |

------

#### Installation

composer require yannisme/melon

#### Clear Cache

php flarum cache:clear

#### Uninstall

composer remove yannisme/melon

------

#### License

MIT

------

#### Changelog

##### Fixed

1. Added HTML rendering support for melon-hero-subtitle
2. Fixed alignment issue on homepage tag area
3. Fixed dark mode on admin panel
4. Fixed participants and floor jump issues
5. Fixed comma display issue
6. Fixed cache issue on homepage "Recent Discussions" section
7. Fixed floor number display issue
8. Fixed incorrect title bolding
9. Fixed post deletion issue
10. Fixed flickering issue during loading
11. Fixed blank page issue on some pages

##### Adapted

- Adapted for Chinese language environment
