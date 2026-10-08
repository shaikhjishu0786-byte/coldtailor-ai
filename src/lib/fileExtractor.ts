export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith('.pdf') || file.type === 'application/pdf';
  const isDocx = name.endsWith('.docx');
  const isText = name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.text') || file.type === 'text/plain';

  if (isPdf) {
    return extractFromPdf(file);
  }
  if (isDocx) {
    return extractFromDocx(file);
  }
  if (isText) {
    return file.text();
  }

  throw new Error('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const arrayBuffer = await file.arrayBuffer();

  const workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .filter((s) => s.length > 0);
    pageTexts.push(strings.join(' '));
  }

  await pdf.destroy();
  return pageTexts.join('\n\n').trim();
}

async function extractFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth/mammoth.browser');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}
