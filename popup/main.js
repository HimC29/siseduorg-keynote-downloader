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

// Match /student/classroom/11/english/6110 or /editor
const keynotePagePattern = /\/classroom\/\d+\/\w+\/\d+/;
// Match /student/classroom/11/english but NOT /student/classroom/11/english/6110
const subjectPagePattern = /\/classroom\/\d+\/(\w+)$/;

async function loadSubjectView(tab) {
    document.getElementById("single-view").style.display = "none";
    document.getElementById("bulk-view").style.display = "block";

    const bulkStatus = document.getElementById("bulk-status");
    const keynoteList = document.getElementById("keynote-list");
    bulkStatus.textContent = "Loading keynotes...";

    // Inject a script to parse the page's data-sveltekit-fetched tag
    const [{ result }] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const scripts = document.querySelectorAll("script[data-sveltekit-fetched]");
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent);
                    const body = JSON.parse(json.body);
                    if (body.modules_teacher_classes_bridge) {
                        return body.modules_teacher_classes_bridge
                            .filter(b => b.modules_main.type === "Ebook")
                            .map(b => ({
                                id: b.modules_main.id,
                                name: b.modules_main.name,
                            }));
                    }
                } catch {}
            }
            return null;
        }
    });

    if (!result || result.length === 0) {
        bulkStatus.textContent = "No keynotes found on this page.";
        return;
    }

    bulkStatus.textContent = "";

    // Build checklist
    keynoteList.innerHTML = "";
    for (const keynote of result) {
        const label = document.createElement("label");
        label.className = "keynote-item";
        label.innerHTML = `<input type="checkbox" value="${keynote.id}" data-name="${keynote.name}"> ${keynote.name}`;
        keynoteList.appendChild(label);
    }

    // Select All
    const selectAll = document.getElementById("select-all");
    selectAll.addEventListener("change", () => {
        keynoteList.querySelectorAll("input[type=checkbox]").forEach(cb => {
            cb.checked = selectAll.checked;
        });
        updateBulkButton();
    });

    keynoteList.addEventListener("change", updateBulkButton);

    function updateBulkButton() {
        const anyChecked = [...keynoteList.querySelectorAll("input[type=checkbox]")].some(cb => cb.checked);
        document.getElementById("bulk-download").disabled = !anyChecked;
    }

    // Bulk download
    document.getElementById("bulk-download").addEventListener("click", async () => {
        const checked = [...keynoteList.querySelectorAll("input[type=checkbox]:checked")];
        const urlMatch = tab.url.match(/\/classroom\/(\d+)\/(\w+)/);
        const grade = urlMatch[1];
        const subject = urlMatch[2];

        document.getElementById("bulk-download").disabled = true;
        selectAll.disabled = true;
        keynoteList.querySelectorAll("input").forEach(cb => cb.disabled = true);

        for (let i = 0; i < checked.length; i++) {
            const cb = checked[i];
            const id = cb.value;
            const name = cb.dataset.name;
            bulkStatus.textContent = `Downloading ${i + 1}/${checked.length}: ${name}`;

            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: async (subject, grade, id, name) => {
                    // Fetch the keynote viewer page to get the UUID
                    const pageUrl = `${window.location.origin}/student/classroom/${grade}/${subject}/${id}`;
                    const r = await fetch(pageUrl);
                    const html = await r.text();

                    const uuids = html.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g);
                    const uuid = [...new Set(uuids)].at(-1);

                    const pdfUrl = `https://supabase.sisedu.org/storage/v1/object/public/coursework/${subject}/${grade}/${uuid}.pdf`;
                    const res = await fetch(pdfUrl);
                    if (!res.ok) throw new Error(`Failed: ${res.status}`);

                    const blob = await res.blob();
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${name}.pdf`;
                    a.click();
                },
                args: [subject, grade, id, name]
            });

            // Small delay between downloads to avoid hammering
            await new Promise(r => setTimeout(r, 800));
        }

        bulkStatus.textContent = `✓ Done! Downloaded ${checked.length} keynote(s).`;
    });
}

async function main() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes("sisedu.org")) {
        document.getElementById("greyed").style.display = "flex";
        return;
    }

    // Subject page: /classroom/11/english (no ID at end)
    if (subjectPagePattern.test(tab.url)) {
        await loadSubjectView(tab);
        return;
    }

    // Single keynote page: /classroom/11/english/6110 or /editor
    if (keynotePagePattern.test(tab.url)) {
        document.getElementById("download").addEventListener("click", async () => {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            browser.runtime.sendMessage({ action: "download", tabId: tab.id });
        });
        return;
    }

    // Anything else on sisedu.org that isn't a keynote page
    document.getElementById("greyed").style.display = "flex";
}

main();
