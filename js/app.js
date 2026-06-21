// ============================================
// Clozzy Support Center - Main Application
// ============================================

import firebaseService from './firebase.js';
import configManager from './config.js';

/**
 * Clozzy Support Application Class
 * Main controller for the support center
 */
class ClozzySupportApp {
    constructor() {
        // State
        this.articles = [];
        this.filteredArticles = [];
        this.activeFeature = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        this.currentArticle = null;
        
        // Configuration
        this.config = {};
        
        // DOM Elements cache
        this.elements = {};
        
        // Bind methods
        this.handleFeatureClick = this.handleFeatureClick.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleArticleClick = this.handleArticleClick.bind(this);
        this.handleTicketSubmit = this.handleTicketSubmit.bind(this);
        this.handleKeyboard = this.handleKeyboard.bind(this);
        
        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Show loading state
            this.showInitialLoader();
            
            // Load configuration
            this.config = await configManager.initialize();
            
            // Cache DOM elements
            this.cacheElements();
            
            // Bind events
            this.bindEvents();
            
            // Initialize Firebase
            await firebaseService.initialize();
            
            // Load articles
            await this.loadArticles();
            
            // Track page view
            this.trackPageView();
            
            // Hide loader
            this.hideInitialLoader();
            
            console.log('✅ Clozzy Support App initialized successfully');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Main containers
            articlesGrid: document.getElementById('articlesGrid'),
            featureScroll: document.getElementById('featureScroll'),
            
            // Search
            searchInput: document.getElementById('searchInput'),
            
            // Feature pills
            featurePills: document.querySelectorAll('.feature-pill'),
            
            // Loading
            loadingIndicator: document.getElementById('loadingIndicator'),
            
            // Ticket modal
            ticketModal: document.getElementById('ticketModal'),
            openTicketBtn: document.getElementById('openTicketModalBtn'),
            closeTicketBtn: document.getElementById('closeTicketModal'),
            ticketForm: document.getElementById('ticketForm'),
            ticketFormContainer: document.getElementById('ticketFormContainer'),
            ticketSuccessMsg: document.getElementById('ticketSuccessMsg'),
            ticketEmail: document.getElementById('ticketEmail'),
            ticketMessage: document.getElementById('ticketMessage'),
            submitTicketBtn: document.getElementById('submitTicketBtn'),
            emailError: document.getElementById('emailError'),
            messageError: document.getElementById('messageError'),
            
            // Article modal
            articleModal: document.getElementById('articleModal'),
            closeArticleBtn: document.getElementById('closeArticleModal'),
            articleModalTitle: document.getElementById('articleModalTitle'),
            articleModalContent: document.getElementById('articleModalContent'),
            articleToTicketBtn: document.getElementById('articleToTicketBtn'),
            
            // Toast
            toastNotification: document.getElementById('toastNotification'),
            toastMessage: document.getElementById('toastMessage'),
            
            // Initial loader
            initialLoader: document.getElementById('initialLoader')
        };
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Feature pill clicks
        this.elements.featurePills.forEach(pill => {
            pill.addEventListener('click', this.handleFeatureClick);
        });

        // Search input
        this.elements.searchInput.addEventListener('input', 
            this.debounce(this.handleSearch, 300)
        );
        this.elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.elements.searchInput.value = '';
                this.handleSearch({ target: { value: '' } });
            }
        });

        // Article grid clicks (event delegation)
        this.elements.articlesGrid.addEventListener('click', this.handleArticleClick);

        // Ticket modal
        this.elements.openTicketBtn.addEventListener('click', () => this.openTicketModal());
        this.elements.closeTicketBtn.addEventListener('click', () => this.closeTicketModal());
        this.elements.ticketModal.addEventListener('click', (e) => {
            if (e.target === this.elements.ticketModal) {
                this.closeTicketModal();
            }
        });

        // Ticket form submission
        this.elements.submitTicketBtn.addEventListener('click', this.handleTicketSubmit);
        this.elements.ticketForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTicketSubmit();
        });

        // Input validation styling
        this.elements.ticketEmail.addEventListener('input', () => {
            this.elements.ticketEmail.classList.remove('error');
            if (this.elements.emailError) {
                this.elements.emailError.style.display = 'none';
            }
        });
        
        this.elements.ticketMessage.addEventListener('input', () => {
            this.elements.ticketMessage.classList.remove('error');
            if (this.elements.messageError) {
                this.elements.messageError.style.display = 'none';
            }
        });

        // Article modal
        this.elements.closeArticleBtn.addEventListener('click', () => this.closeArticleModal());
        this.elements.articleModal.addEventListener('click', (e) => {
            if (e.target === this.elements.articleModal) {
                this.closeArticleModal();
            }
        });
        this.elements.articleToTicketBtn?.addEventListener('click', () => {
            this.closeArticleModal();
            setTimeout(() => this.openTicketModal(), 300);
        });

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyboard);

        // Window resize
        window.addEventListener('resize', this.debounce(() => {
            this.scrollActivePillIntoView();
        }, 200));

        // Online/Offline events
        window.addEventListener('online', () => {
            this.showToast('Back online! Your changes will sync.', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may be limited.', 'warning');
        });
    }

    /**
     * Load articles from Firebase
     */
    async loadArticles() {
        try {
            this.showLoading();
            
            const articles = await firebaseService.getHelpArticles();
            
            if (articles && articles.length > 0) {
                this.articles = articles;
            } else {
                this.loadFallbackArticles();
            }
            
            this.filterAndRender();
        } catch (error) {
            console.warn('Failed to load from Firebase, using fallback:', error);
            this.loadFallbackArticles();
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load fallback articles when Firebase is unavailable
     */
    loadFallbackArticles() {
        this.articles = [
            {
                id: '1',
                title: 'Daily Selfie Not Sending',
                description: 'Check notification permissions and ensure both partners have latest version.',
                category: 'daily-selfie',
                icon: 'fa-camera-retro',
                tag: 'selfie',
                detail: 'Go to phone Settings > Clozzy > Notifications > Allow. Also verify your partner hasn\'t paused selfie reminders in couple settings.'
            },
            {
                id: '2',
                title: 'Selfie Streak Disappeared',
                description: 'Streaks reset after 24h window. Timezone mismatch can cause early reset.',
                category: 'daily-selfie',
                icon: 'fa-fire',
                tag: 'streak',
                detail: 'Both partners should set device time to "Automatic". If streak lost unfairly, send a support request with your account email.'
            },
            {
                id: '3',
                title: 'Chat Messages Not Delivering',
                description: 'Toggle airplane mode or restart app. Check internet connection.',
                category: 'chat',
                icon: 'fa-comment-slash',
                tag: 'delivery',
                detail: 'Long-press a stuck message and tap "Retry". Ensure both partners have stable internet connection.'
            },
            {
                id: '4',
                title: 'Message Reactions Missing',
                description: 'Update app to v2.4+. Both partners need latest version for reactions.',
                category: 'chat',
                icon: 'fa-smile-wink',
                tag: 'reactions',
                detail: 'Clear app cache in Settings > Storage > Clear Cache if reactions still not showing after update.'
            },
            {
                id: '5',
                title: 'Gallery Photos Not Loading',
                description: 'Check couple space sharing permissions in settings.',
                category: 'gallery',
                icon: 'fa-images',
                tag: 'photos',
                detail: 'Go to Profile > Couple Settings > Shared Gallery > Toggle ON. Also check storage permission in phone settings.'
            },
            {
                id: '6',
                title: 'Timeline Entries Out of Order',
                description: 'Pull down to refresh. Date filter may be active.',
                category: 'timeline',
                icon: 'fa-stream',
                tag: 'order',
                detail: 'Tap the calendar icon on timeline to reset any active filters. Pull down to force refresh.'
            },
            {
                id: '7',
                title: 'Stats Dashboard Not Updating',
                description: 'Stats refresh hourly. Force sync in profile settings.',
                category: 'stats',
                icon: 'fa-chart-bar',
                tag: 'sync',
                detail: 'Profile > Stats > Pull down to force refresh. Data updates every 60 minutes automatically.'
            },
            {
                id: '8',
                title: 'Theme Won\'t Apply to Partner',
                description: 'Premium couple themes require both partners to have Clozzy Plus.',
                category: 'theme',
                icon: 'fa-palette',
                tag: 'premium',
                detail: 'Free themes apply instantly. For synced couple themes, both partners need active Clozzy Plus subscription.'
            },
            {
                id: '9',
                title: 'Note Not Syncing Between Partners',
                description: 'Toggle internet off/on. Notes auto-save locally first then sync.',
                category: 'note',
                icon: 'fa-sticky-note',
                tag: 'sync',
                detail: 'Enable cloud backup in Note Settings. Notes sync when both partners are online and have stable connection.'
            },
            {
                id: '10',
                title: 'Mood Status Stuck or Frozen',
                description: 'Swipe the mood card or restart the app to refresh.',
                category: 'mood',
                icon: 'fa-smile',
                tag: 'status',
                detail: 'Mood updates every 6 hours. Tap "Update Now" in mood settings for immediate change. Restart app if unresponsive.'
            },
            {
                id: '11',
                title: 'Quick Action Button Missing',
                description: 'Customize in Settings > Quick Actions. Maximum 4 shortcuts.',
                category: 'quick-action',
                icon: 'fa-bolt',
                tag: 'shortcut',
                detail: 'Drag and drop to reorder quick actions. Reset to defaults in settings if buttons disappear.'
            },
            {
                id: '12',
                title: 'Can\'t Sign Up with Email',
                description: 'Check spam folder for verification. Use password with 8+ characters.',
                category: 'signup-login',
                icon: 'fa-envelope',
                tag: 'email',
                detail: 'Tap "Resend" on verification screen. Add no-reply@clozzy.app to email contacts to prevent spam filtering.'
            },
            {
                id: '13',
                title: 'Login Loop / Constant Logout',
                description: 'Clear app data or reinstall. Set device date/time to automatic.',
                category: 'signup-login',
                icon: 'fa-sync-alt',
                tag: 'loop',
                detail: 'Android: Settings > Apps > Clozzy > Storage > Clear Data. iOS: Delete and reinstall app from App Store.'
            },
            {
                id: '14',
                title: 'Partner Invite Link Expired',
                description: 'Links expire after 48 hours. Request a new invite from your partner.',
                category: 'signup-login',
                icon: 'fa-link',
                tag: 'invite',
                detail: 'Ask your partner to send a fresh invite from couple settings. Old links cannot be reused for security.'
            },
            {
                id: '15',
                title: 'Forgot Password Reset Not Working',
                description: 'Use "Forgot Password" on login screen. Check both email and SMS.',
                category: 'signup-login',
                icon: 'fa-unlock-alt',
                tag: 'password',
                detail: 'Reset link valid for 1 hour. If no SMS received, verify phone number format includes country code.'
            },
            {
                id: '16',
                title: 'Two-Factor Authentication Issues',
                description: 'Ensure device time is set to automatic. Use backup codes if needed.',
                category: 'signup-login',
                icon: 'fa-shield-alt',
                tag: '2fa',
                detail: 'Backup codes available in Settings > Security. Request new codes if all 10 backup codes have been used.'
            }
        ];
        
        this.filterAndRender();
    }

    /**
     * Filter and render articles
     */
    filterAndRender() {
        this.filteredArticles = this.articles.filter(article => {
            const matchFeature = this.activeFeature === 'all' || 
                                article.category === this.activeFeature;
            
            const term = this.searchTerm.toLowerCase().trim();
            const matchSearch = !term || 
                (article.title?.toLowerCase().includes(term)) ||
                (article.description?.toLowerCase().includes(term)) ||
                (article.tag?.toLowerCase().includes(term)) ||
                (article.detail?.toLowerCase().includes(term));
            
            return matchFeature && matchSearch;
        });

        this.renderArticles();
    }

    /**
     * Render articles to DOM
     */
    renderArticles() {
        if (!this.elements.articlesGrid) return;

        if (this.filteredArticles.length === 0) {
            this.elements.articlesGrid.innerHTML = `
                <div class="no-results" role="status">
                    <i class="far fa-frown-open" aria-hidden="true"></i>
                    <p>No articles found</p>
                    <small>Try a different search term or category</small>
                </div>`;
            return;
        }

        this.elements.articlesGrid.innerHTML = this.filteredArticles.map(article => `
            <article class="help-card" data-id="${article.id}" tabindex="0" role="button" aria-label="${this.escapeHtml(article.title)}">
                <div class="card-icon-wrap" aria-hidden="true">
                    <i class="fas ${article.icon || 'fa-file-alt'}"></i>
                </div>
                <h3 class="card-title">${this.escapeHtml(article.title)}</h3>
                <p class="card-desc">${this.escapeHtml(article.description || '')}</p>
                <div class="card-tags">
                    <span class="card-tag">${this.escapeHtml(article.tag || article.category || 'help')}</span>
                </div>
            </article>
        `).join('');

        // Add keyboard support for cards
        this.elements.articlesGrid.querySelectorAll('.help-card').forEach(card => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleArticleClick({ target: card });
                }
            });
        });
    }

    /**
     * Handle feature pill click
     */
    handleFeatureClick(event) {
        const pill = event.currentTarget;
        
        // Update active state
        this.elements.featurePills.forEach(p => {
            p.classList.remove('active');
            p.setAttribute('aria-pressed', 'false');
        });
        
        pill.classList.add('active');
        pill.setAttribute('aria-pressed', 'true');
        
        // Update state and render
        this.activeFeature = pill.dataset.feature;
        this.filterAndRender();
        
        // Scroll pill into view on mobile
        this.scrollActivePillIntoView();
        
        // Track event
        this.trackEvent('feature_filter', { feature: this.activeFeature });
    }

    /**
     * Handle search input
     */
    handleSearch(event) {
        this.searchTerm = event.target.value;
        this.filterAndRender();
        
        // Track search after debounce
        if (this.searchTerm.length > 2) {
            this.debounce(() => {
                this.trackEvent('search', { term: this.searchTerm });
            }, 1000)();
        }
    }

    /**
     * Handle article card click
     */
    handleArticleClick(event) {
        const card = event.target.closest('.help-card');
        if (!card) return;
        
        const articleId = card.dataset.id;
        const article = this.articles.find(a => a.id === articleId);
        
        if (article) {
            this.showArticleDetail(article);
            this.trackEvent('article_view', { articleId: article.id, title: article.title });
        }
    }

    /**
     * Show article detail in modal
     */
    showArticleDetail(article) {
        this.currentArticle = article;
        
        if (this.elements.articleModalTitle) {
            this.elements.articleModalTitle.textContent = article.title || 'Help Article';
        }
        
        if (this.elements.articleModalContent) {
            let content = `
                <p style="margin-bottom:1rem; font-size:0.95rem; line-height:1.6;">
                    ${this.escapeHtml(article.description || '')}
                </p>
                <div style="background:rgba(255,255,255,0.03); padding:1.2rem; border-radius:1rem; border-left:3px solid var(--pink);">
                    <strong style="display:block; margin-bottom:0.5rem; color:white;">🔍 Detailed Solution:</strong>
                    <p style="color:#b0aab5; line-height:1.7;">
                        ${this.escapeHtml(article.detail || 'For personalized help, submit a support request with your account email.')}
                    </p>
                </div>
            `;
            
            // Add steps if available
            if (article.steps && article.steps.length > 0) {
                content += `
                    <div style="margin-top:1.2rem;">
                        <strong style="display:block; margin-bottom:0.5rem; color:white;">📋 Step-by-Step Guide:</strong>
                        <ol style="color:#b0aab5; padding-left:1.2rem; line-height:1.8;">
                            ${article.steps.map(step => 
                                `<li style="margin-bottom:0.3rem;">${this.escapeHtml(step)}</li>`
                            ).join('')}
                        </ol>
                    </div>
                `;
            }
            
            // Add category and tags
            content += `
                <div style="margin-top:1.2rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <span style="font-size:0.7rem; background:rgba(255,56,96,0.15); padding:0.2rem 0.8rem; border-radius:1rem; color:#ffb7c5;">
                        ${this.escapeHtml(article.category || 'general')}
                    </span>
                    <span style="font-size:0.7rem; background:rgba(77,124,255,0.15); padding:0.2rem 0.8rem; border-radius:1rem; color:#7b9fff;">
                        ${this.escapeHtml(article.tag || 'help')}
                    </span>
                </div>
            `;
            
            this.elements.articleModalContent.innerHTML = content;
        }
        
        this.elements.articleModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus trap
        setTimeout(() => {
            this.elements.closeArticleBtn?.focus();
        }, 100);
    }

    /**
     * Close article detail modal
     */
    closeArticleModal() {
        this.elements.articleModal.classList.remove('active');
        document.body.style.overflow = '';
        this.currentArticle = null;
    }

    /**
     * Open ticket submission modal
     */
    openTicketModal() {
        this.resetTicketForm();
        this.elements.ticketModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus on email input
        setTimeout(() => {
            this.elements.ticketEmail?.focus();
        }, 300);
        
        this.trackEvent('ticket_modal_open');
    }

    /**
     * Close ticket modal
     */
    closeTicketModal() {
        this.elements.ticketModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * Reset ticket form to initial state
     */
    resetTicketForm() {
        if (this.elements.ticketFormContainer) {
            this.elements.ticketFormContainer.style.display = 'block';
        }
        if (this.elements.ticketSuccessMsg) {
            this.elements.ticketSuccessMsg.style.display = 'none';
        }
        if (this.elements.ticketEmail) {
            this.elements.ticketEmail.value = '';
            this.elements.ticketEmail.classList.remove('error');
        }
        if (this.elements.ticketMessage) {
            this.elements.ticketMessage.value = '';
            this.elements.ticketMessage.classList.remove('error');
        }
        if (this.elements.submitTicketBtn) {
            this.elements.submitTicketBtn.disabled = false;
            this.elements.submitTicketBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
        }
        if (this.elements.emailError) {
            this.elements.emailError.style.display = 'none';
        }
        if (this.elements.messageError) {
            this.elements.messageError.style.display = 'none';
        }
    }

    /**
     * Handle ticket form submission
     */
    async handleTicketSubmit() {
        const email = this.elements.ticketEmail?.value.trim() || '';
        const message = this.elements.ticketMessage?.value.trim() || '';
        
        // Validate
        let isValid = true;
        
        if (!email || !this.validateEmail(email)) {
            this.elements.ticketEmail?.classList.add('error');
            if (this.elements.emailError) {
                this.elements.emailError.style.display = 'block';
                this.elements.emailError.textContent = 'Please enter a valid email address';
            }
            isValid = false;
        }
        
        if (!message || message.length < 10) {
            this.elements.ticketMessage?.classList.add('error');
            if (this.elements.messageError) {
                this.elements.messageError.style.display = 'block';
                this.elements.messageError.textContent = 'Please describe your issue (minimum 10 characters)';
            }
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Show loading state
        if (this.elements.submitTicketBtn) {
            this.elements.submitTicketBtn.disabled = true;
            this.elements.submitTicketBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        }
        
        try {
            await firebaseService.submitSupportTicket({
                email: email,
                message: message,
                category: this.activeFeature,
                searchQuery: this.searchTerm
            });
            
            // Show success
            if (this.elements.ticketFormContainer) {
                this.elements.ticketFormContainer.style.display = 'none';
            }
            if (this.elements.ticketSuccessMsg) {
                this.elements.ticketSuccessMsg.style.display = 'block';
            }
            
            this.trackEvent('ticket_submitted', { category: this.activeFeature });
            
            // Auto close after delay
            setTimeout(() => {
                this.closeTicketModal();
                setTimeout(() => this.resetTicketForm(), 300);
            }, 3000);
            
        } catch (error) {
            console.error('Ticket submission failed:', error);
            this.showToast('Failed to send request. Please try again.', 'error');
            
            if (this.elements.submitTicketBtn) {
                this.elements.submitTicketBtn.disabled = false;
                this.elements.submitTicketBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
            }
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyboard(event) {
        if (event.key === 'Escape') {
            if (this.elements.articleModal.classList.contains('active')) {
                this.closeArticleModal();
            } else if (this.elements.ticketModal.classList.contains('active')) {
                this.closeTicketModal();
            }
        }
    }

    /**
     * Validate email format
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        if (!this.elements.toastNotification || !this.elements.toastMessage) return;
        
        this.elements.toastMessage.textContent = message;
        this.elements.toastNotification.className = `toast-notification toast-${type}`;
        this.elements.toastNotification.classList.add('show');
        
        clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.elements.toastNotification.classList.remove('show');
        }, 3000);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'flex';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.isLoading = false;
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    }

    /**
     * Show initial loader
     */
    showInitialLoader() {
        if (this.elements.initialLoader) {
            this.elements.initialLoader.style.display = 'flex';
        }
    }

    /**
     * Hide initial loader
     */
    hideInitialLoader() {
        if (this.elements.initialLoader) {
            this.elements.initialLoader.classList.add('hidden');
            setTimeout(() => {
                if (this.elements.initialLoader) {
                    this.elements.initialLoader.style.display = 'none';
                }
            }, 300);
        }
        document.body.classList.add('loaded');
    }

    /**
     * Handle initialization error
     */
    handleInitializationError(error) {
        this.hideInitialLoader();
        
        const errorMessage = error.message || 'Failed to load the support center. Please try again.';
        
        if (this.elements.articlesGrid) {
            this.elements.articlesGrid.innerHTML = `
                <div class="no-results" style="grid-column: 1/-1;">
                    <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ff3860;"></i>
                    <p style="color:#ff3860; margin-top:0.5rem;">Failed to load support center</p>
                    <small>${this.escapeHtml(errorMessage)}</small>
                    <button onclick="location.reload()" style="margin-top:1rem; padding:0.5rem 1.5rem; background:#ff3860; color:white; border:none; border-radius:2rem; cursor:pointer;">
                        Retry
                    </button>
                </div>`;
        }
    }

    /**
     * Scroll active pill into view on mobile
     */
    scrollActivePillIntoView() {
        const activePill = document.querySelector('.feature-pill.active');
        if (activePill) {
            activePill.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest', 
                inline: 'center' 
            });
        }
    }

    /**
     * Track analytics event
     */
    trackEvent(eventName, eventData = {}) {
        if (this.config.features?.enableAnalytics) {
            firebaseService.trackEvent(eventName, eventData).catch(err => {
                console.warn('Analytics tracking failed:', err);
            });
        }
    }

    /**
     * Track page view
     */
    trackPageView() {
        this.trackEvent('page_view', {
            page: window.location.pathname,
            title: document.title,
            referrer: document.referrer
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        this.elements.featurePills?.forEach(pill => {
            pill.removeEventListener('click', this.handleFeatureClick);
        });
        
        this.elements.searchInput?.removeEventListener('input', this.handleSearch);
        this.elements.articlesGrid?.removeEventListener('click', this.handleArticleClick);
        this.elements.openTicketBtn?.removeEventListener('click', this.openTicketModal);
        this.elements.closeTicketBtn?.removeEventListener('click', this.closeTicketModal);
        this.elements.submitTicketBtn?.removeEventListener('click', this.handleTicketSubmit);
        this.elements.closeArticleBtn?.removeEventListener('click', this.closeArticleModal);
        
        document.removeEventListener('keydown', this.handleKeyboard);
        
        // Clear cache
        firebaseService.clearCache();
        
        console.log('App destroyed and cleaned up');
    }
}

// Initialize app when DOM is fully loaded
let app = null;

function initializeApp() {
    try {
        app = new ClozzySupportApp();
        window.clozzyApp = app;
    } catch (error) {
        console.error('Failed to create app instance:', error);
    }
}

// Wait for DOM and config to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.destroy();
    }
});

// Export for potential module usage
export default ClozzySupportApp;