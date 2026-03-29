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
