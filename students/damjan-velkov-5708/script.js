/**
 * Doctor Who Episodes Explorer - full version
 * Filters: Title, Era, Doctor, Companion
 * Writers: "and" → "&"
 * Companions: emojis removed
 * Keyboard navigation
 * Author: Damjan Velkov (updated)
 */

// Configuration
const CONFIG = {
    DATA_URL: '../doctor-who-episodes-exam.json',
    ALT_URLS: [
        'https://raw.githubusercontent.com/sweko/internet-programming-adefinater/refs/heads/preparation/data/doctor-who-episodes-full.json',
        '../doctor-who-episodes-full.json'
    ],
    DEBOUNCE_MS: 250
};

let state = {
    episodes: [],
    filtered: [],
    loading: true,
    error: null,
    sort: { field: 'rank', ascending: true },
    filters: { name: '', era: '', doctor: '', companion: '' },
    warnings: []
};

/* ------------------------- Utility ------------------------- */
const warningsListEl = () => document.getElementById('warnings-list');
const warningCountEl = () => document.getElementById('warning-count');

function addWarning(msg) {
    if (!msg) return;
    state.warnings.push(msg);
    console.warn('Data validation:', msg);
    if (warningCountEl()) warningCountEl().textContent = state.warnings.length;
    if (warningsListEl()) {
        const li = document.createElement('li');
        li.textContent = msg;
        warningsListEl().appendChild(li);
    }
}

function resetWarningsUI() {
    state.warnings = [];
    if (warningCountEl()) warningCountEl().textContent = '0';
    if (warningsListEl()) warningsListEl().innerHTML = '';
}

function parseDateToTimestamp(raw) {
    if (!raw) return NaN;
    if (raw instanceof Date && !isNaN(raw)) return raw.getTime();

    const s = String(raw).trim();
    const isoMatch = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})$/);
    if (isoMatch) return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`).getTime();
    const ukMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ukMatch) return new Date(`${ukMatch[3]}-${ukMatch[2]}-${ukMatch[1]}`).getTime();
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) return parsed;
    const yearMatch = s.match(/(^|\D)(\d{4})(\D|$)/);
    if (yearMatch) return new Date(Number(yearMatch[2]), 0, 1).getTime();
    return NaN;
}

function createCell(text) {
    const td = document.createElement('td');
    td.textContent = (text === null || text === undefined) ? '—' : text;
    return td;
}

/* ------------------------- Validation ------------------------- */
function validateDataset(episodes) {
    resetWarningsUI();
    const seenRanks = new Set();
    const todayTs = Date.now();

    episodes.forEach((ep, idx) => {
        const context = `episode index ${idx}${ep?.title ? ` "${ep.title}"` : ''}`;

        if (!ep || typeof ep !== 'object') {
            addWarning(`${context}: entry is not an object`);
            return;
        }

        // Rank
        if (!('rank' in ep) || ep.rank === null || ep.rank === undefined || ep.rank === '') {
            addWarning(`${context}: missing rank`);
        } else {
            const rankNum = Number(ep.rank);
            if (Number.isNaN(rankNum)) addWarning(`${context}: rank is not a number`);
            else {
                if (!Number.isInteger(rankNum)) addWarning(`${context}: rank not integer`);
                if (rankNum < 0) addWarning(`${context}: rank negative (${rankNum})`);
                if (seenRanks.has(rankNum)) addWarning(`${context}: duplicate rank (${rankNum})`);
                seenRanks.add(rankNum);
            }
        }

        // Series
        if ('series' in ep && ep.series !== null && ep.series !== undefined && ep.series !== '') {
            const seriesNum = Number(ep.series);
            if (Number.isNaN(seriesNum)) addWarning(`${context}: series non-numeric`);
            else if (seriesNum < 0) addWarning(`${context}: series negative (${seriesNum})`);
        }

        // Cast
        if (ep.cast && !Array.isArray(ep.cast)) addWarning(`${context}: cast not array`);

        // Date
        if (ep.broadcast_date) {
            const ts = parseDateToTimestamp(ep.broadcast_date);
            if (Number.isNaN(ts)) addWarning(`${context}: broadcast_date not parseable`);
            else if (ts > todayTs) addWarning(`${context}: broadcast_date in future`);
        }

        if (!ep.title) addWarning(`${context}: missing title`);
        if (!ep.director) addWarning(`${context}: missing director`);
        if (!ep.writer) addWarning(`${context}: missing writer`);
    });
}

/* ------------------------- Load ------------------------- */
async function init() {
    setupEventListeners();
    await loadEpisodes();
}

function setupEventListeners() {
    // Filter inputs
    ['name-filter','era-filter','doctor-filter','companion-filter'].forEach(id => {
        const el = document.getElementById(id);
        let debounced;
        el.addEventListener('input', (e) => {
            clearTimeout(debounced);
            debounced = setTimeout(() => {
                state.filters[id.replace('-filter','')] = e.target.value;
                filterEpisodes();
            }, CONFIG.DEBOUNCE_MS);
        });
    });

    // Sorting headers
    const headers = document.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            if (state.sort.field === field) state.sort.ascending = !state.sort.ascending;
            else { state.sort.field = field; state.sort.ascending = true; }
            headers.forEach(h => h.classList.remove('sort-asc','sort-desc'));
            header.classList.add(state.sort.ascending ? 'sort-asc':'sort-desc');
            sortEpisodes(field);
        });
        header.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); header.click(); }
        });
    });

    // Warnings toggle
    const toggleBtn = document.getElementById('toggle-warnings');
    toggleBtn.addEventListener('click', () => {
        const det = document.getElementById('warnings-details');
        const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        det.style.display = expanded ? 'none' : 'block';
        toggleBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        toggleBtn.textContent = expanded ? 'Show details' : 'Hide details';
    });
}

/* ------------------------- Fetch ------------------------- */
async function tryFetch(url) {
    try { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.text(); }
    catch(e){ console.log('fetch failed for',url,e); throw e;}
}

async function loadEpisodes() {
    try {
        showLoading(true);
        resetWarningsUI();
        let data = null;
        let lastError = null;
        const urls = [...CONFIG.ALT_URLS, CONFIG.DATA_URL];
        for(const url of urls){
            try{
                const text = await tryFetch(url);
                try {
                    const parsed = JSON.parse(text);
                    if(Array.isArray(parsed)) data=parsed;
                    else if(parsed?.episodes) data=parsed.episodes;
                    else if(parsed?.data?.episodes) data=parsed.data.episodes;
                    else data=null;
                    if(data) break;
                    else lastError = new Error('JSON not in expected shape');
                } catch(e){ lastError = e; }
            } catch(e){ lastError = e; }
        }
        if(!data) throw lastError || new Error('Failed fetch/parse');
        state.episodes = data.map(ep => (typeof ep==='object' && ep!==null)?ep:{title:String(ep)});
        validateDataset(state.episodes);
        state.filtered = [...state.episodes];
        populateFilterOptions();
        displayEpisodes(state.filtered);
    } catch(e){ showError(`Failed to load episodes: ${e.message}`); console.error(e);}
    finally{ showLoading(false); }
}

/* ------------------------- Display ------------------------- */
function displayEpisodes(episodes){
    const tbody = document.getElementById('episodes-body');
    const table = document.getElementById('episodes-table');
    const noResults = document.getElementById('no-results');
    tbody.innerHTML='';
    if(!episodes || episodes.length===0){
        table.style.display='none';
        noResults.style.display='block';
        return;
    }
    table.style.display='table';
    noResults.style.display='none';

    episodes.forEach(ep=>{
        if(!ep) return;
        const row = document.createElement('tr');

        row.appendChild(createCell(ep.rank??'—'));
        row.appendChild(createCell(ep.title??'—'));
        row.appendChild(createCell(ep.series??'—'));
        row.appendChild(createCell(ep.era??'—'));
        const ts=parseDateToTimestamp(ep.broadcast_date);
        row.appendChild(createCell(!isNaN(ts)?new Date(ts).getFullYear():'—'));
        row.appendChild(createCell(ep.director??'—'));

        // Writer
        let writerText='—';
        if(ep.writer){
            if(Array.isArray(ep.writer)) writerText=ep.writer.map(w=>w.trim()).join(' & ');
            else writerText=ep.writer.split(/\s*,\s*|\s+and\s+/i).map(w=>w.trim()).filter(Boolean).join(' & ');
        }
        row.appendChild(createCell(writerText));

        // Doctor
        const doctorText=ep.doctor && (ep.doctor.actor || ep.doctor.incarnation)
            ? `${ep.doctor.actor??'—'} (${ep.doctor.incarnation??'—'})` : '—';
        row.appendChild(createCell(doctorText));

        // Companion
        let companionText='—';
        if(ep.companion && (ep.companion.actor || ep.companion.character)){
            let actor = ep.companion.actor??'—';
            let character = ep.companion.character??'—';
            const emojiRegex=/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu;
            actor=actor.replace(emojiRegex,'');
            character=character.replace(emojiRegex,'');
            companionText=`${actor} (${character})`;
        }
        row.appendChild(createCell(companionText));

        // Cast count
        const castCountTd=document.createElement('td');
        const castCount = Array.isArray(ep.cast)?ep.cast.length:0;
        const span=document.createElement('span');
        span.className='cast-count';
        span.textContent=String(castCount);
        castCountTd.appendChild(span);
        row.appendChild(castCountTd);

        tbody.appendChild(row);
    });

    setupKeyboardNavigation();
}

/* ------------------------- Filters ------------------------- */
function populateFilterOptions(){
    const eraSet=new Set(), doctorSet=new Set(), companionSet=new Set();
    state.episodes.forEach(ep=>{
        if(ep.era) eraSet.add(ep.era);
        if(ep.doctor?.actor) doctorSet.add(ep.doctor.actor.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu,''));
        if(ep.companion?.actor) companionSet.add(ep.companion.actor.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}]/gu,''));
    });
    const fillSelect = (id, values)=>{
        const sel=document.getElementById(id);
        sel.innerHTML='<option value="">All</option>';
        Array.from(values).sort().forEach(v=>{
            const opt=document.createElement('option'); opt.value=v; opt.textContent=v; sel.appendChild(opt);
        });
    };
    fillSelect('era-filter', eraSet);
    fillSelect('doctor-filter', doctorSet);
    fillSelect('companion-filter', companionSet);
}

function filterEpisodes(){
    const qName=state.filters.name.trim().toLowerCase();
    const qEra=state.filters.era;
    const qDoctor=state.filters.doctor;
    const qComp=state.filters.companion;

    state.filtered=state.episodes.filter(ep=>{
        if(qName && !(ep.title??'').toLowerCase().includes(qName)) return false;
        if(qEra && (ep.era??'')!==qEra) return false;
        if(qDoctor && (ep.doctor?.actor??'')!==qDoctor) return false;
        if(qComp && (ep.companion?.actor??'')!==qComp) return false;
        return true;
    });

    displayEpisodes(state.filtered);
}

/* ------------------------- Sorting ------------------------- */
function sortEpisodes(field){
    const multiplier = state.sort.ascending?1:-1;
    state.filtered.sort((a,b)=>{
        let valueA,valueB;
        switch(field){
            case 'rank': valueA=Number(a.rank); valueB=Number(b.rank); valueA=Number.isFinite(valueA)?valueA:Infinity; valueB=Number.isFinite(valueB)?valueB:Infinity; break;
            case 'series': const sa=Number(a.series),sb=Number(b.series); const isANum=!Number.isNaN(sa),isBNum=!Number.isNaN(sb); if(isANum&&isBNum){valueA=sa;valueB=sb;}else if(isANum){valueA=sa;valueB=Infinity;}else if(isBNum){valueA=Infinity;valueB=sb;}else{valueA=valueB=Infinity;} break;
            case 'broadcast_date': valueA=parseDateToTimestamp(a.broadcast_date); valueB=parseDateToTimestamp(b.broadcast_date);
                valueA=Number.isNaN(valueA)?-Infinity:valueA; valueB=Number.isNaN(valueB)?-Infinity:valueB; break;
            case 'doctor': valueA=(a.doctor?.actor??'').toLowerCase(); valueB=(b.doctor?.actor??'').toLowerCase(); break;
            case 'companion': valueA=(a.companion?.actor??'').toLowerCase(); valueB=(b.companion?.actor??'').toLowerCase(); break;
            case 'cast': valueA=Array.isArray(a.cast)?a.cast.length:0; valueB=Array.isArray(b.cast)?b.cast.length:0; break;
            default: valueA=(a[field]??'').toString().toLowerCase(); valueB=(b[field]??'').toString().toLowerCase();
        }
        if(valueA<valueB) return -1*multiplier;
        if(valueA>valueB) return 1*multiplier;
        return 0;
    });
    displayEpisodes(state.filtered);
}

/* ------------------------- UI helpers ------------------------- */
function showLoading(show){
    const loadingEl=document.getElementById('loading');
    const tableEl=document.getElementById('episodes-table');
    const errorEl=document.getElementById('error');
    const noResultsEl=document.getElementById('no-results');
    loadingEl.style.display=show?'block':'none';
    if(show){ tableEl.style.display='none'; errorEl.style.display='none'; noResultsEl.style.display='none'; }
}

function showError(msg){
    const errorEl=document.getElementById('error');
    const tableEl=document.getElementById('episodes-table');
    const loadingEl=document.getElementById('loading');
    const noResultsEl=document.getElementById('no-results');
    if(msg){ errorEl.textContent=msg; errorEl.style.display='block'; tableEl.style.display='none'; loadingEl.style.display='none'; noResultsEl.style.display='none'; }
    else errorEl.style.display='none';
}

/* ------------------------- Keyboard Navigation ------------------------- */
function setupKeyboardNavigation(){
    const tbody=document.getElementById('episodes-body');
    let focusedRowIndex=-1;

    function focusRow(index){
        const rows=Array.from(tbody.querySelectorAll('tr'));
        if(rows.length===0) return;
        if(focusedRowIndex>=0 && focusedRowIndex<rows.length) rows[focusedRowIndex].classList.remove('row-focused');
        focusedRowIndex=Math.max(0,Math.min(index,rows.length-1));
        const row=rows[focusedRowIndex];
        row.classList.add('row-focused');
        row.scrollIntoView({block:'nearest',behavior:'smooth'});
    }

    document.addEventListener('keydown', (e)=>{
        const rows=Array.from(tbody.querySelectorAll('tr'));
        if(rows.length===0) return;
        switch(e.key){
            case 'ArrowDown': e.preventDefault(); focusRow(focusedRowIndex+1); break;
            case 'ArrowUp': e.preventDefault(); focusRow(focusedRowIndex-1); break;
            case 'Enter':
                if(focusedRowIndex>=0){
                    const headers=Array.from(document.querySelectorAll('th[data-sort]'));
                    headers.forEach(th=>{
                        if(th===document.activeElement) th.click();
                    });
                }
                break;
        }
    });

    function makeRowsFocusable(){
        const rows=tbody.querySelectorAll('tr');
        rows.forEach(r=>r.tabIndex=0);
    }

    const observer=new MutationObserver(makeRowsFocusable);
    observer.observe(tbody,{childList:true});

    tbody.addEventListener('mouseenter',()=>{if(focusedRowIndex===-1) focusRow(0);});
}

/* ------------------------- Start ------------------------- */
document.addEventListener('DOMContentLoaded', init);
