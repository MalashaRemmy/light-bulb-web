/**
 * Light Bulb Controller - Enhanced Version
 * Features:
 * - Clean state management
 * - Accessibility support
 * - Keyboard navigation
 * - Brightness control
 * - SVG/fallback support
 */

// State management object
const LightBulbState = {
    isOn: false,
    brightness: 50,
    lastToggleTime: null,
    totalToggleCount: 0,
    energyConsumed: 0, // in "virtual watts"
    
    updateState(newState) {
        Object.assign(this, newState);
        this.persistToStorage();
        this.logState();
    },
    
    persistToStorage() {
        try {
            localStorage.setItem('lightBulbState', JSON.stringify({
                isOn: this.isOn,
                brightness: this.brightness,
                totalToggleCount: this.totalToggleCount
            }));
        } catch (error) {
            console.warn('Could not save state to localStorage:', error);
        }
    },
    
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('lightBulbState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.isOn = parsed.isOn || false;
                this.brightness = parsed.brightness || 50;
                this.totalToggleCount = parsed.totalToggleCount || 0;
            }
        } catch (error) {
            console.warn('Could not load state from localStorage:', error);
        }
    },
    
    logState() {
        console.log(`Bulb: ${this.isOn ? 'ON' : 'OFF'}, Brightness: ${this.brightness}%`);
    }
};

// DOM Elements cache with null checks
const DOM = {
    get bulbSvg() { return document.querySelector('.bulb-svg'); },
    get bulbFallback() { return document.getElementById('bulb-fallback'); },
    get toggleBtn() { return document.getElementById('toggleBtn'); },
    get bulbStatus() { return document.getElementById('bulb-status'); },
    get brightnessSlider() { return document.getElementById('brightness-slider'); },
    get brightnessValue() { return document.getElementById('brightness-value'); },
    get mainContent() { return document.getElementById('main-content'); }
};

// Initialize with error handling
function initApp() {
    try {
        // Load saved state
        LightBulbState.loadFromStorage();
        
        // Check for SVG support
        checkSVGSupport();
        
        // Set up DOM elements
        setupDOMReferences();
        
        // Initialize UI
        updateUI();
        
        // Add event listeners
        setupEventListeners();
        
        // Focus management
        setupFocusManagement();
        
        console.log('Light Bulb App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showErrorState();
    }
}

function checkSVGSupport() {
    const supportsSVG = !!document.createElementNS && 
                       !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;
    
    if (!supportsSVG) {
        document.documentElement.classList.add('no-svg');
    }
}

function setupDOMReferences() {
    // Verify all required elements exist
    const requiredElements = [
        DOM.toggleBtn,
        DOM.bulbStatus,
        DOM.brightnessSlider,
        DOM.brightnessValue
    ];
    
    requiredElements.forEach((element, index) => {
        if (!element) {
            throw new Error(`Required element not found at index ${index}`);
        }
    });
}

function setupEventListeners() {
    // Toggle button click
    DOM.toggleBtn.addEventListener('click', handleToggle);
    
    // Keyboard support for toggle button
    DOM.toggleBtn.addEventListener('keydown', (event) => {
        if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault();
            handleToggle();
        }
    });
    
    // Brightness slider
    DOM.brightnessSlider.addEventListener('input', handleBrightnessChange);
    
    // Keyboard navigation for slider
    DOM.brightnessSlider.addEventListener('keydown', (event) => {
        const step = event.shiftKey ? 10 : 1;
        
        switch(event.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                event.preventDefault();
                updateBrightness(LightBulbState.brightness - step);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                event.preventDefault();
                updateBrightness(LightBulbState.brightness + step);
                break;
            case 'Home':
                event.preventDefault();
                updateBrightness(10);
                break;
            case 'End':
                event.preventDefault();
                updateBrightness(100);
                break;
        }
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Alt + T to toggle
        if (event.altKey && event.key === 't') {
            event.preventDefault();
            handleToggle();
        }
        
        // Alt + B to focus brightness slider
        if (event.altKey && event.key === 'b') {
            event.preventDefault();
            DOM.brightnessSlider.focus();
        }
    });
}

function setupFocusManagement() {
    // Ensure the main content is focusable for skip links
    DOM.mainContent.tabIndex = -1;
    
    // Focus trap for accessibility (optional enhancement)
    document.addEventListener('focusin', (event) => {
        const focusableElements = [
            DOM.toggleBtn,
            DOM.brightnessSlider
        ].filter(el => el && !el.disabled);
        
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];
        
        if (event.target === firstFocusable && event.shiftKey) {
            event.preventDefault();
            lastFocusable.focus();
        } else if (event.target === lastFocusable && !event.shiftKey) {
            event.preventDefault();
            firstFocusable.focus();
        }
    });
}

function handleToggle() {
    LightBulbState.updateState({
        isOn: !LightBulbState.isOn,
        lastToggleTime: new Date().toISOString(),
        totalToggleCount: LightBulbState.totalToggleCount + 1,
        energyConsumed: LightBulbState.energyConsumed + (LightBulbState.isOn ? 0 : 10)
    });
    
    updateUI();
    provideHapticFeedback();
    logToggleEvent();
}

function handleBrightnessChange(event) {
    const newBrightness = parseInt(event.target.value, 10);
    updateBrightness(newBrightness);
}

function updateBrightness(newBrightness) {
    // Clamp value between min and max
    const clamped = Math.max(10, Math.min(100, newBrightness));
    
    LightBulbState.updateState({
        brightness: clamped
    });
    
    updateUI();
    
    // Update slider value if it changed
    if (DOM.brightnessSlider.value !== clamped.toString()) {
        DOM.brightnessSlider.value = clamped;
    }
}

function updateUI() {
    const { isOn, brightness } = LightBulbState;
    
    // Update button
    DOM.toggleBtn.setAttribute('aria-pressed', isOn.toString());
    DOM.toggleBtn.setAttribute('data-state', isOn ? 'on' : 'off');
    DOM.toggleBtn.querySelector('.btn-text').textContent = isOn ? 'Turn OFF' : 'Turn ON';
    
    // Update brightness display
    DOM.brightnessValue.textContent = `${brightness}%`;
    DOM.brightnessSlider.value = brightness;
    
    // Update bulb state
    updateBulbVisual(isOn, brightness);
    
    // Update status for screen readers
    updateScreenReaderStatus(isOn, brightness);
    
    // Update document title for context
    document.title = `Light Bulb - ${isOn ? 'ON' : 'OFF'} (${brightness}%)`;
}

function updateBulbVisual(isOn, brightness) {
    const normalizedBrightness = brightness / 100;
    
    if (document.documentElement.classList.contains('no-svg')) {
        // Fallback CSS implementation
        const bulb = DOM.bulbFallback;
        bulb.classList.toggle('on', isOn);
        bulb.classList.toggle('off', !isOn);
        
        if (isOn) {
            bulb.style.opacity = normalizedBrightness;
            bulb.style.boxShadow = `0 0 ${30 * normalizedBrightness}px rgba(255, 235, 59, ${normalizedBrightness})`;
        }
    } else {
        // SVG implementation
        const svg = DOM.bulbSvg;
        
        // Update classes
        svg.querySelector('.bulb-glass').classList.toggle('on', isOn);
        svg.querySelector('.bulb-filament').classList.toggle('on', isOn);
        svg.querySelector('.filament-base').classList.toggle('on', isOn);
        svg.querySelector('.bulb-glow').classList.toggle('on', isOn);
        
        // Update brightness
        if (isOn) {
            const glow = svg.querySelector('.bulb-glow');
            glow.style.opacity = normalizedBrightness * 0.7;
            
            // Adjust glow radius based on brightness
            const glowRadius = 45 + (normalizedBrightness * 10);
            glow.setAttribute('r', glowRadius);
        }
    }
}

function updateScreenReaderStatus(isOn, brightness) {
    const statusText = isOn 
        ? `Light bulb is ON at ${brightness}% brightness`
        : `Light bulb is OFF`;
    
    DOM.bulbStatus.textContent = statusText;
    
    // Force screen reader announcement
    setTimeout(() => {
        DOM.bulbStatus.textContent = '';
        setTimeout(() => {
            DOM.bulbStatus.textContent = statusText;
        }, 50);
    }, 100);
}

function provideHapticFeedback() {
    // Simple vibration feedback if supported
    if ('vibrate' in navigator && LightBulbState.isOn) {
        navigator.vibrate([30, 20, 30]);
    }
}

function logToggleEvent() {
    const now = new Date();
    console.log(`[${now.toLocaleTimeString()}] Bulb toggled to ${LightBulbState.isOn ? 'ON' : 'OFF'}`);
}

function showErrorState() {
    // Graceful degradation
    const errorHTML = `
        <div class="error-state" role="alert">
            <h2>⚠️ Something went wrong</h2>
            <p>We couldn't load the light bulb controller properly.</p>
            <p>Please refresh the page or check your browser console for details.</p>
        </div>
    `;
    
    if (DOM.mainContent) {
        DOM.mainContent.innerHTML = errorHTML;
    }
}

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LightBulbState, initApp };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}