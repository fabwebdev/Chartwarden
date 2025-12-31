export const generateHtmlContent = (): string => {
    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            h1, h2, h3 { color: #333; }
            .toc { margin-bottom: 20px; }
            .toc ul { list-style-type: none; }
            .toc li { margin-bottom: 10px; }
            .page-break { page-break-before: always; }
          </style>
        </head>
        <body>
          <div class="toc">
            <h1>Table des matières</h1>
            <ul>
              <li><a href="#section1">Section 1</a></li>
              <li><a href="#section2">Section 2</a></li>
              <li><a href="#section3">Section 3</a></li>
            </ul>
          </div>
          <div class="page-break"></div>
          <h1 id="section1">Section 1</h1>
          <p>Contenu de la section 1...</p>
          <div class="page-break"></div>
          <h1 id="section2">Section 2</h1>
          <p>Contenu de la section 2...</p>
          <div class="page-break"></div>
          <h1 id="section3">Section 3</h1>
          <p>Contenu de la section 3...</p>
        </body>
      </html>
    `;
  };
  