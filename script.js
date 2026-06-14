let appData = null;

function normalizeData(data, basePath) {
    if (Array.isArray(data.semesters)) {
        data.semesters.forEach(sem => {
            if (Array.isArray(sem.subjects)) {
                sem.subjects.forEach(sub => {
                    if (Array.isArray(sub.units)) {
                        sub.units.forEach(u => {
                            if (u && u.pdf && typeof u.pdf === 'string') {
                                // Normalize path: remove leading ./ or / and ensure starts with pdfs/
                                let p = u.pdf.replace(/^[.\/]+/, '');
                                if (!p.startsWith('pdfs/')) p = p.replace(/^\/*/, 'pdfs/');
                                u.pdf = basePath + p;
                            }
                        });
                    }
                });
            }
        });
    }
    return data;
}

function loadData() {
    // Determine the base path of the app
    // If the path contains /files/, the base path is everything before it.
    let basePath = '/';
    const filesIndex = location.pathname.indexOf('/files/');
    if (filesIndex !== -1) {
        basePath = location.pathname.substring(0, filesIndex);
    } else {
        basePath = location.pathname;
    }
    if (!basePath.endsWith('/')) {
        if (basePath.includes('.') || !basePath.endsWith('/')) {
            basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
        }
    }
    if (!basePath) basePath = '/';

    const apiPath = basePath === '/' ? '/api/data' : basePath + 'api/data';
    const localJsonPath = basePath === '/' ? 'data.json' : basePath + 'data.json';

    console.log(`Attempting to load data. API: ${apiPath}, Fallback: ${localJsonPath}`);

    fetch(apiPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully loaded data from Express API');
            appData = normalizeData(data, basePath);
            renderContent(appData);
            handleInitialUrl();
        })
        .catch(apiError => {
            console.warn('Failed to load from API. Falling back to local data.json:', apiError);
            fetch(localJsonPath)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Local JSON returned status ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Successfully loaded data from local data.json fallback');
                    appData = normalizeData(data, basePath);
                    renderContent(appData);
                    handleInitialUrl();
                })
                .catch(localError => {
                    console.error('All data loading attempts failed:', localError);
                    alert('Error loading content. Make sure either the backend server is running (node server.js) or the data.json file is accessible in the root directory.');
                });
        });
}

// Initialize loading
loadData();

function renderContent(data) {
    const contentDiv = document.getElementById('content');

    data.semesters.forEach(semester => {
        // Create Semester Section
        const section = document.createElement('section');
        section.className = 'semester';
        section.id = semester.id; // e.g., 'sem1'
        let creditHTML = "";

        if (semester.name === "Semester 2") {
            creditHTML = `
    <h4 class="credit">
      Thanks to @ 
      <a
        href="https://www.instagram.com/ramprasad_k_18?igsh=MWpmdTRoMmxxeGt3cA=="
        target="_blank"
        class="insta-link"
      >
       <b> Ram Prasad</b>
      </a>
      for contributing <b>SEM2</b> the PDFs
    </h4>
  `;
        }

        if (semester.name === "Semester 4") {
            creditHTML = `
    <h4 class="credit">
      Thanks to @ 
      <a
        href="https://www.instagram.com/iashwinn18__?igsh=MW9idzM4angyaTduMQ=="
        class="insta-link"
      >
        <b>Ashwin</b>
      </a>
      for contributing <b>SEM4</b> the PDFs
    </h4>
  `;
        }
        if (semester.name === "Semester 6") {
            creditHTML = `
    <h4 class="credit">
      Thanks to @ 
      <a
        href="https://www.linkedin.com/in/pankajyadav2005?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
        target="_blank"
        class="insta-link"
      >
        <b>Pankaj Yadav</b>
      </a>
      for contributing <b>SEM6</b> the PDFs
    </h4>
  `;
        }


        section.innerHTML = `
  <h2>${semester.name}</h2>
  ${creditHTML}
`;




        // Create Grid for Subjects
        const grid = document.createElement('div');
        grid.className = 'subjects';

        semester.subjects.forEach(subject => {
            const card = document.createElement('div');
            card.className = 'card';

            // Determine unit text
            const unitCount = subject.units ? subject.units.length : 0;

            card.innerHTML = `
        <h3>${subject.name}</h3>
        <small>${unitCount} Units</small>
        <div class="unit-buttons"></div>
      `;

            const buttonContainer = card.querySelector('.unit-buttons');

            // Generate Buttons
            if (subject.units && Array.isArray(subject.units)) {
                subject.units.forEach(unitObj => {
                    const btn = document.createElement('button');
                    btn.textContent = unitObj.unit; // "Unit 1"
                    // Pass sem id and subject code/name so we can build pretty URLs
                    const semId = semester.id || semester.name;
                    const subjectCode = subject.code || subject.name;
                    btn.onclick = () => openPDF(unitObj.pdf, semId, subjectCode, unitObj.unit);
                    buttonContainer.appendChild(btn);
                });
            }

            grid.appendChild(card);
        });

        section.appendChild(grid);
        contentDiv.appendChild(section);
    });
}

const viewer = document.getElementById('viewer');
const container = document.getElementById('pdfContainer');
const downloadBtn = document.getElementById('downloadBtn');

let isRendering = false; // prevent concurrent render operations
let currentLoadingTask = null;
let currentPdf = null;
let currentScale = 1.5;

function getDefaultScale() {
    return window.innerWidth < 768 ? 0.9 : 1.5;
}

async function renderPDFPages() {
    if (!currentPdf) return;
    isRendering = true;
    showBatmanLoader();

    // Clear old canvases
    container.innerHTML = '';

    const pagePromises = [];
    let renderPromise = Promise.resolve();

    for (let i = 1; i <= currentPdf.numPages; i++) {
        const canvas = document.createElement('canvas');
        canvas.id = `page-${i}`;
        container.appendChild(canvas);

        // Chain rendering sequentially to prevent concurrent context issues (blank pages)
        renderPromise = renderPromise.then(() => {
            return currentPdf.getPage(i).then(page => {
                const viewport = page.getViewport({ scale: currentScale });
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                return page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
            }).catch(pageErr => {
                console.error(`Error rendering page ${i}:`, pageErr);
            });
        });
        pagePromises.push(renderPromise);
    }

    try {
        await Promise.all(pagePromises);
    } catch (err) {
        console.error("Rendering error:", err);
    } finally {
        hideBatmanLoader();
        isRendering = false;
    }
}

async function openPDF(link, semId, subjectCode, unitName, pushHistory = true) {
    if (!link) {
        alert("Uploading Soon Buddy ");
        return;
    }

    // Prevent starting a new render while one is in progress
    if (isRendering) {
        alert('Please wait — a PDF is still loading.');
        return;
    }

    // If a previous loading task or pdf exists, try to cancel/destroy it to free canvases
    try {
        if (currentLoadingTask && typeof currentLoadingTask.destroy === 'function') {
            currentLoadingTask.destroy();
        }
    } catch (e) {
        console.warn('Failed to destroy previous loadingTask', e);
    }
    try {
        if (currentPdf && typeof currentPdf.destroy === 'function') {
            currentPdf.destroy();
        }
    } catch (e) {
        console.warn('Failed to destroy previous pdf', e);
    }

    // Show viewer in flexbox layout
    if (viewer) viewer.style.display = 'flex';
    
    // Set dynamic viewer title
    const titleSpan = document.getElementById('pdfViewerTitle');
    if (titleSpan) {
        titleSpan.textContent = `${subjectCode.toUpperCase()} - ${unitName}`;
    }

    // Initialize scale dynamically based on viewport width
    currentScale = getDefaultScale();

    // Check if it's a Lab Manual (either by path or subject code)
    const isLabManual = (link && link.includes('Lab Manual')) || (subjectCode && String(subjectCode).toLowerCase().includes('lab'));

    if (isLabManual) {
        downloadBtn.style.display = 'flex'; // show using modern flex buttons

        // Remove old listener to prevent duplicates
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

        newBtn.onclick = async () => {
            try {
                showBatmanLoader();
                const safeDownloadLink = encodeURI(link);
                console.log('Downloading PDF from', safeDownloadLink);
                const existingPdfBytes = await fetch(safeDownloadLink).then(res => {
                    if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
                    return res.arrayBuffer();
                });
                const blob = new Blob([existingPdfBytes], { type: 'application/pdf' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                try { a.download = decodeURIComponent(link.split('/').pop()); } catch(e){ a.download = 'LabManual.pdf'; }
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            } catch (error) {
                console.error("Error downloading PDF:", error);
                alert("Failed to download PDF.");
            } finally {
                hideBatmanLoader();
            }
        };
    } else {
        downloadBtn.style.display = 'none';
    }

    // Update browser URL to pretty path if requested
    try {
        if (pushHistory && semId && subjectCode && unitName) {
            const unitSlug = String(unitName).toLowerCase().replace(/\s+/g, '');
            const subjectSlug = String(subjectCode).toLowerCase().replace(/\s+/g, '');
            const newUrl = `/files/${semId.toLowerCase()}/${subjectSlug}/${unitSlug}`;
            history.pushState({ link, semId, subjectCode, unitName }, '', newUrl);
        }
    } catch (e) {
        console.warn('History API push failed', e);
    }

    // Ensure link is URI-encoded to handle spaces and special chars
    const safeLink = encodeURI(link);
    console.log('Opening PDF:', safeLink);

    showBatmanLoader();

    try {
        const loadTask = pdfjsLib.getDocument(safeLink);
        currentLoadingTask = loadTask;

        loadTask.promise.then(pdf => {
            currentPdf = pdf;
            const pageCountSpan = document.getElementById('pageCountDisplay');
            if (pageCountSpan) {
                pageCountSpan.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? 'Page' : 'Pages'}`;
            }
            const zoomDisplay = document.getElementById('zoomDisplay');
            if (zoomDisplay) {
                zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
            }
            renderPDFPages();
        }).catch(reason => {
            console.warn('Initial load failed, retrying with disableFontFace=true:', reason);
            try {
                const retryTask = pdfjsLib.getDocument({ url: safeLink, disableFontFace: true });
                currentLoadingTask = retryTask;
                retryTask.promise.then(pdf => {
                    currentPdf = pdf;
                    const pageCountSpan = document.getElementById('pageCountDisplay');
                    if (pageCountSpan) {
                        pageCountSpan.textContent = `${pdf.numPages} ${pdf.numPages === 1 ? 'Page' : 'Pages'}`;
                    }
                    const zoomDisplay = document.getElementById('zoomDisplay');
                    if (zoomDisplay) {
                        zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
                    }
                    renderPDFPages();
                }).catch(reason2 => {
                    console.error('Retry failed, opening in new tab fallback:', reason2);
                    hideBatmanLoader();
                    isRendering = false;
                    try { window.open(safeLink, '_blank'); } catch(e){}
                    alert('PDF viewer failed to render. Opened in a new tab as fallback.');
                });
            } catch (retryErr) {
                console.error('Retry error:', retryErr);
                hideBatmanLoader();
                isRendering = false;
                try { window.open(safeLink, '_blank'); } catch(e){}
            }
        });
    } catch (e) {
        console.error('getDocument threw:', e);
        alert('Failed to start PDF load.');
        hideBatmanLoader();
        isRendering = false;
    }
}

function closePDF() {
    if (viewer) viewer.style.display = 'none';
    if (container) {
        container.innerHTML = '';
        container.classList.remove('night-mode');
    }
    const nightToggle = document.getElementById('nightModeToggle');
    if (nightToggle) {
        const moon = nightToggle.querySelector('.moon-icon');
        const sun = nightToggle.querySelector('.sun-icon');
        if (moon && sun) {
            moon.style.display = 'block';
            sun.style.display = 'none';
        }
    }
    if (currentLoadingTask && typeof currentLoadingTask.destroy === 'function') {
        try { currentLoadingTask.destroy(); } catch(e){}
    }
    if (currentPdf && typeof currentPdf.destroy === 'function') {
        try { currentPdf.destroy(); } catch(e){}
    }
    isRendering = false;
    currentPdf = null;
    currentLoadingTask = null;
    try {
        if (location.pathname.startsWith('/files/')) {
            history.pushState(null, '', '/');
        }
    } catch(e) {}
}

function zoomIn() {
    if (!currentPdf || isRendering) return;
    if (currentScale >= 3.0) {
        alert('Maximum zoom reached.');
        return;
    }
    currentScale += 0.25;
    const zoomDisplay = document.getElementById('zoomDisplay');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    }
    renderPDFPages();
}

function zoomOut() {
    if (!currentPdf || isRendering) return;
    if (currentScale <= 0.5) {
        alert('Minimum zoom reached.');
        return;
    }
    currentScale -= 0.25;
    const zoomDisplay = document.getElementById('zoomDisplay');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    }
    renderPDFPages();
}

function resetZoom() {
    if (!currentPdf || isRendering) return;
    currentScale = getDefaultScale();
    const zoomDisplay = document.getElementById('zoomDisplay');
    if (zoomDisplay) {
        zoomDisplay.textContent = Math.round(currentScale * 100) + '%';
    }
    renderPDFPages();
}

// Handle browser back/forward to open/close PDFs based on URL
window.addEventListener('popstate', (event) => {
    const path = location.pathname;
    const m = path.match(/^\/files\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
    if (m) {
        // Try to resolve to a pdf using appData
        const sem = m[1];
        const subject = m[2];
        const unit = m[3];
        if (appData) {
            const semObj = appData.semesters.find(s => (s.id && s.id.toLowerCase() === sem.toLowerCase()));
            if (!semObj) return;
            const subObj = (semObj.subjects || []).find(s => (s.code && s.code.toLowerCase() === subject.toLowerCase()) || (s.name && s.name.toLowerCase().replace(/\s+/g,'') === subject.toLowerCase()));
            if (!subObj) return;
            const normalizedUnitParam = unit.toLowerCase().replace(/[-_]/g, '').replace(/^unit/, '').replace(/\s+/g, '');
            const match = (subObj.units || []).find(u => {
                if (!u.unit) return false;
                const norm = u.unit.toLowerCase().replace(/\s+/g, '').replace(/^unit/, '');
                return norm === normalizedUnitParam || u.unit.toLowerCase().replace(/\s+/g,'') === unit.toLowerCase();
            });
            if (match && match.pdf) {
                openPDF(match.pdf, semObj.id || semObj.name, subObj.code || subObj.name, match.unit, false);
            }
        }
    } else {
        // not a files URL — close viewer
        closePDF();
    }
});

// When the page loads and appData is set, support direct URLs
function handleInitialUrl() {
    const path = location.pathname;
    const m = path.match(/^\/files\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
    if (m && appData) {
        const sem = m[1];
        const subject = m[2];
        const unit = m[3];
        const semObj = appData.semesters.find(s => (s.id && s.id.toLowerCase() === sem.toLowerCase()));
        if (!semObj) return;
        const subObj = (semObj.subjects || []).find(s => (s.code && s.code.toLowerCase() === subject.toLowerCase()) || (s.name && s.name.toLowerCase().replace(/\s+/g,'') === subject.toLowerCase()));
        if (!subObj) return;
        const normalizedUnitParam = unit.toLowerCase().replace(/[-_]/g, '').replace(/^unit/, '').replace(/\s+/g, '');
        const match = (subObj.units || []).find(u => {
            if (!u.unit) return false;
            const norm = u.unit.toLowerCase().replace(/\s+/g, '').replace(/^unit/, '');
            return norm === normalizedUnitParam || u.unit.toLowerCase().replace(/\s+/g,'') === unit.toLowerCase();
        });
        if (match && match.pdf) {
            openPDF(match.pdf, semObj.id || semObj.name, subObj.code || subObj.name, match.unit, false);
        }
    }
}

/* ================= SEARCH LOGIC ================= */
const searchInput = document.querySelector('.search-container input');
const searchBtn = document.querySelector('.search-btn');

function performSearch() {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    const cards = document.querySelectorAll('.card');
    let found = false;

    // Remove previous highlights
    cards.forEach(card => card.classList.remove('highlight'));

    for (const card of cards) {
        const title = card.querySelector('h3').textContent.toLowerCase();
        if (title.includes(query)) {
            // Scroll to the card
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight effect
            card.classList.add('highlight');

            // Remove highlight after animation
            setTimeout(() => {
                card.classList.remove('highlight');
            }, 2000);

            found = true;
            break; // Stop after first match
        }
    }

    if (!found) {
        alert('Subject not found! Try a different keyword.');
    }
}

// Event Listeners
searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

/* ================= SPLASH CLEANUP ================= */
window.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-overlay');
    if (splash) {
        startFireworks();
        setTimeout(() => {
            splash.remove();
        }, 2500); // Wait for animation to finish
    }
});

/* ================= FIREWORKS ANIMATION ================= */
function startFireworks() {
    const canvas = document.getElementById('fireworks');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.velocity = {
                x: (Math.random() - 0.5) * 8,
                y: (Math.random() - 0.5) * 8
            };
            this.alpha = 1;
            this.friction = 0.95;
        }

        draw() {
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            this.velocity.x *= this.friction;
            this.velocity.y *= this.friction;
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.alpha -= 0.01;
        }
    }

    function createFirework(x, y) {
        const color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function animate() {
        if (!document.getElementById('fireworks')) return; // Stop if removed
        requestAnimationFrame(animate);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach((particle, index) => {
            if (particle.alpha > 0) {
                particle.update();
                particle.draw();
            } else {
                particles.splice(index, 1);
            }
        });

        if (Math.random() < 0.1) {
            createFirework(Math.random() * canvas.width, Math.random() * canvas.height);
        }
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

/* ================= BATMAN LOADER LOGIC ================= */
function showBatmanLoader() {
    const loader = document.getElementById('batman-loader-overlay');
    if (loader) loader.style.display = 'flex';
}

function hideBatmanLoader() {
    const loader = document.getElementById('batman-loader-overlay');
    if (loader) loader.style.display = 'none';
}

window.addEventListener('offline', showBatmanLoader);
window.addEventListener('online', hideBatmanLoader);

/* ================= NIGHT MODE LOGIC ================= */
document.addEventListener('DOMContentLoaded', () => {
    const nightModeBtn = document.getElementById('nightModeToggle');
    if (nightModeBtn) {
        nightModeBtn.addEventListener('click', () => {
            if (!container) return;
            container.classList.toggle('night-mode');
            const isNight = container.classList.contains('night-mode');
            
            const moonIcon = nightModeBtn.querySelector('.moon-icon');
            const sunIcon = nightModeBtn.querySelector('.sun-icon');
            
            if (isNight) {
                if (moonIcon) moonIcon.style.display = 'none';
                if (sunIcon) sunIcon.style.display = 'block';
            } else {
                if (moonIcon) moonIcon.style.display = 'block';
                if (sunIcon) sunIcon.style.display = 'none';
            }
        });
    }
});
