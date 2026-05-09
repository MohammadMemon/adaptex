/**
 * Extracts text from a PDF file using pdfjs-dist.
 */
export async function extractTextFromPdf(file) {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to parse PDF text.");
  }
}

/**
 * Extracts images from a PDF and runs OCR using Tesseract.js.
 */
export async function extractOcrFromPdf(file, progressCallback) {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    const Tesseract = (await import("tesseract.js")).default;
    
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullOcrText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      if (progressCallback) {
        progressCallback({ page: i, total: pdf.numPages, status: "recognizing" });
      }

      const { data: { text } } = await Tesseract.recognize(
        canvas,
        'eng',
        {
          logger: m => {
             if (m.status === 'recognizing text' && progressCallback) {
                // Pass granular progress back to the UI
             }
          }
        }
      );

      fullOcrText += text + "\n\n";
    }

    return fullOcrText;
  } catch (error) {
    console.error("Error running OCR on PDF:", error);
    throw new Error("Failed to run OCR on the file.");
  }
}
