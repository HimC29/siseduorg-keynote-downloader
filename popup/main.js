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

const status = document.getElementById("status");

// Restore status from storage when popup reopens
browser.storage.session.get("status", ({ status: saved }) => {
    if (saved) status.textContent = saved;
});

// Keep status in sync while popup is open
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes.status) {
        status.textContent = changes.status.newValue;
    }
});

async function main() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("sisedu.org") || !tab.url.includes("/editor")) {
        document.getElementById("greyed").style.display = "flex";
        return;
    }

    document.getElementById("download").addEventListener("click", async () => {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        browser.runtime.sendMessage({ action: "download", tabId: tab.id });
    });
}

main();