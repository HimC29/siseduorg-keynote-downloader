const status = document.getElementById("status");

// Restore status from storage when popup reopens
chrome.storage.session.get("status", ({ status: saved }) => {
    if (saved) status.textContent = saved;
});

// Keep status in sync while popup is open
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes.status) {
        status.textContent = changes.status.newValue;
    }
});

async function main() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("sisedu.org") || !tab.url.includes("/editor")) {
        document.getElementById("greyed").style.display = "flex";
        return;
    }

    document.getElementById("download").addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.runtime.sendMessage({ action: "download", tabId: tab.id });
    });
}

main();
