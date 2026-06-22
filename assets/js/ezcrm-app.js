/* EZCRM V36 Secure Direct Edition application logic extracted from ezcrm(1).html */
var Util = {
            getLocalToday: function() { var d = new Date(); var m = '' + (d.getMonth() + 1); var day = '' + d.getDate(); if (m.length < 2) m = '0' + m; if (day.length < 2) day = '0' + day; return [d.getFullYear(), m, day].join('-'); },
            execDaumPostcode: function() { new daum.Postcode({ oncomplete: function(data) { document.getElementById('c-addr1').value = data.address; document.getElementById('c-addr2').focus(); } }).open(); }
        };

        var holidays = { "01-01": "신정", "03-01": "삼일절", "05-05": "어린이날", "06-06": "현충일", "08-15": "광복절", "10-03": "개천절", "10-09": "한글날", "12-25": "성탄절" };
        var currentCal = new Date(); var asFilterId = null; var installFilterId = null; 
        
        var currentTempAsMaterials = []; var currentTempInMaterials = []; 
        var currentTempFiles = { asReqs: [], installs: [], materials: [] };
        
        var trendChartInstance = null; var statusChartInstance = null;
        var currentSigTarget = null; 
        var currentKakaoRec = null; var currentKakaoType = '';

        var DB = {
            key: 'ezcrm_db_v36_secure',
            data: { customers: [], consults: [], asReqs: [], installs: [], materials: [], engineers: [], users: [] },
            sortState: { customers: {k:'', a:true}, materials: {k:'', a:true}, engineers: {k:'', a:true} },
            isApplyingRemote: false,
            lastRemoteMeta: null,

            normalizeData: function(parsed) {
                parsed = parsed || {};
                return {
                    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
                    consults: Array.isArray(parsed.consults) ? parsed.consults : [],
                    asReqs: Array.isArray(parsed.asReqs) ? parsed.asReqs : [],
                    installs: Array.isArray(parsed.installs) ? parsed.installs : [],
                    materials: Array.isArray(parsed.materials) ? parsed.materials : [],
                    engineers: Array.isArray(parsed.engineers) ? parsed.engineers : [],
                    users: Array.isArray(parsed.users) ? parsed.users : []
                };
            },

            ensureDefaultAdmin: function() {
                if(!this.data.users || this.data.users.length === 0) {
                    this.data.users = [{id: "U_ADMIN", loginId: "admin", pw: "admin123", name: "최고관리자", dept: "시스템관리부", role: "관리자"}];
                }
            },

            loadLocal: function() {
                try {
                    var stored = localStorage.getItem(this.key);
                    if(stored) this.data = this.normalizeData(JSON.parse(stored));
                } catch(e) {}
                this.ensureDefaultAdmin();
            },

            saveLocal: function() {
                localStorage.setItem(this.key, JSON.stringify(this.data));
            },

            setSyncStatus: function(label, tone, detail) {
                var badge = document.getElementById('ezcrm-sync-badge');
                if(!badge) {
                    badge = document.createElement('div');
                    badge.id = 'ezcrm-sync-badge';
                    badge.className = 'fixed bottom-3 right-3 z-50 rounded-full px-3 py-2 text-[11px] md:text-xs font-bold shadow-lg border bg-white';
                    document.body.appendChild(badge);
                }
                var cls = 'fixed bottom-3 right-3 z-50 rounded-full px-3 py-2 text-[11px] md:text-xs font-bold shadow-lg border ';
                if(tone === 'online') cls += 'bg-emerald-50 text-emerald-700 border-emerald-200';
                else if(tone === 'syncing') cls += 'bg-sky-50 text-sky-700 border-sky-200';
                else if(tone === 'warning') cls += 'bg-amber-50 text-amber-700 border-amber-200';
                else if(tone === 'error') cls += 'bg-rose-50 text-rose-700 border-rose-200';
                else cls += 'bg-white text-slate-600 border-slate-200';
                badge.className = cls;
                badge.innerHTML = label + (detail ? '<span class="ml-1 font-normal opacity-80">' + detail + '</span>' : '');
                var panel = document.getElementById('online-db-status');
                if(panel) panel.innerHTML = label + (detail ? '<br><span class="text-slate-500 font-normal">' + detail + '</span>' : '');
            },

            initDateDefaults: function() {
                var tdStr = Util.getLocalToday();
                var dtDisp = document.getElementById('today-date-display'); if(dtDisp) dtDisp.innerText = tdStr.replace(/-/g, '. ');
                var asSched = document.getElementById('as-schedule'); if(asSched) asSched.value = tdStr;
                var inSched = document.getElementById('in-schedule'); if(inSched) inSched.value = tdStr;
                var admSched = document.getElementById('adm-schedule'); if(admSched) admSched.value = tdStr;
                var csStart = document.getElementById('chart-start'); if(csStart) { var d1 = new Date(); d1.setMonth(d1.getMonth()-5); csStart.value = d1.getFullYear()+'-'+String(d1.getMonth()+1).padStart(2,'0'); }
                var csEnd = document.getElementById('chart-end'); if(csEnd) { var d2 = new Date(); csEnd.value = d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0'); }
                var dsStart = document.getElementById('dash-start'); if(dsStart) dsStart.value = Util.getLocalToday().substring(0,8)+'01';
                var dsEnd = document.getElementById('dash-end'); if(dsEnd) dsEnd.value = tdStr;
            },

            init: function() {
                this.loadLocal();
                this.initDateDefaults();
                UI.viewMode = { asReqs: 'card', installs: 'card', customers: 'card', consults: 'card', materials: 'card' };
                UI.renderAll();
                this.setSyncStatus('💻 로컬 저장 모드', 'local', 'Firebase 설정 전');

                if(window.RemoteDB && RemoteDB.isEnabled()) {
                    this.setSyncStatus('🔄 온라인 DB 연결 중', 'syncing', 'Firebase Realtime Database');
                    RemoteDB.connect({
                        initialData: this.data,
                        onStatus: function(label, tone, detail){ DB.setSyncStatus(label, tone, detail); },
                        onRemoteData: function(remoteData, meta){ DB.applyRemoteData(remoteData, meta); }
                    });
                }
            },

            applyRemoteData: function(remoteData, meta) {
                this.isApplyingRemote = true;
                this.data = this.normalizeData(remoteData);
                this.ensureDefaultAdmin();
                this.lastRemoteMeta = meta || null;
                try { this.saveLocal(); } catch(e) {}
                UI.renderAll();
                this.isApplyingRemote = false;
            },

            save: function() {
                try {
                    this.ensureDefaultAdmin();
                    this.saveLocal();
                    UI.renderAll();
                    if(!this.isApplyingRemote && window.RemoteDB && RemoteDB.isReady()) {
                        this.setSyncStatus('🔄 온라인 DB 저장 중', 'syncing', '변경사항 업로드');
                        RemoteDB.save(this.data).catch(function(err){
                            DB.setSyncStatus('⚠️ 온라인 저장 실패', 'error', (err && err.message) ? err.message : '권한/설정 확인');
                        });
                    }
                } catch(e) { alert('저장 실패! 사진 용량이 초과되었습니다.'); }
            },

            forceOnlineSave: function() {
                if(!(window.RemoteDB && RemoteDB.isReady())) return alert('온라인 DB가 아직 연결되지 않았습니다. assets/js/firebase-config.js 설정을 확인하세요.');
                RemoteDB.save(this.data).then(function(){ alert('현재 브라우저 데이터를 온라인 JSON DB에 업로드했습니다.'); }).catch(function(err){ alert('온라인 업로드 실패: ' + (err && err.message ? err.message : err)); });
            },

            forceOnlineReload: function() {
                if(!(window.RemoteDB && RemoteDB.isReady())) return alert('온라인 DB가 아직 연결되지 않았습니다.');
                RemoteDB.fetchOnce().then(function(remote){ if(remote) DB.applyRemoteData(remote.payload || remote, remote.meta || null); alert('온라인 JSON DB에서 다시 불러왔습니다.'); }).catch(function(err){ alert('온라인 불러오기 실패: ' + (err && err.message ? err.message : err)); });
            },
            insert: function(table, record) { record.id = table + "_" + Date.now() + Math.floor(Math.random()*1000); record.date = Util.getLocalToday(); this.data[table].unshift(record); this.save(); },
            insertNoRender: function(table, record) { record.id = table + "_" + Date.now() + Math.floor(Math.random()*10000); record.date = Util.getLocalToday(); this.data[table].unshift(record); },
            update: function(table, id, updatedRecord) { var index = this.data[table].findIndex(function(row) { return row.id === id; }); if(index !== -1) { for(var key in updatedRecord) { this.data[table][index][key] = updatedRecord[key]; } this.save(); } },
            remove: function(table, id) { if(confirm('삭제하시겠습니까?')) { this.data[table] = this.data[table].filter(function(row) { return row.id !== id; }); this.save(); } },
            
            toggleAsStatus: function(id) { var row = this.data.asReqs.find(function(r) { return r.id === id; }); if(row) { var s = ['접수완료', '처리중', '미완료', '재방문', '완료']; row.status = s[(s.indexOf(row.status) + 1) % s.length]; this.save(); } },
            toggleInstallStatus: function(id) { var row = this.data.installs.find(function(r) { return r.id === id; }); if(row) { var s = ['접수대기', '자재준비', '배정완료', '설치진행', '설치완료']; row.status = s[(s.indexOf(row.status) + 1) % s.length]; this.save(); } },
            
            toggleSettlement: function(table, id) { 
                var row = this.data[table].find(function(r) { return r.id === id; }); 
                if(row) { row.settlementStatus = (row.settlementStatus === '정산완료') ? '정산대기' : '정산완료'; this.save(); } 
            },

            sort: function(table, key) { var asc = this.sortState[table].k === key ? !this.sortState[table].a : true; this.sortState[table] = { k: key, a: asc }; this.data[table].sort(function(a, b) { var valA = a[key] || ''; var valB = b[key] || ''; if(valA < valB) return asc ? -1 : 1; if(valA > valB) return asc ? 1 : -1; return 0; }); UI.renderAll(); },
            
            updateInventory: function(oldMats, newMats) {
                if(oldMats) { 
                    oldMats.forEach(function(m){ 
                        if(m.status === '사용' || !m.status) { var dbm = DB.data.materials.find(function(x){return x.name===m.name;}); if(dbm) dbm.qty = parseInt(dbm.qty) + parseInt(m.qty); }
                        if(m.status === '반납') { var dbm = DB.data.materials.find(function(x){return x.name===m.name;}); if(dbm) dbm.qty = parseInt(dbm.qty) - parseInt(m.qty); }
                    }); 
                }
                if(newMats) { 
                    newMats.forEach(function(m){ 
                        if(m.status === '사용' || !m.status) { var dbm = DB.data.materials.find(function(x){return x.name===m.name;}); if(dbm) dbm.qty = parseInt(dbm.qty) - parseInt(m.qty); }
                        if(m.status === '반납') { var dbm = DB.data.materials.find(function(x){return x.name===m.name;}); if(dbm) dbm.qty = parseInt(dbm.qty) + parseInt(m.qty); }
                    }); 
                }
            },

            importCSV: function() {
                var fInput = document.getElementById('csv-file'); if(!fInput.files[0]) return alert('파일을 선택해주세요.');
                var tTable = document.getElementById('csv-target').value; var reader = new FileReader();
                reader.onload = function(e) {
                    var lines = e.target.result.split('\n'); var cnt = 0;
                    for(var i=1; i<lines.length; i++) {
                        var row = lines[i].split(','); if(row.length < 2 || !row[0].trim()) continue;
                        if(tTable === 'customers') { DB.insertNoRender('customers', { name: row[0].trim(), pic: '', tel: (row[1] || '').trim(), addr1: (row[2] || '').trim(), addr2: '', memo: '' }); cnt++; } 
                        else if (tTable === 'materials') { DB.insertNoRender('materials', { name: row[0].trim(), code: (row[1] || '').trim(), qty: parseInt(row[2])||0, price: parseInt(row[3])||0, memo: '' }); cnt++; }
                    }
                    DB.save(); alert(cnt + '건 등록 완료!'); fInput.value = '';
                };
                reader.readAsText(fInput.files[0], "euc-kr"); 
            },
            exportBackup: function() { var dl = document.createElement('a'); dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.data))); dl.setAttribute("download", "EZCRM_DB_" + Util.getLocalToday() + ".json"); document.body.appendChild(dl); dl.click(); dl.remove(); },
            importBackup: function() { 
                var fInput = document.getElementById('backup-file'); if(!fInput.files.length) return; 
                if(confirm('기존 데이터를 덮어씌웁니다. 진행하시겠습니까?')) { 
                    var reader = new FileReader(); 
                    reader.onload = function(e) { 
                        try { DB.data = JSON.parse(e.target.result); DB.save(); alert('복원 완료!'); fInput.value = ''; UI.switchTab('dashboard'); } catch(err) { alert('에러 발생!'); } 
                    }; 
                    reader.readAsText(fInput.files[0]); 
                } 
            }
        };

        var UI = {
            editingState: { customers: null, consults: null, asReqs: null, installs: null, materials: null, engineers: null },

            toggleSidebar: function() { var sb = document.getElementById('sidebar'); var ov = document.getElementById('sidebar-overlay'); sb.classList.toggle('-translate-x-full'); ov.classList.toggle('hidden'); },

            setViewMode: function(table, mode) {
                this.viewMode[table] = mode;
                var prefix = table === 'asReqs' ? 'as' : (table === 'installs' ? 'in' : (table === 'customers' ? 'cu' : (table === 'consults' ? 'cs' : 'ma')));
                var btnCard = document.getElementById('view-' + prefix + '-card'); var btnList = document.getElementById('view-' + prefix + '-list');
                if(mode === 'list') { if(btnCard) btnCard.className = "px-2 py-1 text-[10px] md:text-xs font-bold rounded text-slate-500 border hover:bg-white"; if(btnList) btnList.className = "px-2 py-1 text-[10px] md:text-xs font-bold rounded bg-white border shadow-sm text-slate-800"; } 
                else { if(btnCard) btnCard.className = "px-2 py-1 text-[10px] md:text-xs font-bold rounded bg-white border shadow-sm text-slate-800"; if(btnList) btnList.className = "px-2 py-1 text-[10px] md:text-xs font-bold rounded text-slate-500 border hover:bg-white"; }
                
                if(table === 'asReqs') this.renderAS(); 
                else if(table === 'installs') this.renderInstalls();
                else if(table === 'customers') this.renderCustomers();
                else if(table === 'consults') this.renderConsults();
                else if(table === 'materials') this.renderMaterials();
            },

            switchTab: function(tabId) {
                document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
                document.querySelectorAll('.nav-item').forEach(function(el) { el.classList.remove('active'); });
                var tTab = document.getElementById('tab-' + tabId); var tNav = document.getElementById('nav-' + tabId);
                if(tTab) tTab.classList.add('active'); if(tNav) tNav.classList.add('active');
                
                var sb = document.getElementById('sidebar'); if(window.innerWidth < 768 && !sb.classList.contains('-translate-x-full')) { this.toggleSidebar(); }
                var main = document.getElementById('main-content'); if(main) main.scrollTop = 0;
                
                if(tabId === 'dashboard') { setTimeout(function(){ UI.renderCharts(); }, 100); }
                if(tabId === 'settlement') { this.renderSettlement(); }
                if(tabId === 'schedule') { this.renderScheduleDashboard(); }
            },

            renderAll: function() {
                var fns = ['updateSelectBoxes', 'renderCustomers', 'renderConsults', 'renderAS', 'renderInstalls', 'renderMaterials', 'renderEngineers', 'renderUsers', 'renderDashboard', 'renderCalendar', 'renderSettlement', 'renderScheduleDashboard'];
                for(var i=0; i<fns.length; i++) {
                    try { if(typeof this[fns[i]] === 'function') this[fns[i]](); } catch(e) { console.error('Error in ' + fns[i], e); }
                }
                try { this.renderFilePreviews('asReqs'); this.renderFilePreviews('installs'); this.renderFilePreviews('materials'); this.renderCharts(); } catch(e) {}
            },

            lbl: function(text) { return '<span class="md:hidden text-[10px] font-bold text-sky-500 block mb-0.5 border-b border-slate-100 pb-0.5">' + text + '</span>'; },
            trClass: "flex flex-col md:grid md:grid-cols-12 border border-slate-200 md:border-none md:border-b md:border-slate-100 rounded-xl md:rounded-none mb-3 md:mb-0 shadow-sm md:shadow-none bg-white transition hover:bg-slate-50",
            tdClass: "p-2.5 md:p-3 border-b border-slate-100 md:border-none text-xs md:text-sm flex flex-col justify-center overflow-hidden",

            updateSelectBoxes: function() {
                var cOpts = DB.data.customers.map(function(c) { return '<option value="'+c.name+'">'; }).join(''); var cDl = document.getElementById('dl-customers'); if(cDl) cDl.innerHTML = cOpts;
                var eOpts = DB.data.engineers.map(function(e) { return '<option value="'+e.name+'">'; }).join(''); var eDl = document.getElementById('dl-engineers'); if(eDl) eDl.innerHTML = eOpts;
                var mOpts = DB.data.materials.map(function(m) { return '<option value="'+m.name+'">'; }).join(''); var mDl = document.getElementById('dl-materials'); if(mDl) mDl.innerHTML = mOpts;
                
                var wFilter = document.getElementById('cal-filter-worker');
                if(wFilter) { var curW = wFilter.value; wFilter.innerHTML = '<option value="">전체 담당자 보기</option>' + DB.data.engineers.map(function(e) { return '<option value="'+e.name+'">'+e.name+'</option>'; }).join(''); wFilter.value = curW; }
                
                var sFilter = document.getElementById('settle-filter-worker');
                if(sFilter) { var curS = sFilter.value; sFilter.innerHTML = '<option value="">전체 대리점/담당자</option>' + DB.data.engineers.map(function(e) { return '<option value="'+e.name+'">'+e.name+'</option>'; }).join(''); sFilter.value = curS; }
            },

            showCustInfo: function(targetPrefix) {
                var cName = document.getElementById(targetPrefix + '-cust').value; var infoBox = document.getElementById(targetPrefix + '-cust-info'); if(!infoBox) return;
                var c = DB.data.customers.find(function(x){return x.name === cName;});
                if(c) { infoBox.innerHTML = '담당: ' + (c.pic||'-') + ' / ☎ ' + c.tel + '<br>' + (c.addr1||'') + ' ' + (c.addr2||''); infoBox.classList.remove('hidden'); } else { infoBox.classList.add('hidden'); }
            },

            addAsMaterial: function() {
                var matName = document.getElementById('as-mat-select').value; var matQty = document.getElementById('as-mat-qty').value; var matSt = document.getElementById('as-mat-status').value;
                if(!matName) return alert('자재를 선택해주세요.');
                var existing = currentTempAsMaterials.find(function(m) { return m.name === matName && m.status === matSt; });
                if(existing) { existing.qty = parseInt(existing.qty) + parseInt(matQty || 1); } else { currentTempAsMaterials.push({ name: matName, qty: parseInt(matQty || 1), status: matSt }); }
                document.getElementById('as-mat-qty').value = 1; document.getElementById('as-mat-select').value = ''; this.renderAsMaterials();
            },
            removeAsMaterial: function(index) { currentTempAsMaterials.splice(index, 1); this.renderAsMaterials(); },
            renderAsMaterials: function() {
                var listEl = document.getElementById('as-mat-list'); if(!listEl) return;
                if(currentTempAsMaterials.length === 0) { listEl.innerHTML = '<li class="text-slate-400 p-1 text-center text-[10px]">추가된 자재가 없습니다.</li>'; } 
                else { listEl.innerHTML = currentTempAsMaterials.map(function(m, idx) { 
                    var c = m.status==='사용'?'text-amber-700':m.status==='반납'?'text-blue-600':'text-slate-500';
                    return '<li class="flex justify-between items-center p-1 border-b"><span class="font-bold text-xs ' + c + '">[' + m.status + '] ' + m.name + ' <span class="font-normal">x ' + m.qty + '개</span></span> <button type="button" onclick="UI.removeAsMaterial(' + idx + ')" class="text-red-400 hover:text-red-600 text-xs font-bold border px-1 rounded">X</button></li>'; 
                }).join(''); }
            },

            addInMaterial: function() {
                var matName = document.getElementById('in-mat-select').value; var matQty = document.getElementById('in-mat-qty').value;
                if(!matName) return alert('설치 제품/자재를 선택해주세요.');
                var existing = currentTempInMaterials.find(function(m) { return m.name === matName; });
                if(existing) { existing.qty = parseInt(existing.qty) + parseInt(matQty || 1); } else { currentTempInMaterials.push({ name: matName, qty: parseInt(matQty || 1), status: '사용' }); }
                document.getElementById('in-mat-qty').value = 1; document.getElementById('in-mat-select').value = ''; this.renderInMaterials();
            },
            removeInMaterial: function(index) { currentTempInMaterials.splice(index, 1); this.renderInMaterials(); },
            renderInMaterials: function() {
                var listEl = document.getElementById('in-mat-list'); if(!listEl) return;
                if(currentTempInMaterials.length === 0) { listEl.innerHTML = '<li class="text-slate-400 p-1 text-center text-[10px]">등록된 설치 품목이 없습니다.</li>'; } 
                else { listEl.innerHTML = currentTempInMaterials.map(function(m, idx) { return '<li class="flex justify-between items-center p-1 border-b"><span class="font-bold text-sky-700 text-xs">' + m.name + ' <span class="text-slate-500 font-normal">x ' + m.qty + '개</span></span> <button type="button" onclick="UI.removeInMaterial(' + idx + ')" class="text-red-400 hover:text-red-600 text-xs font-bold border px-1 rounded">X</button></li>'; }).join(''); }
            },

            renderFilePreviews: function(table) {
                var prefix = table === 'asReqs' ? 'as' : (table === 'installs' ? 'in' : 'm'); var el = document.getElementById(prefix + '-file-previews'); if(!el) return;
                el.innerHTML = currentTempFiles[table].map(function(f, idx) { return '<div class="relative inline-block"><img src="'+f+'" class="img-thumb h-8 w-10 md:h-12 md:w-16 object-cover"><button type="button" onclick="UI.removeTempFile(\''+table+'\', '+idx+')" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold shadow">X</button></div>'; }).join('');
            },
            removeTempFile: function(table, idx) { currentTempFiles[table].splice(idx, 1); this.renderFilePreviews(table); },

            // 카카오톡 팝업
            openKakaoModal: function(table, id) {
                currentKakaoRec = DB.data[table].find(function(r){ return r.id === id; }); currentKakaoType = table === 'asReqs' ? 'A/S' : '제품 납품/설치';
                if(!currentKakaoRec) return; document.getElementById('modal-kakao').classList.remove('hidden');
                document.querySelectorAll('.k-target').forEach(function(r) { r.onchange = function() { UI.updateKakaoPreview(); }; });
                document.getElementById('k-sales-name').oninput = function() { UI.updateKakaoPreview(); };
                this.updateKakaoPreview();
            },
            updateKakaoPreview: function() {
                var r = currentKakaoRec; var tg = []; document.querySelectorAll('.k-target:checked').forEach(function(chk){ tg.push(chk.value); });
                var msg = '[EZCRM 업무알림]\n\n' + r.custName + ' 고객님의 ' + currentKakaoType + ' 건이 [' + r.status + '] 처리되었습니다.\n- 일정: ' + (r.scheduleDate || r.date) + '\n- 담당: ' + (r.worker || '미정');
                if(tg.includes('customer')) msg += '\n\n이용해 주셔서 감사합니다.'; else if(tg.length > 0) msg += '\n\n확인 바랍니다.';
                document.getElementById('kakao-msg-preview').value = msg;
            },
            closeKakaoModal: function() { document.getElementById('modal-kakao').classList.add('hidden'); },
            sendKakao: function() {
                var tg = []; document.querySelectorAll('.k-target:checked').forEach(function(chk){ 
                    if(chk.value === 'sales') { var sn = document.getElementById('k-sales-name').value; if(sn) tg.push(sn + ' 영업사원'); }
                    else if(chk.value === 'customer') tg.push(currentKakaoRec.custName + ' 담당자');
                    else if(chk.value === 'worker') tg.push((currentKakaoRec.worker||'엔지니어'));
                });
                if(tg.length === 0) return alert('수신 대상을 선택하세요.');
                alert('['+tg.join(', ')+'] 에게 알림톡 전송(시뮬레이션).\n\n[내용]\n' + document.getElementById('kakao-msg-preview').value);
                this.closeKakaoModal();
            },

            openSignatureModal: function(targetTable) {
                currentSigTarget = targetTable === 'asReqs' ? 'as' : 'in'; document.getElementById('modal-signature').classList.remove('hidden');
                var canvas = document.getElementById('modal-canvas'); canvas.width = canvas.parentElement.clientWidth - 32; 
                var ctx = canvas.getContext('2d'); var drawing = false; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#334155'; ctx.clearRect(0,0,canvas.width,canvas.height);

                var newCanvas = canvas.cloneNode(true); canvas.parentNode.replaceChild(newCanvas, canvas); canvas = newCanvas;
                ctx = canvas.getContext('2d'); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#334155';

                function getPos(e) { var rect = canvas.getBoundingClientRect(); var cX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0); var cY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0); return { x: (cX - rect.left) * (canvas.width / rect.width), y: (cY - rect.top) * (canvas.height / rect.height) }; }
                function start(e) { var pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); e.preventDefault(); canvas.dataset.drawing = 'true'; }
                function draw(e) { if(canvas.dataset.drawing === 'true') { var pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); } e.preventDefault(); }
                function stop(e) { canvas.dataset.drawing = 'false'; }
                canvas.addEventListener('mousedown', start, {passive:false}); canvas.addEventListener('mousemove', draw, {passive:false}); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseout', stop);
                canvas.addEventListener('touchstart', start, {passive:false}); canvas.addEventListener('touchmove', draw, {passive:false}); canvas.addEventListener('touchend', stop);
            },
            closeSignatureModal: function() { document.getElementById('modal-signature').classList.add('hidden'); },
            clearModalSignature: function() { var canvas = document.getElementById('modal-canvas'); canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); },
            confirmSignatureModal: function() {
                var canvas = document.getElementById('modal-canvas'); var dataUrl = canvas.toDataURL('image/png');
                if(dataUrl.length < 1500) { alert('서명을 캔버스에 먼저 입력해주세요.'); return; }
                document.getElementById(currentSigTarget + '-signature-data').value = dataUrl;
                var preview = document.getElementById(currentSigTarget + '-sig-preview'); preview.src = dataUrl; preview.classList.remove('hidden');
                document.getElementById(currentSigTarget + '-sig-placeholder').classList.add('hidden'); this.closeSignatureModal();
            },
            clearFormSignature: function(prefix) { var dt = document.getElementById(prefix + '-signature-data'); if(dt) dt.value = ''; var pv = document.getElementById(prefix + '-sig-preview'); if(pv) { pv.src = ''; pv.classList.add('hidden'); } var pl = document.getElementById(prefix + '-sig-placeholder'); if(pl) pl.classList.remove('hidden'); },
            loadSignatureData: function(canvasId, dataUrl, dataId, lockId) { var canvas = document.getElementById(canvasId); if(!canvas || !dataUrl) return; var ctx = canvas.getContext('2d'); var img = new Image(); img.onload = function() { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }; img.src = dataUrl; if(document.getElementById(dataId)) document.getElementById(dataId).value = dataUrl; var lock = document.getElementById(lockId); if(lock) lock.classList.remove('hidden'); },

            openViewer: function(src) { var v = document.getElementById('modal-viewer'); var img = document.getElementById('viewer-img'); img.src = src; v.classList.remove('hidden'); },
            closeViewer: function() { document.getElementById('modal-viewer').classList.add('hidden'); },

            startEdit: function(table, id) {
                this.editingState[table] = id; var record = DB.data[table].find(function(r) { return r.id === id; }); if(!record) return;
                
                if(table === 'asReqs') {
                    document.getElementById('as-urgent').checked = record.isUrgent || false;
                    document.getElementById('as-cust').value = record.custName; document.getElementById('as-type').value = record.type; document.getElementById('as-worker').value = record.worker; document.getElementById('as-schedule').value = record.scheduleDate; document.getElementById('as-content').value = record.content; document.getElementById('as-process-detail').value = record.processDetail || ''; document.getElementById('as-memo').value = record.memo || ''; document.getElementById('as-status').value = record.status; 
                    var ct = document.getElementById('as-cost-type'); if(ct) ct.value = record.costType || '무상';
                    document.getElementById('as-labor-cost').value = record.laborCost || 0; document.getElementById('as-other-cost').value = record.otherCost || 0;
                    currentTempFiles['asReqs'] = record.attachedFiles || (record.attachedFile ? [record.attachedFile] : []); this.renderFilePreviews('asReqs');
                    currentTempAsMaterials = record.usedMaterials ? JSON.parse(JSON.stringify(record.usedMaterials)) : []; this.renderAsMaterials();
                    this.clearFormSignature('as'); if(record.signature) { document.getElementById('as-signature-data').value = record.signature; document.getElementById('as-sig-preview').src = record.signature; document.getElementById('as-sig-preview').classList.remove('hidden'); document.getElementById('as-sig-placeholder').classList.add('hidden'); }
                    this.showCustInfo('as');
                } else if(table === 'installs') {
                    document.getElementById('in-urgent').checked = record.isUrgent || false;
                    document.getElementById('in-cust').value = record.custName; document.getElementById('in-worker').value = record.worker; document.getElementById('in-schedule').value = record.scheduleDate; document.getElementById('in-memo').value = record.memo || ''; document.getElementById('in-status').value = record.status;
                    document.getElementById('in-labor-cost').value = record.laborCost || 0; document.getElementById('in-other-cost').value = record.otherCost || 0;
                    if(record.usedMaterials && record.usedMaterials.length > 0) { currentTempInMaterials = JSON.parse(JSON.stringify(record.usedMaterials)); } else if (record.matName) { currentTempInMaterials = [{name: record.matName, qty: record.qty, status:'사용'}]; } else { currentTempInMaterials = []; }
                    this.renderInMaterials();
                    currentTempFiles['installs'] = record.attachedFiles || []; this.renderFilePreviews('installs');
                    this.clearFormSignature('in'); if(record.signature) { document.getElementById('in-signature-data').value = record.signature; document.getElementById('in-sig-preview').src = record.signature; document.getElementById('in-sig-preview').classList.remove('hidden'); document.getElementById('in-sig-placeholder').classList.add('hidden'); }
                    this.showCustInfo('in');
                } else if(table === 'customers') { document.getElementById('c-name').value = record.name; document.getElementById('c-pic').value = record.pic||''; document.getElementById('c-tel').value = record.tel; document.getElementById('c-addr1').value = record.addr1||''; document.getElementById('c-addr2').value = record.addr2||''; document.getElementById('c-memo').value = record.memo || ''; } 
                else if(table === 'materials') { document.getElementById('m-name').value = record.name; document.getElementById('m-code').value = record.code; document.getElementById('m-qty').value = record.qty; document.getElementById('m-price').value = record.price; document.getElementById('m-memo').value = record.memo || ''; currentTempFiles['materials'] = record.attachedFiles || []; this.renderFilePreviews('materials'); } 
                else if(table === 'engineers') { document.getElementById('e-affil').value = record.affil || '본사'; document.getElementById('e-name').value = record.name; document.getElementById('e-dept').value = record.dept; document.getElementById('e-tel').value = record.tel; document.getElementById('e-memo').value = record.memo || ''; }
                else if(table === 'consults') { document.getElementById('cs-cust').value = record.custName; document.getElementById('cs-type').value = record.type; document.getElementById('cs-worker').value = record.worker || ''; document.getElementById('cs-content').value = record.content; document.getElementById('cs-memo').value = record.memo || ''; }

                var btn = document.getElementById('btn-submit-' + table); if(btn) { btn.innerText = "수정 완료"; btn.classList.add('ring-4', 'ring-opacity-50'); }
                var cBtn = document.getElementById('btn-cancel-' + table); if(cBtn) cBtn.classList.remove('hidden');
                var main = document.getElementById('main-content'); if(main) main.scrollTo({top: 0, behavior: 'smooth'});
            },

            cancelEdit: function(table) {
                this.editingState[table] = null;
                var formEl = document.getElementById('form-' + (table==='asReqs'?'as':(table==='installs'?'install':(table==='materials'?'material':table.slice(0,-1))))); if(formEl) formEl.reset();

                if(table === 'asReqs') { document.getElementById('as-urgent').checked = false; document.getElementById('as-schedule').value = Util.getLocalToday(); currentTempAsMaterials = []; this.renderAsMaterials(); currentTempFiles['asReqs'] = []; this.renderFilePreviews('asReqs'); this.clearFormSignature('as'); document.getElementById('as-cust-info').classList.add('hidden'); var ct = document.getElementById('as-cost-type'); if(ct) ct.value = '무상'; document.getElementById('as-labor-cost').value=0; document.getElementById('as-other-cost').value=0; } 
                else if (table === 'installs') { document.getElementById('in-urgent').checked = false; document.getElementById('in-schedule').value = Util.getLocalToday(); currentTempInMaterials = []; this.renderInMaterials(); currentTempFiles['installs'] = []; this.renderFilePreviews('installs'); this.clearFormSignature('in'); document.getElementById('in-cust-info').classList.add('hidden'); document.getElementById('in-labor-cost').value=0; document.getElementById('in-other-cost').value=0;}
                else if (table === 'materials') { currentTempFiles['materials'] = []; this.renderFilePreviews('materials'); }
                else if (table === 'engineers') { document.getElementById('e-affil').value = '본사'; }

                var btnText = "저장";
                if(table==='customers') btnText="저장"; if(table==='asReqs') btnText="A/S 데이터 저장"; if(table==='installs') btnText="설치 일정 저장"; if(table==='materials') btnText="품목 저장"; if(table==='engineers') btnText="저장"; if(table==='consults') btnText="저장";
                
                var btn = document.getElementById('btn-submit-' + table); if(btn) { btn.innerText = btnText; btn.classList.remove('ring-4', 'ring-opacity-50'); }
                var cBtn = document.getElementById('btn-cancel-' + table); if(cBtn) cBtn.classList.add('hidden');
            },

            clearAsFilter: function() { asFilterId = null; var s=document.getElementById('search-as'); if(s) s.value = ''; this.renderAS(); var b=document.getElementById('btn-clear-as-filter'); if(b) b.classList.add('hidden'); },
            clearInstallFilter: function() { installFilterId = null; var s=document.getElementById('search-in'); if(s) s.value = ''; this.renderInstalls(); var b=document.getElementById('btn-clear-in-filter'); if(b) b.classList.add('hidden'); },
            
            changeMonth: function(offset) { currentCal.setMonth(currentCal.getMonth() + offset); this.renderCalendar(); },
            goToday: function() { currentCal = new Date(); this.renderCalendar(); },
            renderCalendar: function() {
                var el = document.getElementById('calendar-grid'); if(!el) return;
                var year = currentCal.getFullYear(); var month = currentCal.getMonth();
                var myEl = document.getElementById('cal-month-year'); if(myEl) myEl.innerText = year + '.' + String(month + 1).padStart(2,'0');
                var firstDayIndex = new Date(year, month, 1).getDay(); var lastDay = new Date(year, month + 1, 0).getDate();
                
                var filterWorker = document.getElementById('cal-filter-worker'); var workerName = filterWorker ? filterWorker.value : '';

                var asByDate = {}; var inByDate = {};
                DB.data.asReqs.forEach(function(a) { if(workerName && a.worker !== workerName) return; var d = a.scheduleDate || a.date || ''; if(!asByDate[d]) asByDate[d] = []; asByDate[d].push(a); });
                DB.data.installs.forEach(function(a) { if(workerName && a.worker !== workerName) return; var d = a.scheduleDate || a.date || ''; if(!inByDate[d]) inByDate[d] = []; inByDate[d].push(a); });

                var html = ''; var dayCount = 1; var localTodayStr = Util.getLocalToday(); 

                for (var i = 0; i < 6; i++) {
                    html += '<div class="cal-row">';
                    for (var j = 0; j < 7; j++) {
                        if (i === 0 && j < firstDayIndex) { html += '<div class="cal-cell bg-slate-50"></div>'; } 
                        else if (dayCount > lastDay) { html += '<div class="cal-cell bg-slate-50"></div>'; } 
                        else {
                            var mStr = (month+1 < 10) ? '0'+(month+1) : (month+1); var dStr = (dayCount < 10) ? '0'+dayCount : dayCount;
                            var cellDateStr = year + '-' + mStr + '-' + dStr; var isToday = (cellDateStr === localTodayStr);
                            var mdStr = mStr + '-' + dStr; var holiName = holidays[mdStr];
                            
                            var dayHighlight = isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center font-bold shadow-md text-[10px] md:text-xs' : 'text-slate-600 font-bold text-[10px] md:text-xs';
                            if(!isToday && j === 0) dayHighlight = 'text-rose-500 font-bold text-[10px] md:text-xs'; 
                            if(!isToday && j === 6) dayHighlight = 'text-blue-500 font-bold text-[10px] md:text-xs';
                            if(!isToday && holiName) dayHighlight = 'text-red-500 font-bold text-[10px] md:text-xs'; 

                            var holiText = holiName ? '<span class="text-[8px] md:text-[10px] text-red-500 truncate max-w-[60%]">' + holiName + '</span>' : '';

                            var taskHtml = '';
                            var dailyAS = asByDate[cellDateStr] || [];
                            taskHtml += dailyAS.map(function(t) {
                                var bgClass = t.status === '완료' ? 'bg-slate-200 text-slate-700 opacity-60 line-through border-slate-300' : t.status === '재방문' ? 'bg-rose-200 text-rose-800' : t.status === '미완료' ? 'bg-red-200 text-red-900' : t.status === '처리중' ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600';
                                var urgentClass = t.isUrgent ? 'urgent-red' : '';
                                return '<div onclick="asFilterId=\'' + t.id + '\'; UI.switchTab(\'as\'); UI.startEdit(\'asReqs\', \'' + t.id + '\'); document.getElementById(\'btn-clear-as-filter\').classList.remove(\'hidden\');" class="schedule-badge ' + bgClass + ' ' + urgentClass + '" title="A/S: ' + t.content + '"><span class="font-bold">' + (t.worker||'') + '</span> ' + (t.custName||'') + '</div>';
                            }).join('');

                            var dailyInstalls = inByDate[cellDateStr] || [];
                            taskHtml += dailyInstalls.map(function(t) {
                                var bgClass = t.status === '설치완료' ? 'bg-teal-100 text-teal-800 opacity-70 border-teal-300' : t.status === '설치진행' ? 'bg-blue-200 text-blue-800' : t.status === '배정완료' ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600';
                                var urgentClass = t.isUrgent ? 'urgent-blue' : '';
                                return '<div onclick="installFilterId=\'' + t.id + '\'; UI.switchTab(\'install\'); UI.startEdit(\'installs\', \'' + t.id + '\'); document.getElementById(\'btn-clear-in-filter\').classList.remove(\'hidden\');" class="schedule-badge ' + bgClass + ' ' + urgentClass + '" title="설치"><span class="font-bold">' + (t.worker||'') + '</span> ' + (t.custName||'') + '</div>';
                            }).join('');

                            html += '<div class="cal-cell"><div class="mb-1 flex justify-between items-center px-1"><div class="' + dayHighlight + '">' + dayCount + '</div>' + holiText + '</div><div class="flex-1 overflow-y-auto flex flex-col gap-0.5">' + taskHtml + '</div></div>';
                            dayCount++;
                        }
                    }
                    html += '</div>';
                    if (dayCount > lastDay) break;
                }
                el.innerHTML = html;
                this.renderScheduleDashboard();
            },

            renderScheduleDashboard: function() {
                var sInput = document.getElementById('dash-start'); if(!sInput) return;
                var eInput = document.getElementById('dash-end'); if(!eInput) return;
                if(!sInput.value || !eInput.value) return;

                var startStr = sInput.value.replace(/-/g, ''); var endStr = eInput.value.replace(/-/g, '');
                if(startStr > endStr) { var tmp = startStr; startStr = endStr; endStr = tmp; }

                var regionStats = {}; var workerStats = {};

                function getRegion(addr) {
                    if(!addr) return '기타'; var a = addr.split(' ')[0];
                    if(a.includes('서울')) return '서울'; if(a.includes('부산')) return '부산'; if(a.includes('대구')) return '대구';
                    if(a.includes('인천')) return '인천'; if(a.includes('광주')) return '광주'; if(a.includes('대전')) return '대전';
                    if(a.includes('울산')) return '울산'; if(a.includes('세종')) return '세종'; if(a.includes('경기')) return '경기';
                    if(a.includes('강원')) return '강원'; if(a.includes('충북')) return '충북'; if(a.includes('충남')) return '충남';
                    if(a.includes('전북')) return '전북'; if(a.includes('전남')) return '전남'; if(a.includes('경북')) return '경북';
                    if(a.includes('경남')) return '경남'; if(a.includes('제주')) return '제주';
                    return '기타';
                }

                function getCustAddr(cname) { var c = DB.data.customers.find(function(x){return x.name===cname}); return c ? c.addr1 : ''; }
                function initStats(obj, key) { if(!obj[key]) obj[key] = { asActive:0, asDone:0, inActive:0, inDone:0 }; }

                DB.data.asReqs.forEach(function(a) {
                    var d = (a.scheduleDate || a.date).replace(/-/g, '');
                    if(d >= startStr && d <= endStr) {
                        var r = getRegion(getCustAddr(a.custName)); var w = a.worker || '미지정';
                        initStats(regionStats, r); initStats(workerStats, w);
                        if(a.status === '완료') { regionStats[r].asDone++; workerStats[w].asDone++; }
                        else { regionStats[r].asActive++; workerStats[w].asActive++; }
                    }
                });

                DB.data.installs.forEach(function(a) {
                    var d = (a.scheduleDate || a.date).replace(/-/g, '');
                    if(d >= startStr && d <= endStr) {
                        var r = getRegion(getCustAddr(a.custName)); var w = a.worker || '미지정';
                        initStats(regionStats, r); initStats(workerStats, w);
                        if(a.status === '설치완료') { regionStats[r].inDone++; workerStats[w].inDone++; }
                        else { regionStats[r].inActive++; workerStats[w].inActive++; }
                    }
                });

                var rEl = document.getElementById('dash-region-list'); var wEl = document.getElementById('dash-worker-list');
                var rHtml = '';
                for(var r in regionStats) { var d = regionStats[r]; var tot = d.asActive+d.asDone+d.inActive+d.inDone; rHtml += '<tr class="hover:bg-slate-50"><td class="p-1.5 font-bold">' + r + '</td><td class="p-1.5 text-center text-red-600">' + d.asActive + ' / ' + d.asDone + '</td><td class="p-1.5 text-center text-blue-600">' + d.inActive + ' / ' + d.inDone + '</td><td class="p-1.5 text-center font-bold text-slate-700">' + tot + '</td></tr>'; }
                if(rEl) rEl.innerHTML = rHtml || '<tr><td colspan="4" class="p-3 text-center text-slate-400">데이터가 없습니다.</td></tr>';

                var wHtml = '';
                for(var w in workerStats) { var d = workerStats[w]; var tot = d.asActive+d.asDone+d.inActive+d.inDone; wHtml += '<tr class="hover:bg-slate-50"><td class="p-1.5 font-bold">' + w + '</td><td class="p-1.5 text-center text-red-600">' + d.asActive + ' / ' + d.asDone + '</td><td class="p-1.5 text-center text-blue-600">' + d.inActive + ' / ' + d.inDone + '</td><td class="p-1.5 text-center font-bold text-slate-700">' + tot + '</td></tr>'; }
                if(wEl) wEl.innerHTML = wHtml || '<tr><td colspan="4" class="p-3 text-center text-slate-400">데이터가 없습니다.</td></tr>';
            },

            resetChartDates: function() {
                var d = new Date(); var d2 = new Date(); d2.setMonth(d2.getMonth()-5);
                var s = document.getElementById('chart-start'); if(s) s.value = d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0');
                var e = document.getElementById('chart-end'); if(e) e.value = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
                this.renderCharts();
            },
            renderCharts: function() {
                var tc = document.getElementById('trendChart'); var sc = document.getElementById('statusChart');
                if(!tc || !sc || !document.getElementById('tab-dashboard').classList.contains('active')) return;

                var sInput = document.getElementById('chart-start').value; var eInput = document.getElementById('chart-end').value;
                var startD = new Date(sInput + '-01'); var endD = new Date(eInput + '-01');
                if(startD > endD) { var temp = startD; startD = endD; endD = temp; }

                var months = []; var asCounts = []; var inCounts = [];
                var tempD = new Date(startD);
                
                while(tempD <= endD && months.length < 24) { 
                    var mStr = tempD.getFullYear() + '-' + String(tempD.getMonth()+1).padStart(2, '0');
                    months.push(mStr.substring(2)); 
                    asCounts.push(DB.data.asReqs.filter(function(a){ return (a.scheduleDate||a.date||'').indexOf(mStr) === 0; }).length);
                    inCounts.push(DB.data.installs.filter(function(a){ return (a.scheduleDate||a.date||'').indexOf(mStr) === 0; }).length);
                    tempD.setMonth(tempD.getMonth() + 1);
                }

                var stCounts = { 'A/S 진행중': 0, 'A/S 완료': 0, '설치 진행중': 0, '설치 완료': 0 };
                DB.data.asReqs.forEach(function(a){ if(a.status === '완료') stCounts['A/S 완료']++; else stCounts['A/S 진행중']++; });
                DB.data.installs.forEach(function(a){ if(a.status === '설치완료') stCounts['설치 완료']++; else stCounts['설치 진행중']++; });

                if(trendChartInstance) trendChartInstance.destroy();
                trendChartInstance = new Chart(tc, { type: 'bar', data: { labels: months, datasets: [ { label: 'A/S', data: asCounts, backgroundColor: '#ef4444' }, { label: '설치', data: inCounts, backgroundColor: '#3b82f6' } ] }, options: { responsive: true, maintainAspectRatio: false } });

                if(statusChartInstance) statusChartInstance.destroy();
                statusChartInstance = new Chart(sc, { type: 'doughnut', data: { labels: Object.keys(stCounts), datasets: [{ data: Object.values(stCounts), backgroundColor: ['#fca5a5', '#94a3b8', '#93c5fd', '#2dd4bf'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: {size: 10} } } } } });
            },

            renderDashboard: function() {
                var el = document.getElementById('dashboard-assignees'); if(!el) return;
                var elC = document.getElementById('kpi-customers'); if(elC) elC.innerText = DB.data.customers.length;
                var elI = document.getElementById('kpi-installs'); if(elI) elI.innerText = DB.data.installs.filter(function(a) { return a.status !== '설치완료'; }).length;
                var elP = document.getElementById('kpi-pending'); if(elP) elP.innerText = DB.data.asReqs.filter(function(a) { return a.status !== '완료'; }).length;
                var elM = document.getElementById('kpi-materials'); if(elM) elM.innerText = DB.data.materials.length;

                var stats = {};
                DB.data.asReqs.forEach(function(a) { var w = a.worker || '미지정'; if(!stats[w]) stats[w] = { total: 0, done: 0 }; stats[w].total++; if(a.status === '완료') stats[w].done++; });
                DB.data.installs.forEach(function(a) { var w = a.worker || '미지정'; if(!stats[w]) stats[w] = { total: 0, done: 0 }; stats[w].total++; if(a.status === '설치완료') stats[w].done++; });
                DB.data.consults.forEach(function(c) { var w = c.worker || '미지정'; if(!stats[w]) stats[w] = { total: 0, done: 0 }; stats[w].total++; stats[w].done++; });

                var html = '';
                for (var w in stats) {
                    var d = stats[w]; var percent = d.total === 0 ? 0 : Math.round((d.done / d.total) * 100);
                    html += '<div class="p-3 md:p-4 rounded-xl border bg-slate-50 flex flex-col justify-between"><div class="flex justify-between items-center mb-2"><span class="font-bold text-slate-700 text-sm">' + w + '</span><span class="text-[10px] md:text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">배정 ' + d.total + '건</span></div><div class="w-full bg-slate-200 rounded-full h-1.5 md:h-2 mb-1"><div class="bg-emerald-500 h-1.5 md:h-2 rounded-full" style="width: ' + percent + '%"></div></div><div class="text-right text-[10px] md:text-xs text-slate-500">처리완료율 ' + percent + '%</div></div>';
                }
                el.innerHTML = html || '<div class="text-slate-400 text-xs">작업 내역이 없습니다.</div>';
            },

            saveSettlementCost: function(type, id) {
                var lCost = document.getElementById('set-labor-'+id).value; var oCost = document.getElementById('set-other-'+id).value;
                var row = DB.data[type].find(function(r){return r.id === id});
                if(row) { row.laborCost = lCost || 0; row.otherCost = oCost || 0; DB.save(); alert('비용이 수정되었습니다.'); }
            },

            renderSettlement: function() {
                var el = document.getElementById('list-settlement-container'); if(!el) return;
                var filterWorker = document.getElementById('settle-filter-worker'); var fw = filterWorker ? filterWorker.value : '';
                var filterStatus = document.getElementById('settle-filter-status'); var fs = filterStatus ? filterStatus.value : '';

                var combined = [];
                DB.data.asReqs.forEach(function(a) { if(a.status === '완료') { var cp = Object.assign({}, a); cp.dataType = 'asReqs'; combined.push(cp); } });
                DB.data.installs.forEach(function(a) { if(a.status === '설치완료') { var cp = Object.assign({}, a); cp.dataType = 'installs'; combined.push(cp); } });
                combined.sort(function(a, b) { var da = a.scheduleDate || a.date; var db = b.scheduleDate || b.date; return db > da ? 1 : -1; });

                var totalCount = 0; var waitCount = 0; var waitAmount = 0; var doneAmount = 0; var html = '';

                html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-2 text-left">일자/구분</div><div class="col-span-2 text-left">고객사/담당</div><div class="col-span-3 text-left">사용 자재 내역</div><div class="col-span-3 text-right">비용입력 (인건/기타)</div><div class="col-span-2">정산상태</div></div>';
                html += '<div class="flex flex-col md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                
                var itemsHtml = combined.map(function(item) {
                    if(fw && item.worker !== fw) return '';
                    var status = item.settlementStatus || '정산대기';
                    if(fs && status !== fs) return '';

                    var isAs = item.dataType === 'asReqs';
                    var typeLabel = isAs ? '<span class="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">A/S ('+(item.costType||'무상')+')</span>' : '<span class="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-[10px] font-bold">설치</span>';
                    
                    var matCost = 0; var matsHtml = '';
                    if(item.usedMaterials && item.usedMaterials.length > 0) {
                        item.usedMaterials.forEach(function(m) {
                            if(isAs && m.status !== '사용') return; 
                            var dbMat = DB.data.materials.find(function(x){return x.name === m.name});
                            var price = dbMat ? (parseInt(dbMat.price) || 0) : 0;
                            matCost += price * parseInt(m.qty); matsHtml += '<div class="text-[10px]">'+m.name + ' <span class="text-slate-400">(' + m.qty + '개)</span></div>';
                        });
                    } else if (item.matName && !isAs) { 
                        var dbMat = DB.data.materials.find(function(x){return x.name === item.matName});
                        var price = dbMat ? (parseInt(dbMat.price) || 0) : 0;
                        matCost += price * parseInt(item.qty || 1); matsHtml += '<div class="text-[10px]">'+item.matName + ' <span class="text-slate-400">(' + (item.qty||1) + '개)</span></div>';
                    }
                    
                    var laborCost = parseInt(item.laborCost) || 0; var otherCost = parseInt(item.otherCost) || 0;
                    var totalCost = matCost + laborCost + otherCost;

                    totalCount++; if(status === '정산대기') { waitCount++; waitAmount += totalCost; } else { doneAmount += totalCost; }
                    var bg = status === '정산완료' ? 'bg-slate-200 text-slate-500' : 'bg-rose-100 text-rose-600';

                    return '<div class="'+UI.trClass+'">' +
                        '<div class="'+UI.tdClass+' md:col-span-2 font-bold">' + UI.lbl('일자/구분') + (item.scheduleDate||item.date||'').substring(5) + ' <div class="mt-1">' + typeLabel + '</div></div>' +
                        '<div class="'+UI.tdClass+' md:col-span-2">' + UI.lbl('고객사/담당자') + '<span class="font-bold text-sky-700">'+item.custName+'</span><br><span class="text-[10px] md:text-xs text-slate-500">'+(item.worker||'미지정')+'</span></div>' +
                        '<div class="'+UI.tdClass+' md:col-span-3 text-xs text-slate-600">' + UI.lbl('사용 자재 내역') + (matsHtml || '사용 자재 없음') + '</div>' +
                        '<div class="'+UI.tdClass+' md:col-span-3 font-bold md:text-right">' + UI.lbl('비용수정 (자재: '+matCost.toLocaleString()+'원)') + 
                            '<div class="flex items-center justify-end gap-1 mb-1 mt-1"><span class="text-[10px] text-slate-500">인건:</span><input type="number" id="set-labor-'+item.id+'" value="'+laborCost+'" class="w-20 border rounded p-1 text-xs text-right outline-none"></div>' +
                            '<div class="flex items-center justify-end gap-1"><span class="text-[10px] text-slate-500">기타:</span><input type="number" id="set-other-'+item.id+'" value="'+otherCost+'" class="w-20 border rounded p-1 text-xs text-right outline-none"></div>' +
                            '<button onclick="UI.saveSettlementCost(\''+item.dataType+'\', \''+item.id+'\')" class="w-full mt-1 bg-slate-600 hover:bg-slate-700 text-white text-[10px] py-1 rounded shadow-sm">비용 반영 (총 ' + totalCost.toLocaleString() + '원)</button>' +
                        '</div>' +
                        '<div class="'+UI.tdClass+' md:col-span-2 text-center items-center justify-center">' + UI.lbl('정산 상태') + '<button onclick="DB.toggleSettlement(\''+item.dataType+'\', \''+item.id+'\')" class="px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold border w-full md:w-auto ' + bg + '">' + status + '</button></div>' +
                    '</div>';
                }).join('');

                if(!itemsHtml) itemsHtml = '<div class="p-6 text-center text-slate-400">정산할 완료 데이터가 없습니다.</div>';
                el.innerHTML = html + itemsHtml + '</div>';

                var kTot = document.getElementById('set-kpi-total'); if(kTot) kTot.innerText = totalCount + '건';
                var kWaitCnt = document.getElementById('set-kpi-wait-cnt'); if(kWaitCnt) kWaitCnt.innerText = waitCount + '건';
                var kWaitAmt = document.getElementById('set-kpi-wait-amt'); if(kWaitAmt) kWaitAmt.innerText = waitAmount.toLocaleString() + '원';
                var kDoneAmt = document.getElementById('set-kpi-done-amt'); if(kDoneAmt) kDoneAmt.innerText = doneAmount.toLocaleString() + '원';
            },

            renderAS: function() {
                var el = document.getElementById('list-as-container'); if(!el) return;
                
                var keyword = (document.getElementById('search-as') ? document.getElementById('search-as').value.toLowerCase() : '');
                var filteredData = DB.data.asReqs;
                if(asFilterId) filteredData = filteredData.filter(function(a){ return a.id === asFilterId; });
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });

                var isList = this.viewMode.asReqs === 'list'; var html = '';
                if(filteredData.length === 0) { el.innerHTML = '<div class="p-6 text-center text-slate-400 border rounded-lg bg-white">데이터가 없습니다.</div>'; return; }

                if(isList) {
                    html = '<div class="overflow-x-auto bg-white rounded-lg border shadow-sm"><table class="w-full text-left text-xs whitespace-nowrap min-w-[600px]"><thead class="bg-slate-100 border-b"><tr><th class="p-2">방문일</th><th class="p-2">고객명(터치 시 수정)</th><th class="p-2">유/무상</th><th class="p-2">조치내용</th><th class="p-2">담당자</th><th class="p-2 text-center">상태</th><th class="p-2 text-center">카톡</th><th class="p-2 text-center">관리</th></tr></thead><tbody class="divide-y">';
                    html += filteredData.map(function(a) {
                        var bg = a.status === '완료' ? "bg-slate-200 text-slate-600 border-slate-300" : a.status === '재방문' ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300" : a.status === '미완료' ? "bg-red-100 text-red-700 border-red-300" : a.status === '처리중' ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white border-slate-200";
                        var cBadge = a.costType === '유상' ? '<span class="text-rose-600 font-bold">유상</span>' : '<span class="text-emerald-600 font-bold">무상</span>';
                        var urgBadge = a.isUrgent ? '<span class="text-red-500 font-bold animate-blink">🚨긴급</span> ' : '';
                        var kakaoBtn = a.status === '완료' ? '<button onclick="UI.openKakaoModal(\'asReqs\', \''+a.id+'\')" class="bg-[#FEE500] text-black font-bold px-2 py-1 rounded text-[10px] shadow-sm">카톡전송</button>' : '';
                        return '<tr><td class="p-2 text-slate-500">' + (a.scheduleDate || a.date || '').substring(5) + '</td><td class="p-2 font-bold text-sky-600 cursor-pointer hover:underline" onclick="UI.startEdit(\'asReqs\', \'' + a.id + '\')">' + urgBadge + a.custName + '</td><td class="p-2">' + cBadge + '</td><td class="p-2 truncate max-w-[150px]">' + a.content + '</td><td class="p-2">' + a.worker + '</td><td class="p-2 text-center"><button onclick="DB.toggleAsStatus(\'' + a.id + '\')" class="px-2 py-1 rounded-full text-[10px] font-bold border ' + bg + '">' + a.status + '</button></td><td class="p-2 text-center">' + kakaoBtn + '</td><td class="p-2 text-center"><button class="text-red-500 font-bold" onclick="DB.remove(\'asReqs\', \'' + a.id + '\')">삭제</button></td></tr>';
                    }).join('');
                    html += '</tbody></table></div>';
                } else {
                    html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-1">방문일</div><div class="col-span-2">고객명/담당</div><div class="col-span-4 text-left">조치내역 및 자재</div><div class="col-span-2">증빙/서명</div><div class="col-span-1">상태</div><div class="col-span-2">관리</div></div>';
                    html += '<div class="flex flex-col gap-3 md:gap-0 md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                    html += filteredData.map(function(a) {
                        var bg = a.status === '완료' ? "bg-slate-200 text-slate-600 border-slate-300" : a.status === '재방문' ? "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300" : a.status === '미완료' ? "bg-red-100 text-red-700 border-red-300" : a.status === '처리중' ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white border-slate-200";
                        var urgClass = a.isUrgent ? "urgent-red" : "";
                        var detailText = a.processDetail ? '<div class="mt-1 text-slate-600 bg-slate-100 p-1.5 rounded text-xs border">↳ 조치: ' + a.processDetail + '</div>' : '';
                        var memoText = a.memo ? '<div class="mt-1 text-indigo-500 text-xs font-bold">📌 메모: ' + a.memo + '</div>' : '';
                        var filesHtml = ''; if(a.attachedFiles && a.attachedFiles.length > 0) { filesHtml = a.attachedFiles.map(function(f){ return '<img src="'+f+'" onclick="UI.openViewer(\''+f+'\')" class="img-thumb inline-block mr-1 mb-1 border-indigo-200">'; }).join(''); } 
                        var sigHtml = a.signature ? '<img src="'+a.signature+'" onclick="UI.openViewer(\''+a.signature+'\')" class="img-thumb inline-block mr-1 mb-1 border-emerald-400 bg-white">' : '';
                        var costTypeBadge = a.costType === '유상' ? '<span class="bg-rose-50 text-rose-600 border border-rose-200 px-1 text-[10px] rounded mr-1 font-bold">유상</span>' : '<span class="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 text-[10px] rounded mr-1 font-bold">무상</span>';
                        var matsHtml = ''; if(a.usedMaterials && a.usedMaterials.length > 0) { var matNames = a.usedMaterials.map(function(m){ var c=m.status==='반납'?'line-through':''; return '<span class="'+c+'">'+m.name + '(' + m.qty + ')</span>' }).join(', '); matsHtml = '<div class="mt-1 text-amber-700 text-xs font-bold">📦 자재: ' + matNames + '</div>'; }
                        var kakaoBtn = a.status === '완료' ? '<button onclick="UI.openKakaoModal(\'asReqs\', \''+a.id+'\')" class="mt-1 w-full bg-[#FEE500] text-black font-bold py-1.5 rounded text-xs shadow-sm">💬 카톡전송</button>' : '';
                        var urgBadge = a.isUrgent ? '<span class="text-red-500 font-bold text-[10px] animate-blink block mb-0.5">🚨긴급건</span>' : '';

                        return '<div class="'+UI.trClass+' ' + urgClass + '">' +
                            '<div class="'+UI.tdClass+' text-slate-500 md:col-span-1">' + UI.lbl('방문일') + (a.scheduleDate || a.date || '').substring(5) + '</div>' +
                            '<div class="'+UI.tdClass+' font-bold md:col-span-2">' + UI.lbl('고객명 / 담당배정') + urgBadge + '<span class="text-sky-700">'+a.custName + '</span><br><span class="text-[10px] md:text-xs font-normal text-slate-500">' + a.worker + '</span></div>' +
                            '<div class="'+UI.tdClass+' md:col-span-4">' + UI.lbl('조치내역 및 소요자재') + '<span class="text-[10px] md:text-xs text-slate-400">[' + a.type + ']</span> ' + costTypeBadge + '<strong class="text-slate-700">' + a.content + '</strong>' + memoText + matsHtml + detailText + '</div>' +
                            '<div class="'+UI.tdClass+' md:col-span-2">' + UI.lbl('증빙 사진 / 서명') + '<div class="flex flex-wrap">'+(filesHtml||'<span class="text-slate-300 text-xs">사진없음</span><br>')+'</div>' + (sigHtml||'<span class="text-[10px] text-slate-400 mt-1 inline-block">서명대기</span>') + '</div>' +
                            '<div class="'+UI.tdClass+' text-center md:col-span-1">' + UI.lbl('처리 상태') + '<button onclick="DB.toggleAsStatus(\'' + a.id + '\')" class="px-2 py-1.5 rounded-full text-[10px] md:text-xs font-bold border inline-block w-full ' + bg + '">' + a.status + '</button>' + kakaoBtn + '</div>' +
                            '<div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-white rounded-b-xl md:rounded-none">' + '<button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'asReqs\', \'' + a.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'asReqs\', \'' + a.id + '\')">삭제</button></div>' +
                        '</div>';
                    }).join('');
                    html += '</div>';
                }
                el.innerHTML = html;
            },

            renderInstalls: function() {
                var el = document.getElementById('list-install-container'); if(!el) return;
                var keyword = (document.getElementById('search-in') ? document.getElementById('search-in').value.toLowerCase() : '');
                var filteredData = DB.data.installs;
                if(installFilterId) filteredData = filteredData.filter(function(a){ return a.id === installFilterId; });
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });

                var isList = this.viewMode.installs === 'list'; var html = '';
                if(filteredData.length === 0) { el.innerHTML = '<div class="p-6 text-center text-slate-400 border rounded-lg bg-white">데이터가 없습니다.</div>'; return; }

                if(isList) {
                    html = '<div class="overflow-x-auto bg-white rounded-lg border shadow-sm"><table class="w-full text-left text-xs whitespace-nowrap min-w-[600px]"><thead class="bg-slate-100 border-b"><tr><th class="p-2">예정일</th><th class="p-2">고객사(터치 수정)</th><th class="p-2">설치품목</th><th class="p-2">담당자</th><th class="p-2 text-center">상태</th><th class="p-2 text-center">카톡</th><th class="p-2 text-center">관리</th></tr></thead><tbody class="divide-y">';
                    html += filteredData.map(function(ins) {
                        var bg = ins.status === '설치완료' ? "bg-teal-100 text-teal-800 border-teal-300" : ins.status === '설치진행' ? "bg-sky-100 text-sky-700 border-sky-300" : "bg-white border-slate-300";
                        var kakaoBtn = '<button onclick="UI.openKakaoModal(\'installs\', \''+ins.id+'\')" class="bg-[#FEE500] text-black font-bold px-2 py-1 rounded text-[10px] shadow-sm">카톡전송</button>';
                        var urgBadge = ins.isUrgent ? '<span class="text-blue-500 font-bold animate-blink">🚨긴급</span> ' : '';
                        var matsName = ins.usedMaterials ? ins.usedMaterials.map(function(m){return m.name}).join(',') : (ins.matName||'');

                        return '<tr><td class="p-2 text-slate-500 font-bold">' + (ins.scheduleDate||'').substring(5) + '</td><td class="p-2 font-bold text-sky-600 cursor-pointer hover:underline" onclick="UI.startEdit(\'installs\', \'' + ins.id + '\')">' + urgBadge + ins.custName + '</td><td class="p-2 text-sky-700 truncate max-w-[150px]">' + matsName + '</td><td class="p-2">' + ins.worker + '</td><td class="p-2 text-center"><button onclick="DB.toggleInstallStatus(\'' + ins.id + '\')" class="px-2 py-1 rounded-full text-[10px] font-bold border ' + bg + '">' + ins.status + '</button></td><td class="p-2 text-center">' + kakaoBtn + '</td><td class="p-2 text-center"><button class="text-red-500 font-bold" onclick="DB.remove(\'installs\', \'' + ins.id + '\')">삭제</button></td></tr>';
                    }).join('');
                    html += '</tbody></table></div>';
                } else {
                    html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-1">예정일</div><div class="col-span-2">고객명/담당</div><div class="col-span-4 text-left">품목 및 비고</div><div class="col-span-2">증빙/서명</div><div class="col-span-1">상태</div><div class="col-span-2">관리</div></div>';
                    html += '<div class="flex flex-col gap-3 md:gap-0 md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                    html += filteredData.map(function(ins) {
                        var bg = ins.status === '설치완료' ? "bg-teal-100 text-teal-800 border-teal-300" : ins.status === '설치진행' ? "bg-sky-100 text-sky-700 border-sky-300" : "bg-white border-slate-300";
                        var urgClass = ins.isUrgent ? "urgent-blue" : "";
                        var urgBadge = ins.isUrgent ? '<span class="text-blue-500 font-bold text-[10px] animate-blink block mb-0.5">🚨긴급건</span>' : '';
                        
                        var filesHtml = ''; if(ins.attachedFiles && ins.attachedFiles.length > 0) { filesHtml = ins.attachedFiles.map(function(f){ return '<img src="'+f+'" onclick="UI.openViewer(\''+f+'\')" class="img-thumb inline-block mr-1 mb-1 border-sky-200">'; }).join(''); } 
                        var sigHtml = ins.signature ? '<img src="'+ins.signature+'" onclick="UI.openViewer(\''+ins.signature+'\')" class="img-thumb inline-block mr-1 mb-1 border-emerald-400 bg-white">' : '';
                        var kakaoBtn = '<button onclick="UI.openKakaoModal(\'installs\', \''+ins.id+'\')" class="mt-1 w-full bg-[#FEE500] text-black font-bold py-1.5 rounded text-xs shadow-sm">💬 카톡전송</button>';
                        
                        var matsHtml = '';
                        if(ins.usedMaterials && ins.usedMaterials.length > 0) { var matNames = ins.usedMaterials.map(function(m){ return m.name + '(' + m.qty + ')' }).join(', '); matsHtml = '<div class="text-sky-700 text-xs font-bold mb-1">📦 품목: ' + matNames + '</div>'; }
                        else if (ins.matName) { matsHtml = '<div class="text-sky-700 text-xs font-bold mb-1">📦 품목: ' + ins.matName + '(' + (ins.qty||1) + ')</div>'; }

                        return '<div class="'+UI.trClass+' ' + urgClass + '">' +
                            '<div class="'+UI.tdClass+' text-slate-500 font-bold md:col-span-1">' + UI.lbl('예정일') + (ins.scheduleDate||'').substring(5) + '</div>' +
                            '<div class="'+UI.tdClass+' font-bold md:col-span-2">' + UI.lbl('고객명 / 담당배정') + urgBadge + '<span class="text-sky-700">' + ins.custName + '</span><br><span class="text-[10px] md:text-xs font-normal text-slate-500">' + ins.worker + '</span></div>' +
                            '<div class="'+UI.tdClass+' md:col-span-4">' + UI.lbl('설치 품목 및 비고') + matsHtml + '<span class="text-[10px] md:text-xs text-slate-500 font-normal">' + (ins.memo||'-') + '</span></div>' +
                            '<div class="'+UI.tdClass+' md:col-span-2">' + UI.lbl('증빙 사진 / 서명') + '<div class="flex flex-wrap">'+(filesHtml||'<span class="text-slate-300 text-xs">사진없음</span><br>')+'</div>' + (sigHtml||'<span class="text-[10px] text-slate-400 mt-1 inline-block">서명대기</span>') + '</div>' +
                            '<div class="'+UI.tdClass+' text-center md:col-span-1">' + UI.lbl('진행 상태') + '<button onclick="DB.toggleInstallStatus(\'' + ins.id + '\')" class="px-2 py-1.5 rounded-full text-[10px] md:text-xs font-bold border inline-block w-full ' + bg + '">' + ins.status + '</button>' + kakaoBtn + '</div>' +
                            '<div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-white rounded-b-xl md:rounded-none">' + '<button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'installs\', \'' + ins.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'installs\', \'' + ins.id + '\')">삭제</button></div>' +
                        '</div>';
                    }).join('');
                    html += '</div>';
                }
                el.innerHTML = html;
            },

            renderConsults: function() { 
                var el = document.getElementById('list-consult-container'); if(!el) return; 
                var keyword = (document.getElementById('search-cs') ? document.getElementById('search-cs').value.toLowerCase() : '');
                var filteredData = DB.data.consults;
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });

                var isList = this.viewMode.consults === 'list'; var html = '';
                if(filteredData.length === 0) { el.innerHTML = '<div class="p-6 text-center text-slate-400 border rounded-lg bg-white">데이터가 없습니다.</div>'; return; }

                if(isList) {
                    html = '<div class="overflow-x-auto bg-white rounded-lg border shadow-sm"><table class="w-full text-left text-xs whitespace-nowrap min-w-[600px]"><thead class="bg-slate-100 border-b"><tr><th class="p-2">상담일자</th><th class="p-2">고객명/상담자(터치 수정)</th><th class="p-2">분류</th><th class="p-2">상담내용/비고</th><th class="p-2 text-center">관리</th></tr></thead><tbody class="divide-y">';
                    html += filteredData.map(function(c) {
                        return '<tr><td class="p-2 text-slate-500">' + c.date.substring(5) + '</td><td class="p-2 font-bold cursor-pointer hover:underline text-sky-600" onclick="UI.startEdit(\'consults\', \'' + c.id + '\')">' + c.custName + ' / ' + (c.worker||'-') + '</td><td class="p-2"><span class="bg-slate-200 px-1 py-0.5 rounded text-[10px]">' + c.type + '</span></td><td class="p-2 truncate max-w-[200px]">' + c.content + ' ' + (c.memo||'') + '</td><td class="p-2 text-center"><button class="text-red-500 font-bold" onclick="DB.remove(\'consults\', \'' + c.id + '\')">삭제</button></td></tr>';
                    }).join('');
                    html += '</tbody></table></div>';
                } else {
                    html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-2 text-left">일자</div><div class="col-span-3">고객/담당</div><div class="col-span-5 text-left">상담내용 및 비고</div><div class="col-span-2">관리</div></div>';
                    html += '<div class="flex flex-col md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                    html += filteredData.map(function(c) { 
                        return '<div class="'+UI.trClass+'"><div class="'+UI.tdClass+' text-slate-500 md:col-span-2">' + UI.lbl('상담일자') + c.date.substring(5) + '</div><div class="'+UI.tdClass+' font-bold md:col-span-3">' + UI.lbl('고객명/상담자') + c.custName + '<br><span class="text-[10px] md:text-xs text-emerald-600">' + (c.worker||'-') + '</span></div><div class="'+UI.tdClass+' md:col-span-5">' + UI.lbl('상담내용 및 비고') + '<div class="flex items-center gap-1 mb-1"><span class="bg-slate-200 px-2 py-1 rounded text-[10px]">' + c.type + '</span></div><span class="font-medium text-slate-700">' + c.content + '</span><br><span class="text-slate-400 text-[10px] md:text-xs mt-1 block">' + (c.memo||'') + '</span></div><div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none"><button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'consults\', \'' + c.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'consults\', \'' + c.id + '\')">삭제</button></div></div>'; 
                    }).join('');
                    html += '</div>';
                }
                el.innerHTML = html;
            },

            renderEngineers: function() { 
                var el = document.getElementById('list-engineer'); if(!el) return; 
                var keyword = (document.getElementById('search-eng') ? document.getElementById('search-eng').value.toLowerCase() : '');
                var filteredData = DB.data.engineers;
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });
                
                el.innerHTML = filteredData.map(function(e) { 
                    return '<div class="'+UI.trClass+'"><div class="'+UI.tdClass+' md:col-span-4 font-bold text-emerald-700">' + UI.lbl('소속/이름/부서') + '<span class="text-xs text-slate-500 mr-1 border border-slate-300 px-1 rounded">' + (e.affil||'본사') + '</span> ' + e.name + '<br><span class="text-[10px] md:text-xs text-slate-500 font-normal mt-0.5 inline-block">' + e.dept + '</span></div><div class="'+UI.tdClass+' md:col-span-3 text-slate-600">' + UI.lbl('연락처') + e.tel + '</div><div class="'+UI.tdClass+' md:col-span-3 text-slate-500 text-xs">' + UI.lbl('비고') + (e.memo||'-') + '</div><div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none"><button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'engineers\', \'' + e.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'engineers\', \'' + e.id + '\')">삭제</button></div></div>'; 
                }).join(''); 
                if(filteredData.length === 0) el.innerHTML = '<div class="p-6 text-center text-slate-400">데이터가 없습니다.</div>';
            },

            renderCustomers: function() { 
                var el = document.getElementById('list-customer-container'); if(!el) return;
                var keyword = (document.getElementById('search-cu') ? document.getElementById('search-cu').value.toLowerCase() : '');
                var filteredData = DB.data.customers;
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });

                var isList = this.viewMode.customers === 'list'; var html = '';
                if(filteredData.length === 0) { el.innerHTML = '<div class="p-6 text-center text-slate-400 border rounded-lg bg-white">데이터가 없습니다.</div>'; return; }

                if(isList) {
                    html = '<div class="overflow-x-auto bg-white rounded-lg border shadow-sm"><table class="w-full text-left text-xs whitespace-nowrap min-w-[600px]"><thead class="bg-slate-100 border-b"><tr><th class="p-2 cursor-pointer" onclick="DB.sort(\'customers\',\'name\')">고객명 ↕</th><th class="p-2">연락처/담당</th><th class="p-2">주소/비고</th><th class="p-2 text-center">관리</th></tr></thead><tbody class="divide-y">';
                    html += filteredData.map(function(c) {
                        return '<tr><td class="p-2 font-bold cursor-pointer hover:underline text-sky-600" onclick="UI.startEdit(\'customers\', \'' + c.id + '\')">' + c.name + '</td><td class="p-2">' + c.tel + ' (' + (c.pic||'-') + ')</td><td class="p-2 truncate max-w-[200px]">' + (c.addr1||'-') + ' ' + (c.addr2||'') + ' ' + (c.memo||'') + '</td><td class="p-2 text-center"><button class="text-red-500 font-bold" onclick="DB.remove(\'customers\', \'' + c.id + '\')">삭제</button></td></tr>';
                    }).join('');
                    html += '</tbody></table></div>';
                } else {
                    html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-2 text-left" onclick="DB.sort(\'customers\',\'name\')">고객명 ↕</div><div class="col-span-3">전화/담당자</div><div class="col-span-5 text-left">전체주소/비고</div><div class="col-span-2">관리</div></div>';
                    html += '<div class="flex flex-col md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                    html += filteredData.map(function(c) { 
                        return '<div class="'+UI.trClass+'"><div class="'+UI.tdClass+' md:col-span-2 font-bold">' + UI.lbl('고객명') + c.name + '</div><div class="'+UI.tdClass+' md:col-span-3">' + UI.lbl('연락처/담당') + c.tel + '<br><span class="text-[10px] md:text-xs text-slate-500 font-normal">' + (c.pic||'-') + '</span></div><div class="'+UI.tdClass+' md:col-span-5 text-slate-600 text-xs">' + UI.lbl('주소/비고') + (c.addr1||'-') + ' ' + (c.addr2||'') + '<br><span class="text-[10px] md:text-xs text-indigo-500 mt-0.5 block">' + (c.memo||'') + '</span></div><div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none"><button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'customers\', \'' + c.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'customers\', \'' + c.id + '\')">삭제</button></div></div>'; 
                    }).join('');
                    html += '</div>';
                }
                el.innerHTML = html;
            },

            renderMaterials: function() { 
                var keyword = (document.getElementById('search-mat') ? document.getElementById('search-mat').value.toLowerCase() : '');
                var filteredData = DB.data.materials;
                if(keyword) filteredData = filteredData.filter(function(a){ return Object.values(a).some(function(v){ return String(v).toLowerCase().includes(keyword); }); });

                var totalItems = filteredData.length;
                var inStock = filteredData.filter(function(m){return parseInt(m.qty) > 0;}).length;
                var lowStock = filteredData.filter(function(m){return parseInt(m.qty) <= 5 && parseInt(m.qty) > 0;}).length;
                var totalValue = filteredData.reduce(function(sum, m){return sum + (parseInt(m.qty) * parseInt(m.price || 0));}, 0);
                
                var elT = document.getElementById('mat-kpi-total'); if(elT) elT.innerText = totalItems + '개';
                var elI = document.getElementById('mat-kpi-instock'); if(elI) elI.innerText = inStock + '개';
                var elL = document.getElementById('mat-kpi-low'); if(elL) elL.innerText = lowStock + '개';
                var elV = document.getElementById('mat-kpi-value'); if(elV) elV.innerText = totalValue.toLocaleString() + '원';

                var el = document.getElementById('list-material-container'); if(!el) return;
                var isList = this.viewMode.materials === 'list'; var html = '';

                if(filteredData.length === 0) { el.innerHTML = '<div class="p-6 text-center text-slate-400 border rounded-lg bg-white mt-2">검색된 데이터가 없습니다.</div>'; return; }

                if(isList) {
                    html = '<div class="overflow-x-auto bg-white rounded-lg border shadow-sm"><table class="w-full text-left text-xs whitespace-nowrap min-w-[600px]"><thead class="bg-slate-100 border-b"><tr><th class="p-2 cursor-pointer" onclick="DB.sort(\'materials\',\'name\')">품목명 ↕</th><th class="p-2">코드</th><th class="p-2 text-right">수량</th><th class="p-2 text-right">단가</th><th class="p-2 text-center">사진</th><th class="p-2">비고</th><th class="p-2 text-center">관리</th></tr></thead><tbody class="divide-y">';
                    html += filteredData.map(function(m) {
                        var filesHtml = ''; if(m.attachedFiles && m.attachedFiles.length > 0) { filesHtml = '<span class="text-emerald-600 font-bold cursor-pointer" onclick="UI.openViewer(\''+m.attachedFiles[0]+'\')">사진보기</span>'; } else { filesHtml = '<span class="text-slate-300">없음</span>'; }
                        var qtyHtml = m.qty <= 5 ? '<span class="mat-warning">' + m.qty + '개</span>' : '<span class="font-bold">' + m.qty + '개</span>';
                        return '<tr><td class="p-2 font-bold text-amber-700 cursor-pointer hover:underline" onclick="UI.startEdit(\'materials\', \'' + m.id + '\')">' + m.name + '</td><td class="p-2 text-slate-500">' + m.code + '</td><td class="p-2 text-right">' + qtyHtml + '</td><td class="p-2 text-right">' + (Number(m.price)||0).toLocaleString() + '원</td><td class="p-2 text-center">' + filesHtml + '</td><td class="p-2 truncate max-w-[150px]">' + (m.memo||'-') + '</td><td class="p-2 text-center"><button class="text-red-500 font-bold" onclick="DB.remove(\'materials\', \'' + m.id + '\')">삭제</button></td></tr>';
                    }).join('');
                    html += '</tbody></table></div>';
                } else {
                    html = '<div class="hidden md:grid grid-cols-12 gap-2 bg-slate-200 text-slate-600 font-bold p-3 rounded-t-lg text-sm text-center border-b border-slate-300"><div class="col-span-3 text-left" onclick="DB.sort(\'materials\',\'name\')">품목명 ↕</div><div class="col-span-3">수량/단가</div><div class="col-span-4 text-left">사진/비고</div><div class="col-span-2">관리</div></div>';
                    html += '<div class="flex flex-col md:bg-white md:border md:border-t-0 md:rounded-b-lg p-2 md:p-0">';
                    html += filteredData.map(function(m) { 
                        var filesHtml = ''; if(m.attachedFiles && m.attachedFiles.length > 0) { filesHtml = m.attachedFiles.map(function(f){ return '<img src="'+f+'" onclick="UI.openViewer(\''+f+'\')" class="img-thumb inline-block mr-1 mb-1">'; }).join(''); } 
                        var qtyHtml = m.qty <= 5 ? '<span class="mat-warning">' + m.qty + '개</span>' : '<span class="font-bold">' + m.qty + '개</span>';
                        return '<div class="'+UI.trClass+'"><div class="'+UI.tdClass+' md:col-span-3 font-bold text-amber-700">' + UI.lbl('품목명/코드') + m.name + '<br><span class="text-[10px] md:text-xs text-slate-500 font-normal">' + m.code + '</span></div><div class="'+UI.tdClass+' md:col-span-3 md:text-center">' + UI.lbl('수량/단가') + qtyHtml + '<br><span class="text-slate-500 text-[10px] md:text-xs">' + (Number(m.price)||0).toLocaleString() + '원</span></div><div class="'+UI.tdClass+' md:col-span-4 text-slate-500 text-xs">' + UI.lbl('사진/비고') + '<div class="flex flex-wrap mb-1">' + (filesHtml||'') + '</div>' + (m.memo||'-') + '</div><div class="p-2 md:p-3 flex gap-2 md:col-span-2 md:justify-center items-center bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none"><button class="btn-action btn-edit flex-1 md:flex-none" onclick="UI.startEdit(\'materials\', \'' + m.id + '\')">수정</button><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'materials\', \'' + m.id + '\')">삭제</button></div></div>'; 
                    }).join(''); 
                    html += '</div>';
                }
                el.innerHTML = html;
            },

            renderUsers: function() { 
                var el = document.getElementById('list-user'); if(el) { el.innerHTML = DB.data.users.map(function(u) { 
                    var pwMask = u.pw ? u.pw.replace(/./g, '*') : ''; var rColor = u.role === '관리자' ? 'text-red-600 font-bold' : u.role === '준관리자' ? 'text-amber-600 font-bold' : 'text-slate-600 font-bold'; 
                    return '<div class="'+UI.trClass+'"><div class="'+UI.tdClass+' md:col-span-3 font-mono text-slate-500 text-xs">' + UI.lbl('ID/PW') + u.loginId + '<br><span class="text-slate-300">' + pwMask + '</span></div><div class="'+UI.tdClass+' md:col-span-5 font-bold">' + UI.lbl('정보/권한') + u.name + ' <span class="text-[10px] md:text-xs text-slate-400 font-normal">(' + (u.dept||'-') + ')</span><br><span class="' + rColor + ' text-xs">' + u.role + '</span></div><div class="p-2 flex gap-2 md:col-span-4 md:justify-center items-center bg-slate-50 md:bg-transparent rounded-b-xl md:rounded-none"><button class="btn-action btn-danger flex-1 md:flex-none" onclick="DB.remove(\'users\', \'' + u.id + '\')">삭제</button></div></div>'; 
                }).join(''); } 
            }
        };

        function handleImageUpload(e, tableType) {
            var files = e.target.files;
            for(var i=0; i<files.length; i++) {
                var file = files[i]; if(!file) continue;
                var reader = new FileReader();
                reader.onload = function(evt) {
                    var img = new Image();
                    img.onload = function() {
                        var canvas = document.createElement('canvas'); var ctx = canvas.getContext('2d');
                        var MAX_W = 600; var MAX_H = 600; var width = img.width; var height = img.height;
                        if(width > height) { if(width > MAX_W) { height *= MAX_W / width; width = MAX_W; } } else { if(height > MAX_H) { width *= MAX_H / height; height = MAX_H; } }
                        canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
                        currentTempFiles[tableType].push(canvas.toDataURL('image/jpeg', 0.5)); UI.renderFilePreviews(tableType);
                    };
                    img.src = evt.target.result;
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        }

        var asFileInput = document.getElementById('as-file'); if(asFileInput) { asFileInput.addEventListener('change', function(e) { handleImageUpload(e, 'asReqs'); }); }
        var inFileInput = document.getElementById('in-file'); if(inFileInput) { inFileInput.addEventListener('change', function(e) { handleImageUpload(e, 'installs'); }); }
        var mFileInput = document.getElementById('m-file'); if(mFileInput) { mFileInput.addEventListener('change', function(e) { handleImageUpload(e, 'materials'); }); }

        function handleFormSubmit(e, table, extractDataFn) {
            e.preventDefault(); var data = extractDataFn();
            if(UI.editingState[table]) { DB.update(table, UI.editingState[table], data); UI.cancelEdit(table); } 
            else { 
                DB.insert(table, data); e.target.reset(); 
                if(table === 'asReqs') { 
                    var asSc = document.getElementById('as-schedule'); if(asSc) asSc.value = Util.getLocalToday(); 
                    document.getElementById('as-urgent').checked = false;
                    currentTempAsMaterials = []; UI.renderAsMaterials(); 
                    currentTempFiles['asReqs'] = []; UI.renderFilePreviews('asReqs'); 
                    UI.clearFormSignature('as'); document.getElementById('as-cust-info').classList.add('hidden');
                    var ct = document.getElementById('as-cost-type'); if(ct) ct.value = '무상';
                    document.getElementById('as-labor-cost').value=0; document.getElementById('as-other-cost').value=0;
                } 
                if(table === 'installs') { 
                    var inSc = document.getElementById('in-schedule'); if(inSc) inSc.value = Util.getLocalToday(); 
                    document.getElementById('in-urgent').checked = false;
                    currentTempInMaterials = []; UI.renderInMaterials();
                    currentTempFiles['installs'] = []; UI.renderFilePreviews('installs');
                    UI.clearFormSignature('in'); document.getElementById('in-cust-info').classList.add('hidden');
                    document.getElementById('in-labor-cost').value=0; document.getElementById('in-other-cost').value=0;
                }
                if (table === 'materials') { currentTempFiles['materials'] = []; UI.renderFilePreviews('materials'); }
            }
        }

        var fEng = document.getElementById('form-engineer'); if(fEng) fEng.addEventListener('submit', function(e) { handleFormSubmit(e, 'engineers', function() { return { affil: document.getElementById('e-affil').value, name: document.getElementById('e-name').value, dept: document.getElementById('e-dept').value, tel: document.getElementById('e-tel').value, memo: document.getElementById('e-memo').value }; }); });
        var fCus = document.getElementById('form-customer'); if(fCus) fCus.addEventListener('submit', function(e) { handleFormSubmit(e, 'customers', function() { return { name: document.getElementById('c-name').value, pic: document.getElementById('c-pic').value, tel: document.getElementById('c-tel').value, addr1: document.getElementById('c-addr1').value, addr2: document.getElementById('c-addr2').value, memo: document.getElementById('c-memo').value }; }); });
        var fCon = document.getElementById('form-consult'); if(fCon) fCon.addEventListener('submit', function(e) { var cv = document.getElementById('cs-cust').value; if(!cv) { alert('고객을 선택하세요.'); return; } handleFormSubmit(e, 'consults', function() { return { custName: cv, type: document.getElementById('cs-type').value, worker: document.getElementById('cs-worker').value, content: document.getElementById('cs-content').value, memo: document.getElementById('cs-memo').value }; }); });
        var fMat = document.getElementById('form-material'); if(fMat) fMat.addEventListener('submit', function(e) { handleFormSubmit(e, 'materials', function() { return { name: document.getElementById('m-name').value, code: document.getElementById('m-code').value, qty: parseInt(document.getElementById('m-qty').value)||0, price: parseInt(document.getElementById('m-price').value)||0, memo: document.getElementById('m-memo').value, attachedFiles: JSON.parse(JSON.stringify(currentTempFiles['materials'])) }; }); });
        var fUser = document.getElementById('form-user'); if(fUser) fUser.addEventListener('submit', function(e) { e.preventDefault(); DB.insert('users', { loginId: document.getElementById('u-id').value, pw: document.getElementById('u-pw').value, name: document.getElementById('u-name').value, dept: document.getElementById('u-dept').value, role: document.getElementById('u-role').value }); e.target.reset(); });

        var fAs = document.getElementById('form-as');
        if(fAs) {
            fAs.addEventListener('submit', function(e) {
                var cv = document.getElementById('as-cust').value; if(!cv) { alert('고객을 선택하세요.'); e.preventDefault(); return; }
                var oldRec = UI.editingState['asReqs'] ? DB.data.asReqs.find(function(x){return x.id===UI.editingState['asReqs']}) : null;
                var oldMats = oldRec ? oldRec.usedMaterials : [];
                handleFormSubmit(e, 'asReqs', function() {
                    DB.updateInventory(oldMats, currentTempAsMaterials);
                    return { 
                        custName: cv, type: document.getElementById('as-type').value, worker: document.getElementById('as-worker').value, scheduleDate: document.getElementById('as-schedule').value, 
                        isUrgent: document.getElementById('as-urgent').checked,
                        content: document.getElementById('as-content').value, processDetail: document.getElementById('as-process-detail').value, memo: document.getElementById('as-memo').value,
                        costType: document.getElementById('as-cost-type').value, laborCost: document.getElementById('as-labor-cost').value, otherCost: document.getElementById('as-other-cost').value,
                        attachedFiles: JSON.parse(JSON.stringify(currentTempFiles['asReqs'])), usedMaterials: JSON.parse(JSON.stringify(currentTempAsMaterials)),
                        signature: document.getElementById('as-signature-data').value, status: document.getElementById('as-status').value, settlementStatus: '정산대기' 
                    };
                });
            });
        }

        var fIns = document.getElementById('form-install');
        if(fIns) {
            fIns.addEventListener('submit', function(e) {
                var cv = document.getElementById('in-cust').value; if(!cv) { alert('고객사(설치처)를 선택하세요.'); e.preventDefault(); return; }
                var oldRec = UI.editingState['installs'] ? DB.data.installs.find(function(x){return x.id===UI.editingState['installs']}) : null;
                var oldMats = []; if(oldRec && oldRec.usedMaterials) oldMats = oldRec.usedMaterials; else if(oldRec && oldRec.matName) oldMats = [{name: oldRec.matName, qty: oldRec.qty, status:'사용'}];
                
                handleFormSubmit(e, 'installs', function() {
                    DB.updateInventory(oldMats, currentTempInMaterials);
                    return { 
                        custName: cv, worker: document.getElementById('in-worker').value, scheduleDate: document.getElementById('in-schedule').value, memo: document.getElementById('in-memo').value, 
                        isUrgent: document.getElementById('in-urgent').checked,
                        laborCost: document.getElementById('in-labor-cost').value, otherCost: document.getElementById('in-other-cost').value,
                        usedMaterials: JSON.parse(JSON.stringify(currentTempInMaterials)), 
                        attachedFiles: JSON.parse(JSON.stringify(currentTempFiles['installs'])), signature: document.getElementById('in-signature-data').value, status: document.getElementById('in-status').value, settlementStatus: '정산대기' 
                    };
                });
            });
        }

        var fAdmTask = document.getElementById('form-admin-task');
        if(fAdmTask) {
            fAdmTask.addEventListener('submit', function(e) {
                e.preventDefault();
                var type = document.getElementById('adm-task-type').value; var cv = document.getElementById('adm-cust').value; var worker = document.getElementById('adm-worker').value; var sched = document.getElementById('adm-schedule').value; var mat = document.getElementById('adm-mat').value; var qty = document.getElementById('adm-qty').value || 1; var memo = document.getElementById('adm-memo').value; var isUrgent = document.getElementById('adm-urgent').checked;
                var mats = mat ? [{name: mat, qty: qty, status: '사용'}] : [];
                DB.updateInventory([], mats); 

                var record = { custName: cv, worker: worker, scheduleDate: sched, status: type === 'asReqs' ? '접수완료' : '접수대기', settlementStatus: '정산대기', attachedFiles: [], signature: '', isUrgent: isUrgent };
                if(type === 'asReqs') { record.type = 'HW수리'; record.content = memo || '관리자 통합 배정 건'; record.memo = '관리자 배정'; record.costType = '무상'; record.usedMaterials = mats; record.processDetail = ''; record.laborCost = 0; record.otherCost = 0; } 
                else { record.matName = mat || '미지정'; record.qty = mat ? qty : 1; record.memo = memo || '관리자 배정'; record.usedMaterials = mats; record.laborCost = 0; record.otherCost = 0; }
                
                DB.insert(type, record); alert('스케줄러에 즉시 배정되었습니다.'); e.target.reset(); document.getElementById('adm-schedule').value = Util.getLocalToday();
            });
        }

        window.onload = function() { DB.init(); };
