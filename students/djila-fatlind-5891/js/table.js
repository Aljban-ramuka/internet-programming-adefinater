class TableRenderer {
    constructor(booksManager) {
        this.booksManager = booksManager;
        this.tbody = document.getElementById('booksTableBody');
        this.initializeSortListeners();
    }

    renderBooks() {
        this.tbody.innerHTML = '';
        
        if (this.booksManager.filteredBooks.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
            return;
        }
        document.getElementById('noResults').classList.add('hidden');

        this.booksManager.filteredBooks.forEach(book => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${book.url || '#'}" target="_blank">${utils.escapeHtml(book.title)}</a></td>
                <td>${utils.escapeHtml(book.author)}</td>
                <td>${utils.escapeHtml(book.award.category)}</td>
                <td>${utils.formatAward(book.award)}</td>
                <td>${utils.escapeHtml(book.publisher)}</td>
                <td>${utils.formatSeries(book.series)}</td>
                <td>${utils.formatGenres(book.genres)}</td>
            `;
            this.tbody.appendChild(row);
        });
    }

    initializeSortListeners() {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                this.booksManager.setSort(column);
                this.updateSortIndicators(th);
                this.renderBooks();
            });
        });
    }

    updateSortIndicators(clickedTh) {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });

        clickedTh.classList.add(
            this.booksManager.currentSort.direction === 'asc' ? 
                'sort-asc' : 'sort-desc'
        );
    }
}