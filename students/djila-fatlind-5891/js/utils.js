const utils = {
    escapeHtml(str) {
        if (str === null || str === undefined) return '—';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    formatSeries(series) {
        if (!series) return '—';
        if (typeof series === 'string') return this.escapeHtml(series);
        return `${this.escapeHtml(series.name)} (#${series.order})`;
    },

    formatAward(award) {
        return `${award.year} ${award.is_winner ? 
            '<span class="winner-badge">Winner</span>' : 
            '<span class="nominee-badge">Nominee</span>'}`;
    },

    formatGenres(genres) {
        if (!genres || !genres.length) return '—';
        return genres
            .map(genre => `<span class="genre-tag">${this.escapeHtml(genre)}</span>`)
            .join(' ');
    },

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
};