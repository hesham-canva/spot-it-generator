/**
 * PDF Generation for Spot It Cards
 * Uses jsPDF to create printable PDF documents
 */

import { jsPDF } from 'jspdf';

/**
 * Convert an image data URL to PNG format using canvas
 * This is needed because jsPDF doesn't support WEBP
 * @param {string} dataUrl - Image data URL
 * @returns {Promise<string>} PNG data URL
 */
async function convertToPNG(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width || 512;
                canvas.height = img.height || 512;
                const ctx = canvas.getContext('2d');
                
                // Fill with white background (in case of transparency)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw image
                ctx.drawImage(img, 0, 0);
                
                // Convert to PNG
                const pngDataUrl = canvas.toDataURL('image/png');
                resolve(pngDataUrl);
            } catch (e) {
                console.error('Error in canvas conversion:', e);
                reject(e);
            }
        };
        img.onerror = (e) => {
            console.error('Failed to load image for conversion:', e);
            reject(new Error('Image load failed'));
        };
        
        // Set a timeout to avoid hanging
        setTimeout(() => {
            if (!img.complete) {
                console.error('Image load timeout');
                reject(new Error('Image load timeout'));
            }
        }, 10000);
        
        img.src = dataUrl;
    });
}

/**
 * Pre-process images to ensure they're in a format jsPDF supports
 * @param {string[]} images - Array of image data URLs
 * @returns {Promise<string[]>} Processed images
 */
async function preprocessImages(images) {
    const processed = [];
    
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img) {
            console.log(`Image ${i}: null/empty`);
            processed.push(null);
            continue;
        }
        
        // Log format info
        const formatMatch = img.match(/^data:image\/(\w+);/);
        const format = formatMatch ? formatMatch[1] : 'unknown';
        console.log(`Image ${i}: format=${format}, length=${img.length}`);
        
        // Convert ALL images to PNG for maximum jsPDF compatibility
        // jsPDF has issues with WEBP and sometimes with other formats
        try {
            const converted = await convertToPNG(img);
            processed.push(converted);
            if (format !== 'png') {
                console.log(`  Converted image ${i} from ${format} to PNG`);
            }
        } catch (e) {
            console.error(`  Failed to convert image ${i}:`, e);
            // Try original as fallback
            processed.push(img);
        }
    }
    
    return processed;
}

/**
 * Generate a PDF of all cards
 * @param {number[][]} cards - Array of card configurations (symbol indices)
 * @param {string[]} images - Array of image data URLs
 * @param {Object[][]} layouts - Array of layouts for each card
 * @param {function} onProgress - Progress callback
 * @returns {Promise<jsPDF>}
 */
export async function generatePDF(cards, images, layouts, onProgress = null) {
    // Debug: Check images array
    const validImages = images.filter(img => img && img.length > 0);
    console.log(`PDF Generation: ${validImages.length}/${images.length} valid images`);
    
    // Pre-process images to convert unsupported formats (like WEBP) to PNG
    if (onProgress) {
        onProgress(0, 1, 'Preparing images for PDF...');
    }
    console.log(`Input images array: ${images.length} items, valid: ${images.filter(i => i && i.length > 0).length}`);
    const processedImages = await preprocessImages(images);
    console.log(`Processed images: ${processedImages.length} items, valid: ${processedImages.filter(i => i && i.length > 0).length}`);
    
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
    });
    
    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.5;
    const cardsPerRow = 3;
    const cardsPerCol = 3;
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    const cardWidth = (pageWidth - margin * 2) / cardsPerRow;
    const cardHeight = (pageHeight - margin * 2) / cardsPerCol;
    const cardSize = Math.min(cardWidth, cardHeight) * 0.95;
    
    const totalPages = Math.ceil(cards.length / cardsPerPage);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        if (pageIndex > 0) {
            pdf.addPage();
        }
        
        if (onProgress) {
            onProgress(pageIndex + 1, totalPages, `Generating page ${pageIndex + 1} of ${totalPages}...`);
        }
        
        const startCard = pageIndex * cardsPerPage;
        const endCard = Math.min(startCard + cardsPerPage, cards.length);
        
        for (let i = startCard; i < endCard; i++) {
            const cardIndexOnPage = i - startCard;
            const row = Math.floor(cardIndexOnPage / cardsPerRow);
            const col = cardIndexOnPage % cardsPerRow;
            
            const x = margin + col * cardWidth + (cardWidth - cardSize) / 2;
            const y = margin + row * cardHeight + (cardHeight - cardSize) / 2;
            
            await drawCard(pdf, cards[i], processedImages, layouts[i], x, y, cardSize);
        }
    }
    
    if (onProgress) {
        onProgress(totalPages, totalPages, 'PDF ready!');
    }
    
    return pdf;
}

/**
 * Draw a single card on the PDF (square with rounded corners)
 */
async function drawCard(pdf, symbolIndices, images, layout, x, y, size) {
    const cornerRadius = 0.1; // Rounded corners in inches
    
    // Debug: Log card info
    console.log(`Drawing card with symbols: [${symbolIndices.join(', ')}], layout positions: ${layout.length}, images available: ${images.length}`);
    
    // Draw card square (thin dashed border for cutting)
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.01); // Thin line (0.01 inches)
    pdf.setLineDashPattern([0.08, 0.04], 0); // Longer dashes, shorter gaps
    pdf.roundedRect(x, y, size, size, cornerRadius, cornerRadius, 'S');
    pdf.setLineDashPattern([], 0);
    pdf.setLineWidth(0.02); // Reset to default
    
    // Draw white fill
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x + 0.02, y + 0.02, size - 0.04, size - 0.04, cornerRadius, cornerRadius, 'F');
    
    // Draw symbols using the same layout as web preview
    const layoutSize = 200; // Original layout is based on 200px
    const scale = size / layoutSize;
    const padding = size * 0.05;
    
    for (let i = 0; i < symbolIndices.length; i++) {
        const symbolIndex = symbolIndices[i];
        const imageData = images[symbolIndex];
        const pos = layout[i];
        
        // Debug each symbol
        console.log(`  Symbol ${i}: index=${symbolIndex}, hasImage=${!!imageData}, hasPos=${!!pos}, imageLen=${imageData ? imageData.length : 0}`);
        
        if (!imageData || !pos) {
            console.warn(`  SKIPPING symbol ${symbolIndex}: imageData=${!!imageData}, pos=${!!pos}`);
            continue;
        }
        
        try {
            // Scale positions and sizes from layout
            const imgSize = pos.size * scale;
            let imgX = x + pos.x * scale;
            let imgY = y + pos.y * scale;
            
            // Clamp to card bounds
            imgX = Math.max(x + padding, Math.min(imgX, x + size - padding - imgSize));
            imgY = Math.max(y + padding, Math.min(imgY, y + size - padding - imgSize));
            
            // Extract format and base64 data from data URL
            // Format: data:image/png;base64,iVBORw0KGgo...
            let format = 'PNG';
            let imgDataToUse = imageData;
            
            if (imageData.startsWith('data:')) {
                const matches = imageData.match(/^data:image\/(\w+);base64,/);
                if (matches) {
                    const detectedFormat = matches[1].toUpperCase();
                    if (['PNG', 'JPEG', 'JPG', 'GIF', 'WEBP'].includes(detectedFormat)) {
                        format = detectedFormat === 'JPG' ? 'JPEG' : detectedFormat;
                    }
                }
            }
            
            pdf.addImage(imgDataToUse, format, imgX, imgY, imgSize, imgSize);
        } catch (e) {
            console.error(`Failed to add image ${symbolIndex} to PDF:`, e.message);
        }
    }
}

/**
 * Download the PDF
 * @param {jsPDF} pdf - PDF document
 * @param {string} filename - File name
 */
export function downloadPDF(pdf, filename = 'spot-it-cards.pdf') {
    pdf.save(filename);
}

/**
 * Generate and download PDF in one step
 */
export async function generateAndDownload(cards, images, layouts, onProgress = null) {
    try {
        const pdf = await generatePDF(cards, images, layouts, onProgress);
        downloadPDF(pdf);
        return true;
    } catch (error) {
        console.error('PDF generation failed:', error);
        throw error;
    }
}

