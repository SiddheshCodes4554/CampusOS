import mammoth from 'mammoth'
import AdmZip from 'adm-zip'

/**
 * Extracts raw text from DOCX files.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value || ''
}

/**
 * Extracts slide texts from PPTX files by parsing slide XML contents.
 */
export function extractTextFromPptx(buffer: Buffer): string {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()
  const slideTexts: string[] = []

  // Filter and sort slide entries numerically (ppt/slides/slide1.xml, slide2.xml, ...)
  const slideEntries = entries.filter(entry => 
    entry.entryName.startsWith('ppt/slides/slide') && 
    entry.entryName.endsWith('.xml')
  ).sort((a, b) => {
    const numA = parseInt(a.entryName.match(/\d+/)?.[0] || '0', 10)
    const numB = parseInt(b.entryName.match(/\d+/)?.[0] || '0', 10)
    return numA - numB
  })

  for (const entry of slideEntries) {
    const xmlText = entry.getData().toString('utf8')
    // Extract text enclosed inside <a:t>...</a:t> elements
    const textMatches = xmlText.match(/<a:t>([^<]*)<\/a:t>/g)
    if (textMatches) {
      const slideText = textMatches
        .map(match => match.replace(/<\/?a:t>/g, ''))
        .join(' ')
      slideTexts.push(slideText)
    }
  }

  return slideTexts.join('\n\n')
}
