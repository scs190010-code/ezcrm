/* EZCRM Firebase Realtime Database adapter: static hosting + online JSON DB */
(function(global) {
  'use strict';

  function cfg() { return global.EZCRM_FIREBASE_CONFIG || {}; }

  function isPlaceholder(value) {
    return !value || String(value).indexOf('YOUR_') >= 0;
  }

  function isEnabled() {
    var c = cfg();
    return c.enabled === true && !isPlaceholder(c.apiKey) && !isPlaceholder(c.databaseURL) && !isPlaceholder(c.projectId);
  }

  function nowText() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
  }

  var RemoteDB = {
    app: null,
    ref: null,
    connected: false,
    seeded: false,
    onStatus: function(){},
    onRemoteData: function(){},

    isEnabled: isEnabled,

    isReady: function() {
      return !!(this.ref && this.connected !== false);
    },

    connect: function(options) {
      options = options || {};
      this.onStatus = options.onStatus || function(){};
      this.onRemoteData = options.onRemoteData || function(){};

      if(!isEnabled()) {
        this.onStatus('💻 로컬 저장 모드', 'local', 'Firebase 설정 전');
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
        this.ref = db.ref(c.path || 'ezcrm/v36');

        firebase.database().ref('.info/connected').on('value', function(snap) {
          RemoteDB.connected = snap.val() === true;
          if(RemoteDB.connected) RemoteDB.onStatus('🟢 온라인 JSON DB 연결됨', 'online', '실시간 동기화 ' + nowText());
          else RemoteDB.onStatus('🟡 온라인 DB 연결 대기', 'warning', '오프라인이면 로컬 저장 후 재연결');
        });

        this.ref.on('value', function(snapshot) {
          var value = snapshot.val();
          if(value && value.payload) {
            RemoteDB.onRemoteData(value.payload, value.meta || {});
            RemoteDB.onStatus('🟢 온라인 JSON DB 동기화 완료', 'online', '수신 ' + nowText());
          } else if(value && (value.customers || value.consults || value.asReqs || value.installs || value.materials || value.engineers || value.users)) {
            RemoteDB.onRemoteData(value, {});
            RemoteDB.onStatus('🟢 온라인 JSON DB 동기화 완료', 'online', '구형 JSON 수신 ' + nowText());
          } else if(!RemoteDB.seeded && options.initialData) {
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
      if(!this.ref) return Promise.reject(new Error('RemoteDB is not connected'));
      var payload = {
        payload: data,
        meta: {
          app: 'EZCRM Static GitHub Edition',
          version: 'v36-online-jsondb',
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAtLocal: new Date().toISOString()
        }
      };
      return this.ref.set(payload).then(function() {
        RemoteDB.onStatus('🟢 온라인 JSON DB 저장 완료', 'online', '업로드 ' + nowText());
      });
    },

    fetchOnce: function() {
      if(!this.ref) return Promise.reject(new Error('RemoteDB is not connected'));
      return this.ref.once('value').then(function(snapshot) { return snapshot.val(); });
    }
  };

  global.RemoteDB = RemoteDB;
})(window);
