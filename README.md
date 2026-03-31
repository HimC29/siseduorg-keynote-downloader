<div align="center">

# 📄 sisedu.org Keynote Downloader

### A Chrome Extension to Download Keynotes from sisedu.org as PDF

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)

**A lightweight Chrome extension that lets you download any keynote on sisedu.org as a PDF with a single click — no fiddling with the site required.**

[Features](#-features) • [Installation](#-installation) • [How It Works](#-how-it-works) • [Project Structure](#-project-structure) • [Contributing](#-contributing)

</div>

---

## ✨ Features

<table>
<tr>
<td>

📥 **One-Click Download**  
Download the current keynote as a PDF instantly

🔄 **Persistent Status**  
Download progress is shown even if you close and reopen the popup

🔒 **Minimal Permissions**  
Only requests what it needs — no unnecessary access

</td>
<td>

⚡ **Lightweight**  
No external dependencies, pure vanilla JS

🎨 **Clean UI**  
Simple, modern popup with clear status feedback

🛡️ **Background Worker**  
Uses a service worker so downloads aren't interrupted

</td>
</tr>
</table>

---

## 🤔 Why This Project?

sisedu.org provides **no way to download keynotes** — there's no download button, no export option, nothing. The only way to get the PDF is to dig through the browser's DevTools, find the right network request, and manually copy the URL. This extension eliminates all of that.

- 🚫 **No download button exists** — sisedu.org simply doesn't offer one, leaving you stuck unless you know your way around DevTools
- 📦 **No manual digging** — No need to hunt through network requests or page source for the PDF URL
- ⚡ **One click** — Open the extension, click download, done
- 🔓 **Open source** — See exactly what the extension does and how it works
- 🛠️ **Learning project** — Built to learn Chrome Extension development with Manifest V3

---

## 🚀 Installation

Since this extension isn't on the Chrome Web Store, you'll need to load it manually:

1. **Download or clone this repository**
   ```bash
   git clone https://github.com/HimC29/siseduorg-keynote-downloader.git
   ```

2. **Open Chrome Extensions**  
   Navigate to `chrome://extensions/`

3. **Enable Developer Mode**  
   Toggle **Developer mode** in the top right corner

4. **Load the extension**  
   Click **Load unpacked** and select the cloned folder

5. **Pin it** *(optional)*  
   Click the puzzle icon in Chrome's toolbar and pin the extension for easy access

---

## 📖 Usage

1. Navigate to a keynote editor on sisedu.org  
   *(URL should match `sisedu.org/classroom/.../editor`)*

2. Click the extension icon in your toolbar

3. Click **⬇ Download Keynote**

4. The PDF will be downloaded automatically with the keynote's name as the filename

> ⚠️ **Note:** The extension only works on sisedu.org keynote editor pages. Opening it elsewhere will show an overlay telling you to navigate there first.

---

## 🔧 How It Works

### Flow

```
Popup click
    └─► Background service worker
            └─► Injects script.js into the active tab
                    ├─► Fetches keynote metadata (name, UUID) from the page
                    ├─► Constructs the Supabase PDF storage URL
                    ├─► Fetches the PDF blob
                    └─► Triggers a download & reports status back
```

### PDF URL Structure

```
https://supabase.sisedu.org/storage/v1/object/public/coursework/{subject}/{grade}/{uuid}.pdf
```

The UUID and metadata are extracted from the keynote module page by parsing its HTML.

### Status Persistence

Status messages (e.g. `"Fetching PDF..."`, `"Download complete!"`) are saved to `chrome.storage.session` by the background service worker. When you reopen the popup mid-download, it reads the last known status so you're never left wondering what's happening.

---

## 📁 Project Structure

```
siseduorg-keynote-downloader/
├── manifest.json                  — Extension manifest (MV3)
├── media/
│   └── logo.png                   — Extension icon
├── background/
│   └── service_worker.js          — Handles injection & status persistence
├── popup/
│   ├── index.html                 — Popup UI
│   ├── main.js                    — Popup logic
│   └── styles.css                 — Popup styling
├── injection-script/
│   └── script.js                  — Injected into the page to fetch & download the PDF
├── LICENSE                        — MIT License
└── README.md                      — Project documentation
```

---

## 📝 Changelog

### v1.0.1
- 🔧 Fixed wrong PDF being downloaded on some keynotes
- 🔍 Now checks network requests first before falling back to constructed URL
- ⚠️ Better error status shown in popup on failed downloads

### v1.0.0
- 🎉 Initial release
- One-click PDF download from keynote editor pages
- Status feedback in popup
- Background service worker for persistent status across popup open/close

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or want to improve the extension, feel free to open an issue or PR.

### How to Contribute

1. **Fork the Project**
2. **Create your Feature Branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit your Changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to the Branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request**

### Ideas for Contributions

- 🎨 Better UI / themes
- 📋 Download history log
- 🔔 Desktop notification on download complete
- 📦 Chrome Web Store release

---

## 🐛 Troubleshooting

### The overlay says "Open a keynote editor on sisedu.org first"
- Make sure you're on a page with a URL matching `sisedu.org/.../editor`
- Try refreshing the page and reopening the extension

### Clicking download does nothing
- Open Chrome DevTools on the popup (`chrome://extensions/` → **Inspect views: popup**) and check the console for errors
- Make sure Developer Mode is enabled and the extension is loaded correctly

### Status is stuck on "Fetching PDF..."
- The PDF URL may have changed — open an issue with the keynote URL pattern you're seeing

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

### ⭐ Star this repo if you found it useful!

**Made with ❤️ by [HimC29](https://github.com/HimC29)**

[Report Bug](https://github.com/HimC29/siseduorg-keynote-downloader/issues) • [Request Feature](https://github.com/HimC29/siseduorg-keynote-downloader/issues)

</div>
