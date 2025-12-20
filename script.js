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
viewer.addEventListener('contextmenu', event => event.preventDefault());
