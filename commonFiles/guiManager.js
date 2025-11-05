import GUI from 'lil-gui';

let currentGUI = null;

export function createGUI() {
    // If there's an existing GUI, destroy it first
    if (currentGUI) {
        currentGUI.destroy();
    }
    
    // Create new GUI instance
    currentGUI = new GUI();
    return currentGUI;
}

export function destroyGUI() {
    if (currentGUI) {
        currentGUI.destroy();
        currentGUI = null;
    }
}

export function getCurrentGUI() {
    return currentGUI;
} 