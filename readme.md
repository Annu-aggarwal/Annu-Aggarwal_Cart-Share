# CartShare 🛒

A collaborative, real-time shopping cart app — built as the CartShare internship studio project.

## Features

| Feature | How it works |
|---|---|
| **Room system** | Create or join rooms via a 6-character code |
| **Shared cart** | Add / remove items; all tabs in the same room see changes instantly |
| **Activity log** | Real-time log of who added or removed what |
| **Free-shipping tracker** | Progress bar toward ₹750 threshold |
| **Member list** | See who's in the room |
| **Printable receipt** | Clean per-person cost breakdown |
| **Fully responsive** | Works on mobile and desktop |

## Tech Stack

- **HTML5** — semantic structure
- **CSS3** — Flexbox + Grid + CSS custom properties + `@media print`
- **Vanilla JavaScript** — no framework; ES2020
- **Bootstrap 5** — responsive grid and UI components
- **Font Awesome 6** — icons
- **localStorage + StorageEvent** — data persistence and cross-tab sync

## Folder Structure

```
cartshare/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── assets/           (for any images you add later)
└── README.md
```

## How to Run Locally

1. Clone or download this repository.
2. Open `index.html` in your browser — **no build step needed**.
3. To test collaboration, open `index.html` in **two browser tabs**:
   - Tab 1: Enter your name → **Create Room** → copy the 6-letter code.
   - Tab 2: Enter a different name → paste the code → **Join**.
   - Add items in either tab and watch the other update in real-time.

## How to Deploy

### GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to **Settings → Pages → Source → main branch / root**.
3. Your app will be live at `https://<username>.github.io/<repo>/`.

### Netlify / Vercel
1. Drag-and-drop the `cartshare/` folder onto [netlify.com/drop](https://app.netlify.com/drop) **or** import the GitHub repo into Vercel.
2. No build command or output directory settings required.

## Submission Format

`BatchID_FullName_CartShare`

---

> Built with ❤️ for the Internship Studio project brief.