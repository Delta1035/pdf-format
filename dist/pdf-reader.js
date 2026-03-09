import { readFile } from 'fs/promises';
import pdfParse from 'pdf-parse';
export async function readPdf(filePath) {
    const buffer = await readFile(filePath);
    const data = await pdfParse(buffer);
    return {
        text: data.text,
        pages: data.numpages,
        info: data.info,
    };
}
