// sisedu.org Keynote Downloader — download keynotes as PDF
// Copyright (C) <year>  HimC29
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

(async () => {
    chrome.runtime.sendMessage({ status: "Loading keynote page..." });

    // Get keynote name from the page
    const parts = window.location.href.match(/\/classroom\/(\d+)\/(\w+)\/(\d+)/);
    const grade = parts[1];
    const subject = parts[2];
    const moduleId = parts[3];

    // Get the name from the page heading
    const nameEl = document.querySelector('.text-center.text-lg.font-bold') 
        || document.querySelector('h1');
    const name = nameEl ? nameEl.textContent.trim() : `keynote-${moduleId}`;

    // Intercept fetch to catch the PDF url the page loads
    chrome.runtime.sendMessage({ status: "Waiting for PDF to load..." });

    const pdfUrl = await new Promise((resolve) => {
        const origFetch = window.fetch;
        window.fetch = function(...args) {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
            if (url && url.includes('storage') && url.includes('.pdf')) {
                resolve(url);
                window.fetch = origFetch;
            }
            return origFetch.apply(this, args);
        };

        // Timeout after 15s
        setTimeout(() => {
            window.fetch = origFetch;
            resolve(null);
        }, 15000);
    });

    if (!pdfUrl) {
        chrome.runtime.sendMessage({ status: "Could not find PDF — try scrolling the keynote first." });
        return;
    }

    chrome.runtime.sendMessage({ status: "Fetching PDF..." });
    const res = await fetch(pdfUrl);
    if (!res.ok) {
        chrome.runtime.sendMessage({ status: `Failed: ${res.status}` });
    } else {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.pdf`;
        a.click();
        chrome.runtime.sendMessage({ status: "Download complete!" });
    }
})();
