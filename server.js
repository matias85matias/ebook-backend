const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

app.use(express.json());
app.use('/public', express.static(PUBLIC_DIR));

function buildHtml(title, pages) {
  const chaptersHtml = pages.map((page, index) => {
    const text = page.text || '';
    const firstChar = text.charAt(0);
    const rest = text.slice(1);

    return `
      <div class="page">
        <h2>${page.title || `Capítulo ${index + 1}`}</h2>
        <p><span class="drop-cap">${firstChar}</span>${rest}</p>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: A4;
      margin: 2.5cm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      color: #1a1a1a;
      background: white;
    }

    .cover {
      width: 100%;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      page-break-after: always;
    }

    .cover h1 {
      font-size: 32pt;
      text-align: center;
      font-weight: bold;
      letter-spacing: 2px;
      color: #111;
    }

    .page {
      page-break-before: always;
      padding-top: 1cm;
    }

    h2 {
      font-size: 18pt;
      margin-bottom: 0.8cm;
      color: #222;
      border-bottom: 1px solid #ccc;
      padding-bottom: 6px;
    }

    p {
      text-align: justify;
      line-height: 1.8;
      font-size: 12pt;
    }

    .drop-cap {
      float: left;
      font-size: 52pt;
      line-height: 0.75;
      margin-right: 8px;
      margin-top: 6px;
      font-weight: bold;
      color: #111;
      font-family: Georgia, serif;
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${title}</h1>
  </div>
  ${chaptersHtml}
</body>
</html>`;
}

app.post('/generate-ebook', async (req, res) => {
  const { title, pages } = req.body;

  if (!title || !Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ error: 'Se requiere "title" y un array "pages" con al menos un elemento.' });
  }

  let browser;
  try {
    const html = buildHtml(title, pages);
    const filename = `ebook-${Date.now()}.pdf`;
    const outputPath = path.join(PUBLIC_DIR, filename);

    console.log(`[generate-ebook] Iniciando generación: "${title}" (${pages.length} páginas)`);

    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '2.5cm', bottom: '2.5cm', left: '2.5cm', right: '2.5cm' },
    });

    await browser.close();

    const url = `${BASE_URL}/public/${filename}`;
    console.log(`[generate-ebook] PDF generado: ${url}`);

    res.json({ url });
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('[generate-ebook] Error:', err.message);
    res.status(500).json({ error: 'Error al generar el ebook.', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en ${BASE_URL}`);
  console.log(`PDFs disponibles en ${BASE_URL}/public/`);
});
