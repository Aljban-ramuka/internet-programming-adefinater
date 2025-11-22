document.addEventListener('DOMContentLoaded', async () => {
    const booksManager = new BooksManager();
    const tableRenderer = new TableRenderer(booksManager);

    // Initialize filters
    const filters = {
        titleFilter: document.getElementById('titleFilter'),
        authorFilter: document.getElementById('authorFilter'),
        yearFilter: document.getElementById('yearFilter'),
        winnerFilter: document.getElementById('winnerFilter')
    };

    try {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('error').classList.add('hidden');

        await booksManager.loadBooks();

        // Populate year filter
        const years = booksManager.books
            .map(book => book.award.year)
            .filter((year, index, self) => self.indexOf(year) === index)
            .sort((a, b) => b - a);

        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            filters.yearFilter.appendChild(option);
        });

        // Add filter event listeners
        const handleFilter = utils.debounce(() => {
            const filterValues = {
                title: filters.titleFilter.value,
                author: filters.authorFilter.value,
                year: filters.yearFilter.value,
                winnerOnly: filters.winnerFilter.checked
            };
            
            booksManager.filterBooks(filterValues);
            tableRenderer.renderBooks();
        }, 300);

        Object.values(filters).forEach(filter => {
            filter.addEventListener('input', handleFilter);
            filter.addEventListener('change', handleFilter);
        });

        // Initial render
        tableRenderer.renderBooks();

    } catch (error) {
        document.getElementById('error').textContent = 'Failed to load books data. Please try again later.';
        document.getElementById('error').classList.remove('hidden');
        console.error('Application error:', error);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
});