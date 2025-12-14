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
    
    // Seed-based pseudo-random for consistency
    const seededRandom = (seed) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };
    
    // Predefined size categories for variety (like real Spot It)
    // Increased sizes: Large, medium-large, medium, medium-small, small
    const sizeCategories = [0.42, 0.38, 0.34, 0.30, 0.26, 0.22];
    
    for (let cardIndex = 0; cardIndex < numCards; cardIndex++) {
        const positions = [];
        const center = cardSize / 2;
        const baseRadius = cardSize * 0.28; // Smaller radius to keep bigger images in bounds
        
        // Shuffle size assignments for this card
        const shuffledSizes = [...sizeCategories];
        for (let i = shuffledSizes.length - 1; i > 0; i--) {
            const swapIdx = Math.floor(seededRandom(cardIndex * 50 + i) * (i + 1));
            [shuffledSizes[i], shuffledSizes[swapIdx]] = [shuffledSizes[swapIdx], shuffledSizes[i]];
        }
        
        for (let i = 0; i < symbolsPerCard; i++) {
            const seed = cardIndex * 100 + i;
            const angleOffset = seededRandom(seed) * 0.4 - 0.2;
            const angle = (i / symbolsPerCard) * Math.PI * 2 + angleOffset;
            
            // Get size from shuffled categories, with some randomness
            const baseSizeRatio = shuffledSizes[i % shuffledSizes.length];
            const sizeVariation = 1 + (seededRandom(seed + 2) * 0.15 - 0.075); // ±7.5%
            const size = cardSize * baseSizeRatio * sizeVariation;
            
            // Spread symbols evenly, larger ones slightly toward center
            const sizeInfluence = baseSizeRatio / 0.42; // Normalize to 0-1
            const distVariation = seededRandom(seed + 1) * 0.25 + 0.6;
            const dist = baseRadius * distVariation * (1.2 - sizeInfluence * 0.4);
            
            const x = center + Math.cos(angle) * dist - size / 2;
            const y = center + Math.sin(angle) * dist - size / 2;
            const rotation = seededRandom(seed + 3) * 360;
            
            positions.push({ x, y, size, rotation });
        }
        
        layouts.push(positions);
    }
    
    return layouts;
}

