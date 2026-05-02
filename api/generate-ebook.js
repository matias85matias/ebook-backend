export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, pages } = req.body || {};

    const html = `
      <html><body>
        <h1>${title || 'Test'}</h1>
        <p>${(pages && pages[0] && pages[0].text) || 'Contenido'}</p>
      </body></html>
    `;

    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.PDFSHIFT_API_KEY
      },
      body: JSON.stringify({ source: html })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', 'application/pdf');
    res.status(200).send(buffer);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
