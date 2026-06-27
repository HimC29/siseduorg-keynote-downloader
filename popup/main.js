// sisedu.org Keynote Downloader — download keynotes as PDF
// Copyright (C) <year>  HimC29
//
// GNU GPL v3 — see <https://www.gnu.org/licenses/>.

const status = document.getElementById("status");

browser.storage.session.get("status", ({ status: saved }) => {
    if (saved) status.textContent = saved;
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === "session" && changes.status) {
        status.textContent = changes.status.newValue;
    }
});

const keynotePagePattern = /\/classroom\/\d+\/\w+\/\d+/;
const subjectPagePattern = /\/classroom\/\d+\/(\w+)$/;
const classroomRootPattern = /\/classroom\/(\d+)$/;

// Subject abbreviation -> display name
const SUBJECT_NAMES = {
    acct: "Accounting", add_math: "Additional Mathematics", arts: "Arts",
    bio: "Biology", bs: "Business Studies", chem: "Chemistry",
    chinese: "Chinese", cs: "Computer Science", ca: "Culinary",
    econ: "Economics", english: "English", literacy: "English Tutorial",
    geo: "Geography", history: "History", ict: "ICT", malay: "Malay",
    math: "Mathematics", moral: "Moral", ma: "Music Appreciation",
    phy: "Physics", scs: "Science", sejarah: "Sejarah",
    spelling_dictation: "Spelling & Dictation", va: "Visual Arts"
};

// Keys to ignore when scanning the student record for subjects
const NON_SUBJECT_KEYS = new Set([
    "studentID","academic_year","class_term","class_code","id",
    "date_joined","semesterID","term","prev_class","School_Semester"
]);

async function getEnrolledSubjects(tab) {
    const [{ result }] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const scripts = document.querySelectorAll("script[data-sveltekit-fetched]");
            for (const script of [...scripts].reverse()) {
                try {
                    const json = JSON.parse(script.textContent);
                    const body = JSON.parse(json.body);
                    // The current-semester student record is a single object (not array)
                    if (body && body.studentID && body.semesterID && !Array.isArray(body)) {
                        return body;
                    }
                } catch {}
            }
            return null;
        }
    });
    return result;
}

async function fetchKeynoteList(tab, grade, subject) {
    const [{ result }] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (grade, subject) => {
            const pageUrl = `${window.location.origin}/student/classroom/${grade}/${subject}`;
            const r = await fetch(pageUrl);
            const html = await r.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const scripts = doc.querySelectorAll("script[data-sveltekit-fetched]");
            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent);
                    const body = JSON.parse(json.body);
                    if (body.modules_teacher_classes_bridge) {
                        return body.modules_teacher_classes_bridge
                            .filter(b => b.modules_main.type === "Ebook")
                            .map(b => ({ id: b.modules_main.id, name: b.modules_main.name }));
                    }
                } catch {}
            }
            return [];
        },
        args: [grade, subject]
    });
    return result || [];
}

async function loadClassroomView(tab) {
    document.getElementById("single-view").style.display = "none";
    document.getElementById("bulk-view").style.display = "block";

    const bulkStatus = document.getElementById("bulk-status");
    const keynoteList = document.getElementById("keynote-list");

    const grade = tab.url.match(classroomRootPattern)[1];

    bulkStatus.textContent = "Loading your subjects...";

    const studentRecord = await getEnrolledSubjects(tab);
    if (!studentRecord) {
        bulkStatus.textContent = "Could not load subject list.";
        return;
    }

    // Get subjects where value is not null
    const subjects = Object.entries(studentRecord)
        .filter(([key, val]) => !NON_SUBJECT_KEYS.has(key) && val !== null)
        .map(([key]) => key);

    if (subjects.length === 0) {
        bulkStatus.textContent = "No subjects found.";
        return;
    }

    bulkStatus.textContent = `Loading keynotes for ${subjects.length} subjects...`;
    keynoteList.innerHTML = "";

    // Fetch keynotes for all subjects
    const allItems = []; // { subject, subjectName, id, name }
    for (const subject of subjects) {
        const keynotes = await fetchKeynoteList(tab, grade, subject);
        for (const k of keynotes) {
            allItems.push({ subject, subjectName: SUBJECT_NAMES[subject] || subject, ...k });
        }
    }

    if (allItems.length === 0) {
        bulkStatus.textContent = "No keynotes found.";
        return;
    }

    bulkStatus.textContent = "";
    keynoteList.innerHTML = "";

    // Group by subject
    const grouped = {};
    for (const item of allItems) {
        if (!grouped[item.subject]) grouped[item.subject] = [];
        grouped[item.subject].push(item);
    }

    for (const [subject, items] of Object.entries(grouped)) {
        // Subject header
        const header = document.createElement("div");
        header.className = "subject-header";
        header.textContent = SUBJECT_NAMES[subject] || subject;
        keynoteList.appendChild(header);

        for (const keynote of items) {
            const label = document.createElement("label");
            label.className = "keynote-item";
            label.innerHTML = `<input type="checkbox" value="${keynote.id}" data-name="${keynote.name}" data-subject="${subject}"> ${keynote.name}`;
            keynoteList.appendChild(label);
        }
    }

    // Select All
    const selectAll = document.getElementById("select-all");
    const freshSelectAll = selectAll.cloneNode(true);
    selectAll.replaceWith(freshSelectAll);
    freshSelectAll.checked = false;

    freshSelectAll.addEventListener("change", () => {
        keynoteList.querySelectorAll("input[type=checkbox]").forEach(cb => {
            cb.checked = freshSelectAll.checked;
        });
        updateBulkButton();
    });
    keynoteList.addEventListener("change", updateBulkButton);

    function updateBulkButton() {
        const anyChecked = [...keynoteList.querySelectorAll("input[type=checkbox]")].some(cb => cb.checked);
        document.getElementById("bulk-download").disabled = !anyChecked;
    }

    const oldBtn = document.getElementById("bulk-download");
    const bulkBtn = oldBtn.cloneNode(true);
    oldBtn.replaceWith(bulkBtn);
    bulkBtn.disabled = true;

    bulkBtn.addEventListener("click", async () => {
        const checked = [...keynoteList.querySelectorAll("input[type=checkbox]:checked")];
        bulkBtn.disabled = true;
        freshSelectAll.disabled = true;
        keynoteList.querySelectorAll("input").forEach(cb => cb.disabled = true);

        for (let i = 0; i < checked.length; i++) {
            const cb = checked[i];
            const id = cb.value;
            const name = cb.dataset.name;
            const subject = cb.dataset.subject;
            bulkStatus.textContent = `Downloading ${i + 1}/${checked.length}: ${name}`;

            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: async (subject, grade, id, name) => {
                    const pageUrl = `${window.location.origin}/student/classroom/${grade}/${subject}/${id}`;
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
					if (!filePath) throw new Error("Could not find PDF path");
					const pdfUrl = `https://supabase.sisedu.org/storage/v1/object/public/coursework/${filePath}`;
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

            await new Promise(r => setTimeout(r, 800));
        }

        bulkStatus.textContent = `✓ Done! Downloaded ${checked.length} keynote(s).`;
    });
}

async function loadSubjectView(tab) {
    document.getElementById("single-view").style.display = "none";
    document.getElementById("bulk-view").style.display = "block";

    const bulkStatus = document.getElementById("bulk-status");
    const keynoteList = document.getElementById("keynote-list");

    bulkStatus.textContent = "Loading keynotes...";

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
                            .map(b => ({ id: b.modules_main.id, name: b.modules_main.name }));
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
    keynoteList.innerHTML = "";

    for (const keynote of result) {
        const label = document.createElement("label");
        label.className = "keynote-item";
        label.innerHTML = `<input type="checkbox" value="${keynote.id}" data-name="${keynote.name}"> ${keynote.name}`;
        keynoteList.appendChild(label);
    }

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

    // Classroom root: /classroom/11
    if (classroomRootPattern.test(tab.url)) {
        await loadClassroomView(tab);
        return;
    }

    // Subject page: /classroom/11/english
    if (subjectPagePattern.test(tab.url)) {
        await loadSubjectView(tab);
        return;
    }

    // Single keynote page: /classroom/11/english/6110
    if (keynotePagePattern.test(tab.url)) {
        document.getElementById("download").addEventListener("click", async () => {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            browser.runtime.sendMessage({ action: "download", tabId: tab.id });
        });
        return;
    }

    document.getElementById("greyed").style.display = "flex";
}

main();
