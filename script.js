/**
 * Realistic LED Light Bulb Controller
 * Simulates A21 LED bulb behavior with physical switch
 * Fixed keyboard brightness control with arrow keys
 */

class LEDLightBulb {
    constructor() {
        this.state = {
            isOn: false,
            brightness: 50, // 10-100%
            voltage: 0, // 0-120V simulation
            temperature: 72, // °F
            runtime: 0, // seconds
            powerDraw: 0, // watts
            totalEnergy: 0, // watt-hours
            lastUpdate: Date.now(),
            autoMode: false,
            autoInterval: null
        };

        this.init();
    }

    init() {
        this.loadState();
        this.cacheElements();
        this.setupEventListeners();
        this.setupKeyboardControls();
        this.updateUI();
        this.startRuntimeCounter();
        
        console.log('A21 LED Bulb Controller initialized');
    }

    loadState() {
        try {
            const saved = localStorage.getItem('ledBulbState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state.isOn = parsed.isOn || false;
                this.state.brightness = Math.max(10, Math.min(100, parsed.brightness || 50));
                this.state.totalEnergy = parsed.totalEnergy || 0;
            }
        } catch (error) {
            console.warn('Could not load saved state:', error);
        }
    }

    saveState() {
        try {
            localStorage.setItem('ledBulbState', JSON.stringify({
                isOn: this.state.isOn,
                brightness: this.state.brightness,
                totalEnergy: this.state.totalEnergy
            }));
        } catch (error) {
            console.warn('Could not save state:', error);
        }
    }

    cacheElements() {
        // Bulb elements
        this.elements = {
            bulbContainer: document.getElementById('bulb-container'),
            bulbGlass: document.getElementById('bulb-glass'),
            glowEffect: document.getElementById('glow-effect'),
            lightCast: document.getElementById('light-cast'),
            ledArray: document.querySelector('.led-array'),
            
            // Switch elements
            physicalSwitch: document.getElementById('physical-switch'),
            switchToggle: document.getElementById('switch-toggle'),
            onIndicator: document.querySelector('.on-indicator'),
            offIndicator: document.querySelector('.off-indicator'),
            
            // Brightness control
            brightnessSlider: document.getElementById('brightness-slider'),
            brightnessValue: document.getElementById('brightness-value'),
            
            // Status elements
            statusValue: document.getElementById('status-value'),
            powerValue: document.getElementById('power-value'),
            runtimeValue: document.getElementById('runtime-value'),
            tempValue: document.getElementById('temp-value'),
            
            // Buttons
            toggleBtn: document.getElementById('toggle-btn'),
            autoBtn: document.getElementById('auto-btn'),
            resetBtn: document.getElementById('reset-btn'),
            
            // Aria announcement
            ariaAnnouncement: document.getElementById('aria-announcement')
        };

        // Verify all required elements exist
        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element && key !== 'autoInterval') {
                console.warn(`Element not found: ${key}`);
            }
        });
    }

    setupEventListeners() {
        // Physical switch click
        this.elements.physicalSwitch.addEventListener('click', () => this.togglePower());
        this.elements.switchToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent double trigger
            this.togglePower();
        });

        // Toggle button
        this.elements.toggleBtn.addEventListener('click', () => this.togglePower());

        // Brightness slider
        this.elements.brightnessSlider.addEventListener('input', (e) => {
            this.setBrightness(parseInt(e.target.value, 10));
        });

        // Auto cycle button
        this.elements.autoBtn.addEventListener('click', () => this.toggleAutoMode());

        // Reset button
        this.elements.resetBtn.addEventListener('click', () => this.resetToDefault());

        // Prevent slider from toggling switch
        this.elements.brightnessSlider.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    setupKeyboardControls() {
        // Global keyboard controls
        document.addEventListener('keydown', (e) => {
            // Prevent default behavior for our keys
            const handledKeys = [' ', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
            
            if (handledKeys.includes(e.key)) {
                const target = e.target;
                const isSlider = target === this.elements.brightnessSlider;
                const isButton = target.tagName === 'BUTTON';
                
                // Handle space/enter on buttons (except slider)
                if ((e.key === ' ' || e.key === 'Enter') && !isSlider) {
                    e.preventDefault();
                    if (target === this.elements.toggleBtn) {
                        this.togglePower();
                    } else if (target === this.elements.autoBtn) {
                        this.toggleAutoMode();
                    } else if (target === this.elements.resetBtn) {
                        this.resetToDefault();
                    }
                }
                
                // Handle arrow keys for brightness control
                if (e.key.startsWith('Arrow') && !isSlider) {
                    e.preventDefault();
                    this.handleArrowKey(e.key);
                }
            }
        });

        // Specific keyboard handling for slider when focused
        this.elements.brightnessSlider.addEventListener('keydown', (e) => {
            if (e.key.startsWith('Arrow')) {
                e.stopPropagation(); // Prevent global handler from firing
                
                // Let the native slider behavior handle it
                // We'll update the value after a short delay to ensure DOM is updated
                setTimeout(() => {
                    const newValue = parseInt(this.elements.brightnessSlider.value, 10);
                    this.setBrightness(newValue);
                }, 10);
            }
        });
    }

    handleArrowKey(key) {
        const step = 5; // 5% per arrow press
        let newBrightness = this.state.brightness;

        switch (key) {
            case 'ArrowRight':
            case 'ArrowUp':
                newBrightness = Math.min(100, this.state.brightness + step);
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                newBrightness = Math.max(10, this.state.brightness - step);
                break;
        }

        if (newBrightness !== this.state.brightness) {
            this.setBrightness(newBrightness);
            this.updateSliderPosition();
            
            // Provide visual feedback for keyboard adjustment
            this.showKeyboardFeedback(key);
        }
    }

    showKeyboardFeedback(key) {
        const feedback = document.createElement('div');
        feedback.className = 'keyboard-feedback';
        feedback.textContent = key.includes('Right') || key.includes('Up') ? '▲ Brighter' : '▼ Dimmer';
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(33, 150, 243, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            z-index: 10000;
            animation: fadeOut 1s forwards;
        `;
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
        }, 800);
    }

    togglePower() {
        this.state.isOn = !this.state.isOn;
        
        // Add physics simulation
        if (this.state.isOn) {
            this.state.voltage = 120;
            this.simulatePowerOnSequence();
        } else {
            this.simulatePowerOffSequence();
        }
        
        this.updateUI();
        this.saveState();
        this.announceStateChange();
        this.logEvent('toggle');
    }

    simulatePowerOnSequence() {
        // Gradual brightness increase for realistic turn-on
        if (this.state.brightness < 30) {
            this.state.brightness = 30;
        }
        
        // Simulate LED warm-up
        const leds = document.querySelectorAll('.led');
        leds.forEach((led, index) => {
            setTimeout(() => {
                led.style.opacity = '0.8';
                led.style.boxShadow = `0 0 12px ${this.getLEDColor()}`;
            }, index * 100);
        });
        
        // Add subtle vibration for tactile feedback
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 30, 50]);
        }
    }

    simulatePowerOffSequence() {
        // Gradual fade for realistic turn-off
        const leds = document.querySelectorAll('.led');
        leds.forEach((led, index) => {
            setTimeout(() => {
                led.style.opacity = '0';
                led.style.boxShadow = 'none';
            }, index * 50);
        });
    }

    setBrightness(value) {
        const oldValue = this.state.brightness;
        const clampedValue = Math.max(10, Math.min(100, value));
        
        if (clampedValue !== oldValue) {
            this.state.brightness = clampedValue;
            
            // If bulb is off and brightness is increased above 30%, turn it on
            if (!this.state.isOn && clampedValue >= 30) {
                this.state.isOn = true;
                this.simulatePowerOnSequence();
            }
            
            this.updateUI();
            this.saveState();
            this.announceBrightnessChange(clampedValue);
            this.logEvent('brightness', { from: oldValue, to: clampedValue });
        }
    }

    updateSliderPosition() {
        if (this.elements.brightnessSlider) {
            this.elements.brightnessSlider.value = this.state.brightness;
        }
    }

    toggleAutoMode() {
        this.state.autoMode = !this.state.autoMode;
        
        if (this.state.autoMode) {
            this.startAutoCycle();
            this.elements.autoBtn.innerHTML = '<i class="fas fa-stop"></i><span>Stop Cycle</span>';
            this.elements.autoBtn.classList.add('active');
        } else {
            this.stopAutoCycle();
            this.elements.autoBtn.innerHTML = '<i class="fas fa-random"></i><span>Auto Cycle</span>';
            this.elements.autoBtn.classList.remove('active');
        }
    }

    startAutoCycle() {
        let direction = 1; // 1 for increasing, -1 for decreasing
        let currentValue = this.state.brightness;
        
        this.state.autoInterval = setInterval(() => {
            currentValue += direction * 10;
            
            if (currentValue >= 100) {
                currentValue = 100;
                direction = -1;
            } else if (currentValue <= 10) {
                currentValue = 10;
                direction = 1;
            }
            
            this.setBrightness(currentValue);
        }, 1000);
    }

    stopAutoCycle() {
        if (this.state.autoInterval) {
            clearInterval(this.state.autoInterval);
            this.state.autoInterval = null;
        }
    }

    resetToDefault() {
        this.state.isOn = false;
        this.state.brightness = 50;
        this.state.autoMode = false;
        
        this.stopAutoCycle();
        this.updateUI();
        this.saveState();
        this.announceReset();
        
        // Update auto button
        this.elements.autoBtn.innerHTML = '<i class="fas fa-random"></i><span>Auto Cycle</span>';
        this.elements.autoBtn.classList.remove('active');
    }

    updateUI() {
        const { isOn, brightness } = this.state;
        
        // Update bulb visual state
        this.updateBulbVisual(isOn, brightness);
        
        // Update switch state
        this.updateSwitchVisual(isOn);
        
        // Update brightness display
        this.updateBrightnessDisplay(brightness);
        
        // Update status panel
        this.updateStatusPanel();
        
        // Update button states
        this.updateButtonStates();
    }

    updateBulbVisual(isOn, brightness) {
        const brightnessFactor = brightness / 100;
        
        // Container classes
        this.elements.bulbContainer.classList.toggle('on', isOn);
        
        // LED array
        this.elements.ledArray.classList.toggle('on', isOn);
        
        // Glow effect
        this.elements.glowEffect.classList.toggle('on', isOn);
        if (isOn) {
            this.elements.glowEffect.style.opacity = brightnessFactor.toString();
        }
        
        // Light cast
        this.elements.lightCast.classList.toggle('on', isOn);
        if (isOn) {
            this.elements.lightCast.style.opacity = (brightnessFactor * 0.8).toString();
        }
        
        // Individual LEDs
        const leds = document.querySelectorAll('.led');
        leds.forEach(led => {
            if (isOn) {
                const intensity = brightnessFactor * 0.8 + 0.2;
                led.style.opacity = intensity.toString();
                led.style.boxShadow = `0 0 ${12 * brightnessFactor}px ${this.getLEDColor(brightnessFactor)}`;
            } else {
                led.style.opacity = '0';
                led.style.boxShadow = 'none';
            }
        });
    }

    getLEDColor(intensity = 1) {
        // Color temperature changes with intensity
        if (intensity < 0.3) return '#FFECB3'; // Very dim - warm white
        if (intensity < 0.6) return '#FFE08C'; // Medium - soft white
        if (intensity < 0.8) return '#FFD95C'; // Bright - daylight
        return '#FFB74D'; // Very bright - cool white
    }

    updateSwitchVisual(isOn) {
        // Toggle switch position
        this.elements.switchToggle.classList.toggle('on', isOn);
        
        // Update indicators
        this.elements.onIndicator.classList.toggle('active', isOn);
        this.elements.offIndicator.classList.toggle('active', !isOn);
        
        // Update switch background color
        const switchBase = document.querySelector('.switch-base');
        if (isOn) {
            switchBase.style.background = `linear-gradient(180deg, ${this.hexToRgba('#4CAF50', 0.3)} 0%, #37474F 100%)`;
        } else {
            switchBase.style.background = `linear-gradient(180deg, ${this.hexToRgba('#F44336', 0.3)} 0%, #37474F 100%)`;
        }
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    updateBrightnessDisplay(brightness) {
        this.elements.brightnessValue.textContent = `${brightness}%`;
        
        // Update slider position
        this.elements.brightnessSlider.value = brightness;
        
        // Update slider gradient based on brightness
        const slider = this.elements.brightnessSlider;
        const percent = brightness;
        slider.style.background = `linear-gradient(90deg, 
            #E0E0E0 0%, 
            #E0E0E0 10%, 
            #BBDEFB 10%, 
            #BBDEFB ${percent}%, 
            #2196F3 ${percent}%, 
            #2196F3 100%
        )`;
    }

    updateStatusPanel() {
        // Power status
        this.elements.statusValue.textContent = this.state.isOn ? 'ON' : 'OFF';
        this.elements.statusValue.style.color = this.state.isOn ? 
            'var(--success-color)' : 'var(--danger-color)';
        
        // Power draw calculation (14W LED at full brightness)
        const powerDraw = this.state.isOn ? 
            Math.round((14 * this.state.brightness / 100) * 10) / 10 : 0;
        this.state.powerDraw = powerDraw;
        this.elements.powerValue.textContent = `${powerDraw}W`;
        
        // Temperature simulation
        const baseTemp = 72;
        const heatIncrease = this.state.isOn ? (this.state.brightness / 100) * 15 : 0;
        this.state.temperature = Math.round(baseTemp + heatIncrease);
        this.elements.tempValue.textContent = `${this.state.temperature}°F`;
        
        // Runtime - handled by runtime counter
    }

    updateButtonStates() {
        // Toggle button
        const toggleIcon = this.elements.toggleBtn.querySelector('i');
        const toggleText = this.elements.toggleBtn.querySelector('span');
        
        if (this.state.isOn) {
            toggleIcon.className = 'fas fa-power-off';
            toggleText.textContent = 'Turn OFF';
            this.elements.toggleBtn.style.background = 
                'linear-gradient(135deg, var(--danger-color), #D32F2F)';
        } else {
            toggleIcon.className = 'fas fa-power-off';
            toggleText.textContent = 'Turn ON';
            this.elements.toggleBtn.style.background = 
                'linear-gradient(135deg, var(--success-color), #388E3C)';
        }
    }

    startRuntimeCounter() {
        setInterval(() => {
            if (this.state.isOn) {
                this.state.runtime++;
                
                // Update energy consumption (watt-hours)
                const hours = this.state.runtime / 3600;
                this.state.totalEnergy = Math.round(
                    (this.state.powerDraw * hours) * 100
                ) / 100;
                
                // Update runtime display
                const minutes = Math.floor(this.state.runtime / 60);
                const seconds = this.state.runtime % 60;
                this.elements.runtimeValue.textContent = 
                    `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    announceStateChange() {
        const message = this.state.isOn ? 
            `Light bulb turned ON at ${this.state.brightness}% brightness` :
            'Light bulb turned OFF';
        
        this.elements.ariaAnnouncement.textContent = message;
        
        // Force screen reader announcement
        setTimeout(() => {
            this.elements.ariaAnnouncement.textContent = '';
        }, 1000);
    }

    announceBrightnessChange(brightness) {
        const message = `Brightness set to ${brightness}%`;
        this.elements.ariaAnnouncement.textContent = message;
        
        setTimeout(() => {
            this.elements.ariaAnnouncement.textContent = '';
        }, 1000);
    }

    announceReset() {
        this.elements.ariaAnnouncement.textContent = 
            'Light bulb reset to default settings';
        
        setTimeout(() => {
            this.elements.ariaAnnouncement.textContent = '';
        }, 1000);
    }

    logEvent(type, data = {}) {
        const timestamp = new Date().toISOString();
        const event = {
            timestamp,
            type,
            state: { ...this.state },
            ...data
        };
        
        console.log(`[${timestamp}] ${type.toUpperCase()}:`, event);
    }

    // Public API for external control
    turnOn() {
        if (!this.state.isOn) this.togglePower();
    }

    turnOff() {
        if (this.state.isOn) this.togglePower();
    }

    setBrightnessLevel(level) {
        this.setBrightness(level);
    }

    getState() {
        return { ...this.state };
    }
}

// Initialize the application
let lightBulb;

document.addEventListener('DOMContentLoaded', () => {
    try {
        lightBulb = new LEDLightBulb();
        
        // Add CSS for keyboard feedback animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeOut {
                0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                70% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); }
            }
            
            .keyboard-feedback {
                animation: fadeOut 0.8s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
        
    } catch (error) {
        console.error('Failed to initialize light bulb:', error);
        
        // Show error state
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="error" style="text-align: center; padding: 40px;">
                    <h2>⚠️ Initialization Error</h2>
                    <p>Unable to load the light bulb controller.</p>
                    <p>Please check the console for details and refresh the page.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 24px; background: #2196F3; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Reload Application
                    </button>
                </div>
            `;
        }
    }
});

// Make available globally for debugging
window.LEDLightBulb = LEDLightBulb;
window.lightBulb = lightBulb;