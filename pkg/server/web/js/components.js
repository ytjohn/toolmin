// Register Alpine.js components
document.addEventListener('alpine:init', () => {
    Alpine.data('loginForm', () => ({
        email: '',
        password: '',
        loading: false,
        errorMessage: '',
        errors: {},
        
        validate() {
            this.errors = {};
            if (!this.email) this.errors.email = 'Email is required';
            if (!this.password) this.errors.password = 'Password is required';
            return Object.keys(this.errors).length === 0;
        },
        
        async login() {
            if (!this.validate()) return;
            
            this.loading = true;
            this.errorMessage = '';
            
            try {
                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password
                    })
                });
                
                if (!response.ok) throw new Error('Login failed');
                
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                
                // Trigger header refresh
                htmx.trigger('body', 'auth:changed');
                Router.navigate('/account');
            } catch (error) {
                this.errorMessage = error.message;
            } finally {
                this.loading = false;
            }
        }
    }));

    Alpine.data('accountPage', () => ({
        user: null,
        loading: true,
        error: null,
        tokenCopied: false,
        
        init() {
            this.fetchAccountInfo();
        },
        
        async copyToken() {
            try {
                const token = localStorage.getItem('accessToken');
                await navigator.clipboard.writeText(token);
                this.tokenCopied = true;
                setTimeout(() => {
                    this.tokenCopied = false;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy token:', err);
            }
        },
        
        async fetchAccountInfo() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await fetch('/api/v1/whoami', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                
                if (!response.ok) {
                    if (response.status === 401) {
                        localStorage.removeItem('accessToken');
                        localStorage.removeItem('refreshToken');
                        Router.navigate('/login');
                        return;
                    }
                    throw new Error('Failed to fetch profile data');
                }
                
                this.user = await response.json();
            } catch (error) {
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        formatDate(dateString) {
            if (!dateString) return 'Not available';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }));

    Alpine.data('headerAuth', () => ({
        loading: true,
        dropdownOpen: false,
        user: null,
        
        async init() {
            await this.fetchUserInfo();
            this.loading = false;
        },
        
        isAuthenticated() {
            return !!localStorage.getItem('accessToken');
        },
        
        async fetchUserInfo() {
            if (!this.isAuthenticated()) {
                this.user = null;
                return;
            }
            
            try {
                const response = await fetch('/api/v1/whoami', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }
                
                this.user = await response.json();
            } catch (error) {
                console.error('Error fetching user info:', error);
                this.user = null;
            }
        },
        
        get userDisplay() {
            if (!this.user) return 'User';
            return this.user.callSign || this.user.firstName || this.user.email || 'User';
        },
        
        get userInitial() {
            if (!this.user) return 'U';
            const firstName = this.user.firstName || '';
            const lastName = this.user.lastName || '';
            if (!firstName && !lastName) return 'U';
            return (firstName.charAt(0) + (lastName.charAt(0) || '')).toUpperCase();
        },
        
        async logout() {
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    await fetch('/api/v1/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            } finally {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                this.user = null;
                htmx.trigger('body', 'auth:changed');
                Router.navigate('/login');
            }
        },

        dropdownItems() {
            return [
                { href: '/account', label: 'Your Account' },
                { href: '#', label: 'Sign out', action: () => this.logout() }
            ];
        }
    }));

    Alpine.data('footerInfo', () => ({
        loading: true,
        error: null,
        data: {
            appName: 'BCARS Member Portal',
            copyright: 'Copyright 2025 John Hogenmiller',
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

    Alpine.data('sidebar', () => ({
        publicMenuItems: [
            { href: '/', label: 'Home' },
            { href: '/about', label: 'About' },
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

    Alpine.data('membersList', () => ({
        members: [],
        loading: true,
        error: null,
        searchQuery: '',
        sortKey: null,
        sortDesc: false,
        exportOptions: {
            timeframe: 'current',
            withEmail: false,
            withPhone: false,
            withAddress: false
        },

        columns: [
            { key: 'callSign', label: 'Call Sign' },
            { key: 'name', label: 'Name' },
            { key: 'class', label: 'Class' },
            { key: 'volunteerExaminer', label: 'VE?', tooltip: 'Volunteer Examiner' },
            { key: 'status', label: 'Status' }
        ],

        async init() {
            this.loading = true;
            this.error = null;

            try {
                const response = await fetch('/api/v1/members', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch members');
                }

                const data = await response.json();
                this.members = data.members || [];
                window.DataService.setCachedData('members', this.members);
                
            } catch (error) {
                console.error('Error fetching members:', error);
                this.error = 'Failed to load members';
                this.members = [];
            } finally {
                this.loading = false;
            }

            // Listen for data service events for updates
            document.addEventListener('data:membersUpdated', () => {
                this.members = window.DataService.getCachedData('members') || [];
            });
        },

        formatDate(date) {
            const formattedDate = new Date(date).toLocaleDateString();
            return formattedDate === 'Invalid Date' ? 'N/A' : formattedDate;
        },

        async exportMembers() {
            try {
                const params = new URLSearchParams({
                    format: 'csv',
                    timeframe: this.exportOptions.timeframe,
                    with_email: this.exportOptions.withEmail,
                    with_phone: this.exportOptions.withPhone,
                    with_address: this.exportOptions.withAddress
                });

                const response = await fetch(`/api/v1/members/export?${params}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Export failed');
                }

                // Create a blob from the CSV data
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `members-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Export error:', error);
                this.error = 'Failed to export members';
            }
        },

        async refreshData() {
            this.loading = true;
            this.error = null;
            this.searchQuery = '';
            this.sortKey = null;
            this.sortDesc = false;
            this.members = [];
            await this.init();
        },

        sort(key) {
            if (this.sortKey === key) {
                this.sortDesc = !this.sortDesc;
            } else {
                this.sortKey = key;
                this.sortDesc = false;
            }
        },

        get filteredAndSortedMembers() {
            let result = [...this.members];
            
            // Search filter
            if (this.searchQuery.trim()) {
                const query = this.searchQuery.toLowerCase();
                result = result.filter(member => {
                    if (!member) return false;
                    
                    return (
                        (member.callSign || '').toLowerCase().includes(query) ||
                        (member.firstName || '').toLowerCase().includes(query) ||
                        (member.lastName || '').toLowerCase().includes(query) ||
                        (member.class || '').toLowerCase().includes(query) ||
                        (member.volunteerExaminer ? 've' : '').includes(query)
                    );
                });
            }
            
            // Sorting
            if (this.sortKey) {
                result.sort((a, b) => {
                    if (!a || !b) return 0;
                    
                    let aVal, bVal;
                    
                    switch(this.sortKey) {
                        case 'name':
                            aVal = `${a.firstName || ''} ${a.lastName || ''}`.trim();
                            bVal = `${b.firstName || ''} ${b.lastName || ''}`.trim();
                            break;
                        case 'location':
                            aVal = `${a.city || ''}, ${a.stateProvince || ''}`.trim();
                            bVal = `${b.city || ''}, ${b.stateProvince || ''}`.trim();
                            break;
                        case 'status':
                            aVal = a.lastVerifiedAt ? 1 : 0;
                            bVal = b.lastVerifiedAt ? 1 : 0;
                            break;
                        default:
                            aVal = a[this.sortKey] || '';
                            bVal = b[this.sortKey] || '';
                    }
                    
                    if (aVal === bVal) return 0;
                    const comparison = aVal > bVal ? 1 : -1;
                    return this.sortDesc ? -comparison : comparison;
                });
            }
            
            return result;
        }
    }));

    Alpine.data('memberDetail', () => ({
        member: null,
        loading: true,
        error: null,
        isEditing: false,
        saving: false,
        editForm: {},
        errors: {},
        deleting: false,
        
        async init() {
            const id = window.location.pathname.split('/')[2];
            this.isEditing = window.location.pathname.endsWith('/edit');
            await this.loadMember(id);
        },
        
        async loadMember(id) {
            try {
                const response = await fetch(`/api/v1/members/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                
                if (!response.ok) throw new Error('Failed to load member');
                
                const data = await response.json();
                this.member = data.member;
                if (this.isEditing) {
                    this.editForm = {
                        ...this.member,
                        // Format lastVerifiedAt for date input (YYYY-MM-DD)
                        lastVerifiedAt: this.member.lastVerifiedAt ? 
                            new Date(this.member.lastVerifiedAt).toISOString().split('T')[0] : 
                            null
                    };
                }
            } catch (error) {
                console.error('Error loading member:', error);
                this.error = 'Failed to load member details';
            } finally {
                this.loading = false;
            }
        },
        
        async saveMember() {
            this.saving = true;
            this.errors = {};
            this.error = null;

            try {
                if (!this.validateCallSignAndClass()) {
                    return;
                }

                // Only include fields that have changed
                const editableFields = {};
                const fields = [
                    'addressLine1', 'addressLine2', 'callSign', 'city', 'class',
                    'country', 'email', 'firstName', 'joinDate', 'lastName',
                    'currentUntil',
                    'lastVerifiedAt', 'mailingListOptIn', 'membershipType',
                    'notes', 'phone', 'postalCode', 'stateProvince',
                    'volunteerExaminer', 'wpaAresEnrolled'
                ];

                fields.forEach(field => {
                    const newValue = this.editForm[field];
                    const oldValue = this.member[field];
                    
                    // Include field if:
                    // 1. It's been cleared (new value is null/undefined but old value existed)
                    // 2. It's been changed to a new value
                    if (
                        ((newValue === null || newValue === undefined) && oldValue) ||
                        (newValue !== oldValue)
                    ) {
                        // Convert null to empty string for nullable string fields
                        if (['callSign', 'class', 'phone', 'addressLine1', 'addressLine2',
                            'city', 'stateProvince', 'postalCode', 'country', 'notes'].includes(field)) {
                            editableFields[field] = newValue ?? '';
                        } else {
                            editableFields[field] = newValue;
                        }
                    }
                });

                const response = await fetch(`/api/v1/members/${this.member.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ member: editableFields })
                });
                
                if (response.status === 422) {
                    const errorData = await response.json();
                    if (errorData.errors) {
                        errorData.errors.forEach(err => {
                            const field = err.location.split('.').slice(-1)[0];
                            this.errors[field] = err.message;
                        });
                    }
                    this.error = errorData.detail || 'Please correct the errors below.';
                    return;
                }
                
                if (!response.ok) {
                    throw new Error('Failed to save member');
                }

                const data = await response.json();
                this.member = data.member;
                this.isEditing = false;
                Router.navigate(`/member/${this.member.id}`);
            } catch (error) {
                console.error('Error saving member:', error);
                this.error = 'Failed to save changes';
            } finally {
                this.saving = false;
            }
        },
        
        toggleEdit() {
            if (this.isEditing) {
                Router.navigate(`/member/${this.member.id}`);
                this.isEditing = false;
            } else {
                this.editForm = { 
                    ...this.member,
                    // Default to verified as of today when entering edit mode
                    lastVerifiedAt: new Date().toISOString().split('T')[0],
                    isVerified: true
                };
                Router.navigate(`/member/${this.member.id}/edit`);
                this.isEditing = true;
            }
        },
        
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },
        
        async confirmDelete() {
            if (!confirm(`Are you sure you want to delete member ${this.member.callSign}?`)) {
                return;
            }
            
            this.deleting = true;
            try {
                const response = await fetch(`/api/v1/members/${this.member.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                
                if (!response.ok) throw new Error('Failed to delete member');
                
                // Success - return to member list
                Router.navigate('/members');
            } catch (error) {
                console.error('Error deleting member:', error);
                this.error = 'Failed to delete member';
            } finally {
                this.deleting = false;
            }
        },

        validateCallSignAndClass() {
            const hasCallSign = (this.editForm.callSign || '').trim() !== '';
            const hasClass = this.editForm.class && this.editForm.class !== '';

            if (hasCallSign && !hasClass) {
                this.errors.class = 'License class is required when call sign is provided';
                return false;
            } else if (!hasCallSign && hasClass) {
                this.errors.class = 'License class should be empty or None when no call sign is provided';
                return false;
            } else {
                delete this.errors.class;
                return true;
            }
        },

        async verifyNow() {
            try {
                const today = new Date().toISOString().split('T')[0];
                const response = await fetch(`/api/v1/members/${this.member.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        member: {
                            lastVerifiedAt: today
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update verification date');
                }

                // Update the member data
                this.member.lastVerifiedAt = today;
                
                // Show success message (optional)
                this.error = null;
            } catch (err) {
                console.error('Error verifying member:', err);
                this.error = 'Failed to update verification date';
            }
        }
    }));

    Alpine.data('createMember', () => ({
        form: {
            member: {
                firstName: '',
                lastName: '',
                email: '',
                callSign: '',
                class: '',
                membershipType: '',
                joinDate: new Date().toISOString().split('T')[0],
                currentUntil: null,
                lastVerifiedAt: null,
                volunteerExaminer: false,
                wpaAresEnrolled: false,
                mailingListOptIn: false,
                addressLine1: '',
                addressLine2: '',
                city: '',
                stateProvince: '',
                postalCode: '',
                country: '',
                phone: '',
                notes: ''
            }
        },
        errors: {},
        error: null,
        saving: false,

        validateCallSignAndClass() {
            const hasCallSign = (this.form.member.callSign || '').trim() !== '';
            const hasClass = this.form.member.class && this.form.member.class !== '';

            if (hasCallSign && !hasClass) {
                this.errors.class = 'License class is required when call sign is provided';
                return false;
            } else if (!hasCallSign && hasClass) {
                this.errors.class = 'License class should be empty or None when no call sign is provided';
                return false;
            } else {
                delete this.errors.class;
                return true;
            }
        },

        async createMember() {
            if (!this.validateCallSignAndClass()) {
                return;
            }
            this.saving = true;
            this.errors = {};
            this.error = null;

            try {
                const memberData = {
                    ...this.form.member,
                    callSign: this.form.member.callSign || null,
                    class: this.form.member.class || null
                };

                const response = await fetch('/api/v1/members', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ member: memberData })
                });

                if (response.status === 201) {
                    const data = await response.json();
                    Router.navigate(`/member/${data.member.id}`);
                    return;
                }

                if (response.status === 422) {
                    const errorData = await response.json();
                    if (errorData.errors) {
                        errorData.errors.forEach(err => {
                            const field = err.location.split('.').slice(-1)[0];
                            this.errors[field] = err.message;
                        });
                    }
                    this.error = errorData.detail || 'Please correct the errors below.';
                } else {
                    throw new Error('Failed to create member');
                }
            } catch (error) {
                console.error('Error creating member:', error);
                this.error = 'Failed to create member. Please try again.';
            } finally {
                this.saving = false;
            }
        }
    }));

    Alpine.data('bulkImport', () => ({
        file: null,
        csvData: [],
        headers: [],
        mapping: {},
        previewData: [],
        loading: false,
        error: null,
        importStats: null,
        step: 'upload',
        validationErrors: [],
        currentPage: 1,
        pageSize: 10,

        init() {
            console.log('Component init');
            this.loadFieldMapping();
        },

        // Computed properties
        get totalPages() {
            return Math.ceil((this.previewData?.length || 0) / this.pageSize);
        },
        
        get paginatedData() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.previewData?.slice(start, end) || [];
        },

        // Methods
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },

        previousPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },

        async loadFieldMapping() {
            console.log('Loading field mapping');
            try {
                const response = await fetch('/api/v1/members/groupsio-mapping', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    }
                });
                if (!response.ok) throw new Error('Failed to load field mapping');
                const data = await response.json();
                this.mapping = data.mapping;
                console.log('Loaded mapping:', this.mapping);
            } catch (err) {
                console.error('Mapping error:', err);
                this.error = 'Failed to load field mapping: ' + err.message;
            }
        },

        handleFileUpload(event) {
            console.log('File upload triggered');
            const file = event.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }
            this.processFile(file);
        },

        async processFile(file) {
            console.log('Processing file:', file.name);
            this.file = null;
            this.csvData = [];
            this.previewData = [];
            this.error = null;
            this.validationErrors = [];
            
            try {
                const text = await file.text();
                console.log('File content length:', text.length);
                
                const lines = text.split(/\r?\n/);
                console.log('Number of lines:', lines.length);
                
                if (lines.length === 0) {
                    throw new Error('File is empty');
                }

                this.headers = lines[0].split(',').map(header => 
                    header.trim().replace(/^["']|["']$/g, '')
                );
                console.log('Headers:', this.headers);

                // Process all lines
                this.csvData = lines.slice(1)
                    .filter(line => line.trim())
                    .map(line => {
                        const values = [];
                        let inQuotes = false;
                        let currentValue = '';
                        
                        for (let char of line) {
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                values.push(currentValue.trim());
                                currentValue = '';
                            } else {
                                currentValue += char;
                            }
                        }
                        values.push(currentValue.trim());
                        return values;
                    })
                    .filter(row => row.length === this.headers.length);
                
                // Process all rows for preview with validation
                this.previewData = this.csvData.map((row, rowIndex) => {
                    const record = {
                        rowNumber: rowIndex + 1,
                        firstName: '',
                        lastName: '',
                        callSign: '',
                        email: '',
                        class: '',
                        membershipType: '',
                        volunteerExaminer: false,
                        currentUntil: null,
                        validationErrors: {}
                    };
                    
                    // Build the member object
                    this.headers.forEach((header, index) => {
                        const mappedField = this.mapping[header];
                        if (mappedField) {
                            const value = row[index] || '';
                            if (mappedField === 'name') {
                                const parts = value.split(',').map(s => s.trim());
                                record.lastName = parts[0] || '';
                                record.firstName = parts[1] || '';
                            } else if (mappedField === 'volunteerExaminer') {
                                record[mappedField] = value.toLowerCase() === 'checked';
                            } else if (mappedField === 'currentUntil') {
                                if (value && value !== '01/01/0001') {
                                    const [month, day, year] = value.split('/');
                                    record[mappedField] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                }
                            } else if (mappedField === 'membershipType') {
                                record[mappedField] = this.normalizeMembershipType(value);
                            } else {
                                record[mappedField] = value;
                            }
                        }
                    });

                    // Validate the record
                    if (!record.firstName?.trim()) {
                        record.validationErrors.firstName = 'Required';
                    }
                    if (!record.lastName?.trim()) {
                        record.validationErrors.lastName = 'Required';
                    }
                    if (record.callSign && record.callSign.length > 10) {
                        record.validationErrors.callSign = 'Too long (max 10 chars)';
                    }
                    if (!record.email?.trim()) {
                        record.validationErrors.email = 'Required';
                    } else if (!record.email.includes('@') || !record.email.includes('.')) {
                        record.validationErrors.email = 'Invalid format';
                    }
                    if (!this.validateMembershipType(record.membershipType)) {
                        record.validationErrors.membershipType = 'Must be guest, associate, honorary, or member';
                    }
                    
                    return record;
                });
                
                console.log(`Processed ${this.previewData.length} records`);
                this.step = 'preview';
            } catch (err) {
                console.error('Processing error:', err);
                this.error = 'Failed to process CSV file: ' + err.message;
            }
        },

        validateMembershipType(type) {
            const validTypes = ['guest', 'associate', 'honorary', 'member'];
            return validTypes.includes(type?.toLowerCase());
        },

        validateMember(member, rowIndex) {
            const errors = [];
            
            // Required fields
            if (!member.firstName?.trim()) {
                errors.push(`Row ${rowIndex + 1}: First name is required`);
            }
            if (!member.lastName?.trim()) {
                errors.push(`Row ${rowIndex + 1}: Last name is required`);
            }
            if (!member.email?.trim()) {
                errors.push(`Row ${rowIndex + 1}: Email is required`);
            } else if (!member.email.includes('@') || !member.email.includes('.')) {
                errors.push(`Row ${rowIndex + 1}: Invalid email format`);
            }

            // Field lengths
            if (member.callSign && member.callSign.length > 10) {
                errors.push(`Row ${rowIndex + 1}: Call sign too long (maximum 10 characters)`);
            }
            if (member.firstName && member.firstName.length > 50) {
                errors.push(`Row ${rowIndex + 1}: First name too long (maximum 50 characters)`);
            }
            if (member.lastName && member.lastName.length > 50) {
                errors.push(`Row ${rowIndex + 1}: Last name too long (maximum 50 characters)`);
            }

            // Membership type
            if (!this.validateMembershipType(member.membershipType)) {
                errors.push(`Row ${rowIndex + 1}: Invalid membership type "${member.membershipType}" (must be guest, associate, honorary, or member)`);
            }

            // Date format for currentUntil
            if (member.currentUntil && member.currentUntil !== '01/01/0001') {
                try {
                    const [month, day, year] = member.currentUntil.split('/');
                    const date = new Date(year, month - 1, day);
                    if (isNaN(date.getTime())) {
                        throw new Error('Invalid date');
                    }
                } catch (err) {
                    errors.push(`Row ${rowIndex + 1}: Invalid current until date format (must be MM/DD/YYYY)`);
                }
            }

            return errors;
        },

        async submitImport() {
            this.loading = true;
            this.error = null;
            this.validationErrors = [];
            
            try {
                // Process and validate all rows first
                const members = [];
                const allErrors = [];
                
                this.csvData.forEach((row, index) => {
                    const member = {
                        mailingListOptIn: false,
                        wpaAresEnrolled: false,
                        joinDate: new Date().toISOString().split('T')[0]
                    };
                    
                    this.headers.forEach((header, colIndex) => {
                        const mappedField = this.mapping[header];
                        if (mappedField) {
                            if (mappedField === 'name') {
                                const [lastName, firstName] = row[colIndex].split(',').map(s => s.trim());
                                member.firstName = firstName;
                                member.lastName = lastName;
                            } else if (mappedField === 'volunteerExaminer') {
                                member[mappedField] = row[colIndex].toLowerCase() === 'checked';
                            } else if (mappedField === 'currentUntil') {
                                const date = row[colIndex];
                                if (date && date !== '01/01/0001') {
                                    const [month, day, year] = date.split('/');
                                    member[mappedField] = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                                }
                            } else if (mappedField === 'membershipType') {
                                // Make sure membership type is normalized and lowercase
                                member[mappedField] = this.normalizeMembershipType(row[colIndex]).toLowerCase();
                            } else {
                                member[mappedField] = row[colIndex];
                            }
                        }
                    });

                    // Validate the member
                    const memberErrors = this.validateMember(member, index);
                    if (memberErrors.length > 0) {
                        allErrors.push(...memberErrors);
                    } else {
                        members.push(member);
                    }
                });

                // If there are validation errors, show them and stop
                if (allErrors.length > 0) {
                    this.validationErrors = allErrors;
                    throw new Error('Please fix validation errors before importing');
                }

                const response = await fetch('/api/v1/members/bulk', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                    },
                    body: JSON.stringify({
                        members: members
                    })
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.detail || 'Import failed');
                }
                
                // If we get here, the import was successful
                this.importStats = responseData;
                
                // Show success message briefly before redirecting
                this.step = 'complete';
                this.error = null;
                
                // Wait a short moment to show the success message, then redirect
                setTimeout(() => {
                    window.$router.push('/members');
                }, 1500);

            } catch (err) {
                console.error('Import error:', err);
                if (err.message !== 'Please fix validation errors before importing') {
                    this.error = err.message;
                }
            } finally {
                this.loading = false;
            }
        },

        renderPreviewRows() {
            if (!this.previewData || this.previewData.length === 0) {
                return `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">No records to display</td></tr>`;
            }

            return this.previewData.map(record => {
                const hasErrors = Object.keys(record.validationErrors).length > 0;
                const errorTitles = Object.entries(record.validationErrors)
                    .map(([field, error]) => `${field}: ${error}`)
                    .join('\n');
                
                return `
                    <tr class="${hasErrors ? 'bg-red-50' : ''}" 
                        title="${hasErrors ? errorTitles : ''}"
                        ${hasErrors ? 'data-errors="true"' : ''}>
                        <td class="px-6 py-4 whitespace-nowrap">${record.rowNumber}</td>
                        <td class="px-6 py-4 whitespace-nowrap ${record.validationErrors.callSign ? 'text-red-600' : ''}">${record.callSign || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap ${(record.validationErrors.firstName || record.validationErrors.lastName) ? 'text-red-600' : ''}">${record.firstName} ${record.lastName}</td>
                        <td class="px-6 py-4 whitespace-nowrap">${record.class || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap ${record.validationErrors.membershipType ? 'text-red-600' : ''}">${record.membershipType || '-'}</td>
                        <td class="px-6 py-4 whitespace-nowrap ${record.validationErrors.email ? 'text-red-600' : ''}">${record.email || '-'}</td>
                    </tr>
                `;
            }).join('');
        },

        // Add this helper method to normalize membership types
        normalizeMembershipType(type) {
            if (!type) return '';
            
            // Convert to lowercase for comparison
            const lowerType = type.toLowerCase();
            
            // Map of conversions
            const typeMap = {
                'full': 'member'
            };
            
            // Return the mapped value or the original if no mapping exists
            return typeMap[lowerType] || type;
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