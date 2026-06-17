# 📊 BigQuery Release Notes Viewer & Analytics Dashboard

An interactive, premium web application built with **Python Flask** and **plain vanilla HTML, JavaScript, and CSS** that fetches, parses, caches, and visualizes the Google Cloud BigQuery XML release notes feed in real-time.

---

## 🎨 Built with Antigravity & Vibe Coding

This repository and application were created using the **Antigravity CLI** agent as part of the **Kaggle & Google Vibe Coding Course**. 

"Vibe coding" shifts the focus from writing boilerplate lines to high-level architectural design and immediate visual/functional iteration, utilizing Antigravity to build, refine, and deploy full-stack applications through natural language dialogue.

---

## 🚀 Key Features

*   **In-Memory Feed Caching (Backend):** Bypasses Google Cloud rate limits by caching feed requests for 10 minutes. Includes manual cache bypass endpoints and graceful stale-cache fallbacks.
*   **Manual Refresh Button:** Trigger a fresh XML fetch directly from the UI header with a smooth loading spinner animation.
*   **Fuzzy Search:** Perform instantaneous client-side text filtering matching keyword details, dates, or code blocks in the releases.
*   **Type & Stage Filters:** Filter releases instantly using interactive pills:
    *   **Types:** *Feature*, *Change*, *Issue*, *Announcement*, *Breaking*
    *   **Launch Stages:** *GA*, *Preview*, *Beta*, *Deprecated*
*   **Monthly Indexing:** Scroll through a chronologically grouped sidebar navigation listing counts by month and jump directly to relevant periods.
*   **Horizontal Bar Charts:** Visual stats displays rendered entirely in vanilla HTML/CSS detailing distribution ratios for stages and categories.
*   **Interactive Timeline:** A structured vertical timeline showcasing color-coded card widgets. Each card supports:
    *   "Read Full Update" / "Show Less" collapsible body containers.
    *   Inline code highlights and parsed hyperlinks.
    *   Relative release time labels (e.g., *"3 days ago"*).
*   **Light/Dark Theme Switcher:** Fully customizable stylesheets providing persistent visual experiences saved in `localStorage`.

---

## 🛠️ Project Structure

```text
event-talk-app/
│
├── app.py                      # Flask server (feed fetching, XML parsing, API endpoints)
├── requirements.txt            # Python dependencies (Flask & Gunicorn)
├── README.md                   # Project documentation
├── templates/
│   └── index.html              # Main HTML skeleton & layout
└── static/
    ├── css/
    │   └── style.css           # UI design tokens, glassmorphism layers, theme palettes
    └── js/
        └── app.js              # Client state, dynamic rendering, search filters, charts drawer
```

---

## 🖥️ Getting Started (Local Development)

### Prerequisites
Make sure you have **Python 3** installed.

### 1. Install Dependencies
Run the following command in your terminal to install Flask:
```bash
pip install -r requirements.txt
```

### 2. Run the Development Server
Navigate to the repository folder and execute:
```bash
python app.py
```

### 3. Open the Dashboard
Navigate to the local address in your web browser:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🌐 Live Deployment (Render)

The project includes a `requirements.txt` and is configured to run out-of-the-box on Linux production environments using Gunicorn.

To host your Flask app live for free:
1.  Push your code to your GitHub repository:
    ```bash
    git push -u origin main
    ```
2.  Log in to **[Render.com](https://render.com/)** using your GitHub account.
3.  Click **New +** > **Web Service** and connect your repository.
4.  Apply the following values:
    *   **Runtime:** `Python`
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `gunicorn app:app`
    *   **Instance Type:** `Free`
5.  Click **Deploy Web Service** to launch your live public URL!

---
