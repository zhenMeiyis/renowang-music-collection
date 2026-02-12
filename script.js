// ========== 全局变量 ==========
let allSongs = [];
let filteredSongs = [];
let searchHistory = JSON.parse(localStorage.getItem('wzls_history')) || [];
let savedScrollPosition = 0; // 保存滚动位置

// 当前筛选状态
let currentFilters = {
    singerType: 'all',
    year: 'all',
    album: 'all',
    genre: 'all',
    language: 'all',
    search: ''
};

// 添加排序状态
let currentSort = {
    field: 'time',      // 'time' 或 'name'
    order: 'desc'       // 'asc' 或 'desc'
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    setupEventListeners();
    renderHistory();
    applyFilters();
});

// 加载数据
async function loadData() {
    try {
        const response = await fetch('music_data.json');
        allSongs = await response.json();
        
        // 初始化筛选选项
        initFilterOptions();
        
        // 初始排序并渲染
        applyFilters();
        
        document.getElementById('totalCount').textContent = allSongs.length;
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('songGrid').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <p>数据加载失败，请检查 music_data.json 文件</p>
            </div>
        `;
    }
}

// 判断歌曲是否有有效时间
function hasValidTime(song) {
    return song.song_time_public && 
           song.song_time_public !== '0000-00-00' && 
           song.year && 
           song.year !== '0000';
}

// 初始化筛选选项
function initFilterOptions() {
    // 年份选项
    const years = [...new Set(allSongs.map(s => s.year).filter(y => y && y !== '0000'))]
        .sort((a, b) => b - a);
    const yearSelect = document.getElementById('yearFilter');
    
    // 先清空，保留"全部年份"
    yearSelect.innerHTML = '<option value="all">全部年份</option>';
    
    // 添加未知时间选项（放在第一位，全部之后）
    const unknownOpt = document.createElement('option');
    unknownOpt.value = 'unknown';
    unknownOpt.textContent = '未知时间 / 无年份';
    yearSelect.appendChild(unknownOpt);
    
    // 添加具体年份
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year + '年';
        yearSelect.appendChild(opt);
    });
    
    // 专辑选项
    const albums = [...new Set(allSongs.map(s => s.album_name).filter(a => a))]
        .sort();
    const albumSelect = document.getElementById('albumFilter');
    albums.forEach(album => {
        const opt = document.createElement('option');
        opt.value = album;
        opt.textContent = album.length > 20 ? album.slice(0, 20) + '...' : album;
        albumSelect.appendChild(opt);
    });

    // 流派选项
    const genres = [...new Set(allSongs.map(s => s.song_type).filter(g => g && g !== '无信息'))]
        .sort();
    const genreSelect = document.getElementById('genreFilter');
    genres.forEach(genre => {
        const opt = document.createElement('option');
        opt.value = genre;
        opt.textContent = genre;
        genreSelect.appendChild(opt);
    });
    
    // 语言选项
    const languages = [...new Set(allSongs.map(s => s.language).filter(l => l))]
        .sort();
    const languageSelect = document.getElementById('languageFilter');
    languages.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = lang;
        languageSelect.appendChild(opt);
    });
}

// 设置事件监听
function setupEventListeners() {
    // 搜索
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') doSearch();
    });
    
    // 输入框内容变化时控制清空按钮显示/隐藏
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
            // 输入框为空时自动清空搜索，显示全部
            if (currentFilters.search) {
                clearSearch();
            }
        }
    });
    
    // 清空搜索按钮
    clearSearchBtn.addEventListener('click', clearSearch);
    
    // 搜索历史显示/隐藏
    searchInput.addEventListener('focus', () => {
        if (searchHistory.length > 0) {
            document.getElementById('searchHistory').classList.add('active');
        }
    });
    
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
            document.getElementById('searchHistory').classList.remove('active');
        }
    });
    
    // 歌手数量筛选
    document.getElementById('singerFilter').addEventListener('click', e => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('#singerFilter .filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            currentFilters.singerType = e.target.dataset.value;
            applyFilters();
        }
    });
    
    // 年份筛选
    document.getElementById('yearFilter').addEventListener('change', e => {
        currentFilters.year = e.target.value;
        applyFilters();
    });
    
    // 专辑筛选
    document.getElementById('albumFilter').addEventListener('change', e => {
        currentFilters.album = e.target.value;
        applyFilters();
    });

    // 排序按钮事件 - 使用事件委托
    document.getElementById('sortControls').addEventListener('click', e => {
        if (e.target.classList.contains('sort-btn')) {
            const field = e.target.dataset.field;
            const order = e.target.dataset.order;
            
            // 更新激活状态
            document.querySelectorAll('#sortControls .sort-btn').forEach(b => {
                b.classList.remove('active');
            });
            e.target.classList.add('active');
            
            currentSort.field = field;
            currentSort.order = order;
            sortSongs();
            renderSongList();
        }
    });

    // 在 setupEventListeners 中添加事件监听
    document.getElementById('genreFilter').addEventListener('change', e => {
        currentFilters.genre = e.target.value;
        applyFilters();
    });

    document.getElementById('languageFilter').addEventListener('change', e => {
        currentFilters.language = e.target.value;
        applyFilters();
    });
}

// 执行搜索
function doSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    // 如果搜索词为空，清空搜索
    if (!query) {
        clearSearch();
        return;
    }
    
    // 添加到历史
    addHistory(query);
    
    currentFilters.search = query;
    applyFilters();
    
    document.getElementById('searchHistory').classList.remove('active');
}

// 清空搜索
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    currentFilters.search = '';
    applyFilters();
    document.getElementById('searchHistory').classList.remove('active');
}

// 添加历史记录
function addHistory(query) {
    searchHistory = searchHistory.filter(h => h !== query);
    searchHistory.unshift(query);
    if (searchHistory.length > 8) searchHistory = searchHistory.slice(0, 8);
    localStorage.setItem('wzls_history', JSON.stringify(searchHistory));
    renderHistory();
}

// 渲染历史
function renderHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = searchHistory.map(h => `
        <button class="history-tag" onclick="quickSearch('${h.replace(/'/g, "\\'")}')">${h}</button>
    `).join('');
}

// 快速搜索
function quickSearch(query) {
    document.getElementById('searchInput').value = query;
    document.getElementById('clearSearchBtn').style.display = 'block';
    doSearch();
}

// 清空历史
function clearHistory() {
    searchHistory = [];
    localStorage.removeItem('wzls_history');
    renderHistory();
    document.getElementById('searchHistory').classList.remove('active');
}

// 应用筛选
function applyFilters() {
    filteredSongs = allSongs.filter(song => {
        // 歌手数量
        if (currentFilters.singerType !== 'all' && 
            song.singer_type !== currentFilters.singerType) {
            return false;
        }
        
        // 年份
        if (currentFilters.year !== 'all') {
            if (currentFilters.year === 'unknown') {
                // 筛选未知时间：无有效时间的歌曲
                if (hasValidTime(song)) return false;
            } else {
                // 正常年份筛选
                if (String(song.year) !== currentFilters.year) {
                    return false;
                }
            }
        }
        
        // 专辑
        if (currentFilters.album !== 'all' && 
            song.album_name !== currentFilters.album) {
            return false;
        }

        // 流派筛选
        if (currentFilters.genre !== 'all' && 
            song.song_type !== currentFilters.genre) {
            return false;
        }
        
        // 语言筛选
        if (currentFilters.language !== 'all' && 
            song.language !== currentFilters.language) {
            return false;
        }
        
        // 搜索词
        if (currentFilters.search) {
            const searchStr = `${song.song_name} ${song.singer_name.join(' ')} ${song.album_name || ''}`.toLowerCase();
            if (!searchStr.includes(currentFilters.search.toLowerCase())) {
                return false;
            }
        }
        
        return true;
    });
    
    sortSongs();
    renderSongList();
}

// 排序歌曲 - 严格按照需求实现
function sortSongs() {
    filteredSongs.sort((a, b) => {
        const hasTimeA = hasValidTime(a);
        const hasTimeB = hasValidTime(b);
        const nameA = a.song_name || '';
        const nameB = b.song_name || '';
        
        if (currentSort.field === 'time') {
            // ========== 按「发行时间」排序 ==========
            
            // 1. 有时间的 > 无时间的
            if (hasTimeA && !hasTimeB) return -1;
            if (!hasTimeA && hasTimeB) return 1;
            
            // 此时 hasTimeA === hasTimeB
            if (hasTimeA && hasTimeB) {
                // 2. 都有时间：按用户选择的时间升序/降序排列
                const timeA = new Date(a.song_time_public).getTime();
                const timeB = new Date(b.song_time_public).getTime();
                
                if (timeA !== timeB) {
                    return currentSort.order === 'asc' ? timeA - timeB : timeB - timeA;
                }
                // 时间相同，按歌名A-Z作为次排序
                return nameA.localeCompare(nameB, 'zh-CN');
            } else {
                // 3. 都无时间：按歌名A-Z排列
                return nameA.localeCompare(nameB, 'zh-CN');
            }
            
        } else {
            // ========== 按「歌名」排序 ==========
            
            // 1. 先按歌名主排序（升序/降序）
            let nameCompare;
            if (currentSort.order === 'asc') {
                nameCompare = nameA.localeCompare(nameB, 'zh-CN');
            } else {
                nameCompare = nameB.localeCompare(nameA, 'zh-CN');
            }
            
            // 歌名不同，直接返回歌名排序结果
            if (nameCompare !== 0) {
                return nameCompare;
            }
            
            // 2. 歌名相同：有时间的 > 无时间的
            if (hasTimeA && !hasTimeB) return -1;
            if (!hasTimeA && hasTimeB) return 1;
            
            // 3. 歌名相同且时间状态相同
            if (hasTimeA && hasTimeB) {
                // 都有时间：按发行时间降序排列
                const timeA = new Date(a.song_time_public).getTime();
                const timeB = new Date(b.song_time_public).getTime();
                return timeB - timeA;
            } else {
                // 都无时间：保持原顺序（或按其他字段，这里返回0）
                return 0;
            }
        }
    });
}

// 渲染歌曲列表
function renderSongList() {
    const container = document.getElementById('songGrid');
    const countEl = document.getElementById('resultCount');
    
    countEl.textContent = `共 ${filteredSongs.length} 首`;
    
    if (filteredSongs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <p>没有找到符合条件的歌曲</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSongs.map(song => `
        <div class="song-item" onclick="showDetail(${song.song_id})">
            <div class="song-main">
                <div class="song-name">${highlight(song.song_name)}</div>
                <div class="song-meta">
                    <span>🎤 ${song.singer_name.join(' / ')}</span>
                    <span>💿 ${song.album_name || '未知专辑'}</span>
                    <span>📅 ${hasValidTime(song) ? song.song_time_public : '未知时间'}</span>
                    ${song.language ? `<span>🌐 ${song.language}</span>` : ''}
                    ${song.song_type && song.song_type !== '无信息' ? `<span>🎼 ${song.song_type}</span>` : ''}
                </div>
            </div>
            <span class="song-badge">${song.singer_type}</span>
        </div>
    `).join('');
}

// 高亮搜索词
function highlight(text) {
    if (!currentFilters.search) return text;
    const regex = new RegExp(`(${currentFilters.search})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 显示详情
function showDetail(songId) {
    const song = allSongs.find(s => s.song_id === songId);
    if (!song) return;
    
    // 保存当前滚动位置
    savedScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    // 填充标题（居中）
    document.getElementById('detailTitle').textContent = song.song_name;
    
    // 填充基本信息
    const infoGrid = document.getElementById('infoGrid');
    infoGrid.innerHTML = `
        <div class="info-row">
            <span class="info-label">歌手</span>
            <span class="info-value">${song.singer_name.join(' / ')}</span>
        </div>
        <div class="info-row">
            <span class="info-label">专辑</span>
            <span class="info-value">${song.album_name || '未知'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">发行时间</span>
            <span class="info-value">${hasValidTime(song) ? song.song_time_public : '未知'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">演唱形式</span>
            <span class="info-value">${song.singer_type}</span>
        </div>
        <div class="info-row">
            <span class="info-label">语言</span>
            <span class="info-value">${song.language || '未知'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">流派</span>
            <span class="info-value">${song.song_type && song.song_type !== '无信息' ? song.song_type : '未知'}</span>
        </div>
        <div class="info-row">
            <span class="info-label">歌曲ID</span>
            <span class="info-value">${song.song_id}</span>
        </div>
        <div class="info-row">
            <span class="info-label">外部链接</span>
            <span class="info-value">
                <a href="${song.song_url || '#'}" target="_blank">QQ音乐 →</a>
            </span>
        </div>
    `;
    
    // 填充歌词（居中垂直展开）
    const lyricsEl = document.getElementById('lyricsContent');
    lyricsEl.textContent = song.lyric || '暂无歌词';
    
    // 切换视图
    document.getElementById('listSection').style.display = 'none';
    document.getElementById('detailSection').style.display = 'block';
    window.scrollTo(0, 0);
}

// 返回列表
function backToList() {
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('listSection').style.display = 'block';
    
    // 恢复之前的滚动位置
    setTimeout(() => {
        window.scrollTo({
            top: savedScrollPosition,
            behavior: 'auto' // 直接跳转，不用平滑滚动
        });
    }, 0);
}
