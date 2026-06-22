/* EZCRM application interaction guard extracted from ezcrm(1).html */
document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);
        document.addEventListener('selectstart', function(e) { 
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); }
        }, false);
        document.addEventListener('dragstart', function(e) { 
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); }
        }, false);
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.shiftKey && e.keyCode === 74) || (e.ctrlKey && e.keyCode === 85)) { e.preventDefault(); return false; }
        });
