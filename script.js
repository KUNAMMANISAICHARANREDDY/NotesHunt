fetch('data.json')
    .then(response => response.json())
    .then(data => renderContent(data))
    .catch(error => console.error('Error loading data:', error));

function renderContent(data) {
    const contentDiv = document.getElementById('content');

    data.semesters.forEach(semester => {
        // Create Semester Section
        const section = document.createElement('section');
        section.className = 'semester';
        section.id = semester.id; // e.g., 'sem1'
        section.innerHTML = `<h2>${semester.name}</h2>`;

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
                    btn.onclick = () => openPDF(unitObj.pdf);
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

function openPDF(link) {
    if (!link) {
        alert("Uploading Soon Buddy ");
        return;
    }
    viewer.style.display = 'flex';
    container.innerHTML = ''; // Clear previous

    // Download Button Logic
    const downloadBtn = document.getElementById('downloadBtn');
    if (link.includes('Lab Manual')) {
        downloadBtn.style.display = 'inline-block';
        downloadBtn.onclick = () => {
            const a = document.createElement('a');
            a.href = link;
            a.download = link.split('/').pop();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
    } else {
        downloadBtn.style.display = 'none';
    }

    const loadingTask = pdfjsLib.getDocument(link);
    loadingTask.promise.then(
        function (pdf) {
            // Load all pages sequentially to ensure order
            for (let i = 1; i <= pdf.numPages; i++) {
                const canvas = document.createElement('canvas');
                canvas.id = `page-${i}`;
                container.appendChild(canvas);

                pdf.getPage(i).then(function (page) {
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale: scale });
                    const c = document.getElementById(`page-${i}`);
                    const context = c.getContext('2d');
                    c.height = viewport.height;
                    c.width = viewport.width;

                    page.render({
                        canvasContext: context,
                        viewport: viewport
                    });
                });
            }
        },
        function (reason) {
            console.error(reason);
            alert("Error loading PDF: " + reason);
            closePDF(); // Close if error
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
