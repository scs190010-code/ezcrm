/* EZCRM Server Realtime Sync Adapter
 * GitHub Pages(정적 호스팅) + Firebase Realtime Database 또는 REST 서버를 이용해
 * 모든 클라이언트가 동일한 JSON DB(payload)를 보도록 동기화한다.
 */
(function(global) {
  'use strict';

  function cfg() { return global.EZCRM_FIREBASE_CONFIG || {}; }
  function serverCfg() { return global.EZCRM_SERVER_PUSH_CONFIG || {}; }

  function syncEngine() {
    var engine = global.EZCRM_SYNC_ENGINE || cfg().engine || serverCfg().engine || 'firebase';
    return String(engine || 'firebase').toLowerCase();
  }

  function isPlaceholder(value) {
    if(!value) return true;
    var s = String(value);
    return s.indexOf('YOUR_') >= 0 || s.indexOf('YOUR-') >= 0 || s.indexOf('실제') >= 0 || s.indexOf('프로젝트ID') >= 0 || s.indexOf('YOUR_SERVER_DOMAIN') >= 0;
  }

  function isLikelyStaticHost(url) {
    try {
      var u = new URL(String(url), location.href);
      var h = u.hostname.toLowerCase();
      return /(^|\.)github\.io$/.test(h) || /(^|\.)githubusercontent\.com$/.test(h) || /(^|\.)netlify\.app$/.test(h) || /(^|\.)vercel\.app$/.test(h);
    } catch(e) { return false; }
  }

  function firebaseEnabled() {
    var c = cfg();
    return c.enabled === true && !isPlaceholder(c.apiKey) && !isPlaceholder(c.databaseURL) && !isPlaceholder(c.projectId);
  }

  function customServerEnabled() {
    var c = serverCfg();
    if(c.enabled !== true) return false;

    // Firebase와 REST를 동시에 켜면 REST 실패가 화면 동기화를 방해할 수 있으므로
    // 기본 엔진(firebase)에서는 REST 폴링을 자동 차단한다. REST만 쓸 때는 engine:'rest' 또는 forceRest:true 사용.
    if(firebaseEnabled() && syncEngine() !== 'rest' && c.forceRest !== true) return false;

    var endpoint = c.endpoint || '';
    var readEndpoint = c.readEndpoint || c.endpoint || '';
    if(isPlaceholder(endpoint) || isPlaceholder(readEndpoint)) return false;
    if(!/^https?:\/\//.test(String(endpoint)) || !/^https?:\/\//.test(String(readEndpoint))) return false;

    // GitHub Pages, Netlify, Vercel 같은 정적 호스팅 URL은 REST 저장 서버가 아니다.
    // 실제 API 서버를 쓰는 고급 사용자는 allowStaticHost:true 로 강제 허용 가능.
    if(c.allowStaticHost !== true && (isLikelyStaticHost(endpoint) || isLikelyStaticHost(readEndpoint))) return false;
    return true;
  }

  function nowText() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
  }

  function safeKey(value) {
    return String(value || 'unknown').replace(/[.#$\[\]\/]/g, '_').replace(/\s+/g, '_').slice(0, 80);
  }

  function getClientId() {
    try {
      var key = 'ezcrm_client_id_v1';
      var id = localStorage.getItem(key);
      if(!id) {
        id = 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(key, id);
      }
      return id;
    } catch(e) {
      return 'client_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }
  }

  function getClientLabel() {
    try {
      var ua = navigator.userAgent || '';
      var platform = navigator.platform || '';
      return (platform ? platform + ' · ' : '') + ua.slice(0, 120);
    } catch(e) { return 'unknown client'; }
  }

  function hasBusinessData(data) {
    data = data || {};
    return ['customers', 'consults', 'asReqs', 'installs', 'materials', 'engineers'].some(function(k) {
      return Array.isArray(data[k]) && data[k].length > 0;
    });
  }

  function countPayload(data) {
    data = data || {};
    var out = {};
    ['customers', 'consults', 'asReqs', 'installs', 'materials', 'engineers', 'users'].forEach(function(k) {
      out[k] = Array.isArray(data[k]) ? data[k].length : 0;
    });
    return out;
  }

  function stableStringify(value) {
    var seen = [];
    return JSON.stringify(value || {}, function(key, val) {
      if(typeof val === 'string' && val.length > 50000) return val.slice(0, 50000) + '…';
      if(val && typeof val === 'object') {
        if(seen.indexOf(val) >= 0) return '[Circular]';
        seen.push(val);
        if(!Array.isArray(val)) {
          var ordered = {};
          Object.keys(val).sort().forEach(function(k){ ordered[k] = val[k]; });
          return ordered;
        }
      }
      return val;
    });
  }

  function hashPayload(value) {
    var str = stableStringify(value);
    var h = 0;
    for(var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return String(h) + ':' + str.length;
  }

  function makeRevision() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  function slimForLog(value) {
    try {
      var copy = JSON.parse(JSON.stringify(value || {}));
      if(copy.data && copy.data.fields) {
        Object.keys(copy.data.fields).forEach(function(k) {
          var v = copy.data.fields[k];
          if(typeof v === 'string' && v.length > 300) copy.data.fields[k] = v.slice(0, 300) + '…';
        });
      }
      if(copy.payload) copy.payload = { counts: countPayload(copy.payload) };
      return copy;
    } catch(e) { return {}; }
  }

  function getReadEndpoint() {
    var c = serverCfg();
    return c.readEndpoint || c.endpoint;
  }

  function requestCustomServer(kind, data, options) {
    options = options || {};
    if(!customServerEnabled()) return Promise.resolve({ skipped: true });
    var c = serverCfg();
    var body = JSON.stringify({
      app: 'EZCRM',
      version: 'v36-realtime-server-sync',
      kind: kind,
      clientId: RemoteDB.clientId || getClientId(),
      clientLabel: getClientLabel(),
      page: location.href,
      sentAtLocal: new Date().toISOString(),
      data: data
    });
    var headers = { 'Content-Type': 'application/json' };
    if(c.token) headers.Authorization = 'Bearer ' + c.token;

    if(options.keepalive && navigator.sendBeacon) {
      try {
        var ok = navigator.sendBeacon(c.endpoint, new Blob([body], { type: 'application/json' }));
        if(ok) return Promise.resolve({ beacon: true });
      } catch(e) {}
    }

    if(!global.fetch) return Promise.reject(new Error('fetch API is not available'));
    return fetch(c.endpoint, {
      method: c.method || 'POST',
      headers: headers,
      body: body,
      mode: c.mode || 'cors',
      keepalive: !!options.keepalive
    }).then(function(res) {
      if(!res.ok) throw new Error('Custom server HTTP ' + res.status);
      return res.json().catch(function(){ return { ok: true }; });
    });
  }

  function readCustomServer() {
    if(!customServerEnabled() || !global.fetch) return Promise.reject(new Error('Custom server is not enabled'));
    var c = serverCfg();
    var headers = { 'Accept': 'application/json' };
    if(c.token) headers.Authorization = 'Bearer ' + c.token;
    var url = getReadEndpoint();
    var sep = String(url).indexOf('?') >= 0 ? '&' : '?';
    url += sep + 'app=EZCRM&clientId=' + encodeURIComponent(RemoteDB.clientId || getClientId()) + '&ts=' + Date.now();
    return fetch(url, { method: 'GET', headers: headers, mode: c.mode || 'cors', cache: 'no-store' })
      .then(function(res) {
        if(!res.ok) throw new Error('Custom server GET HTTP ' + res.status);
        return res.json();
      });
  }

  function extractEnvelope(value) {
    value = value || {};
    if(value.payload) return { payload: value.payload, meta: value.meta || {}, raw: value };
    if(value.data && value.data.payload) return { payload: value.data.payload, meta: value.data.meta || value.meta || {}, raw: value };
    if(value.ok && value.payload) return { payload: value.payload, meta: value.meta || {}, raw: value };
    if(value.ok && value.data && value.data.payload) return { payload: value.data.payload, meta: value.data.meta || {}, raw: value };
    if(value.customers || value.consults || value.asReqs || value.installs || value.materials || value.engineers || value.users) {
      return { payload: value, meta: value.meta || {}, raw: value };
    }
    return { payload: null, meta: value.meta || {}, raw: value };
  }

  var RemoteDB = {
    app: null,
    ref: null,
    inputRef: null,
    logRef: null,
    presenceRef: null,
    connected: false,
    firebaseConnected: false,
    customServerConnected: false,
    seeded: false,
    clientId: getClientId(),
    onStatus: function(){},
    onRemoteData: function(){},
    pollTimer: null,
    lastRemoteHash: '',
    lastAppliedRevision: '',
    lastSaveHash: '',
    lastSaveAt: 0,
    bootFetched: false,

    isEnabled: firebaseEnabled,
    hasCustomServer: customServerEnabled,

    hasServerTarget: function() { return firebaseEnabled() || customServerEnabled(); },

    isReady: function() {
      return !!this.ref || customServerEnabled();
    },

    _emitStatus: function(label, tone, detail) {
      try { this.onStatus(label, tone, detail); } catch(e) {}
    },

    _makeMeta: function(data) {
      return {
        app: 'EZCRM Static GitHub Edition',
        version: 'v36-realtime-server-sync',
        revision: makeRevision(),
        updatedAt: global.firebase && firebase.database ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
        updatedAtLocal: new Date().toISOString(),
        updatedByClientId: this.clientId,
        clientLabel: getClientLabel(),
        counts: countPayload(data)
      };
    },

    _applyEnvelope: function(envelope, source) {
      envelope = envelope || {};
      var payload = envelope.payload;
      var meta = envelope.meta || {};
      if(!hasBusinessData(payload)) return false;
      var hash = hashPayload(payload);
      var revision = meta.revision || meta.updatedAt || meta.updatedAtLocal || '';
      if(hash === this.lastRemoteHash && revision === this.lastAppliedRevision) return false;
      this.lastRemoteHash = hash;
      this.lastAppliedRevision = revision;
      this.onRemoteData(payload, meta, source || 'server');
      this._emitStatus('🟢 서버 DB 수신·화면 동기화 완료', 'online', (source || 'server') + ' ' + nowText());
      return true;
    },

    _seedIfEmpty: function(initialData) {
      if(this.seeded || !hasBusinessData(initialData)) return;
      this.seeded = true;
      this._emitStatus('🔄 서버 DB 초기 데이터 업로드 중', 'syncing', 'seed.json/local → server');
      this.save(initialData).catch(function(err) {
        RemoteDB._emitStatus('⚠️ 서버 초기 업로드 실패', 'error', err && err.message ? err.message : '권한/설정 확인');
      });
    },

    connect: function(options) {
      options = options || {};
      this.onStatus = options.onStatus || function(){};
      this.onRemoteData = options.onRemoteData || function(){};
      this.seeded = false;

      if(!firebaseEnabled() && !customServerEnabled()) {
        var sc = serverCfg();
        if(sc && sc.enabled === true) {
          this._emitStatus('💻 로컬 저장 모드', 'local', 'REST 설정 무시됨: 실제 API endpoint 또는 engine:\'rest\' 확인');
        } else {
          this._emitStatus('💻 로컬 저장 모드', 'local', 'Firebase/서버 설정 전');
        }
        return;
      }

      if(firebaseEnabled()) this._connectFirebase(options);
      if(customServerEnabled()) this._connectCustomServer(options);
    },

    _connectFirebase: function(options) {
      if(!global.firebase || !firebase.initializeApp || !firebase.database) {
        this._emitStatus('⚠️ Firebase SDK 로드 실패', 'error', '인터넷/CDN 연결 확인');
        return;
      }

      try {
        var c = cfg();
        this.app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(c);
        var db = firebase.database(this.app);
        var basePath = c.path || 'ezcrm/v36';
        this.ref = db.ref(basePath);
        this.inputRef = db.ref(basePath + '/_clientInputs/' + safeKey(this.clientId));
        this.logRef = db.ref(basePath + '/_changeLog');
        this.presenceRef = db.ref(basePath + '/_presence/' + safeKey(this.clientId));

        firebase.database().ref('.info/connected').on('value', function(snap) {
          RemoteDB.firebaseConnected = snap.val() === true;
          RemoteDB.connected = RemoteDB.firebaseConnected || RemoteDB.customServerConnected;
          if(RemoteDB.firebaseConnected) {
            RemoteDB._emitStatus('🟢 Firebase 서버 연결됨', 'online', '실시간 구독 ' + nowText());
            RemoteDB.pushPresence();
            if(global.ClientAutoSync && ClientAutoSync.flushQueue) ClientAutoSync.flushQueue();
          } else {
            RemoteDB._emitStatus('🟡 Firebase 연결 대기', 'warning', '오프라인이면 로컬 저장 후 재연결');
          }
        });

        // 접속 직후 1회 강제 로드: 새 클라이언트가 로컬 데이터보다 서버 데이터를 먼저 따라오게 한다.
        this.ref.once('value').then(function(snapshot) {
          RemoteDB.bootFetched = true;
          var envelope = extractEnvelope(snapshot.val());
          if(!RemoteDB._applyEnvelope(envelope, 'firebase-once')) {
            RemoteDB._seedIfEmpty(options.initialData);
          }
        }).catch(function(error) {
          RemoteDB._emitStatus('⚠️ Firebase 최초 읽기 실패', 'error', error && error.message ? error.message : '규칙/URL 확인');
        });

        // 이후 실시간 구독: 다른 클라이언트가 저장하면 모든 접속 화면에 자동 반영된다.
        this.ref.on('value', function(snapshot) {
          var envelope = extractEnvelope(snapshot.val());
          if(!RemoteDB._applyEnvelope(envelope, 'firebase-live')) {
            if(RemoteDB.bootFetched) RemoteDB._seedIfEmpty(options.initialData);
          }
        }, function(error) {
          RemoteDB._emitStatus('⚠️ Firebase 실시간 읽기 실패', 'error', error && error.message ? error.message : '규칙/URL 확인');
        });
      } catch(error) {
        this._emitStatus('⚠️ Firebase 초기화 실패', 'error', error && error.message ? error.message : '설정 확인');
      }
    },

    _connectCustomServer: function(options) {
      var c = serverCfg();
      var pollMs = Math.max(1500, parseInt(c.pollMs || 3000, 10));
      this._emitStatus('🟣 REST 서버 동기화 준비', 'syncing', 'GET 폴링 ' + (pollMs / 1000) + '초');
      var poll = function(first) {
        RemoteDB.pollServer(options, first).catch(function(err) {
          RemoteDB.customServerConnected = false;
          RemoteDB.connected = RemoteDB.firebaseConnected || RemoteDB.customServerConnected;
          RemoteDB._emitStatus('⚠️ REST 서버 읽기 실패', 'warning', err && err.message ? err.message : 'GET endpoint 확인');
        });
      };
      poll(true);
      clearInterval(this.pollTimer);
      this.pollTimer = setInterval(function(){ poll(false); }, pollMs);
      global.addEventListener('visibilitychange', function() {
        if(!document.hidden) poll(false);
      });
      global.addEventListener('online', function(){ poll(false); });
    },

    pollServer: function(options, first) {
      return readCustomServer().then(function(json) {
        RemoteDB.customServerConnected = true;
        RemoteDB.connected = RemoteDB.firebaseConnected || RemoteDB.customServerConnected;
        var envelope = extractEnvelope(json);
        var applied = RemoteDB._applyEnvelope(envelope, first ? 'rest-once' : 'rest-poll');
        if(!applied && !hasBusinessData(envelope.payload)) RemoteDB._seedIfEmpty(options.initialData);
        if(!applied && hasBusinessData(envelope.payload)) {
          RemoteDB._emitStatus('🟣 REST 서버 DB 확인 완료', 'online', '변경 없음 ' + nowText());
        }
        if(global.ClientAutoSync && ClientAutoSync.flushQueue) ClientAutoSync.flushQueue();
        return json;
      });
    },

    save: function(data) {
      var meta = this._makeMeta(data);
      var payload = { payload: data, meta: meta };
      var hash = hashPayload(data);
      var jobs = [];
      this.lastSaveHash = hash;
      this.lastSaveAt = Date.now();

      if(this.ref) {
        jobs.push(this.ref.update(payload).then(function() {
          RemoteDB._emitStatus('🟢 Firebase 서버 DB 저장 완료', 'online', '업로드 ' + nowText());
          return RemoteDB.pushEvent('full-db-save', { counts: countPayload(data), meta: meta }, { quiet: true });
        }));
      } else if(firebaseEnabled()) {
        jobs.push(Promise.reject(new Error('Firebase RemoteDB is not connected')));
      }

      if(customServerEnabled()) {
        jobs.push(requestCustomServer('full-db-save', { payload: data, meta: meta }).then(function(res) {
          RemoteDB.customServerConnected = true;
          RemoteDB.connected = RemoteDB.firebaseConnected || RemoteDB.customServerConnected;
          RemoteDB._emitStatus('🟣 REST 서버 DB 저장 완료', 'online', 'POST ' + nowText());
          return res;
        }).catch(function(err) {
          console.warn('[EZCRM] custom server full-save failed:', err);
          throw err;
        }));
      }

      if(jobs.length === 0) return Promise.reject(new Error('저장할 서버 대상이 없습니다.'));
      return Promise.all(jobs).then(function(){ return payload; });
    },

    pushPresence: function(extra) {
      var record = {
        clientId: this.clientId,
        clientLabel: getClientLabel(),
        page: location.href,
        updatedAt: global.firebase && firebase.database ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
        updatedAtLocal: new Date().toISOString(),
        online: true,
        extra: extra || null
      };
      if(this.presenceRef) {
        try {
          this.presenceRef.onDisconnect().update({ online: false, disconnectedAt: firebase.database.ServerValue.TIMESTAMP });
          this.presenceRef.update(record);
        } catch(e) { console.warn('[EZCRM] presence failed:', e); }
      }
      if(customServerEnabled()) return requestCustomServer('presence', record).catch(function(){});
      return Promise.resolve(record);
    },

    pushClientInput: function(kind, data, options) {
      options = options || {};
      var record = {
        kind: kind || 'draft',
        clientId: this.clientId,
        clientLabel: getClientLabel(),
        page: location.href,
        updatedAt: global.firebase && firebase.database ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
        updatedAtLocal: new Date().toISOString(),
        data: data || {}
      };
      var jobs = [];
      if(this.inputRef) {
        var key = safeKey((data && data.formId) || kind || 'input');
        if(kind === 'draft') jobs.push(this.inputRef.child('drafts/' + key).set(record));
        else jobs.push(this.inputRef.child('events').push(record));
      } else if(firebaseEnabled()) {
        jobs.push(Promise.reject(new Error('Firebase RemoteDB is not connected')));
      }
      if(customServerEnabled()) {
        jobs.push(requestCustomServer('client-' + (kind || 'input'), record, options).catch(function(err) {
          console.warn('[EZCRM] custom server client input failed:', err);
        }));
      }
      if(jobs.length === 0) return Promise.reject(new Error('서버 대상이 설정되지 않았습니다.'));
      return Promise.all(jobs).then(function(){
        if(!options.quiet) RemoteDB._emitStatus('🟢 입력값 서버 자동전송 완료', 'online', nowText());
        return record;
      });
    },

    pushEvent: function(eventName, data, options) {
      options = options || {};
      var record = {
        eventName: eventName,
        clientId: this.clientId,
        clientLabel: getClientLabel(),
        page: location.href,
        createdAt: global.firebase && firebase.database ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
        createdAtLocal: new Date().toISOString(),
        data: slimForLog(data)
      };
      var jobs = [];
      if(this.logRef) jobs.push(this.logRef.push(record));
      else if(firebaseEnabled()) jobs.push(Promise.reject(new Error('Firebase RemoteDB is not connected')));
      if(customServerEnabled()) {
        jobs.push(requestCustomServer('event-' + eventName, record, options).catch(function(err) {
          console.warn('[EZCRM] custom server event failed:', err);
        }));
      }
      if(jobs.length === 0) return Promise.resolve(record);
      return Promise.all(jobs).then(function(){ return record; });
    },

    fetchOnce: function() {
      if(this.ref) return this.ref.once('value').then(function(snapshot) { return snapshot.val(); });
      if(customServerEnabled()) return readCustomServer();
      return Promise.reject(new Error('RemoteDB is not connected'));
    },

    stop: function() {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      if(this.ref) this.ref.off();
    }
  };

  global.RemoteDB = RemoteDB;
})(window);
