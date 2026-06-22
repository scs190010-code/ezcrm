/* EZCRM Portal interaction guard extracted from ezmain(1).html */
document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, false);
        document.addEventListener('selectstart', function(e) { e.preventDefault(); }, false);
        document.addEventListener('dragstart', function(e) { e.preventDefault(); }, false);
        document.addEventListener('keydown', function(e) {
            if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73) || (e.ctrlKey && e.shiftKey && e.keyCode === 74) || (e.ctrlKey && e.keyCode === 85)) { e.preventDefault(); return false; }
        });
