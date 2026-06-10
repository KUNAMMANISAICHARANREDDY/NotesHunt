const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files (index.html, css, js) from project root
app.use(express.static(path.join(__dirname)));

// Serve PDFs folder
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// API: return data.json with normalized PDF paths
app.get('/api/data', (req, res) => {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
    const data = JSON.parse(raw);

    // Ensure pdf paths start with /pdfs so they work with static route
    if (Array.isArray(data.semesters)) {
      data.semesters.forEach(sem => {
        if (Array.isArray(sem.subjects)) {
          sem.subjects.forEach(sub => {
            if (Array.isArray(sub.units)) {
              sub.units.forEach(u => {
                if (u && u.pdf && typeof u.pdf === 'string') {
                  // Normalize: remove leading ./ or / and ensure starts with /pdfs
                  let p = u.pdf.replace(/^[.\/]+/, '');
                  if (!p.startsWith('pdfs/')) p = p.replace(/^\/*/, 'pdfs/');
                  u.pdf = '/' + p; // leading slash so URL is absolute relative to host
                }
              });
            }
          });
        }
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Error reading data.json:', err);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Simple health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
