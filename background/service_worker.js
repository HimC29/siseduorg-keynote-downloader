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

function setStatus(text) {
    chrome.storage.session.set({ status: text });
}

chrome.runtime.onMessage.addListener((message, sender) => {
    // Message from injection script — forward status and persist it
    if (message.status) {
        setStatus(message.status);
        if (message.status === "Download complete!") {
            setTimeout(() => setStatus(""), 2000);
        }
    }
});

chrome.runtime.onMessage.addListener((message, sender) => {
    // Message from popup requesting script injection
    if (message.action === "download") {
        setStatus("Starting download...");
        chrome.scripting.executeScript({
            target: { tabId: message.tabId },
            files: ["injection-script/script.js"]
        }).catch(() => setStatus("Error: could not run script."));
    }
});
