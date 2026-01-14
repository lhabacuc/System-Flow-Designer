let flowchart;
const FlowchartManager = {
    instance: null,
    init: function() {
        this.instance = new InteractiveFlowchart('journeyCanvas');
        return this.instance;
    },
    getInstance: function() {
        return this.instance;
    }
};

window.addEventListener('load', () => {
    flowchart = FlowchartManager.init();
});

// Reset zoom button
document.getElementById('resetZoom')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.resetZoom();
    }
});

// Auto layout button
document.getElementById('autoLayout')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance) {
        instance.autoLayout();
        instance.draw();
    }
});

// Clear canvas button
document.getElementById('clearCanvas')?.addEventListener('click', () => {
    const instance = FlowchartManager.getInstance();
    if (instance && confirm('Tem certeza que deseja limpar todo o canvas?')) {
        instance.clearAll();
    }
});