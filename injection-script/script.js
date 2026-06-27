(async () => {
    chrome.runtime.sendMessage({ status: "Loading keynote page..." });

    const parts = window.location.href.match(/\/classroom\/(\d+)\/(\w+)\/(\d+)/);
    const grade = parts[1];
    const subject = parts[2];
    const moduleId = parts[3];

    const nameEl = document.querySelector('.text-center.text-lg.font-bold') || document.querySelector('h1');
    const name = nameEl ? nameEl.textContent.trim() : `keynote-${moduleId}`;

    chrome.runtime.sendMessage({ status: "Fetching PDF..." });

    // Fetch the page HTML and extract UUID directly, same as bulk download
    const pageUrl = `${window.location.origin}/student/classroom/${grade}/${subject}/${moduleId}`;
    const r = await fetch(pageUrl);
    const html = await r.text();
    const uuids = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
    const uuid = [...new Set(uuids)].at(-1);

    if (!uuid) {
        chrome.runtime.sendMessage({ status: "Could not find PDF — try the subject page instead." });
        return;
    }

    const pdfUrl = `https://supabase.sisedu.org/storage/v1/object/public/coursework/${subject}/${grade}/${uuid}.pdf`;
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
