import type { UploadedFile } from "express-fileupload";
import * as JSZip from 'jszip';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface UpdateAltTextOptions {
    // Array of alt text strings to apply sequentially to images found in the doc
    altTextList: string[]; 
}

/**
 * Reads a .docx buffer, updates image alt texts, and returns the updated .docx buffer.
 */
export async function addAltTextToDocx(fileBuffer: Buffer, options: UpdateAltTextOptions): Promise<Buffer> {
    // 1. Load the docx file as a zip archive
    const zip = await JSZip.loadAsync(fileBuffer);
    
    // 2. Locate and extract the main document XML file
    const documentXmlPath = 'word/document.xml';
    const documentXmlStr = await zip.file(documentXmlPath)?.async('string');
    
    if (!documentXmlStr) {
        throw new Error('Invalid .docx file: word/document.xml not found.');
    }

    // 3. Setup XML Parser and Builder options to preserve attributes
    const parserOpts = {
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        parseAttributeValue: false
    };
    const builderOpts = {
        ...parserOpts,
        suppressEmptyNode: true
    };
    const parser = new XMLParser(parserOpts);
    const builder = new XMLBuilder(builderOpts);

    // Parse XML text into a mutable JavaScript Object
    const jsonObj = parser.parse(documentXmlStr);

    let imageCounter = 0;

    /**
     * Recursive function to scan the XML object for image property tags (<wp:docPr>)
     */
    function processNodes(node: any) {
        if (!node || typeof node !== 'object') return;

        // Check if the current node is a Word Processing Drawing properties block
        if (node['wp:docPr']) {
            const docPr = node['wp:docPr'];
            
            // Pick the next available alt text from your list
            if (imageCounter < options.altTextList.length) {
                const newAltText = options.altTextList[imageCounter];
                
                // Assign to the 'descr' attribute (corresponds to description/alt text in Word)
                docPr['@_descr'] = newAltText; 
                
                imageCounter++;
            }
        }

        // Keep traversing child nodes recursively
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                processNodes(node[key]);
            }
        }
    }

    // Run the traversal
    processNodes(jsonObj);

    // 4. Rebuild the updated XML string from our modified object
    const updatedXmlStr = builder.build(jsonObj);

    // 5. Replace the old document.xml in our zip instance
    zip.file(documentXmlPath, updatedXmlStr);

    // 6. Generate and return the final document as a Node.js Buffer
    const updatedBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    return updatedBuffer;
}