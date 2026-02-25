const state = {
  spec: null,
  endpoints: [],
  selected: null,
  history: [],
  currentSong: null,
  currentArtistId: null
};

const els = {
  baseUrl: document.getElementById('baseUrl'),
  openApiUrl: document.getElementById('openApiUrl'),
  authToken: document.getElementById('authToken'),
  loadApisBtn: document.getElementById('loadApisBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  status: document.getElementById('status'),
  searchInput: document.getElementById('searchInput'),
  apiList: document.getElementById('apiList'),
  endpointTitle: document.getElementById('endpointTitle'),
  requestForm: document.getElementById('requestForm'),
  method: document.getElementById('method'),
  path: document.getElementById('path'),
  contentType: document.getElementById('contentType'),
  paramsContainer: document.getElementById('paramsContainer'),
  requestBody: document.getElementById('requestBody'),
  responseSection: document.getElementById('responseSection'),
  responseMeta: document.getElementById('responseMeta'),
  responseBody: document.getElementById('responseBody'),
  history: document.getElementById('history'),
  copyCurlBtn: document.getElementById('copyCurlBtn'),
  playerSongId: document.getElementById('playerSongId'),
  playerPlaylistId: document.getElementById('playerPlaylistId'),
  playerAlbumId: document.getElementById('playerAlbumId'),
  playerListenDuration: document.getElementById('playerListenDuration'),
  loadPlayerBtn: document.getElementById('loadPlayerBtn'),
  recordPlayBtn: document.getElementById('recordPlayBtn'),
  recordListenBtn: document.getElementById('recordListenBtn'),
  loadArtistStatsBtn: document.getElementById('loadArtistStatsBtn'),
  playerAudio: document.getElementById('playerAudio'),
  seekRange: document.getElementById('seekRange'),
  seekLabel: document.getElementById('seekLabel'),
  playerInfo: document.getElementById('playerInfo'),
  artistStats: document.getElementById('artistStats')
};

initDefaults();
bindEvents();

function initDefaults() {
  const origin = window.location.origin === 'null' ? 'http://localhost:8080' : window.location.origin;
  els.baseUrl.value = origin;
  els.openApiUrl.value = `${origin}/v3/api-docs`;
}

function bindEvents() {
  els.loadApisBtn.addEventListener('click', loadApis);
  els.searchInput.addEventListener('input', renderEndpointList);
  els.requestForm.addEventListener('submit', submitRequest);
  els.copyCurlBtn.addEventListener('click', copyCurl);
  els.clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    renderHistory();
  });
  els.contentType.addEventListener('change', () => {
    if (state.selected) renderRequestBodyTemplate(state.selected);
  });

  els.loadPlayerBtn.addEventListener('click', loadSongAndPlay);
  els.recordPlayBtn.addEventListener('click', recordPlay);
  els.recordListenBtn.addEventListener('click', recordListen);
  els.loadArtistStatsBtn.addEventListener('click', loadArtistStats);

  els.playerAudio.addEventListener('timeupdate', syncSeekUI);
  els.playerAudio.addEventListener('loadedmetadata', syncSeekUI);
  els.seekRange.addEventListener('input', () => {
    const nextTime = Number(els.seekRange.value || 0);
    els.playerAudio.currentTime = Number.isFinite(nextTime) ? nextTime : 0;
    syncSeekUI();
  });
}

async function loadApis() {
  try {
    setStatus('Đang tải OpenAPI spec...');
    const res = await fetch(els.openApiUrl.value.trim());
    if (!res.ok) throw new Error(`Không tải được spec (${res.status})`);
    state.spec = await res.json();
    state.endpoints = extractEndpoints(state.spec);
    renderEndpointList();
    setStatus(`Đã tải ${state.endpoints.length} endpoint.`);
  } catch (err) {
    setStatus(err.message, true);
  }
}

function extractEndpoints(spec) {
  const items = [];
  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      items.push({ path, method: method.toUpperCase(), operation });
    }
  }
  return items;
}

function renderEndpointList() {
  const key = els.searchInput.value.trim().toLowerCase();
  els.apiList.innerHTML = '';

  state.endpoints
    .filter(ep => {
      if (!key) return true;
      const tags = (ep.operation.tags || []).join(' ').toLowerCase();
      return `${ep.method} ${ep.path}`.toLowerCase().includes(key) || tags.includes(key);
    })
    .forEach((ep) => {
      const div = document.createElement('div');
      div.className = `endpoint-item ${state.selected === ep ? 'active' : ''}`;
      div.innerHTML = `<span class="badge">${ep.method}</span><span>${ep.path}</span>`;
      div.addEventListener('click', () => selectEndpoint(ep));
      els.apiList.appendChild(div);
    });
}

function selectEndpoint(endpoint) {
  state.selected = endpoint;
  renderEndpointList();
  els.requestForm.classList.remove('hidden');
  els.endpointTitle.textContent = `${endpoint.method} ${endpoint.path}`;
  els.method.value = endpoint.method;
  els.path.value = endpoint.path;
  renderParams(endpoint);
  renderContentTypes(endpoint);
  renderRequestBodyTemplate(endpoint);
}

function renderParams(endpoint) {
  const params = endpoint.operation.parameters || [];
  els.paramsContainer.innerHTML = '';
  if (!params.length) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'meta-grid';

  params.forEach((param) => {
    const id = `param_${param.in}_${param.name}`;
    const label = document.createElement('label');
    label.innerHTML = `${param.name} (${param.in})${param.required ? ' *' : ''}`;
    const input = document.createElement('input');
    input.id = id;
    input.dataset.paramIn = param.in;
    input.dataset.paramName = param.name;
    input.required = Boolean(param.required);
    input.placeholder = param.schema?.type || 'string';
    label.appendChild(input);
    wrapper.appendChild(label);
  });

  els.paramsContainer.appendChild(wrapper);
}

function renderContentTypes(endpoint) {
  const content = endpoint.operation.requestBody?.content || {};
  const types = Object.keys(content);
  els.contentType.innerHTML = '';
  if (!types.length) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Không có body';
    els.contentType.appendChild(opt);
    return;
  }
  types.forEach(type => {
    const opt = document.createElement('option');
    opt.value = type;
    opt.textContent = type;
    els.contentType.appendChild(opt);
  });
}

function renderRequestBodyTemplate(endpoint) {
  const type = els.contentType.value;
  const schema = endpoint.operation.requestBody?.content?.[type]?.schema;
  els.requestBody.value = JSON.stringify(exampleFromSchema(schema), null, 2);
}

function exampleFromSchema(schema) {
  if (!schema) return {};
  if (schema.example) return schema.example;
  if (schema.$ref) {
    const key = schema.$ref.split('/').pop();
    const real = state.spec?.components?.schemas?.[key];
    return exampleFromSchema(real);
  }
  if (schema.type === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(schema.properties || {})) {
      obj[k] = exampleFromSchema(v);
    }
    return obj;
  }
  if (schema.type === 'array') return [exampleFromSchema(schema.items)];
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  return '';
}

async function submitRequest(event) {
  event.preventDefault();
  if (!state.selected) return;

  try {
    const { url, options, curl } = buildRequest(state.selected);
    const started = performance.now();
    const res = await fetch(url, options);
    const elapsed = Math.round(performance.now() - started);

    let body;
    const txt = await res.text();
    try { body = JSON.parse(txt); } catch { body = txt; }

    els.responseSection.classList.remove('hidden');
    els.responseMeta.textContent = `Status: ${res.status} ${res.statusText}\nTime: ${elapsed}ms\nURL: ${url}`;
    els.responseBody.textContent = typeof body === 'string' ? body : JSON.stringify(body, null, 2);

    state.history.unshift({
      when: new Date().toLocaleString(),
      method: state.selected.method,
      path: state.selected.path,
      status: res.status,
      elapsed,
      curl
    });
    state.history = state.history.slice(0, 20);
    renderHistory();
    setStatus('Gọi API thành công.');
  } catch (err) {
    setStatus(err.message, true);
  }
}

function buildRequest(endpoint) {
  let path = endpoint.path;
  const query = new URLSearchParams();
  const headers = { Accept: 'application/json' };
  const token = els.authToken.value.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  document.querySelectorAll('[data-param-in]').forEach(input => {
    const where = input.dataset.paramIn;
    const name = input.dataset.paramName;
    const value = input.value;
    if (!value) return;
    if (where === 'path') path = path.replace(`{${name}}`, encodeURIComponent(value));
    if (where === 'query') query.append(name, value);
    if (where === 'header') headers[name] = value;
  });

  let body;
  if (!['GET', 'DELETE'].includes(endpoint.method)) {
    const raw = els.requestBody.value.trim();
    if (raw) {
      body = raw;
      if (els.contentType.value) headers['Content-Type'] = els.contentType.value;
    }
  }

  const base = els.baseUrl.value.trim().replace(/\/$/, '');
  const queryString = query.toString();
  const url = `${base}${path}${queryString ? `?${queryString}` : ''}`;
  const options = { method: endpoint.method, headers, body };

  const curlParts = [`curl -X ${endpoint.method} '${url}'`];
  Object.entries(headers).forEach(([k, v]) => curlParts.push(`-H '${k}: ${v}'`));
  if (body) curlParts.push(`--data-raw '${body.replace(/'/g, "'\\''")}'`);

  return { url, options, curl: curlParts.join(' ') };
}

async function copyCurl() {
  if (!state.selected) return;
  try {
    const { curl } = buildRequest(state.selected);
    await navigator.clipboard.writeText(curl);
    setStatus('Đã copy cURL vào clipboard.');
  } catch {
    setStatus('Không copy được cURL. Trình duyệt có thể đang chặn clipboard.', true);
  }
}

function renderHistory() {
  els.history.innerHTML = '';
  state.history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.textContent = `[${item.when}] ${item.method} ${item.path} -> ${item.status} (${item.elapsed}ms)`;
    div.title = item.curl;
    els.history.appendChild(div);
  });
}

function getApiBase() {
  return els.baseUrl.value.trim().replace(/\/$/, '');
}

function authHeaders(defaultType = 'application/json') {
  const headers = { Accept: 'application/json' };
  if (defaultType) headers['Content-Type'] = defaultType;
  const token = els.authToken.value.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function safeApiCall(url, options = {}) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let payload;
  try { payload = JSON.parse(raw); } catch { payload = raw; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  }
  return payload;
}

async function loadSongAndPlay() {
  const songId = els.playerSongId.value.trim();
  if (!songId) {
    setStatus('Vui lòng nhập Song ID trước khi phát nhạc.', true);
    return;
  }

  try {
    const base = getApiBase();
    const songData = await safeApiCall(`${base}/songs/${songId}`, { headers: authHeaders(null) });
    const streamData = await safeApiCall(`${base}/songs/${songId}/stream`, { headers: authHeaders(null) });

    const song = songData.result || {};
    const streamUrl = streamData.result;
    if (!streamUrl) throw new Error('API stream không trả về URL hợp lệ.');

    state.currentSong = song;
    state.currentArtistId = song.primaryArtist?.id || null;

    els.playerAudio.src = streamUrl;
    await els.playerAudio.play();

    els.playerInfo.textContent = JSON.stringify({
      songId: song.id,
      title: song.title,
      durationSeconds: song.durationSeconds,
      playCount: song.playCount,
      streamUrl,
      primaryArtist: song.primaryArtist
    }, null, 2);

    setStatus('Đã load stream và bắt đầu phát nhạc. Bạn có thể tua bằng thanh seek.');
  } catch (err) {
    setStatus(`Load player thất bại: ${err.message}`, true);
  }
}

async function recordPlay() {
  const songId = els.playerSongId.value.trim();
  if (!songId) {
    setStatus('Vui lòng nhập Song ID trước khi ghi nhận play.', true);
    return;
  }

  try {
    const base = getApiBase();
    await safeApiCall(`${base}/songs/${songId}/play`, {
      method: 'POST',
      headers: authHeaders(null)
    });
    setStatus('Đã ghi nhận play thành công.');
  } catch (err) {
    setStatus(`Ghi nhận play thất bại: ${err.message}`, true);
  }
}

async function recordListen() {
  const songId = els.playerSongId.value.trim();
  if (!songId) {
    setStatus('Vui lòng nhập Song ID trước khi ghi nhận listen.', true);
    return;
  }

  try {
    const base = getApiBase();
    const params = new URLSearchParams();
    const playlistId = els.playerPlaylistId.value.trim();
    const albumId = els.playerAlbumId.value.trim();
    const duration = els.playerListenDuration.value.trim() || '30';

    if (playlistId) params.set('playlistId', playlistId);
    if (albumId) params.set('albumId', albumId);
    params.set('durationSeconds', duration);

    await safeApiCall(`${base}/songs/${songId}/listen?${params.toString()}`, {
      method: 'POST',
      headers: authHeaders(null)
    });
    setStatus('Đã ghi nhận listen thành công.');
  } catch (err) {
    setStatus(`Ghi nhận listen thất bại: ${err.message}`, true);
  }
}

async function loadArtistStats() {
  const songId = els.playerSongId.value.trim();
  if (!songId) {
    setStatus('Vui lòng nhập Song ID để lấy artist stats.', true);
    return;
  }

  try {
    const base = getApiBase();

    if (!state.currentArtistId) {
      const songData = await safeApiCall(`${base}/songs/${songId}`, { headers: authHeaders(null) });
      state.currentArtistId = songData.result?.primaryArtist?.id || null;
    }

    if (!state.currentArtistId) {
      throw new Error('Không tìm thấy primaryArtist.id từ bài hát này.');
    }

    const stats = await safeApiCall(`${base}/social/artists/${state.currentArtistId}/stats`, {
      headers: authHeaders(null)
    });

    els.artistStats.textContent = JSON.stringify({
      artistId: state.currentArtistId,
      stats: stats.result || stats
    }, null, 2);

    setStatus('Đã lấy thống kê artist thành công.');
  } catch (err) {
    setStatus(`Lấy stats thất bại: ${err.message}`, true);
  }
}

function syncSeekUI() {
  const duration = Number.isFinite(els.playerAudio.duration) ? Math.floor(els.playerAudio.duration) : 0;
  const current = Math.floor(els.playerAudio.currentTime || 0);
  els.seekRange.max = String(Math.max(duration, 0));
  els.seekRange.value = String(Math.min(current, duration || 0));
  els.seekLabel.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
}

function formatTime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.style.color = isError ? '#fca5a5' : 'var(--muted)';
}
