/* EZCRM Firebase Realtime Database adapter: static hosting + online JSON DB + client auto server push */
(function(global) {
  'use strict';

  function cfg() { return global.EZCRM_FIREBASE_CONFIG || {}; }
  function serverCfg() { return global.EZCRM_SERVER_PUSH_CONFIG || {}; }

  function isPlaceholder(value) {
    return !value || String(value).indexOf('YOUR_') >= 0;
  }

  function isEnabled() {
    var c = cfg();
    return c.enabled === true && !isPlaceholder(c.apiKey) && !isPlaceholder(c.databaseURL) && !isPlaceholder(c.projectId);
  }

  function customServerEnabled() {
    var c = serverCfg();
    return c.enabled === true && !!c.endpoint && String(c.endpoint).indexOf('https://') === 0;
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

  function postCustomServer(kind, data, options) {
    options = options || {};
    if(!customServerEnabled()) return Promise.resolve({ skipped: true });
    var c = serverCfg();
    var body = JSON.stringify({
      app: 'EZCRM',
      version: 'v36-online-jsondb-auto-server-push',
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
      return res;
    });
  }

  var RemoteDB = {
    app: null,
    ref: null,
    inputRef: null,
    logRef: null,
    presenceRef: null,
    connected: false,
    seeded: false,
    clientId: getClientId(),
    onStatus: function(){},
    onRemoteData: function(){},

    isEnabled: isEnabled,
    hasCustomServer: customServerEnabled,

    hasServerTarget: function() {
      return isEnabled() || customServerEnabled();
    },

    isReady: function() {
      return !!(this.ref && this.connected !== false);
    },

    connect: function(options) {
      options = options || {};
      this.onStatus = options.onStatus || function(){};
      this.onRemoteData = options.onRemoteData || function(){};

      if(!isEnabled()) {
        if(customServerEnabled()) this.onStatus('🟣 자체 서버 자동전송 모드', 'syncing', 'Firebase 없이 REST 전송');
        else this.onStatus('💻 로컬 저장 모드', 'local', 'Firebase/서버 설정 전');
        return;
      }
      if(!global.firebase || !firebase.initializeApp || !firebase.database) {
        this.onStatus('⚠️ Firebase SDK 로드 실패', 'error', '인터넷/CDN 연결 확인');
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
          RemoteDB.connected = snap.val() === true;
          if(RemoteDB.connected) {
            RemoteDB.onStatus('🟢 온라인 JSON DB 연결됨', 'online', '실시간 동기화 ' + nowText());
            RemoteDB.pushPresence();
            if(global.ClientAutoSync && ClientAutoSync.flushQueue) ClientAutoSync.flushQueue();
          } else {
            RemoteDB.onStatus('🟡 온라인 DB 연결 대기', 'warning', '오프라인이면 로컬 저장 후 재연결');
          }
        });

        this.ref.on('value', function(snapshot) {
          var value = snapshot.val();
          if(value && value.payload) {
            if(!hasBusinessData(value.payload) && !RemoteDB.seeded && hasBusinessData(options.initialData)) {
              RemoteDB.seeded = true;
              RemoteDB.save(options.initialData);
              return;
            }
            RemoteDB.onRemoteData(value.payload, value.meta || {});
            RemoteDB.onStatus('🟢 온라인 JSON DB 동기화 완료', 'online', '수신 ' + nowText());
          } else if(value && (value.customers || value.consults || value.asReqs || value.installs || value.materials || value.engineers || value.users)) {
            if(!hasBusinessData(value) && !RemoteDB.seeded && hasBusinessData(options.initialData)) {
              RemoteDB.seeded = true;
              RemoteDB.save(options.initialData);
              return;
            }
            RemoteDB.onRemoteData(value, {});
            RemoteDB.onStatus('🟢 온라인 JSON DB 동기화 완료', 'online', '구형 JSON 수신 ' + nowText());
          } else if(!RemoteDB.seeded && hasBusinessData(options.initialData)) {
            RemoteDB.seeded = true;
            RemoteDB.save(options.initialData);
          }
        }, function(error) {
          RemoteDB.onStatus('⚠️ 온라인 DB 읽기 실패', 'error', error && error.message ? error.message : '규칙/URL 확인');
        });
      } catch(error) {
        this.onStatus('⚠️ 온라인 DB 초기화 실패', 'error', error && error.message ? error.message : '설정 확인');
      }
    },

    save: function(data) {
      var meta = {
        app: 'EZCRM Static GitHub Edition',
        version: 'v36-online-jsondb-auto-server-push',
        updatedAt: global.firebase && firebase.database ? firebase.database.ServerValue.TIMESTAMP : Date.now(),
        updatedAtLocal: new Date().toISOString(),
        updatedByClientId: this.clientId,
        clientLabel: getClientLabel(),
        counts: countPayload(data)
      };
      var payload = { payload: data, meta: meta };
      var jobs = [];

      if(this.ref) {
        // update()를 사용해 _clientInputs, _changeLog 같은 서버측 수신 로그를 보존한다.
        jobs.push(this.ref.update(payload).then(function() {
          RemoteDB.onStatus('🟢 온라인 JSON DB 저장 완료', 'online', '업로드 ' + nowText());
          return RemoteDB.pushEvent('full-db-save', { counts: countPayload(data), meta: meta }, { quiet: true });
        }));
      } else if(isEnabled()) {
        jobs.push(Promise.reject(new Error('RemoteDB is not connected')));
      }

      jobs.push(postCustomServer('full-db-save', { payload: data, meta: meta }).catch(function(err) {
        console.warn('[EZCRM] custom server full-save failed:', err);
      }));

      if(jobs.length === 0) return Promise.reject(new Error('RemoteDB is not connected'));
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
      return postCustomServer('presence', record).catch(function(){});
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
      } else if(isEnabled()) {
        jobs.push(Promise.reject(new Error('RemoteDB is not connected')));
      }
      jobs.push(postCustomServer('client-' + (kind || 'input'), record, options).catch(function(err) {
        console.warn('[EZCRM] custom server client input failed:', err);
      }));
      if(jobs.length === 0) return Promise.reject(new Error('No server target configured'));
      return Promise.all(jobs).then(function(){
        if(!options.quiet) RemoteDB.onStatus('🟢 입력값 서버 자동전송 완료', 'online', nowText());
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
      else if(isEnabled()) jobs.push(Promise.reject(new Error('RemoteDB is not connected')));
      jobs.push(postCustomServer('event-' + eventName, record, options).catch(function(err) {
        console.warn('[EZCRM] custom server event failed:', err);
      }));
      if(jobs.length === 0) return Promise.reject(new Error('No server target configured'));
      return Promise.all(jobs).then(function(){ return record; });
    },

    fetchOnce: function() {
      if(!this.ref) return Promise.reject(new Error('RemoteDB is not connected'));
      return this.ref.once('value').then(function(snapshot) { return snapshot.val(); });
    }
  };

  global.RemoteDB = RemoteDB;
})(window);
