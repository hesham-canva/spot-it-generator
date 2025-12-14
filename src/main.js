/**
 * Spot It Generator - Main Application
 */

import './styles.css';
import * as Algorithm from './algorithm.js';
import * as API from './openai.js';
import * as PDF from './pdf.js';

// Symbol count to order mapping
const SYMBOL_COUNT_TO_ORDER = {
    7: 2,   // 7 symbols, 7 cards, 3 per card
    13: 3,  // 13 symbols, 13 cards, 4 per card
    31: 5,  // 31 symbols, 31 cards, 6 per card
    57: 7   // 57 symbols, 57 cards, 8 per card
};

// State
const state = {
    currentStep: 1,
    symbolCount: 57,
    order: 7,
    descriptions: [],
    images: [],
    cards: [],
    layouts: [],
    abortController: null
};

// DOM Elements
let elements = {};

/**
 * Initialize the application
 */
function init() {
    cacheElements();
    bindEvents();
    initializeSymbolsGrid();
    checkSavedApiKeys();
    generateCardConfigurations();
    updateCountDisplays();
}

/**
 * Cache DOM elements
 */
function cacheElements() {
    elements = {
        panelApi: document.getElementById('panel-api'),
        panelSymbols: document.getElementById('panel-symbols'),
        panelGenerate: document.getElementById('panel-generate'),
        panelPreview: document.getElementById('panel-preview'),
        
        openaiKeyInput: document.getElementById('openai-key'),
        leonardoKeyInput: document.getElementById('leonardo-key'),
        leonardoStyleSelect: document.getElementById('leonardo-style'),
        toggleOpenaiVisibility: document.getElementById('toggle-openai-visibility'),
        toggleLeonardoVisibility: document.getElementById('toggle-leonardo-visibility'),
        btnSaveKeys: document.getElementById('btn-save-keys'),
        
        symbolCountSelect: document.getElementById('symbol-count'),
        themeInput: document.getElementById('theme-input'),
        btnGenerateDescriptions: document.getElementById('btn-generate-descriptions'),
        symbolsProgress: document.getElementById('symbols-progress'),
        descProgressFill: document.getElementById('desc-progress-fill'),
        descProgressText: document.getElementById('desc-progress-text'),
        symbolsGrid: document.getElementById('symbols-grid'),
        btnBackToApi: document.getElementById('btn-back-to-api'),
        btnGenerateImages: document.getElementById('btn-generate-images'),
        
        imageProgressFill: document.getElementById('image-progress-fill'),
        imageProgressText: document.getElementById('image-progress-text'),
        generatedImagesGrid: document.getElementById('generated-images-grid'),
        btnCancelGeneration: document.getElementById('btn-cancel-generation'),
        
        btnBrowserPrint: document.getElementById('btn-browser-print'),
        btnDownloadPdf: document.getElementById('btn-download-pdf'),
        cardsPreview: document.getElementById('cards-preview'),
        btnStartOver: document.getElementById('btn-start-over'),
        
        printContainer: document.getElementById('print-container'),
        toastContainer: document.getElementById('toast-container'),
        steps: document.querySelectorAll('.step'),
        
        // Dynamic count displays
        symbolsHeaderCount: document.getElementById('symbols-header-count'),
        generateHeaderCount: document.getElementById('generate-header-count'),
        previewCardCount: document.getElementById('preview-card-count')
    };
}

/**
 * Bind events
 */
function bindEvents() {
    elements.toggleOpenaiVisibility.addEventListener('click', () => toggleKeyVisibility('openai'));
    elements.toggleLeonardoVisibility.addEventListener('click', () => toggleKeyVisibility('leonardo'));
    elements.btnSaveKeys.addEventListener('click', saveApiKeys);
    
    elements.symbolCountSelect.addEventListener('change', handleSymbolCountChange);
    elements.btnGenerateDescriptions.addEventListener('click', generateDescriptions);
    elements.btnBackToApi.addEventListener('click', () => goToStep(1));
    elements.btnGenerateImages.addEventListener('click', startImageGeneration);
    
    elements.btnCancelGeneration.addEventListener('click', cancelGeneration);
    
    elements.btnBrowserPrint.addEventListener('click', browserPrint);
    elements.btnDownloadPdf.addEventListener('click', downloadPdf);
    elements.btnStartOver.addEventListener('click', startOver);
}

/**
 * Handle symbol count change
 */
function handleSymbolCountChange() {
    const count = parseInt(elements.symbolCountSelect.value);
    state.symbolCount = count;
    state.order = SYMBOL_COUNT_TO_ORDER[count];
    
    // Clear existing descriptions
    state.descriptions = [];
    
    // Regenerate grid and cards
    initializeSymbolsGrid();
    generateCardConfigurations();
    
    // Update count displays
    updateCountDisplays();
    
    // Disable generate button until symbols are filled
    elements.btnGenerateImages.disabled = true;
}

/**
 * Update all count displays in the UI
 */
function updateCountDisplays() {
    const symbolCount = state.symbolCount;
    const cardCount = state.cards.length;
    
    if (elements.symbolsHeaderCount) {
        elements.symbolsHeaderCount.textContent = symbolCount;
    }
    if (elements.generateHeaderCount) {
        elements.generateHeaderCount.textContent = symbolCount;
    }
    if (elements.previewCardCount) {
        elements.previewCardCount.textContent = cardCount;
    }
}

/**
 * Generate card configurations
 */
function generateCardConfigurations() {
    const symbolsPerCard = state.order + 1;
    state.cards = Algorithm.generateCards(state.order);
    state.layouts = Algorithm.generateAllLayouts(state.cards.length, symbolsPerCard, 200);
    console.log(`Generated ${state.cards.length} cards with ${symbolsPerCard} symbols each`);
}

/**
 * Initialize symbol input grid
 */
function initializeSymbolsGrid() {
    const grid = elements.symbolsGrid;
    grid.innerHTML = '';
    
    for (let i = 0; i < state.symbolCount; i++) {
        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-2 bg-surface-700 border border-surface-500 rounded-xl transition-colors focus-within:border-accent-orange';
        item.innerHTML = `
            <span class="min-w-[32px] h-8 flex items-center justify-center bg-surface-800 rounded-lg text-xs font-semibold text-gray-500">${i + 1}</span>
            <input type="text" 
                   data-index="${i}" 
                   placeholder="Symbol description..."
                   class="flex-1 bg-transparent border-none text-gray-100 font-outfit text-sm outline-none placeholder:text-gray-500">
        `;
        grid.appendChild(item);
    }
    
    grid.addEventListener('input', checkSymbolsComplete);
}

/**
 * Check for saved API keys and style
 */
function checkSavedApiKeys() {
    const savedOpenaiKey = API.getOpenAIApiKey();
    const savedLeonardoKey = API.getLeonardoApiKey();
    const savedStyle = API.getLeonardoStyle();
    
    if (savedOpenaiKey) {
        elements.openaiKeyInput.value = savedOpenaiKey;
    }
    if (savedLeonardoKey) {
        elements.leonardoKeyInput.value = savedLeonardoKey;
    }
    // Style dropdown is in symbols step, restore it there
    if (savedStyle && elements.leonardoStyleSelect) {
        elements.leonardoStyleSelect.value = savedStyle;
    }
}

/**
 * Toggle key visibility
 */
function toggleKeyVisibility(type) {
    const input = type === 'openai' ? elements.openaiKeyInput : elements.leonardoKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
}

/**
 * Save API keys
 */
function saveApiKeys() {
    const openaiKey = elements.openaiKeyInput.value.trim();
    const leonardoKey = elements.leonardoKeyInput.value.trim();
    
    if (!openaiKey) {
        showToast('Please enter your OpenAI API key', 'error');
        return;
    }
    
    if (!openaiKey.startsWith('sk-')) {
        showToast('Invalid OpenAI API key format (should start with sk-)', 'error');
        return;
    }
    
    if (!leonardoKey) {
        showToast('Please enter your Leonardo API key', 'error');
        return;
    }
    
    API.setOpenAIApiKey(openaiKey);
    API.setLeonardoApiKey(leonardoKey);
    showToast('API keys saved!', 'success');
    goToStep(2);
}

/**
 * Generate descriptions with AI
 */
async function generateDescriptions() {
    const theme = elements.themeInput.value.trim();
    
    elements.symbolsProgress.classList.remove('hidden');
    elements.btnGenerateDescriptions.disabled = true;
    
    try {
        state.descriptions = await API.generateDescriptions(
            theme,
            state.symbolCount,
            (progress, status) => {
                elements.descProgressFill.style.width = `${progress}%`;
                elements.descProgressText.textContent = status;
            }
        );
        
        const inputs = elements.symbolsGrid.querySelectorAll('input');
        inputs.forEach((input, i) => {
            if (state.descriptions[i]) {
                input.value = state.descriptions[i];
            }
        });
        
        showToast(`Generated ${state.symbolCount} symbol descriptions!`, 'success');
        checkSymbolsComplete();
        
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        elements.symbolsProgress.classList.add('hidden');
        elements.btnGenerateDescriptions.disabled = false;
    }
}

/**
 * Check if all symbols are filled
 */
function checkSymbolsComplete() {
    const inputs = elements.symbolsGrid.querySelectorAll('input');
    let filledCount = 0;
    
    inputs.forEach(input => {
        if (input.value.trim()) filledCount++;
    });
    
    elements.btnGenerateImages.disabled = filledCount < state.symbolCount;
    state.descriptions = Array.from(inputs).map(input => input.value.trim());
}

/**
 * Start image generation
 */
async function startImageGeneration() {
    const inputs = elements.symbolsGrid.querySelectorAll('input');
    state.descriptions = Array.from(inputs).map(input => input.value.trim());
    
    const emptyCount = state.descriptions.filter(d => !d).length;
    if (emptyCount > 0) {
        showToast(`Please fill in all ${emptyCount} empty descriptions`, 'warning');
        return;
    }
    
    // Save the selected style
    const selectedStyle = elements.leonardoStyleSelect.value;
    API.setLeonardoStyle(selectedStyle);
    
    goToStep(3);
    initializeImageGrid();
    
    // Reset progress text with correct count
    elements.imageProgressText.textContent = `0 / ${state.symbolCount} images generated`;
    
    state.abortController = new AbortController();
    
    try {
        state.images = await API.generateAllImages(
            state.descriptions,
            (current, total, status) => {
                const progress = (current / total) * 100;
                elements.imageProgressFill.style.width = `${progress}%`;
                elements.imageProgressText.textContent = `${current} / ${total} images generated`;
            },
            (index, imageData, error) => {
                updateImageCell(index, imageData, error);
            },
            state.abortController.signal
        );
        
        const successCount = state.images.filter(img => img).length;
        if (successCount < state.symbolCount) {
            showToast(`Generated ${successCount}/${state.symbolCount} images. Some failed.`, 'warning');
        } else {
            showToast('All images generated!', 'success');
        }
        
        goToStep(4);
        renderCardsPreview();
        preparePrintContainer();
        
    } catch (error) {
        if (error.message === 'Generation cancelled') {
            showToast('Generation cancelled', 'warning');
            goToStep(2);
        } else {
            showToast(error.message, 'error');
        }
    }
}

/**
 * Initialize image grid
 */
function initializeImageGrid() {
    const grid = elements.generatedImagesGrid;
    grid.innerHTML = '';
    
    for (let i = 0; i < state.symbolCount; i++) {
        const cell = document.createElement('div');
        cell.className = 'symbol-cell';
        cell.id = `image-cell-${i}`;
        cell.title = state.descriptions[i] || `Symbol ${i + 1}`;
        cell.innerHTML = `
            <div class="w-6 h-6 border-2 border-surface-500 border-t-accent-orange rounded-full animate-spin"></div>
        `;
        grid.appendChild(cell);
    }
}

/**
 * Update image cell
 */
function updateImageCell(index, imageData, error = null) {
    const cell = document.getElementById(`image-cell-${index}`);
    if (!cell) return;
    
    if (error) {
        cell.classList.add('border-red-400');
        cell.innerHTML = `<span class="text-red-400 text-xs">!</span>`;
        cell.title = `Error: ${error.message}`;
    } else if (imageData) {
        cell.classList.add('border-emerald-500');
        cell.innerHTML = `<img src="${imageData}" alt="${state.descriptions[index]}" class="w-full h-full object-contain">`;
    }
}

/**
 * Cancel generation
 */
function cancelGeneration() {
    if (state.abortController) {
        state.abortController.abort();
    }
}

/**
 * Render cards preview
 */
function renderCardsPreview() {
    const container = elements.cardsPreview;
    container.innerHTML = '';
    
    state.cards.forEach((card, cardIndex) => {
        const cardEl = createCardElement(card, state.layouts[cardIndex], 180);
        container.appendChild(cardEl);
    });
}

/**
 * Create card element
 */
function createCardElement(symbolIndices, layout, size) {
    const card = document.createElement('div');
    card.className = 'card-square';
    card.style.width = `${size}px`;
    card.style.height = `${size}px`;
    
    const scale = size / 200;
    
    symbolIndices.forEach((symbolIndex, i) => {
        const pos = layout[i];
        const imageData = state.images[symbolIndex];
        
        if (imageData && pos) {
            const symbol = document.createElement('div');
            symbol.className = 'absolute flex items-center justify-center';
            symbol.style.left = `${pos.x * scale}px`;
            symbol.style.top = `${pos.y * scale}px`;
            symbol.style.width = `${pos.size * scale}px`;
            symbol.style.height = `${pos.size * scale}px`;
            symbol.style.transform = `rotate(${pos.rotation}deg)`;
            
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = state.descriptions[symbolIndex];
            img.className = 'w-full h-full object-contain';
            
            symbol.appendChild(img);
            card.appendChild(symbol);
        }
    });
    
    return card;
}

/**
 * Prepare print container
 */
function preparePrintContainer() {
    const container = elements.printContainer;
    container.innerHTML = '';
    
    const cardsPerPage = 9;
    const totalPages = Math.ceil(state.cards.length / cardsPerPage);
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const page = document.createElement('div');
        page.className = 'print-page';
        
        const grid = document.createElement('div');
        grid.className = 'print-cards-grid';
        
        const startCard = pageIndex * cardsPerPage;
        const endCard = Math.min(startCard + cardsPerPage, state.cards.length);
        
        for (let i = startCard; i < endCard; i++) {
            const cardEl = createPrintCard(state.cards[i], state.layouts[i]);
            grid.appendChild(cardEl);
        }
        
        page.appendChild(grid);
        container.appendChild(page);
    }
}

/**
 * Create print card
 */
function createPrintCard(symbolIndices, layout) {
    const card = document.createElement('div');
    card.className = 'print-card';
    
    symbolIndices.forEach((symbolIndex, i) => {
        const pos = layout[i];
        const imageData = state.images[symbolIndex];
        
        if (imageData && pos) {
            const symbol = document.createElement('div');
            symbol.className = 'absolute flex items-center justify-center';
            symbol.style.left = `${pos.x / 200 * 100}%`;
            symbol.style.top = `${pos.y / 200 * 100}%`;
            symbol.style.width = `${pos.size / 200 * 100}%`;
            symbol.style.height = `${pos.size / 200 * 100}%`;
            symbol.style.transform = `rotate(${pos.rotation}deg)`;
            
            const img = document.createElement('img');
            img.src = imageData;
            img.alt = state.descriptions[symbolIndex];
            img.className = 'w-full h-full object-contain';
            
            symbol.appendChild(img);
            card.appendChild(symbol);
        }
    });
    
    return card;
}

/**
 * Browser print
 */
function browserPrint() {
    window.print();
}

/**
 * Download PDF
 */
async function downloadPdf() {
    const btn = elements.btnDownloadPdf;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin">⏳</span> Generating...`;
    
    try {
        await PDF.generateAndDownload(
            state.cards,
            state.images,
            state.layouts,
            (current, total, status) => {
                btn.innerHTML = `<span class="animate-spin">⏳</span> ${status}`;
            }
        );
        showToast('PDF downloaded!', 'success');
    } catch (error) {
        showToast('Failed to generate PDF: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Start over
 */
function startOver() {
    state.descriptions = [];
    state.images = [];
    API.clearImageCache();
    
    const inputs = elements.symbolsGrid.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    
    elements.themeInput.value = '';
    elements.btnGenerateImages.disabled = true;
    
    goToStep(1);
    showToast('Ready to create new cards!', 'success');
}

/**
 * Navigate to step
 */
function goToStep(step) {
    state.currentStep = step;
    
    elements.steps.forEach(stepEl => {
        const stepNum = parseInt(stepEl.dataset.step);
        stepEl.classList.remove('opacity-100', 'opacity-50');
        
        const badge = stepEl.querySelector('.step-badge');
        badge.classList.remove('step-badge-active', 'step-badge-completed');
        
        if (stepNum < step) {
            stepEl.classList.add('opacity-100');
            badge.classList.add('step-badge-completed');
        } else if (stepNum === step) {
            stepEl.classList.add('opacity-100');
            badge.classList.add('step-badge-active');
        } else {
            stepEl.classList.add('opacity-50');
        }
    });
    
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const panelMap = {
        1: elements.panelApi,
        2: elements.panelSymbols,
        3: elements.panelGenerate,
        4: elements.panelPreview
    };
    
    if (panelMap[step]) {
        panelMap[step].classList.add('active');
    }
}

/**
 * Show toast
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);
