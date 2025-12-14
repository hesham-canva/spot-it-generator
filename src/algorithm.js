/**
 * Spot It Card Generation Algorithm
 * 
 * Based on finite projective plane mathematics.
 * For order n (where n is a prime number):
 * - Each card has n + 1 symbols
 * - Total cards = n² + n + 1
 * - Total symbols = n² + n + 1
 * - Any two cards share exactly one symbol
 * 
 * For standard Spot It: n = 7
 * - 8 symbols per card
 * - 57 total cards
 * - 57 total symbols
 */

/**
 * Generate all card configurations for a given order
 * @param {number} n - The order of the projective plane (must be prime)
 * @returns {number[][]} Array of cards, each card is an array of symbol indices
 */
export function generateCards(n = 7) {
    const cards = [];
    
    // First card: symbols 0 to n
    const firstCard = [];
    for (let i = 0; i <= n; i++) {
        firstCard.push(i);
    }
    cards.push(firstCard);
    
    // Next n cards: each contains symbol 0 and n symbols from first group
    for (let i = 0; i < n; i++) {
        const card = [0]; // Always include symbol 0
        for (let j = 0; j < n; j++) {
            card.push(n + 1 + i * n + j);
        }
        cards.push(card);
    }
    
    // Remaining n² cards
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const card = [i + 1]; // One symbol from first card (1 to n)
            for (let k = 0; k < n; k++) {
                const symbolIndex = n + 1 + k * n + ((i * k + j) % n);
                card.push(symbolIndex);
            }
            cards.push(card);
        }
    }
    
    return cards;
}

/**
 * Get the total number of symbols needed for a given order
 * @param {number} n - The order of the projective plane
 * @returns {number} Total number of unique symbols
 */
export function getTotalSymbols(n = 7) {
    return n * n + n + 1;
}

/**
 * Get the number of symbols per card for a given order
 * @param {number} n - The order of the projective plane
 * @returns {number} Number of symbols on each card
 */
export function getSymbolsPerCard(n = 7) {
    return n + 1;
}

/**
 * Verify that the generated cards are correct
 * (any two cards share exactly one symbol)
 * @param {number[][]} cards - Array of cards to verify
 * @returns {boolean} True if valid
 */
export function verifyCards(cards) {
    for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
            const shared = cards[i].filter(s => cards[j].includes(s));
            if (shared.length !== 1) {
                console.error(`Cards ${i} and ${j} share ${shared.length} symbols:`, shared);
                return false;
            }
        }
    }
    return true;
}

/**
 * Generate deterministic but varied layouts for all cards
 * Uses seeded randomness for consistency
 * @param {number} numCards - Number of cards
 * @param {number} symbolsPerCard - Symbols per card
 * @param {number} cardSize - Card size in pixels
 * @returns {Object[][]} Array of layouts for each card
 */
export function generateAllLayouts(numCards, symbolsPerCard = 8, cardSize = 200) {
    const layouts = [];
    
    // Seeded random for consistent shuffling
    const seededRandom = (seed) => {
        const x = Math.sin(seed * 9999) * 10000;
        return x - Math.floor(x);
    };
    
    // Seeded shuffle function
    const seededShuffle = (array, seed) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };
    
    // Calculate grid dimensions based on number of symbols
    const getGridDimensions = (n) => {
        if (n <= 2) return { cols: 2, rows: 1 };
        if (n <= 4) return { cols: 2, rows: 2 };
        if (n <= 6) return { cols: 3, rows: 2 };
        if (n <= 9) return { cols: 3, rows: 3 };
        return { cols: 4, rows: Math.ceil(n / 4) };
    };
    
    const { cols, rows } = getGridDimensions(symbolsPerCard);
    const padding = cardSize * 0.08; // Padding from card edges
    const availableWidth = cardSize - padding * 2;
    const availableHeight = cardSize - padding * 2;
    
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    
    // Symbol size fits within cell with some margin
    const symbolSize = Math.min(cellWidth, cellHeight) * 0.85;
    
    // Generate base grid positions
    const basePositions = [];
    for (let i = 0; i < symbolsPerCard; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        // Center symbol in its cell
        const cellX = padding + col * cellWidth;
        const cellY = padding + row * cellHeight;
        const x = cellX + (cellWidth - symbolSize) / 2;
        const y = cellY + (cellHeight - symbolSize) / 2;
        
        basePositions.push({ 
            x, 
            y, 
            size: symbolSize, 
            rotation: 0  // No rotation
        });
    }
    
    // For each card, shuffle the positions
    for (let cardIndex = 0; cardIndex < numCards; cardIndex++) {
        // Use card index as seed for consistent but different shuffles
        const shuffledPositions = seededShuffle(basePositions, cardIndex * 137);
        layouts.push(shuffledPositions);
    }
    
    return layouts;
}

