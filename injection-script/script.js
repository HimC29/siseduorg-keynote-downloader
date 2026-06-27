(async () => {
    chrome.runtime.sendMessage({ status: "Loading keynote page..." });

    const parts = window.location.href.match(/\/classroom\/(\d+)\/(\w+)\/(\d+)/);
    const grade = parts[1];
    const subject = parts[2];
    const moduleId = parts[3];

    const nameEl = document.querySelector('.text-center.text-lg.font-bold') || document.querySelector('h1');
    const name = nameEl ? nameEl.textContent.trim() : `keynote-${moduleId}`;

    chrome.runtime.sendMessage({ status: "Fetching PDF..." });

	const pageUrl = `${window.location.origin}/student/classroom/${grade}/${subject}/${moduleId}`;
	const r = await fetch(pageUrl);
	const html = await r.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const scripts = doc.querySelectorAll("script[data-sveltekit-fetched]");
	let filePath = null;
	for (const script of scripts) {
	    try {
	        const json = JSON.parse(script.textContent);
	        const body = JSON.parse(json.body);
	        if (body.modules_pdf?.file_path) {
	            filePath = body.modules_pdf.file_path;
	            break;
	        }
	    } catch {}
	}
	if (!filePath) {
	    chrome.runtime.sendMessage({ status: "Could not find PDF — try the subject page instead." });
	    return;
	}
	const pdfUrl = `https://supabase.sisedu.org/storage/v1/object/public/coursework/${filePath}`;
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
