let books = [];
let filteredBooks = [];
const API_URL = 'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/hugo-books-full.json';

class BooksManager {
    constructor() {
        this.books = [];
        this.filteredBooks = [];
        this.currentSort = {
            column: 'award.year',
            direction: 'desc'
        };
    }

    async loadBooks() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Failed to load books data');
            
            const data = await response.json();
            this.books = data.books;
            this.filteredBooks = [...this.books];
            this.sortBooks();
            return true;
        } catch (error) {
            console.error('Error loading books:', error);
            throw error;
        }
    }

    filterBooks(filters = {}) {
        this.filteredBooks = this.books.filter(book => {
            const matchesTitle = !filters.title || 
                book.title.toLowerCase().includes(filters.title.toLowerCase());
            
            const matchesAuthor = !filters.author || 
                book.author.toLowerCase().includes(filters.author.toLowerCase());
            
            const matchesYear = !filters.year || 
                book.award.year.toString() === filters.year;
            
            const matchesWinner = !filters.winnerOnly || 
                book.award.is_winner;

            return matchesTitle && matchesAuthor && matchesYear && matchesWinner;
        });

        this.sortBooks();
        return this.filteredBooks;
    }

    sortBooks() {
        const { column, direction } = this.currentSort;
        
        this.filteredBooks.sort((a, b) => {
            let valueA = this.getNestedValue(a, column);
            let valueB = this.getNestedValue(b, column);

            if (valueA === valueB) return 0;
            if (valueA === null || valueA === undefined) return 1;
            if (valueB === null || valueB === undefined) return -1;

            const comparison = valueA < valueB ? -1 : 1;
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((curr, key) => 
            curr ? curr[key] : null, obj);
    }

    setSort(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = 
                this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        this.sortBooks();
    }
}