// ============================================
// Clozzy Support Center - Configuration
// ============================================

/**
 * Environment Configuration Manager
 * Handles loading and validating environment variables
 */
class ConfigManager {
    constructor() {
        this.config = {};
        this.isLoaded = false;
        this.loadingPromise = null;
    }

    /**
     * Initialize configuration
     * @returns {Promise<Object>} Configuration object
     */
    async initialize() {
        if (this.isLoaded) {
            return this.config;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = this.loadConfig();
        
        try {
            this.config = await this.loadingPromise;
            this.isLoaded = true;
            this.validateConfig();
            console.log('✅ Configuration loaded successfully');
            return this.config;
        } catch (error) {
            console.error('❌ Failed to load configuration:', error);
            throw error;
        }
    }

    /**
     * Load configuration from various sources
     * @returns {Promise<Object>} Configuration object
     */
    async loadConfig() {
        // Try to load from window.ENV (set by server-side or inline script)
        if (window.ENV && Object.keys(window.ENV).length > 0) {
            return this.processConfig(window.ENV);
        }

        // Try to load from meta tags
        const metaConfig = this.loadFromMetaTags();
        if (Object.keys(metaConfig).length > 0) {
            return this.processConfig(metaConfig);
        }

        // Try to load from a config endpoint (production)
        try {
            const response = await fetch('/api/config', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const serverConfig = await response.json();
                return this.processConfig(serverConfig);
            }
        } catch (error) {
            console.warn('Could not load config from server:', error.message);
        }

        // Fallback to default configuration (development only)
        console.warn('⚠️ Using fallback configuration. This should not happen in production.');
        return this.getFallbackConfig();
    }

    /**
     * Process and normalize configuration
     * @param {Object} rawConfig - Raw configuration object
     * @returns {Object} Processed configuration
     */
    processConfig(rawConfig) {
        return {
            firebase: {
                apiKey: rawConfig.FIREBASE_API_KEY || rawConfig.firebase?.apiKey || '',
                authDomain: rawConfig.FIREBASE_AUTH_DOMAIN || rawConfig.firebase?.authDomain || '',
                projectId: rawConfig.FIREBASE_PROJECT_ID || rawConfig.firebase?.projectId || '',
                storageBucket: rawConfig.FIREBASE_STORAGE_BUCKET || rawConfig.firebase?.storageBucket || '',
                messagingSenderId: rawConfig.FIREBASE_MESSAGING_SENDER_ID || rawConfig.firebase?.messagingSenderId || '',
                appId: rawConfig.FIREBASE_APP_ID || rawConfig.firebase?.appId || ''
            },
            app: {
                name: rawConfig.APP_NAME || 'Clozzy',
                version: rawConfig.APP_VERSION || '1.0.0',
                supportEmail: rawConfig.SUPPORT_EMAIL || 'help@clozzy.app',
                website: rawConfig.APP_WEBSITE || 'https://clozzy.app'
            },
            features: {
                enableAnalytics: rawConfig.ENABLE_ANALYTICS === 'true' || rawConfig.features?.enableAnalytics || false,
                enableLogging: rawConfig.ENABLE_LOGGING !== 'false' && rawConfig.features?.enableLogging !== false,
                debugMode: rawConfig.DEBUG_MODE === 'true' || rawConfig.features?.debugMode || false
            },
            api: {
                baseUrl: rawConfig.API_BASE_URL || rawConfig.api?.baseUrl || '',
                configEndpoint: rawConfig.CONFIG_ENDPOINT || rawConfig.api?.configEndpoint || '/api/config'
            }
        };
    }

    /**
     * Load configuration from HTML meta tags
     * @returns {Object} Configuration from meta tags
     */
    loadFromMetaTags() {
        const config = {};
        const metaTags = document.querySelectorAll('meta[name^="config-"]');
        
        metaTags.forEach(tag => {
            const key = tag.getAttribute('name')
                .replace('config-', '')
                .toUpperCase()
                .replace(/-/g, '_');
            config[key] = tag.getAttribute('content');
        });

        return config;
    }

    /**
     * Get fallback configuration for development
     * @returns {Object} Fallback configuration
     */
    getFallbackConfig() {
        return {
            firebase: {
                apiKey: "AIzaSyDboAkuycuusLIxaKPuxKA7vUhLRc-Zwm8",
                authDomain: "clozzy-early-access.firebaseapp.com",
                projectId: "clozzy-early-access",
                storageBucket: "clozzy-early-access.firebasestorage.app",
                messagingSenderId: "60518810918",
                appId: "1:60518810918:web:9aa4a937b08427a65cede7"
            },
            app: {
                name: "Clozzy",
                version: "1.0.0",
                supportEmail: "help@clozzy.app",
                website: "https://clozzy.app"
            },
            features: {
                enableAnalytics: false,
                enableLogging: true,
                debugMode: false
            },
            api: {
                baseUrl: "",
                configEndpoint: "/api/config"
            }
        };
    }

    /**
     * Validate required configuration values
     * @throws {Error} If required values are missing
     */
    validateConfig() {
        const required = [
            { path: 'firebase.apiKey', name: 'Firebase API Key' },
            { path: 'firebase.projectId', name: 'Firebase Project ID' },
            { path: 'firebase.appId', name: 'Firebase App ID' }
        ];

        for (const req of required) {
            const value = this.get(req.path);
            if (!value || value === '') {
                throw new Error(`Missing required configuration: ${req.name}`);
            }
        }
    }

    /**
     * Get a configuration value by dot notation path
     * @param {string} path - Dot notation path (e.g., 'firebase.apiKey')
     * @returns {*} Configuration value
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Check if running in development mode
     * @returns {boolean}
     */
    isDevelopment() {
        return this.config.features?.debugMode || 
               window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1';
    }

    /**
     * Check if running in production mode
     * @returns {boolean}
     */
    isProduction() {
        return !this.isDevelopment();
    }
}

// Create and export singleton instance
const configManager = new ConfigManager();

// Export for use in other modules
export default configManager;

// Also make available globally for non-module scripts
window.configManager = configManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        configManager.initialize().catch(error => {
            console.error('Failed to initialize config:', error);
        });
    });
} else {
    configManager.initialize().catch(error => {
        console.error('Failed to initialize config:', error);
    });
}