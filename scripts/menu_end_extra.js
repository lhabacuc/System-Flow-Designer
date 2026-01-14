const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;

// Check for saved theme preference or default to light mode
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    body.classList.add('dark-mode');
    themeIcon.innerHTML = "<i class='bx bx-sun'></i>";
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');

    themeIcon.innerHTML = isDark
        ? "<i class='bx bx-sun'></i>"
        : "<i class='bx bx-moon'></i>";

    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.draw();
    }
});


// Helper function to close floating menu
function closeFloatingMenu() {
    document.getElementById('floatingMenu')?.classList.remove('active');
    document.getElementById('floatingMenuBtn')?.classList.remove('active');
}

// Floating Menu Toggle
document.getElementById('floatingMenuBtn')?.addEventListener('click', () => {
    const menu = document.getElementById('floatingMenu');
    const btn = document.getElementById('floatingMenuBtn');
    menu.classList.toggle('active');
    btn.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('floatingMenu');
    const btn = document.getElementById('floatingMenuBtn');
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
        closeFloatingMenu();
    }
});

// Toolbar buttons
document.getElementById('addNodeBtn')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.openAddNodeModal();
    }
    closeFloatingMenu();
});

document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.exportToJSON();
    }
    closeFloatingMenu();
});

document.getElementById('importJsonBtn')?.addEventListener('click', () => {
    document.getElementById('jsonFileInput').click();
    closeFloatingMenu();
});

document.getElementById('jsonFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                const instance = FlowchartManager.getInstance();
                if (instance) {
                    instance.importFromJSON(json);
                }
            } catch (error) {
                alert('Erro ao importar JSON: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    e.target.value = ''; // Reset file input
});

// Canvas Flowchart Implementation
// Polyfill for roundRect if not supported
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (typeof r === 'number') {
            r = [r, r, r, r];
        } else if (r.length === 1) {
            r = [r[0], r[0], r[0], r[0]];
        } else if (r.length === 2) {
            r = [r[0], r[1], r[0], r[1]];
        } else if (r.length === 3) {
            r = [r[0], r[1], r[2], r[1]];
        }
        
        if (w < 2 * r[0]) r[0] = w / 2;
        if (h < 2 * r[1]) r[1] = h / 2;
        if (w < 2 * r[2]) r[2] = w / 2;
        if (h < 2 * r[3]) r[3] = h / 2;
        
        this.beginPath();
        this.moveTo(x + r[0], y);
        this.lineTo(x + w - r[1], y);
        this.arcTo(x + w, y, x + w, y + r[1], r[1]);
        this.lineTo(x + w, y + h - r[2]);
        this.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
        this.lineTo(x + r[3], y + h);
        this.arcTo(x, y + h, x, y + h - r[3], r[3]);
        this.lineTo(x, y + r[0]);
        this.arcTo(x, y, x + r[0], y, r[0]);
        this.closePath();
        return this;
    };
}
