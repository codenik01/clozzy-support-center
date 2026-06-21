// ============================================
// Clozzy Support Center - Firebase Service
// ============================================

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy,
    limit,
    where,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import configManager from './config.js';

/**
 * Firebase Service Class
 * Handles all Firebase operations for the support center
 */
class FirebaseService {
    constructor() {
        this.app = null;
        this.db = null;
        this.initialized = false;
        this.initializationPromise = null;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize Firebase with configuration
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeFirebase();
        
        try {
            await this.initializationPromise;
            this.initialized = true;
            console.log('🔥 Firebase initialized successfully');
        } catch (error) {
            console.error('🔥 Firebase initialization failed:', error);
            this.initializationPromise = null;
            throw error;
        }
    }

    /**
     * Internal Firebase initialization
     * @returns {Promise<void>}
     */
    async _initializeFirebase() {
        // Get configuration
        await configManager.initialize();
        const config = configManager.get('firebase');

        if (!config || !config.apiKey) {
            throw new Error('Firebase configuration not found');
        }

        const firebaseConfig = {
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId
        };

        try {
            // Check if Firebase app already exists
            if (getApps().length === 0) {
                this.app = initializeApp(firebaseConfig);
            } else {
                this.app = getApp();
            }

            this.db = getFirestore(this.app);
            
            // Test connection
            await this.testConnection();
        } catch (error) {
            console.error('Firebase initialization error:', error);
            throw error;
        }
    }

    /**
     * Test Firebase connection
     * @returns {Promise<boolean>}
     */
    async testConnection() {
        try {
            const testRef = collection(this.db, '_connection_test');
            const testDoc = doc(testRef, 'test');
            await getDoc(testDoc);
            return true;
        } catch (error) {
            console.warn('Firebase connection test failed:', error.message);
            return false;
        }
    }

    /**
     * Get help articles from Firestore
     * @param {Object} options - Query options
     * @returns {Promise<Array>} Array of articles
     */
    async getHelpArticles(options = {}) {
        if (!this.initialized) {
            await this.initialize();
        }

        const {
            category = null,
            limit: limitCount = 50,
            useCache = true
        } = options;

        // Check cache
        const cacheKey = `articles_${category || 'all'}_${limitCount}`;
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const articlesRef = collection(this.db, "helpArticles");
            let q = query(articlesRef, orderBy("createdAt", "desc"));
            
            if (limitCount) {
                q = query(q, limit(limitCount));
            }
            
            if (category && category !== 'all') {
                q = query(q, where("category", "==", category));
            }

            const querySnapshot = await getDocs(q);
            const articles = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                articles.push({
                    id: doc.id,
                    title: data.title || 'Untitled',
                    description: data.description || '',
                    category: data.category || 'general',
                    icon: data.icon || 'fa-file-alt',
                    tag: data.tag || 'help',
                    detail: data.detail || '',
                    steps: data.steps || [],
                    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
                    updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null
                });
            });

            // Update cache
            if (useCache) {
                this.cache.set(cacheKey, {
                    data: articles,
                    timestamp: Date.now()
                });
            }

            return articles;
        } catch (error) {
            console.error('Error fetching articles:', error);
            throw error;
        }
    }

    /**
     * Get a single article by ID
     * @param {string} articleId - Article ID
     * @returns {Promise<Object|null>}
     */
    async getArticleById(articleId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const articleRef = doc(this.db, "helpArticles", articleId);
            const articleDoc = await getDoc(articleRef);
            
            if (articleDoc.exists()) {
                return {
                    id: articleDoc.id,
                    ...articleDoc.data()
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error fetching article:', error);
            throw error;
        }
    }

    /**
     * Submit a support ticket
     * @param {Object} ticketData - Ticket data
     * @returns {Promise<Object>} Result with ticket ID
     */
    async submitSupportTicket(ticketData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!ticketData.email || !ticketData.message) {
            throw new Error('Email and message are required');
        }

        try {
            const ticketsRef = collection(this.db, "supportTickets");
            
            const ticket = {
                email: ticketData.email,
                message: ticketData.message,
                category: ticketData.category || 'general',
                searchQuery: ticketData.searchQuery || '',
                status: 'open',
                priority: 'normal',
                app: configManager.get('app.name'),
                appVersion: configManager.get('app.version'),
                platform: this.getPlatform(),
                userAgent: navigator.userAgent,
                language: navigator.language,
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                metadata: {
                    url: window.location.href,
                    referrer: document.referrer,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            const docRef = await addDoc(ticketsRef, ticket);
            
            console.log('Ticket submitted successfully:', docRef.id);
            
            return {
                success: true,
                ticketId: docRef.id,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error submitting ticket:', error);
            throw error;
        }
    }

    /**
     * Get user's ticket history by email
     * @param {string} email - User email
     * @returns {Promise<Array>} Array of tickets
     */
    async getTicketHistory(email) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const ticketsRef = collection(this.db, "supportTickets");
            const q = query(
                ticketsRef, 
                where("email", "==", email),
                orderBy("createdAt", "desc"),
                limit(10)
            );
            
            const querySnapshot = await getDocs(q);
            const tickets = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                tickets.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
                });
            });
            
            return tickets;
        } catch (error) {
            console.error('Error fetching ticket history:', error);
            throw error;
        }
    }

    /**
     * Search articles (client-side filtering)
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} Filtered articles
     */
    async searchArticles(searchTerm) {
        if (!this.initialized) {
            await this.initialize();
        }

        // Since Firestore doesn't support full-text search,
        // we fetch all articles and filter client-side
        const articles = await this.getHelpArticles({ useCache: true });
        
        if (!searchTerm || searchTerm.trim() === '') {
            return articles;
        }

        const term = searchTerm.toLowerCase().trim();
        
        return articles.filter(article => {
            return (
                (article.title && article.title.toLowerCase().includes(term)) ||
                (article.description && article.description.toLowerCase().includes(term)) ||
                (article.tag && article.tag.toLowerCase().includes(term)) ||
                (article.detail && article.detail.toLowerCase().includes(term)) ||
                (article.category && article.category.toLowerCase().includes(term))
            );
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Firebase cache cleared');
    }

    /**
     * Get platform information
     * @returns {string} Platform name
     */
    getPlatform() {
        const ua = navigator.userAgent;
        
        if (/Android/i.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
        if (/Windows/i.test(ua)) return 'Windows';
        if (/Mac/i.test(ua)) return 'macOS';
        if (/Linux/i.test(ua)) return 'Linux';
        
        return 'Unknown';
    }

    /**
     * Track analytics event (if enabled)
     * @param {string} eventName - Event name
     * @param {Object} eventData - Event data
     */
    async trackEvent(eventName, eventData = {}) {
        if (!configManager.get('features.enableAnalytics')) {
            return;
        }

        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const analyticsRef = collection(this.db, "analytics");
            await addDoc(analyticsRef, {
                event: eventName,
                data: eventData,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                page: window.location.pathname
            });
        } catch (error) {
            console.warn('Analytics tracking failed:', error);
        }
    }
}

// Create and export singleton instance
const firebaseService = new FirebaseService();

export default firebaseService;