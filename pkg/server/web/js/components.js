// Register Alpine.js components
document.addEventListener('alpine:init', () => {

    // Sidebar component
    Alpine.data('sidebar', () => ({
        publicMenuItems: [
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' }
        ],
        
        authMenuItems: [
            { href: '/account', label: 'Account' }
        ],
        
        isAuthenticated() {
            return !!localStorage.getItem('accessToken');
        },
        
        isCurrentPath(path) {
            return window.location.pathname === path ||
                   (window.location.pathname === '/' && path === '/');
        },
        
        init() {
            // Listen for route changes to update active state
            window.addEventListener('popstate', () => {
                this.$nextTick(() => this.$forceUpdate());
            });
            
            // Listen for auth changes to show/hide menu items
            document.addEventListener('auth:changed', () => {
                this.$nextTick(() => this.$forceUpdate());
            });
        }
    }));

    // Footer component that shows version info
    Alpine.data('footerInfo', () => ({
        loading: true,
        error: null,
        data: {
            appName: 'ToolMin',
            copyright: 'Copyright 2024',
            version: ''
        },

        
        async init() {
            try {
                const response = await fetch('/api/v1/version');
                if (!response.ok) throw new Error('Failed to fetch version info');
                
                const responseData = await response.json();
                this.data = {
                    ...this.data,  // Keep defaults if API fields are missing
                    ...responseData
                };
            } catch (error) {
                console.error('Error fetching version:', error);
                this.error = 'Failed to load version information';
            } finally {
                this.loading = false;
            }
        }
    }));

    // About page component
    Alpine.data('aboutPage', () => ({
        loading: true,
        error: null,
        info: null,
        
        init() {
            this.fetchVersionInfo();
        },
        
        async fetchVersionInfo() {
            try {
                const response = await fetch('/api/v1/version');
                if (!response.ok) throw new Error('Failed to fetch version info');
                
                this.info = await response.json();
            } catch (error) {
                console.error('Error fetching version:', error);
                this.error = 'Failed to load version information';
            } finally {
                this.loading = false;
            }
        }
    }));
});

// Add this before Alpine.js component registration
window.DataService = {
    cache: new Map(),
    
    setCachedData(key, data) {
        this.cache.set(key, data);
        document.dispatchEvent(new CustomEvent(`data:${key}Updated`));
    },
    
    getCachedData(key) {
        return this.cache.get(key);
    },
    
    clearCache() {
        this.cache.clear();
    }
};