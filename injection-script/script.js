/*
sisedu.org Keynote Downloader

MIT License
Copyright (c) 2026 Him C. <himc.29z@gmail.com>
*/

async function getKeynoteInfo() {
    const moduleUrl = window.location.href.replace('/editor', '');
    const r = await fetch(moduleUrl);
    const html = await r.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const name = doc.querySelector('.text-center.text-lg.font-bold').textContent.trim();
    const uuids = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
    const uuid = [...new Set(uuids)].at(-1);
    const parts = window.location.href.match(/\/classroom\/(\d+)\/(\w+)\//);
    const grade = parts[1];
    const subject = parts[2];
    return { name, uuid, grade, subject };
}

async function findPdfUrl(subject, grade, uuid) {
    // try from network entries first
    const entries = performance.getEntriesByType("resource");
    const fromNetwork = entries
        .map(e => e.name)
        .find(url => url.includes(subject) && url.includes(uuid));

    if(fromNetwork)
        return fromNetwork;

    // fall back to constructed URL
    return `https://supabase.sisedu.org/storage/v1/object/public/coursework/${subject}/${grade}/${uuid}.pdf`;
}

(async () => {
    chrome.runtime.sendMessage({ status: "Fetching keynote info..." });

    const { name, uuid, grade, subject } = await getKeynoteInfo();
    const url = await findPdfUrl(subject, grade, uuid);

    chrome.runtime.sendMessage({ status: "Fetching PDF..." });
    console.log("Fetching:", url);

    const res = await fetch(url);
    if(!res.ok) {
        chrome.runtime.sendMessage({ status: `Failed: ${res.status}` });
        console.log("Failed to fetch PDF:", res.status);
    }
    else {
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.pdf`;
        a.click();
        chrome.runtime.sendMessage({ status: "Download complete!" });
        console.log("Download complete:", name);
    }
})();