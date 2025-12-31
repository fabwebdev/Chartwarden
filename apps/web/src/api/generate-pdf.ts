import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('API generate-pdf called'); // Log d'entrée API
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    const content = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { background-color: #70c0d9; color: #fff; padding: 10px; text-align: center; }
            .section { margin: 20px 0; }
            .section h2 { font-size: 20px; }
            .section p { font-size: 14px; }
            .question-group { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .question-group label { display: block; margin-right: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAIN ASSESSMENT IN ADVANCED DEMENTIA SCALE - PAINAD</h1>
          </div>
          <div class="section">
            <h2>Instructions</h2>
            <p>Observe the patient for five minutes before scoring their behaviors.</p>
            <p>Assess the patient during active periods, such as turning, walking, and transferring.</p>
            <p>Rate the patient for each of the five observed behaviors.</p>
            <p>Obtain a total score by adding the scores of the five behaviors.</p>
            <p>The total score can range from 0 to 10.</p>
            <p>Note that the 0-10 score of the PAINAD scale is not the same as the 0-10 verbal descriptive pain rating scale.</p>
          </div>
          <div class="section">
            <h2>Behavior</h2>
            <div class="question-group">
              <label><input type="radio" name="behavior" value="0"> Normal (0)</label>
              <label><input type="radio" name="behavior" value="1"> Occasional labored breathing or short periods of hyperventilation (1)</label>
              <label><input type="radio" name="behavior" value="2"> Noisy labored breathing, long periods of hyperventilation, Cheyne-Stokes respirations (2)</label>
            </div>
            <!-- Repeat for other sections... -->
          </div>
        </body>
      </html>
    `;

    await page.setContent(content, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=output.pdf');
    res.end(pdfBuffer);
    console.log('PDF generated successfully'); // Log de succès
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};
