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

// Storage key for persistence
const STORAGE_KEY = 'spotit_state';

// DOM Elements
let elements = {};

/**
 * Save state to localStorage
 */
function saveState() {
    const stateToSave = {
        currentStep: state.currentStep,
        symbolCount: state.symbolCount,
        order: state.order,
        descriptions: state.descriptions,
        cards: state.cards,
        layouts: state.layouts,
        // Images are saved separately via API.cacheImage
        hasImages: state.images.filter(img => img).length > 0
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

/**
 * Load state from localStorage
 * @returns {boolean} True if state was restored
 */
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        
        const savedState = JSON.parse(saved);
        
        // Restore state
        state.currentStep = savedState.currentStep || 1;
        state.symbolCount = savedState.symbolCount || 57;
        state.order = savedState.order || 7;
        state.descriptions = savedState.descriptions || [];
        state.cards = savedState.cards || [];
        state.layouts = savedState.layouts || [];
        
        // Restore images from cache
        if (savedState.hasImages) {
            state.images = API.getAllCachedImages(state.symbolCount);
        }
        
        return state.currentStep > 1 || state.descriptions.length > 0;
    } catch (e) {
        console.error('Failed to load saved state:', e);
        return false;
    }
}

/**
 * Clear saved state
 */
function clearSavedState() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Initialize the application
 */
function init() {
    cacheElements();
    bindEvents();
    checkSavedApiKeys();
    
    // Try to restore saved state
    const hasRestoredState = loadState();
    
    if (hasRestoredState) {
        // Update symbol count dropdown
        if (elements.symbolCountSelect) {
            elements.symbolCountSelect.value = state.symbolCount.toString();
        }
        
        // Initialize grid with restored descriptions
        initializeSymbolsGrid();
        
        // Restore descriptions to input fields
        if (state.descriptions.length > 0) {
            const inputs = elements.symbolsGrid.querySelectorAll('input');
            state.descriptions.forEach((desc, i) => {
                if (inputs[i]) inputs[i].value = desc;
            });
            // Check if all descriptions are filled to enable Generate Images button
            checkSymbolsComplete();
        }
        
        // Restore images to grid if available
        if (state.images.length > 0) {
            restoreImageGrid();
        }
        
        // Generate card configurations
        generateCardConfigurations();
        
        // Go to saved step
        goToStep(state.currentStep);
        
        // Handle step-specific restoration
        if (state.currentStep === 3 && state.images.filter(img => img).length > 0) {
            // Restore image grid and show continue button
            restoreImageGrid();
            elements.btnContinueToPrint.classList.remove('hidden');
            elements.btnCancelGeneration.textContent = 'Back to Symbols';
            elements.imageProgressFill.style.width = '100%';
            elements.imageProgressText.textContent = `${state.images.filter(img => img).length} / ${state.symbolCount} images generated`;
        } else if (state.currentStep === 4 && state.images.length > 0) {
            renderCardsPreview();
            preparePrintContainer();
        }
        
        showToast('Progress restored! Continue where you left off.', 'success');
    } else {
        initializeSymbolsGrid();
        generateCardConfigurations();
    }
    
    updateCountDisplays();
}

/**
 * Restore image grid from cached images
 */
function restoreImageGrid() {
    const grid = elements.generatedImagesGrid;
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < state.symbolCount; i++) {
        const imageData = state.images[i];
        const description = state.descriptions[i] || `Symbol ${i + 1}`;
        
        const item = document.createElement('div');
        item.className = 'image-grid-item';
        item.id = `image-${i}`;
        
        if (imageData) {
            item.innerHTML = `
                <img src="${imageData}" alt="${description}" class="w-full h-full object-contain" />
                <span class="image-label">${description}</span>
            `;
        } else {
            item.innerHTML = `
                <div class="flex items-center justify-center h-full text-surface-400">
                    <span class="text-2xl">?</span>
                </div>
                <span class="image-label">${description}</span>
            `;
        }
        
        grid.appendChild(item);
    }
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
        
        btnDownloadPdf: document.getElementById('btn-download-pdf'),
        cardsPreview: document.getElementById('cards-preview'),
        btnStartOver: document.getElementById('btn-start-over'),
        btnContinueToPrint: document.getElementById('btn-continue-to-print'),
        
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
    
    elements.btnDownloadPdf.addEventListener('click', downloadPdf);
    elements.btnStartOver.addEventListener('click', startOver);
    elements.btnContinueToPrint.addEventListener('click', continueToPrint);
    
    // Step navigation - allow clicking on completed steps
    elements.steps.forEach(stepEl => {
        stepEl.addEventListener('click', () => handleStepClick(stepEl));
    });
}

/**
 * Handle click on step indicator
 */
function handleStepClick(stepEl) {
    const stepNum = parseInt(stepEl.dataset.step);
    
    // Only allow clicking on completed steps (before current step)
    if (stepNum >= state.currentStep) {
        return;
    }
    
    // Navigate to the clicked step
    navigateToStep(stepNum);
}

/**
 * Navigate to a specific step with proper state handling
 */
function navigateToStep(step) {
    // Handle any cleanup needed when leaving current step
    if (state.currentStep === 3) {
        // If leaving generation step, cancel any ongoing generation
        if (state.abortController) {
            state.abortController.abort();
            state.abortController = null;
        }
    }
    
    goToStep(step);
    
    // Handle any setup needed when entering the step
    if (step === 3 && state.images.filter(img => img).length > 0) {
        // Restore image grid if we have images
        restoreImageGrid();
        elements.btnContinueToPrint.classList.remove('hidden');
        elements.btnCancelGeneration.textContent = 'Back to Symbols';
        elements.imageProgressFill.style.width = '100%';
        elements.imageProgressText.textContent = `${state.images.filter(img => img).length} / ${state.symbolCount} images generated`;
    } else if (step === 4) {
        renderCardsPreview();
        preparePrintContainer();
    }
}

/**
 * Continue to print step after reviewing images
 */
function continueToPrint() {
    goToStep(4);
    renderCardsPreview();
    preparePrintContainer();
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
        saveState(); // Persist descriptions
        
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
    
    // Reset button states
    elements.btnContinueToPrint.classList.add('hidden');
    elements.btnCancelGeneration.textContent = 'Cancel';
    
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
            showToast('All images generated! Review them and continue when ready.', 'success');
        }
        
        // Show continue button instead of auto-navigating
        elements.btnContinueToPrint.classList.remove('hidden');
        elements.btnCancelGeneration.textContent = 'Back to Symbols';
        saveState();
        
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
 * Start over - clear all state and restart
 */
function startOver() {
    // Clear state
    state.currentStep = 1;
    state.descriptions = [];
    state.images = [];
    state.cards = [];
    state.layouts = [];
    
    // Clear caches
    API.clearImageCache();
    clearSavedState();
    
    // Reset UI
    const inputs = elements.symbolsGrid.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
    
    elements.themeInput.value = '';
    elements.btnGenerateImages.disabled = true;
    
    // Clear image grid
    if (elements.generatedImagesGrid) {
        elements.generatedImagesGrid.innerHTML = '';
    }
    
    // Clear cards preview
    if (elements.cardsPreview) {
        elements.cardsPreview.innerHTML = '';
    }
    
    // Regenerate card configurations
    generateCardConfigurations();
    
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
        stepEl.classList.remove('opacity-100', 'opacity-50', 'step-clickable', 'step-active', 'border-surface-500');
        
        const badge = stepEl.querySelector('.step-badge');
        const label = stepEl.querySelector('.step-label');
        badge.classList.remove('step-badge-active', 'step-badge-completed');
        label.classList.remove('text-gray-100', 'text-gray-400');
        
        if (stepNum < step) {
            // Completed step
            stepEl.classList.add('opacity-100', 'step-clickable', 'border-surface-500');
            badge.classList.add('step-badge-completed');
            label.classList.add('text-gray-100');
        } else if (stepNum === step) {
            // Current step
            stepEl.classList.add('opacity-100', 'step-active');
            badge.classList.add('step-badge-active');
            label.classList.add('text-gray-100');
        } else {
            // Future step
            stepEl.classList.add('opacity-50', 'border-surface-500');
            label.classList.add('text-gray-400');
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
    
    // Save state when navigating steps
    saveState();
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
