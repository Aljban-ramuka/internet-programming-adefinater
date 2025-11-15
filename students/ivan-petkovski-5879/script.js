// script.js
class DoctorWhoExplorer {
    constructor() {
        this.episodes = [];
        this.filteredEpisodes = [];
        this.sortConfig = {
            key: 'rank',
            direction: 'asc'
        };
        this.filters = {
            search: '',
            era: '',
            doctor: '',
            companion: ''
        };
        this.dataWarnings = [];
        
        this.initializeApp();
    }
    
    initializeApp() {
        this.bindEvents();
        this.loadEpisodes();
    }
    
    bindEvents() {
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });
        
        // Era filter
        document.getElementById('eraFilter').addEventListener('change', (e) => {
            this.filters.era = e.target.value;
            this.applyFilters();
        });
        
        // Doctor filter
        document.getElementById('doctorFilter').addEventListener('change', (e) => {
            this.filters.doctor = e.target.value;
            this.applyFilters();
        });
        
        // Companion filter
        document.getElementById('companionFilter').addEventListener('change', (e) => {
            this.filters.companion = e.target.value;
            this.applyFilters();
        });
        
        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });
        
        // Table header sorting
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                this.handleSort(th.dataset.sort);
            });
        });
    }
    
    async loadEpisodes() {
        this.showLoading();
        
        try {
            // Using the single URL approach as specified
            const response = await fetch('https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.episodes = data.episodes || [];
            
            // Validate data and collect warnings
            this.validateData();
            
            // Populate filter dropdowns
            this.populateFilters();
            
            // Apply initial sort and display
            this.applySort();
            this.applyFilters();
            
            this.hideLoading();
            this.showTable();
            
        } catch (error) {
            console.error('Error loading episodes:', error);
            this.hideLoading();
            this.showError();
        }
    }
    
    validateData() {
        this.dataWarnings = [];
        
        this.episodes.forEach(episode => {
            // Check for missing required fields
            if (!episode.rank) this.dataWarnings.push(`Episode "${episode.title}" is missing rank`);
            if (!episode.title) this.dataWarnings.push(`Episode with rank ${episode.rank} is missing title`);
            if (!episode.series) this.dataWarnings.push(`Episode "${episode.title}" is missing series`);
            if (!episode.era) this.dataWarnings.push(`Episode "${episode.title}" is missing era`);
            if (!episode.broadcast_date) this.dataWarnings.push(`Episode "${episode.title}" is missing broadcast date`);
            
            // Check for future broadcast dates
            const broadcastYear = this.extractYear(episode.broadcast_date);
            if (broadcastYear > new Date().getFullYear()) {
                this.dataWarnings.push(`Episode "${episode.title}" has a future broadcast date: ${episode.broadcast_date}`);
            }
            
            // Check for negative series numbers
            if (episode.series < 0) {
                this.dataWarnings.push(`Episode "${episode.title}" has negative series number: ${episode.series}`);
            }
            
            // Check for duplicate ranks
            const sameRank = this.episodes.filter(e => e.rank === episode.rank);
            if (sameRank.length > 1) {
                this.dataWarnings.push(`Duplicate rank ${episode.rank} found for episodes: ${sameRank.map(e => e.title).join(', ')}`);
            }
        });
        
        // Display warnings in UI
        this.displayWarnings();
        
        // Log warnings to console
        if (this.dataWarnings.length > 0) {
            console.warn('Data validation warnings:', this.dataWarnings);
        }
    }
    
    displayWarnings() {
        const warningsElement = document.getElementById('dataWarnings');
        
        if (this.dataWarnings.length > 0) {
            warningsElement.textContent = `${this.dataWarnings.length} data warnings detected (see console for details)`;
        } else {
            warningsElement.textContent = '';
        }
    }
    
    populateFilters() {
        // Get unique doctors
        const doctors = [...new Set(this.episodes
            .filter(ep => ep.doctor)
            .map(ep => `${ep.doctor.actor} (${ep.doctor.incarnation})`)
        )].sort();
        
        const doctorFilter = document.getElementById('doctorFilter');
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor;
            option.textContent = doctor;
            doctorFilter.appendChild(option);
        });
        
        // Get unique companions
        const companions = [...new Set(this.episodes
            .filter(ep => ep.companion)
            .map(ep => `${ep.companion.actor} (${ep.companion.character})`)
        )].sort();
        
        const companionFilter = document.getElementById('companionFilter');
        companions.forEach(companion => {
            const option = document.createElement('option');
            option.value = companion;
            option.textContent = companion;
            companionFilter.appendChild(option);
        });
    }
    
    applyFilters() {
        this.filteredEpisodes = this.episodes.filter(episode => {
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchFields = [
                    episode.title,
                    episode.doctor?.actor,
                    episode.doctor?.incarnation,
                    episode.companion?.actor,
                    episode.companion?.character,
                    episode.director,
                    episode.writer
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchFields.includes(searchTerm)) {
                    return false;
                }
            }
            
            // Era filter
            if (this.filters.era && episode.era !== this.filters.era) {
                return false;
            }
            
            // Doctor filter
            if (this.filters.doctor) {
                const doctorStr = `${episode.doctor?.actor} (${episode.doctor?.incarnation})`;
                if (doctorStr !== this.filters.doctor) {
                    return false;
                }
            }
            
            // Companion filter
            if (this.filters.companion) {
                if (!episode.companion) return false;
                
                const companionStr = `${episode.companion.actor} (${episode.companion.character})`;
                if (companionStr !== this.filters.companion) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Apply smart relevance sort when filtering
        if (this.filters.search) {
            this.applyRelevanceSort();
        } else {
            this.applySort();
        }
        
        this.renderTable();
        this.updateEpisodeCount();
    }
    
    applySort() {
        this.filteredEpisodes.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortConfig.key) {
                case 'rank':
                    aValue = a.rank;
                    bValue = b.rank;
                    break;
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'series':
                    aValue = a.series;
                    bValue = b.series;
                    break;
                case 'era':
                    aValue = a.era;
                    bValue = b.era;
                    break;
                case 'broadcast_year':
                    aValue = this.extractYear(a.broadcast_date);
                    bValue = this.extractYear(b.broadcast_date);
                    break;
                case 'director':
                    aValue = a.director.toLowerCase();
                    bValue = b.director.toLowerCase();
                    break;
                case 'writer':
                    aValue = a.writer.toLowerCase();
                    bValue = b.writer.toLowerCase();
                    break;
                case 'doctor':
                    aValue = `${a.doctor?.actor} (${a.doctor?.incarnation})`.toLowerCase();
                    bValue = `${b.doctor?.actor} (${b.doctor?.incarnation})`.toLowerCase();
                    break;
                case 'companion':
                    aValue = a.companion ? `${a.companion.actor} (${a.companion.character})`.toLowerCase() : '';
                    bValue = b.companion ? `${b.companion.actor} (${b.companion.character})`.toLowerCase() : '';
                    break;
                case 'cast_count':
                    aValue = a.cast ? a.cast.length : 0;
                    bValue = b.cast ? b.cast.length : 0;
                    break;
                default:
                    aValue = a.rank;
                    bValue = b.rank;
            }
            
            // Handle null/undefined values
            if (aValue == null) aValue = '';
            if (bValue == null) bValue = '';
            
            let result = 0;
            if (aValue < bValue) result = -1;
            if (aValue > bValue) result = 1;
            
            return this.sortConfig.direction === 'asc' ? result : -result;
        });
    }
    
    applyRelevanceSort() {
        const searchTerm = this.filters.search.toLowerCase();
        
        this.filteredEpisodes.sort((a, b) => {
            // 1. Exact title matches
            const aTitleExact = a.title.toLowerCase() === searchTerm;
            const bTitleExact = b.title.toLowerCase() === searchTerm;
            
            if (aTitleExact && !bTitleExact) return -1;
            if (!aTitleExact && bTitleExact) return 1;
            
            // 2. Title contains search term
            const aTitleContains = a.title.toLowerCase().includes(searchTerm);
            const bTitleContains = b.title.toLowerCase().includes(searchTerm);
            
            if (aTitleContains && !bTitleContains) return -1;
            if (!aTitleContains && bTitleContains) return 1;
            
            // 3. Any field contains search term
            const aFields = [
                a.title,
                a.doctor?.actor,
                a.doctor?.incarnation,
                a.companion?.actor,
                a.companion?.character,
                a.director,
                a.writer
            ].filter(Boolean).join(' ').toLowerCase();
            
            const bFields = [
                b.title,
                b.doctor?.actor,
                b.doctor?.incarnation,
                b.companion?.actor,
                b.companion?.character,
                b.director,
                b.writer
            ].filter(Boolean).join(' ').toLowerCase();
            
            const aAnyContains = aFields.includes(searchTerm);
            const bAnyContains = bFields.includes(searchTerm);
            
            if (aAnyContains && !bAnyContains) return -1;
            if (!aAnyContains && bAnyContains) return 1;
            
            // 4. Default rank order
            return a.rank - b.rank;
        });
    }
    
    handleSort(key) {
        // Toggle direction if same key, otherwise set to ascending
        if (this.sortConfig.key === key) {
            this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortConfig.key = key;
            this.sortConfig.direction = 'asc';
        }
        
        // Update UI to show current sort
        document.querySelectorAll('th').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const currentTh = document.querySelector(`th[data-sort="${key}"]`);
        currentTh.classList.add(`sort-${this.sortConfig.direction}`);
        
        // Apply sort
        if (this.filters.search) {
            this.applyRelevanceSort();
        } else {
            this.applySort();
        }
        
        this.renderTable();
    }
    
    renderTable() {
        const tbody = document.getElementById('episodesBody');
        tbody.innerHTML = '';
        
        if (this.filteredEpisodes.length === 0) {
            this.showNoResults();
            return;
        }
        
        this.filteredEpisodes.forEach(episode => {
            const row = document.createElement('tr');
            
            // Format data with proper handling of edge cases
            const broadcastYear = this.extractYear(episode.broadcast_date);
            const doctorDisplay = episode.doctor ? 
                `${episode.doctor.actor} (${episode.doctor.incarnation})` : '—';
            const companionDisplay = episode.companion ? 
                `${episode.companion.actor} (${episode.companion.character})` : '—';
            const castCount = episode.cast ? episode.cast.length : 0;
            
            row.innerHTML = `
                <td>${episode.rank}</td>
                <td>${this.escapeHTML(episode.title)}</td>
                <td>${episode.series}</td>
                <td>${episode.era}</td>
                <td>${broadcastYear}</td>
                <td>${this.escapeHTML(episode.director)}</td>
                <td>${this.escapeHTML(episode.writer)}</td>
                <td>${this.escapeHTML(doctorDisplay)}</td>
                <td>${this.escapeHTML(companionDisplay)}</td>
                <td>${castCount}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        this.showTable();
    }
    
    extractYear(dateString) {
        if (!dateString) return '—';
        
        // Handle different date formats
        // Format 1: YYYY-MM-DD
        const match1 = dateString.match(/^(\d{4})-\d{2}-\d{2}$/);
        if (match1) return parseInt(match1[1]);
        
        // Format 2: DD/MM/YYYY
        const match2 = dateString.match(/^\d{2}\/\d{2}\/(\d{4})$/);
        if (match2) return parseInt(match2[1]);
        
        // Format 3: Month DD, YYYY
        const match3 = dateString.match(/\w+ \d{1,2}, (\d{4})$/);
        if (match3) return parseInt(match3[1]);
        
        // Format 4: Just YYYY
        const match4 = dateString.match(/^\d{4}$/);
        if (match4) return parseInt(match4[0]);
        
        // Fallback: try to parse as date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.getFullYear();
        }
        
        return '—';
    }
    
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateEpisodeCount() {
        document.getElementById('episodeCount').textContent = this.filteredEpisodes.length;
    }
    
    exportToCSV() {
        if (this.filteredEpisodes.length === 0) {
            alert('No episodes to export');
            return;
        }
        
        const headers = [
            'Rank', 'Title', 'Series', 'Era', 'Broadcast Year', 
            'Director', 'Writer', 'Doctor', 'Companion', 'Cast Count'
        ];
        
        const csvContent = [
            headers.join(','),
            ...this.filteredEpisodes.map(episode => {
                const broadcastYear = this.extractYear(episode.broadcast_date);
                const doctorDisplay = episode.doctor ? 
                    `${episode.doctor.actor} (${episode.doctor.incarnation})` : 'None';
                const companionDisplay = episode.companion ? 
                    `${episode.companion.actor} (${episode.companion.character})` : 'None';
                const castCount = episode.cast ? episode.cast.length : 0;
                
                return [
                    episode.rank,
                    `"${episode.title.replace(/"/g, '""')}"`,
                    episode.series,
                    episode.era,
                    broadcastYear,
                    `"${episode.director.replace(/"/g, '""')}"`,
                    `"${episode.writer.replace(/"/g, '""')}"`,
                    `"${doctorDisplay.replace(/"/g, '""')}"`,
                    `"${companionDisplay.replace(/"/g, '""')}"`,
                    castCount
                ].join(',');
            })
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'doctor_who_episodes.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    showLoading() {
        document.getElementById('loadingIndicator').style.display = 'block';
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'none';
    }
    
    hideLoading() {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
    
    showError() {
        document.getElementById('errorMessage').style.display = 'block';
    }
    
    showTable() {
        document.getElementById('tableContainer').style.display = 'block';
        document.getElementById('noResults').style.display = 'none';
    }
    
    showNoResults() {
        document.getElementById('tableContainer').style.display = 'none';
        document.getElementById('noResults').style.display = 'block';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DoctorWhoExplorer();
});