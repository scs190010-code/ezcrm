/* EZCRM client input auto sender: sends form drafts and submit snapshots to server automatically */
(function(global) {
  'use strict';

  var QUEUE_KEY = 'ezcrm_auto_server_queue_v1';
  var MAX_QUEUE = 100;

  function cfg() {
    var c = global.EZCRM_CLIENT_AUTOSYNC_CONFIG || {};
    return {
      enabled: c.enabled !== false,
      debounceMs: typeof c.debounceMs === 'number' ? c.debounceMs : 900,
      queueWhenOffline: c.queueWhenOffline !== false,
      includeHidden: c.includeHidden === true,
      maxTextLength: typeof c.maxTextLength === 'number' ? c.maxTextLength : 5000
    };
  }

  function now() { return new Date().toISOString(); }

  function isSkippableElement(el) {
    if(!el || !el.tagName) return true;
    var tag = el.tagName.toLowerCase();
    var type = String(el.type || '').toLowerCase();
    if(['button', 'submit', 'reset'].indexOf(type) >= 0) return true;
    if(type === 'password') return true;
    if(el.id && /(pw|password|pass)/i.test(el.id)) return true;
    if(el.name && /(pw|password|pass)/i.test(el.name)) return true;
    if(el.dataset && el.dataset.autosync === 'off') return true;
    if(['input', 'textarea', 'select'].indexOf(tag) < 0) return true;
    return false;
  }

  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch(e) { return []; }
  }

  function writeQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch(e) {}
  }

  function findSectionId(form) {
    var p = form;
    while(p && p !== document.body) {
      if(p.id && p.id.indexOf('tab-') === 0) return p.id;
      p = p.parentElement;
    }
    return '';
  }

  function getFormTitle(form) {
    try {
      var section = form.closest ? form.closest('section') : null;
      var h = section ? section.querySelector('h2,h3') : null;
      return h ? h.textContent.trim().replace(/\s+/g, ' ') : '';
    } catch(e) { return ''; }
  }

  function limitText(value) {
    var c = cfg();
    if(typeof value !== 'string') return value;
    if(value.length <= c.maxTextLength) return value;
    return value.slice(0, c.maxTextLength) + '…[truncated]';
  }

  function valueOf(el) {
    var type = String(el.type || '').toLowerCase();
    if(type === 'file') {
      return Array.prototype.slice.call(el.files || []).map(function(file) {
        return { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified };
      });
    }
    if(type === 'checkbox') return !!el.checked;
    if(type === 'radio') return el.checked ? el.value : null;
    if(type === 'hidden') {
      if(!cfg().includeHidden) return '[hidden omitted]';
      if(el.id && /signature|sig/i.test(el.id)) return el.value ? '[signature data present]' : '';
    }
    return limitText(el.value);
  }

  function snapshotForm(form) {
    var fields = {};
    Array.prototype.slice.call(form.elements || []).forEach(function(el) {
      if(isSkippableElement(el)) return;
      var type = String(el.type || '').toLowerCase();
      if(type === 'hidden' && !cfg().includeHidden && !(el.id && /signature|sig/i.test(el.id))) return;
      var key = el.id || el.name;
      if(!key) return;
      var val = valueOf(el);
      if(val === null) return;
      fields[key] = val;
    });

    return {
      formId: form.id || findSectionId(form) || 'unknown-form',
      formTitle: getFormTitle(form),
      sectionId: findSectionId(form),
      fieldCount: Object.keys(fields).length,
      fields: fields,
      url: location.pathname + location.search,
      capturedAtLocal: now()
    };
  }

  var ClientAutoSync = {
    initialized: false,
    timers: {},
    lastStatus: '',

    init: function() {
      var c = cfg();
      if(this.initialized || !c.enabled) return;

      // 서버 대상이 없으면 입력 초안을 계속 큐에 쌓지 않는다.
      // Firebase 설정 전 업로드 테스트에서는 로컬 DB만 정상 작동하고,
      // Firebase 설정 후에는 자동전송/실시간 동기화가 활성화된다.
      if(!(global.RemoteDB && RemoteDB.hasServerTarget && RemoteDB.hasServerTarget())) {
        this.showStatus('💻 서버 자동전송 비활성', 'Firebase 설정 전 · REST 서버 사용 안 함');
        return;
      }

      this.initialized = true;

      var self = this;
      document.addEventListener('input', function(e) { self.scheduleFromElement(e.target, 'input'); }, true);
      document.addEventListener('change', function(e) { self.scheduleFromElement(e.target, 'change'); }, true);
      document.addEventListener('submit', function(e) { self.pushForm(e.target, 'submit', { keepalive: true }); }, true);
      window.addEventListener('online', function() { self.flushQueue(); });
      document.addEventListener('visibilitychange', function() {
        if(document.visibilityState === 'hidden') self.flushVisibleForms(true);
        else self.flushQueue();
      });
      window.addEventListener('beforeunload', function() { self.flushVisibleForms(true); });

      setInterval(function(){ self.flushQueue(); }, 7000);
      setInterval(function(){ if(global.RemoteDB && RemoteDB.pushPresence) RemoteDB.pushPresence({ autosync: true }); }, 30000);
      setTimeout(function(){ self.flushQueue(); }, 1500);
      this.showStatus('🟣 입력값 자동전송 대기', '입력 시 서버로 자동 전송');
    },

    isTrackableForm: function(form) {
      return !!(form && form.tagName && form.tagName.toLowerCase() === 'form' && !(form.dataset && form.dataset.autosync === 'off'));
    },

    scheduleFromElement: function(el, reason) {
      if(isSkippableElement(el)) return;
      var form = el.form;
      if(!this.isTrackableForm(form)) return;
      var c = cfg();
      var key = form.id || findSectionId(form) || 'unknown-form';
      var self = this;
      this.showStatus('🟣 입력값 서버전송 예약', key);
      clearTimeout(this.timers[key]);
      this.timers[key] = setTimeout(function() { self.pushForm(form, 'draft', { reason: reason }); }, c.debounceMs);
    },

    flushVisibleForms: function(keepalive) {
      var self = this;
      Array.prototype.slice.call(document.querySelectorAll('form')).forEach(function(form) {
        if(self.isTrackableForm(form)) self.pushForm(form, 'draft', { keepalive: !!keepalive, quiet: true });
      });
    },

    pushForm: function(form, kind, options) {
      options = options || {};
      if(!this.isTrackableForm(form)) return Promise.resolve();
      var snapshot = snapshotForm(form);
      if(snapshot.fieldCount === 0) return Promise.resolve();
      snapshot.kind = kind || 'draft';
      snapshot.reason = options.reason || '';
      return this.sendPacket({ kind: kind || 'draft', data: snapshot }, options);
    },

    pushBusinessEvent: function(eventName, data, options) {
      options = options || {};
      return this.sendPacket({ kind: 'event', eventName: eventName, data: data || {} }, options);
    },

    sendPacket: function(packet, options) {
      options = options || {};
      var self = this;
      if(global.RemoteDB && RemoteDB.pushClientInput && RemoteDB.hasServerTarget && RemoteDB.hasServerTarget()) {
        var job;
        if(packet.kind === 'event' && RemoteDB.pushEvent) job = RemoteDB.pushEvent(packet.eventName || 'client-event', packet.data, options);
        else job = RemoteDB.pushClientInput(packet.kind, packet.data, options);
        return job.then(function() {
          if(!options.quiet) self.showStatus('🟢 입력값 서버 자동전송 완료', packet.data && packet.data.formId ? packet.data.formId : now().slice(11,19));
        }).catch(function(err) {
          if(cfg().queueWhenOffline) self.queuePacket(packet);
          self.showStatus('🟡 서버전송 대기열 저장', err && err.message ? err.message : '오프라인/연결대기');
        });
      }
      if(cfg().queueWhenOffline) this.queuePacket(packet);
      this.showStatus('💻 서버 설정 전 로컬 대기', 'Firebase 또는 자체 서버 설정 필요');
      return Promise.resolve();
    },

    queuePacket: function(packet) {
      var q = readQueue();
      q.push({ queuedAtLocal: now(), packet: packet });
      writeQueue(q);
    },

    flushQueue: function() {
      var self = this;
      var q = readQueue();
      if(!q.length) return Promise.resolve();
      if(!(global.RemoteDB && RemoteDB.hasServerTarget && RemoteDB.hasServerTarget())) return Promise.resolve();
      var current = q.slice();
      writeQueue([]);
      var chain = Promise.resolve();
      current.forEach(function(item) {
        chain = chain.then(function(){ return self.sendPacket(item.packet, { quiet: true }); });
      });
      return chain.then(function(){ self.showStatus('🟢 대기 입력값 서버 전송 완료', current.length + '건'); }).catch(function(){
        var remain = readQueue().concat(current);
        writeQueue(remain);
      });
    },

    showStatus: function(label, detail) {
      this.lastStatus = label + (detail ? ' · ' + detail : '');
      var panel = document.getElementById('autosend-status');
      if(panel) panel.innerHTML = label + (detail ? '<br><span class="text-slate-500 font-normal">' + String(detail).replace(/[<>&]/g, function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]; }) + '</span>' : '');
    }
  };

  global.ClientAutoSync = ClientAutoSync;
})(window);
