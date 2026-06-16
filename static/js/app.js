// --- App State ---
const state = {
    feedTitle: "BigQuery - Release notes",
    releases: [],
    stats: {},
    filters: {
        search: "",
        type: "all",
        stage: "all",
        month: "all",
        sort: "newest"
    },
    expandedCards: new Set() // Track ids of cards that are explicitly expanded
};

// --- DOM Elements ---
const elements = {
    themeToggle: document.getElementById("theme-toggle"),
    feedStatus: document.getElementById("feed-status"),
    refreshFeed: document.getElementById("refresh-feed"),
    cacheTime: document.getElementById("cache-time"),
    
    // Stats
    statTotal: document.getElementById("stat-total-count"),
    statFeatures: document.getElementById("stat-features-count"),
    statChanges: document.getElementById("stat-changes-count"),
    statIssues: document.getElementById("stat-issues-count"),
    
    // Charts
    typeChart: document.getElementById("type-chart"),
    stageChart: document.getElementById("stage-chart"),
    
    // Filters
    searchInput: document.getElementById("search-input"),
    clearSearch: document.getElementById("clear-search"),
    typePills: document.getElementById("type-pills"),
    stagePills: document.getElementById("stage-pills"),
    sortSelect: document.getElementById("sort-select"),
    resetFilters: document.getElementById("reset-filters"),
    monthNavigation: document.getElementById("month-navigation"),
    
    // Feed Listing
    filteredCount: document.getElementById("filtered-count"),
    totalCount: document.getElementById("total-count"),
    expandAll: document.getElementById("expand-all"),
    collapseAll: document.getElementById("collapse-all"),
    releaseItemsContainer: document.getElementById("release-items-container"),
    emptyState: document.getElementById("empty-state"),
    emptyResetBtn: document.getElementById("empty-reset-btn")
};

// --- Color Maps for Badges & Charts ---
const colorMap = {
    "Feature": "var(--color-feature)",
    "Change": "var(--color-change)",
    "Issue": "var(--color-issue)",
    "Announcement": "var(--color-announcement)",
    "Breaking": "var(--color-breaking)",
    "GA": "var(--color-ga)",
    "Preview": "var(--color-preview)",
    "Beta": "var(--color-beta)",
    "Deprecated": "var(--color-deprecated)",
    "N/A": "var(--text-muted)"
};

const iconMap = {
    "Feature": "fa-wand-magic-sparkles",
    "Change": "fa-sliders",
    "Issue": "fa-triangle-exclamation",
    "Announcement": "fa-bullhorn",
    "Breaking": "fa-bolt-lightning"
};

// --- Helper Functions ---
function calculateTimeAgo(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        
        // Strip hours/mins for accurate days difference
        const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffMs = nowMidnight - dateMidnight;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return "Just now";
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        }
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } catch (e) {
        return "";
    }
}

function formatDate(dateStr) {
    // Standardize dates: "June 15, 2026"
    return dateStr;
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    setupEventListeners();
    fetchData();
});

// --- Theme Management ---
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    if (savedTheme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        elements.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
        elements.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
}

function toggleTheme() {
    if (document.body.classList.contains("dark-theme")) {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        elements.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem("theme", "light");
    } else {
        document.body.classList.add("dark-theme");
        document.body.classList.remove("light-theme");
        elements.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem("theme", "dark");
    }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Theme toggle
    elements.themeToggle.addEventListener("click", toggleTheme);
    
    // Refresh feed toggle
    if (elements.refreshFeed) {
        elements.refreshFeed.addEventListener("click", () => {
            fetchData(true);
        });
    }
    
    // Search filter
    elements.searchInput.addEventListener("input", (e) => {
        state.filters.search = e.target.value.trim().toLowerCase();
        toggleClearSearchButton();
        applyFiltersAndRender();
    });
    
    elements.clearSearch.addEventListener("click", () => {
        elements.searchInput.value = "";
        state.filters.search = "";
        toggleClearSearchButton();
        applyFiltersAndRender();
        elements.searchInput.focus();
    });
    
    // Type Filter Pills
    elements.typePills.addEventListener("click", (e) => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        
        elements.typePills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        
        state.filters.type = pill.dataset.type;
        applyFiltersAndRender();
    });
    
    // Stage Filter Pills
    elements.stagePills.addEventListener("click", (e) => {
        const pill = e.target.closest(".pill");
        if (!pill) return;
        
        elements.stagePills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        
        state.filters.stage = pill.dataset.stage;
        applyFiltersAndRender();
    });
    
    // Sort Select
    elements.sortSelect.addEventListener("change", (e) => {
        state.filters.sort = e.target.value;
        applyFiltersAndRender();
    });
    
    // Reset buttons
    elements.resetFilters.addEventListener("click", resetAllFilters);
    elements.emptyResetBtn.addEventListener("click", resetAllFilters);
    
    // Expand / Collapse all
    elements.expandAll.addEventListener("click", () => {
        const activeItemIds = getFilteredItems().map(item => item.id);
        activeItemIds.forEach(id => state.expandedCards.add(id));
        applyFiltersAndRender();
    });
    
    elements.collapseAll.addEventListener("click", () => {
        state.expandedCards.clear();
        applyFiltersAndRender();
    });
}

function toggleClearSearchButton() {
    if (state.filters.search.length > 0) {
        elements.clearSearch.style.display = "flex";
    } else {
        elements.clearSearch.style.display = "none";
    }
}

function resetAllFilters() {
    state.filters.search = "";
    state.filters.type = "all";
    state.filters.stage = "all";
    state.filters.month = "all";
    state.filters.sort = "newest";
    
    // Reset HTML inputs
    elements.searchInput.value = "";
    toggleClearSearchButton();
    
    elements.typePills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    elements.typePills.querySelector('[data-type="all"]').classList.add("active");
    
    elements.stagePills.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
    elements.stagePills.querySelector('[data-stage="all"]').classList.add("active");
    
    elements.sortSelect.value = "newest";
    
    // Reset monthly navigation links
    elements.monthNavigation.querySelectorAll(".month-link").forEach(l => l.classList.remove("active"));
    const allMonthsLink = elements.monthNavigation.querySelector('[data-month="all"]');
    if (allMonthsLink) allMonthsLink.classList.add("active");
    
    applyFiltersAndRender();
}

// --- Data Fetching ---
async function fetchData(forceRefresh = false) {
    const refreshIcon = elements.refreshFeed ? elements.refreshFeed.querySelector("i") : null;
    try {
        setLoadingState(true);
        if (refreshIcon) refreshIcon.classList.add("fa-spin");
        if (elements.refreshFeed) elements.refreshFeed.disabled = true;
        
        // Fetch Releases and Stats concurrently
        const releasesUrl = forceRefresh ? "/api/releases?refresh=true" : "/api/releases";
        const statsUrl = forceRefresh ? "/api/stats?refresh=true" : "/api/stats";
        
        const [releasesResponse, statsResponse] = await Promise.all([
            fetch(releasesUrl),
            fetch(statsUrl)
        ]);
        
        if (!releasesResponse.ok || !statsResponse.ok) {
            throw new Error("Failed to fetch feed data from API");
        }
        
        const releasesData = await releasesResponse.json();
        const statsData = await statsResponse.json();
        
        state.releases = releasesData.items || [];
        state.stats = statsData || {};
        state.feedTitle = releasesData.feed_title || "BigQuery - Release notes";
        
        // Update Feed Status & Cache Time
        elements.feedStatus.innerText = "Feed Connected";
        document.title = `${state.feedTitle} | Analytics Dashboard`;
        
        if (releasesData.cached_at) {
            const cachedDate = new Date(releasesData.cached_at * 1000);
            elements.cacheTime.innerText = `Last updated: ${cachedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        // Update UI
        updateStatsWidgets(state.stats);
        renderCharts(state.stats);
        renderMonthNavigation(state.stats.timeline);
        
        // Render Timeline
        setLoadingState(false);
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
        if (elements.refreshFeed) elements.refreshFeed.disabled = false;
        applyFiltersAndRender();
        
    } catch (error) {
        if (refreshIcon) refreshIcon.classList.remove("fa-spin");
        if (elements.refreshFeed) elements.refreshFeed.disabled = false;
        console.error("Fetch error:", error);
        elements.feedStatus.innerText = "Connection Error";
        elements.releaseItemsContainer.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-circle-exclamation" style="font-size: 3rem; color: var(--color-breaking);"></i>
                <p>Failed to load release notes. Please refresh the page or try again later.</p>
                <button onclick="fetchData()" class="btn btn-secondary"><i class="fa-solid fa-rotate-right"></i> Retry Connection</button>
            </div>
        `;
    }
}

function setLoadingState(isLoading) {
    if (isLoading) {
        elements.releaseItemsContainer.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Fetching BigQuery release notes...</p>
            </div>
        `;
        elements.typeChart.innerHTML = '<div class="chart-loading"><div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Loading chart data...</div>';
        elements.stageChart.innerHTML = '<div class="chart-loading"><div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div> Loading chart data...</div>';
        elements.monthNavigation.innerHTML = '<div class="small-text-loading">Loading months...</div>';
    }
}

// --- Render Widgets & Charts ---
function updateStatsWidgets(stats) {
    elements.statTotal.innerText = stats.total_items || 0;
    
    // Count feature types
    const features = stats.types ? stats.types.find(t => t.name === "Feature") : null;
    elements.statFeatures.innerText = features ? features.count : 0;
    
    // Count changes
    const changes = stats.types ? stats.types.find(t => t.name === "Change") : null;
    elements.statChanges.innerText = changes ? changes.count : 0;
    
    // Count issues
    const issues = stats.types ? stats.types.find(t => t.name === "Issue") : null;
    elements.statIssues.innerText = issues ? issues.count : 0;
}

function renderCharts(stats) {
    // Render Type Chart
    if (stats.types && stats.types.length > 0) {
        // Sort types descending
        const sortedTypes = [...stats.types].sort((a, b) => b.count - a.count);
        const maxVal = sortedTypes[0].count;
        
        elements.typeChart.innerHTML = sortedTypes.map(t => {
            const percent = (t.count / maxVal) * 100;
            const color = colorMap[t.name] || "var(--text-muted)";
            return `
                <div class="chart-row">
                    <span class="chart-label">${t.name}</span>
                    <div class="chart-track">
                        <div class="chart-fill" style="width: ${percent}%; background-color: ${color}"></div>
                    </div>
                    <span class="chart-count">${t.count}</span>
                </div>
            `;
        }).join("");
    } else {
        elements.typeChart.innerHTML = '<div class="chart-loading">No type data available</div>';
    }

    // Render Stage Chart
    if (stats.stages && stats.stages.length > 0) {
        const sortedStages = [...stats.stages].sort((a, b) => b.count - a.count);
        const maxVal = sortedStages[0].count;
        
        elements.stageChart.innerHTML = sortedStages.map(s => {
            const percent = (s.count / maxVal) * 100;
            const color = colorMap[s.name] || "var(--text-muted)";
            return `
                <div class="chart-row">
                    <span class="chart-label">${s.name}</span>
                    <div class="chart-track">
                        <div class="chart-fill" style="width: ${percent}%; background-color: ${color}"></div>
                    </div>
                    <span class="chart-count">${s.count}</span>
                </div>
            `;
        }).join("");
    } else {
        elements.stageChart.innerHTML = '<div class="chart-loading">No stage data available</div>';
    }
}

function renderMonthNavigation(timeline) {
    if (!timeline || timeline.length === 0) {
        elements.monthNavigation.innerHTML = '<div class="small-text-loading">No months found</div>';
        return;
    }
    
    // Add "All Months" link
    let html = `
        <button class="month-link active" data-month="all" id="month-link-all">
            <span>All Updates</span>
            <span class="item-badge">${state.releases.length}</span>
        </button>
    `;
    
    // Sort timeline months from newest to oldest
    // period is "Month Year" e.g., "June 2026"
    const monthMap = {
        "January": 0, "February": 1, "March": 2, "April": 3, "May": 4, "June": 5,
        "July": 6, "August": 7, "September": 8, "October": 9, "November": 10, "December": 11
    };
    
    const sortedMonths = [...timeline].sort((a, b) => {
        const partsA = a.period.split(" ");
        const partsB = b.period.split(" ");
        if (partsA.length === 2 && partsB.length === 2) {
            const [mA, yA] = partsA;
            const [mB, yB] = partsB;
            if (yA !== yB) return parseInt(yB) - parseInt(yA);
            return monthMap[mB] - monthMap[mA];
        }
        return 0;
    });

    html += sortedMonths.map(m => {
        return `
            <button class="month-link" data-month="${m.period}">
                <span>${m.period}</span>
                <span class="item-badge">${m.count}</span>
            </button>
        `;
    }).join("");
    
    elements.monthNavigation.innerHTML = html;
    
    // Bind click events
    elements.monthNavigation.addEventListener("click", (e) => {
        const link = e.target.closest(".month-link");
        if (!link) return;
        
        elements.monthNavigation.querySelectorAll(".month-link").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
        
        state.filters.month = link.dataset.month;
        applyFiltersAndRender();
    });
}

// --- Filtering & Sorting Core ---
function getFilteredItems() {
    return state.releases.filter(item => {
        // Search Filter
        if (state.filters.search) {
            const query = state.filters.search;
            const matchSearch = 
                item.date.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query) ||
                item.stage.toLowerCase().includes(query) ||
                item.snippet.toLowerCase().includes(query) ||
                item.content.toLowerCase().includes(query);
            
            if (!matchSearch) return false;
        }
        
        // Type Filter
        if (state.filters.type !== "all" && item.type !== state.filters.type) {
            return false;
        }
        
        // Stage Filter
        if (state.filters.stage !== "all" && item.stage !== state.filters.stage) {
            return false;
        }
        
        // Month Filter
        if (state.filters.month !== "all") {
            const dateStr = item.date; // e.g. "June 15, 2026"
            // check if month includes
            const isMatch = dateStr.includes(state.filters.month.split(" ")[0]) && dateStr.includes(state.filters.month.split(" ")[1]);
            if (!isMatch) return false;
        }
        
        return true;
    });
}

function applyFiltersAndRender() {
    let filtered = getFilteredItems();
    
    // Sorting
    filtered.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        if (state.filters.sort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
    
    // Update counter labels
    elements.filteredCount.innerText = filtered.length;
    elements.totalCount.innerText = state.releases.length;
    
    // Toggle reset filters button state
    const isFiltered = 
        state.filters.search !== "" || 
        state.filters.type !== "all" || 
        state.filters.stage !== "all" || 
        state.filters.month !== "all" ||
        state.filters.sort !== "newest";
        
    elements.resetFilters.disabled = !isFiltered;
    
    // Render timeline
    renderTimeline(filtered);
}

// --- Render Timeline Cards ---
function renderTimeline(items) {
    if (items.length === 0) {
        elements.releaseItemsContainer.classList.add("hidden");
        elements.emptyState.classList.remove("hidden");
        return;
    }
    
    elements.emptyState.classList.add("hidden");
    elements.releaseItemsContainer.classList.remove("hidden");
    
    elements.releaseItemsContainer.innerHTML = items.map((item, index) => {
        const isExpanded = state.expandedCards.has(item.id);
        const typeColor = colorMap[item.type] || "var(--text-muted)";
        const stageColor = colorMap[item.stage] || "var(--text-muted)";
        const typeIcon = iconMap[item.type] || "fa-circle-info";
        const relativeTime = calculateTimeAgo(item.updated || item.date);
        
        // Heuristic: show read more toggle if content length is long or contains HTML lists
        const hasLongContent = item.content.length > 280 || item.content.includes("<ul>") || item.content.includes("<ol>");
        
        return `
            <article 
                class="release-card glass-panel ${isExpanded ? 'expanded' : 'collapsed'}" 
                data-type="${item.type}" 
                id="${item.id}"
                style="animation-delay: ${Math.min(index * 0.05, 0.6)}s"
            >
                <div class="card-dot" style="background-color: var(--bg-surface);">
                    <i class="fa-solid ${typeIcon}" style="color: ${typeColor}; display: block;"></i>
                </div>
                
                <div class="card-meta">
                    <span class="card-date">${formatDate(item.date)}</span>
                    <span class="card-time-ago">${relativeTime}</span>
                    
                    <div class="badges">
                        <span class="badge badge-type-${item.type.toLowerCase()}">
                            <i class="fa-solid ${typeIcon}"></i> ${item.type}
                        </span>
                        
                        ${item.stage !== 'N/A' ? `
                            <span class="badge badge-stage-${item.stage.toLowerCase()}">
                                ${item.stage}
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <div class="card-body">
                    ${item.content}
                </div>
                
                ${hasLongContent ? `
                    <button class="card-toggle" data-id="${item.id}" aria-expanded="${isExpanded}">
                        <span>${isExpanded ? 'Show Less' : 'Read Full Update'}</span>
                        <i class="fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
                    </button>
                ` : ''}
            </article>
        `;
    }).join("");
    
    // Bind toggle buttons
    elements.releaseItemsContainer.querySelectorAll(".card-toggle").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const cardId = btn.dataset.id;
            const card = document.getElementById(cardId);
            
            if (state.expandedCards.has(cardId)) {
                state.expandedCards.delete(cardId);
                card.classList.remove("expanded");
                card.classList.add("collapsed");
                btn.querySelector("span").innerText = "Read Full Update";
                btn.querySelector("i").className = "fa-solid fa-chevron-down";
                btn.setAttribute("aria-expanded", "false");
                
                // Scroll card into view if it goes off screen
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                state.expandedCards.add(cardId);
                card.classList.add("expanded");
                card.classList.remove("collapsed");
                btn.querySelector("span").innerText = "Show Less";
                btn.querySelector("i").className = "fa-solid fa-chevron-up";
                btn.setAttribute("aria-expanded", "true");
            }
        });
    });
}
