# Taskboard: Task Manager & Productivity Tracker

A browser-based task manager built with HTML, CSS and vanilla JavaScript. No server, no dependencies. Tasks persist in `localStorage`, so they survive page reloads.

## Core features (Task 2 requirements)
- Create, read, update and delete tasks
- Categories (Work, Personal, Study, Health), due dates, overdue highlighting
- Mark tasks complete with a fade/strike-through transition and confetti
- Filter by All / Active / Completed, plus live search
- Data saved with `saveToLocalStorage()` / `loadFromLocalStorage()` style persistence

## Extra features
- Priority levels (Low / Medium / High) and sorting (manual, due date, priority, newest)
- Category filter chips and drag-and-drop reordering
- Progress ring and live stats: active, done, overdue, due today
- 25-minute Pomodoro focus timer with a daily session counter
- Undo for deleted tasks, clear completed, export and import tasks as JSON
- Light and dark theme (remembers your choice, follows system default)
- Keyboard shortcuts: `N` new task, `/` search, `Esc` cancel edit, double-click a title to edit
- Responsive layout, accessible labels, respects reduced-motion settings

## Run locally
Open `index.html` in a browser.

## Tech
HTML5, CSS3 (custom properties, grid, flexbox, transitions), JavaScript ES6+, localStorage API, Blob / FileReader APIs
