// Doctor Who Episodes - Minimal working implementation
(function () {
    const CONFIG = {
        DATA_URLS: [
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
            'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/preparation/data/doctor-who-episodes-full.json'
        ],
        DEBOUNCE_MS: 200
    };

    // Application state
    const state = {
        episodes: [],
        visible: [],
        sort: { field: 'rank', ascending: true },
        filters: { name: '', era: '', doctor: '', companion: '' }
    };

    // DOM refs
    const refs = {
        loading: document.getElementById('loading'),
        error: document.getElementById('error'),
        table: document.getElementById('episodes-table'),
        tbody: document.getElementById('episodes-body'),
        noResults: document.getElementById('no-results'),
        nameFilter: document.getElementById('name-filter'),
        eraFilter: document.getElementById('era-filter'),
        doctorFilter: document.getElementById('doctor-filter'),
        companionFilter: document.getElementById('companion-filter'),
        headers: Array.from(document.querySelectorAll('th[data-sort]'))
    };

    // Initialize
    function init() {
        setupEventListeners();
        loadEpisodes();
    }

    // Setup listeners
    function setupEventListeners() {
        if (refs.nameFilter) {
            refs.nameFilter.addEventListener('input', debounce((e) => {
                state.filters.name = e.target.value.trim().toLowerCase();
                applyFiltersAndSort();
            }, CONFIG.DEBOUNCE_MS));
        }

        if (refs.eraFilter) {
            refs.eraFilter.addEventListener('change', (e) => {
                state.filters.era = e.target.value;
                applyFiltersAndSort();
            });
        }

        if (refs.doctorFilter) {
            refs.doctorFilter.addEventListener('change', (e) => {
                state.filters.doctor = e.target.value;
                applyFiltersAndSort();
            });
        }

        if (refs.companionFilter) {
            refs.companionFilter.addEventListener('change', (e) => {
                state.filters.companion = e.target.value;
                applyFiltersAndSort();
            });
        }

        refs.headers.forEach(h => {
            h.addEventListener('click', () => {
                const field = h.dataset.sort;
                if (state.sort.field === field) state.sort.ascending = !state.sort.ascending;
                else { state.sort.field = field; state.sort.ascending = true; }
                applyFiltersAndSort();
            });
        });
    }

    // Load episodes from configured URLs (try sequentially)
    async function loadEpisodes() {
        showLoading(true);
        let lastError = null;
        try {
            for (const url of CONFIG.DATA_URLS) {
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                    const json = await res.json();
                    const arr = extractArray(json);
                    if (!Array.isArray(arr)) throw new Error('No array in response');
                    // Attach stable original index to each episode for deterministic tie-breaking
                    state.episodes = arr.map((ep, i) => Object.assign({}, ep, { _idx: i }));
                    // Validate data and show warnings
                    const warnings = validateEpisodes(state.episodes);
                    showWarningCount(warnings.length);
                    // Populate filter dropdowns
                    populateFilterDropdowns();
                    applyFiltersAndSort();
                    showError(null);
                    return;
                } catch (e) {
                    console.warn('Fetch failed for', url, e.message);
                    lastError = e;
                }
            }
            throw lastError || new Error('No data sources available');
        } catch (e) {
            showError('Failed to load episodes: ' + (e && e.message ? e.message : String(e)));
            console.error(e);
        } finally {
            showLoading(false);
        }
    }

    // Extract first array found in JSON (common wrappers: { episodes: [...] } )
    function extractArray(json) {
        if (Array.isArray(json)) return json;
        if (json && typeof json === 'object') {
            if (Array.isArray(json.episodes)) return json.episodes;
            if (Array.isArray(json.data)) return json.data;
            for (const k of Object.keys(json)) if (Array.isArray(json[k])) return json[k];
        }
        return null;
    }

    // Apply filter and sort, then render
    function applyFiltersAndSort() {
        // Apply all filters
        const { name, era, doctor, companion } = state.filters;
        
        let list = state.episodes.filter(ep => {
            // Name filter
            if (name) {
                const hay = buildSearchText(ep);
                if (!hay.includes(name)) return false;
            }
            
            // Era filter
            if (era && ep.era !== era) return false;
            
            // Doctor filter
            if (doctor) {
                const doctorName = ep.doctor?.actor || '';
                if (doctorName !== doctor) return false;
            }
            
            // Companion filter
            if (companion) {
                if (companion === '(None)') {
                    if (ep.companion) return false;
                } else {
                    const companionName = ep.companion?.actor || '';
                    if (companionName !== companion) return false;
                }
            }
            
            return true;
        });

        // If there's a search term, apply 4-tier relevance sort exactly as specified:
        // 1. Exact title matches
        // 2. Title contains search term
        // 3. Any field contains search term
        // 4. Default rank order
        if (name) {
            const term = name.toLowerCase();
            
            function getRelevanceScore(ep) {
                const title = ep?.title ? String(ep.title).toLowerCase() : '';
                const hay = buildSearchText(ep);
                
                if (title === term) return 0;  // Exact title match
                if (title.includes(term)) return 1;  // Title contains
                if (hay.includes(term)) return 2;  // Any field contains
                return 3;  // Default rank order
            }

            list.sort((a, b) => {
                const ra = getRelevanceScore(a);
                const rb = getRelevanceScore(b);
                if (ra !== rb) return ra - rb;
                // Within same relevance tier, sort by rank
                return (Number(a.rank) || 0) - (Number(b.rank) || 0);
                // Within same relevance tier, sort by rank ascending
                const rankA = Number.isFinite(Number(a.rank)) ? Number(a.rank) : Infinity;
                const rankB = Number.isFinite(Number(b.rank)) ? Number(b.rank) : Infinity;
                if (rankA !== rankB) return rankA - rankB;
                // Final stable tie-breaker
                return (a._idx ?? 0) - (b._idx ?? 0);
            });
        } else {
            // No search term: use normal column sorting
            const field = state.sort.field;
            const asc = state.sort.ascending;
            list.sort((a, b) => {
                const r = compareField(a, b, field, asc);
                if (r !== 0) return r;
                // deterministic tie-breaker using original index (stable, does NOT flip with asc/desc)
                const ai = Number.isFinite(Number(a._idx)) ? Number(a._idx) : 0;
                const bi = Number.isFinite(Number(b._idx)) ? Number(b._idx) : 0;
                if (ai === bi) return 0;
                return ai < bi ? -1 : 1;
            });
        }
        state.visible = list;
        renderEpisodes();
    }

    // Build a normalized lowercase text blob for searching across multiple fields
    function buildSearchText(ep) {
        if (!ep || typeof ep !== 'object') return '';
        const parts = [];
        const push = (v) => { if (v != null) parts.push(String(v).toLowerCase()); };

        push(ep.title);
        push(ep.director);
        // writer may contain multiple names joined with & or and
        if (ep.writer) {
            // split common delimiters and push all tokens
            const w = String(ep.writer).split(/&| and |,|;/i).map(s => s.trim()).filter(Boolean);
            w.forEach(push);
        }
        // doctor actor and incarnation
        if (ep.doctor) {
            push(ep.doctor.actor);
            push(ep.doctor.incarnation);
        }
        // companion actor and character
        if (ep.companion) {
            push(ep.companion.actor);
            push(ep.companion.character);
        }
        // rank and series (numbers)
        if (ep.rank != null) push(ep.rank);
        if (ep.series != null) push(ep.series);
        // Cast is intentionally excluded from search to match requirements
        // This ensures searches don't match against cast member names

        return parts.join(' ');
    }

    // Basic compare function supporting broadcast_date parsing
    function compareField(a, b, field, asc) {
        let va = a[field];
        let vb = b[field];

        // If sorting by doctor or companion, compare by the actor name (then incarnation/character)
        if (field === 'doctor') {
            va = doctorSortKey(a.doctor);
            vb = doctorSortKey(b.doctor);
            if (va == null && vb == null) return 0;
            // When ascending: unknowns should be last (greater). When descending: unknowns should be first (less).
            if (va == null) return asc ? 1 : -1;
            if (vb == null) return asc ? -1 : 1;
        }
        if (field === 'companion') {
            va = companionSortKey(a.companion);
            vb = companionSortKey(b.companion);
            if (va == null && vb == null) return 0;
            if (va == null) return asc ? 1 : -1;
            if (vb == null) return asc ? -1 : 1;
        }

        // Numeric fields should be compared as numbers
        if (field === 'rank' || field === 'series') {
            const na = Number.isFinite(Number(va)) ? Number(va) : null;
            const nb = Number.isFinite(Number(vb)) ? Number(vb) : null;
            if (na == null && nb == null) return 0;
            if (na == null) return asc ? 1 : -1;
            if (nb == null) return asc ? -1 : 1;
            return na === nb ? 0 : (na < nb ? (asc ? -1 : 1) : (asc ? 1 : -1));
        }

        // Special handling for broadcast_date: compare timestamps
        if (field === 'broadcast_date') {
            va = parseDateToTime(va);
            vb = parseDateToTime(vb);
            if (va == null && vb == null) return 0;
            if (va == null) return asc ? 1 : -1;
            if (vb == null) return asc ? -1 : 1;
            return va === vb ? 0 : (va < vb ? (asc ? -1 : 1) : (asc ? 1 : -1));
        }

        // For cast (array or other representations), compare by normalized cast count
        if (field === 'cast') {
            const la = getCastCount(va);
            const lb = getCastCount(vb);
            if (la === lb) {
                // Tie-breaker: use rank (numeric) so ordering is stable and consistent
                const ra = Number.isFinite(Number(a.rank)) ? Number(a.rank) : Infinity;
                const rb = Number.isFinite(Number(b.rank)) ? Number(b.rank) : Infinity;
                if (ra === rb) return 0;
                return ra < rb ? -1 : 1;
            }
            return la < lb ? (asc ? -1 : 1) : (asc ? 1 : -1);
        }

        // Default: string comparison when both are strings
        if (typeof va === 'string' && typeof vb === 'string') {
            const r = va.localeCompare(vb);
            return asc ? r : -r;
        }

        // Fallback generic comparison
        if (va == null && vb == null) {
            // final deterministic tie-breaker using original index (stable, does NOT flip with asc/desc)
            const ai = Number.isFinite(Number(a._idx)) ? Number(a._idx) : 0;
            const bi = Number.isFinite(Number(b._idx)) ? Number(b._idx) : 0;
            if (ai === bi) return 0;
            return ai < bi ? -1 : 1;
        }
        if (va == null) return asc ? 1 : -1;
        if (vb == null) return asc ? -1 : 1;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        // last resort: index-based deterministic order
        const ai = Number.isFinite(Number(a._idx)) ? Number(a._idx) : 0;
        const bi = Number.isFinite(Number(b._idx)) ? Number(b._idx) : 0;
        if (ai === bi) return 0;
        return ai < bi ? -1 : 1;
    }

    function isPlaceholderName(s) {
        if (!s) return true;
        const t = String(s).trim().toLowerCase();
        return t === '' || t === 'unknown' || t === 'n/a' || t === '—' || t === '-' || t === 'none' || t === 'null';
    }

    function doctorSortKey(d) {
        if (!d) return null;
        const actorRaw = d.actor || '';
        const incarnationRaw = d.incarnation || '';
        // If actor is missing/placeholder, treat as unknown regardless of incarnation
        if (isPlaceholderName(actorRaw)) return null;
        const actor = String(actorRaw).toLowerCase().trim();
        const incarnation = String(incarnationRaw).toLowerCase().trim();
        return actor + (incarnation ? '|' + incarnation : '');
    }

    function companionSortKey(c) {
        if (!c) return null;
        const actorRaw = c.actor || '';
        const characterRaw = c.character || '';
        // If actor is missing/placeholder, treat as unknown regardless of character
        if (isPlaceholderName(actorRaw)) return null;
        const actor = String(actorRaw).toLowerCase().trim();
        const character = String(characterRaw).toLowerCase().trim();
        return actor + (character ? '|' + character : '');
    }

    // Render episodes table
    function renderEpisodes() {
        const tbody = refs.tbody;
        tbody.innerHTML = '';
        if (!state.visible || state.visible.length === 0) {
            refs.table.style.display = 'none';
            refs.noResults.style.display = 'block';
            return;
        }
        refs.noResults.style.display = 'none';
        refs.table.style.display = 'table';

        for (const ep of state.visible) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(ep.rank ?? '—')}</td>
                <td>${escapeHtml(ep.title ?? '—')}</td>
                <td>${escapeHtml(ep.series ?? '—')}</td>
                <td>${escapeHtml(ep.era ?? '—')}</td>
                <td>${escapeHtml(formatBroadcastYear(ep.broadcast_date))}</td>
                <td>${escapeHtml(ep.director ?? '—')}</td>
                <td>${escapeHtml(ep.writer ?? '—')}</td>
                <td>${escapeHtml(formatDoctor(ep.doctor))}</td>
                <td>${escapeHtml(formatCompanion(ep.companion))}</td>
                <td>${escapeHtml(String(getCastCount(ep.cast)))}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    // Utilities
    function formatBroadcastYear(s) {
        if (!s) return '—';
        const t = parseDateToTime(s);
        if (!t) {
            // try DD/MM/YYYY
            const parts = String(s).split('/');
            if (parts.length === 3) return parts[2];
            return s;
        }
        return new Date(t).getFullYear();
    }

    function formatDoctor(d) {
        if (!d) return '—';
        return `${d.actor || 'Unknown'}${d.incarnation ? ' (' + d.incarnation + ')' : ''}`;
    }

    function formatCompanion(c) {
        if (!c) return '—';
        return `${c.actor || 'Unknown'}${c.character ? ' (' + c.character + ')' : ''}`;
    }

    function parseDateToTime(s) {
        if (!s) return null;
        // Handle YYYY
        if (/^\d{4}$/.test(String(s))) return new Date(Number(s),0,1).getTime();
        // Try DD/MM/YYYY
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(s))) {
            const [dd,mm,yy] = String(s).split('/').map(Number);
            return new Date(yy, mm-1, dd).getTime();
        }
        const parsed = Date.parse(String(s));
        return isNaN(parsed) ? null : parsed;
    }

    // Parse cast count from various representations
    function parseCastCount(v) {
        if (v == null) return null;
        if (Array.isArray(v)) return v.length;
        if (typeof v === 'number') return Number.isFinite(v) ? v : null;
        if (typeof v === 'string') {
            const s = v.trim();
            if (s === '') return null;
            // Try JSON array
            try {
                const parsed = JSON.parse(s);
                if (Array.isArray(parsed)) return parsed.length;
            } catch (e) {
                // not JSON
            }
            // Comma-separated list fallback
            if (s.includes(',')) {
                return s.split(',').map(x => x.trim()).filter(x => x).length;
            }
            // Try numeric string
            if (/^\d+$/.test(s)) return Number(s);
            return 1; // non-empty string probably represents one cast item
        }
        return null;
    }

    // Build normalized search text from all episode fields
    function buildSearchText(ep) {
        if (!ep || typeof ep !== 'object') return '';
        const parts = [];
        const push = (v) => {
            if (v != null) {
                const words = String(v)
                    .toLowerCase()
                    // Split on word boundaries, keeping delimiters
                    .split(/([^a-z0-9]+)/i)
                    .filter(Boolean);
                parts.push(...words);
            }
        };

        // Include all searchable fields
        push(ep.title);
        push(ep.director);
        // Split writer on common delimiters
        if (ep.writer) {
            String(ep.writer).split(/&| and |,|;/i)
                .map(s => s.trim())
                .filter(Boolean)
                .forEach(push);
        }
        // Doctor: actor and incarnation
        if (ep.doctor) {
            push(ep.doctor.actor);
            push(ep.doctor.incarnation);
        }
        // Companion: actor and character
        if (ep.companion) {
            push(ep.companion.actor);
            push(ep.companion.character);
        }
        // Include numbers as strings
        if (ep.rank != null) push(ep.rank);
        if (ep.series != null) push(ep.series);
        // Cast members if available
        if (Array.isArray(ep.cast)) {
            ep.cast.forEach(c => {
                if (c) {
                    push(c.actor);
                    push(c.character);
                }
            });
        }
        return parts.join(' ');
    }

    // Normalize cast count to a non-negative integer for sorting/display.
    // Treat missing/unknown as 0 so they group consistently with explicit 0 values.
    function getCastCount(v) {
        const n = parseCastCount(v);
        if (n == null || !Number.isFinite(Number(n))) return 0;
        return Math.max(0, Math.floor(Number(n)));
    }

    // (Removed key-builder functions in favor of compareField-based sorting.)

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function debounce(fn, ms) {
        let t;
        return function (...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    function showLoading(on) {
        refs.loading.style.display = on ? 'block' : 'none';
        refs.table.style.display = on ? 'none' : 'table';
    }

    function showError(msg) {
        if (!msg) {
            refs.error.style.display = 'none';
            refs.error.textContent = '';
        } else {
            refs.error.style.display = 'block';
            refs.error.textContent = msg;
        }
    }

    // Data Validation (Tier 3 Advanced Feature)
    function validateEpisodes(episodes) {
        const warnings = [];
        const seenRanks = new Set();
        const now = new Date();

        episodes.forEach((ep, idx) => {
            // Missing required fields
            if (!ep.title || typeof ep.title !== 'string' || ep.title.trim() === '') {
                warnings.push(`Episode at index ${idx}: Missing or invalid title`);
            }
            if (ep.rank == null) {
                warnings.push(`Episode "${ep.title || 'at index ' + idx}": Missing rank`);
            }
            if (!ep.broadcast_date) {
                warnings.push(`Episode "${ep.title || 'at index ' + idx}": Missing broadcast_date`);
            }

            // Duplicate/invalid ranks
            if (ep.rank != null) {
                if (seenRanks.has(ep.rank)) {
                    warnings.push(`Episode "${ep.title || 'at index ' + idx}": Duplicate rank ${ep.rank}`);
                }
                if (Number(ep.rank) <= 0) {
                    warnings.push(`Episode "${ep.title || 'at index ' + idx}": Invalid rank ${ep.rank} (must be positive)`);
                }
                seenRanks.add(ep.rank);
            }

            // Negative series numbers
            if (ep.series != null && Number(ep.series) < 0) {
                warnings.push(`Episode "${ep.title || 'at index ' + idx}": Negative series number ${ep.series}`);
            }

            // Future broadcast dates
            if (ep.broadcast_date) {
                const dateTime = parseDateToTime(ep.broadcast_date);
                if (dateTime && dateTime > now.getTime()) {
                    warnings.push(`Episode "${ep.title || 'at index ' + idx}": Future broadcast date ${ep.broadcast_date}`);
                }
            }
        });

        // Log all warnings to console
        if (warnings.length > 0) {
            console.warn(`Data Validation: Found ${warnings.length} warning(s):`);
            warnings.forEach(w => console.warn('  - ' + w));
        } else {
            console.log('Data Validation: No issues found');
        }

        return warnings;
    }

    function showWarningCount(count) {
        let badge = document.getElementById('validation-warnings');
        if (count === 0) {
            if (badge) badge.remove();
            return;
        }
        
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'validation-warnings';
            badge.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: #ff9800;
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9999;
                cursor: pointer;
            `;
            badge.title = 'Click to view validation warnings in console';
            badge.addEventListener('click', () => {
                console.log('Check console for detailed validation warnings');
            });
            document.body.appendChild(badge);
        }
        badge.textContent = `⚠ ${count} Warning${count !== 1 ? 's' : ''}`;
    }

    // Populate filter dropdowns from episode data (Bonus Feature: Enhanced Filters)
    function populateFilterDropdowns() {
        // Populate Doctor filter
        if (refs.doctorFilter) {
            const doctors = new Set();
            state.episodes.forEach(ep => {
                if (ep.doctor && ep.doctor.actor) {
                    doctors.add(ep.doctor.actor);
                }
            });
            
            // Clear existing options except first
            refs.doctorFilter.innerHTML = '<option value="">All Doctors</option>';
            
            // Sort and add doctors
            Array.from(doctors).sort().forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor;
                option.textContent = doctor;
                refs.doctorFilter.appendChild(option);
            });
        }

        // Populate Companion filter
        if (refs.companionFilter) {
            const companions = new Set();
            let hasNone = false;
            
            state.episodes.forEach(ep => {
                if (ep.companion && ep.companion.actor) {
                    companions.add(ep.companion.actor);
                } else {
                    hasNone = true;
                }
            });
            
            // Clear existing options except first
            refs.companionFilter.innerHTML = '<option value="">All Companions</option>';
            
            // Add "None" option if there are episodes without companions
            if (hasNone) {
                const noneOption = document.createElement('option');
                noneOption.value = '(None)';
                noneOption.textContent = '(None)';
                refs.companionFilter.appendChild(noneOption);
            }
            
            // Sort and add companions
            Array.from(companions).sort().forEach(companion => {
                const option = document.createElement('option');
                option.value = companion;
                option.textContent = companion;
                refs.companionFilter.appendChild(option);
            });
        }
    }

    // Start
    document.addEventListener('DOMContentLoaded', init);

})();
