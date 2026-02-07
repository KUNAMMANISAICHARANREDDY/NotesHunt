fetch('data.json')
    .then(response => response.json())
    .then(data => renderContent(data))
    .catch(error => {
        console.error('Error loading data:', error);
        alert('Error loading content. If you are opening this file directly (file://), please run a local server (like "Live Server" in VS Code) to allow fetching data.json.');
    });

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

        // Check if this is the Lab Manuals section
        if (semester.name === "Lab Manuals") {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'enrollment-container';
            inputContainer.style.marginBottom = '20px';
            inputContainer.innerHTML = `
                <input type="text" id="enrollmentInput" placeholder="Enter Enrollment Number" 
                       style="padding: 10px; border-radius: 5px; border: 1px solid #ddd; width: 100%; max-width: 300px;">
             `;
            section.appendChild(inputContainer);
        }

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
                    // Pass subject name to check for Lab Manuals context if needed, 
                    // or we rely on the link path as before
                    btn.onclick = () => openPDF(unitObj.pdf, semester.name);
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

async function openPDF(link, semesterName) {
    if (!link) {
        alert("Uploading Soon Buddy ");
        return;
    }

    // Show Batman Loader
    showBatmanLoader();

    viewer.style.display = 'flex';
    container.innerHTML = ''; // Clear previous

    // Download Button Logic
    const downloadBtn = document.getElementById('downloadBtn');

    // Check if it's a Lab Manual (either by section name or path)
    const isLabManual = link.includes('Lab Manual') || (semesterName && semesterName === 'Lab Manuals');

    if (isLabManual) {
        downloadBtn.style.display = 'inline-block';

        // Remove old listener to prevent duplicates
        const newBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newBtn, downloadBtn);

        newBtn.onclick = async () => {
            const enrollmentInput = document.getElementById('enrollmentInput');
            const enrollmentNumber = enrollmentInput ? enrollmentInput.value.trim() : '';

            if (!enrollmentNumber) {
                alert("Please enter your Enrollment Number in the Lab Manuals section to download.");
                // Close the viewer so they can see the input input
                closePDF();
                // Scroll to input if possible
                if (enrollmentInput) enrollmentInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            try {
                showBatmanLoader(); // Show loader during download prep
                // Fetch the existing PDF
                const existingPdfBytes = await fetch(link).then(res => res.arrayBuffer());

                // Load a PDFDocument from the existing PDF bytes
                const pdfDoc = await PDFLib.PDFDocument.load(existingPdfBytes);

                // Get all pages of the document
                const pages = pdfDoc.getPages();
                const { rgb } = PDFLib;

                // Add the enrollment number to each page
                for (const page of pages) {
                    const { width, height } = page.getSize();
                    const fontSize = 12;

                    // To do true right align we need text width. 
                    // pdf-lib standard font:
                    const helveticaFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                    const textWidth = helveticaFont.widthOfTextAtSize(enrollmentNumber, fontSize);

                    page.drawText(enrollmentNumber, {
                        x: width - textWidth - 15,
                        y: height - 15 - fontSize, // Position from top (height - margin - fontSize) approx
                        size: fontSize,
                        font: helveticaFont,
                        color: rgb(0, 0, 0),
                    });
                }

                // Serialize the PDFDocument to bytes (a Uint8Array)
                const pdfBytes = await pdfDoc.save();

                // Trigger the browser to download the PDF document
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `LabManual_${enrollmentNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (error) {
                console.error("Error modifying PDF:", error);
                alert("Failed to process PDF for download.");
            } finally {
                hideBatmanLoader();
            }
        };
    } else {
        downloadBtn.style.display = 'none';
    }

    const loadingTask = pdfjsLib.getDocument(link);
    loadingTask.promise.then(
        function (pdf) {
            const pagePromises = [];
            // Load all pages sequentially to ensure order
            for (let i = 1; i <= pdf.numPages; i++) {
                const canvas = document.createElement('canvas');
                canvas.id = `page-${i}`;
                container.appendChild(canvas);

                const renderPromise = pdf.getPage(i).then(function (page) {
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale: scale });
                    const c = document.getElementById(`page-${i}`);
                    const context = c.getContext('2d');
                    c.height = viewport.height;
                    c.width = viewport.width;

                    return page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                });
                pagePromises.push(renderPromise);
            }

            // Hide loader after all pages are rendered
            Promise.all(pagePromises).then(() => {
                hideBatmanLoader();
            }).catch(err => {
                console.error("Rendering error:", err);
                hideBatmanLoader();
            });
        },
        function (reason) {
            console.error(reason);
            alert("Error loading PDF: " + reason);
            closePDF(); // Close if error
            hideBatmanLoader();
        }
    );
}

function closePDF() {
    viewer.style.display = 'none';
    container.innerHTML = ''; // Clear memory
}

// Disable right click on viewer
// Disable right click on viewer
viewer.addEventListener('contextmenu', event => event.preventDefault());

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
