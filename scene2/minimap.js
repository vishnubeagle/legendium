// Minimap module for Scene 3
// Provides a circular radar-style minimap with scanning effect for interior environment

import './minimap.css';

let container, canvas, ctx, toggleBtn, visible = false;
let scene, physicsController, electroCharacter, zoeCharacter;
let backgroundPattern = null;

const markers = [
  { type: 'friend', color: '#ffffff', size: 8, position: { x: -0.16, y: 1.9, z: -254 } },
  { type: 'hoverboard', color: '#00ff00', size: 8, position: { x: -2.2, y: 1.9, z: -231 } },
  { type: 'portal', color: '#ff00ff', size: 10, position: { x: -31, y: 4, z: 608 } }
];

const playerMarker = { color: '#00f6ff', size: 6 };

function drawMarkerSymbol(ctx, marker) {
    ctx.save();
    ctx.strokeStyle = marker.color;
    ctx.fillStyle = marker.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = marker.color;
    ctx.shadowBlur = 10;
    switch (marker.type) {
        case 'friend':
            ctx.beginPath();
            ctx.arc(0, 0, marker.size * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(-marker.size * 0.8, -marker.size * 0.8, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(marker.size * 0.8, -marker.size * 0.8, 2, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'hoverboard':
            // Simple hoverboard representation: rectangle with wheels
            ctx.fillRect(-marker.size * 0.5, -marker.size * 0.2, marker.size, marker.size * 0.4);
            ctx.beginPath();
            ctx.arc(-marker.size * 0.3, marker.size * 0.2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(marker.size * 0.3, marker.size * 0.2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'portal':
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#fff';
            for (const r of [marker.size * 0.6, marker.size]) {
                ctx.beginPath();
                ctx.arc(0, 0, r, Math.PI * 0.2, Math.PI * 1.8);
                ctx.stroke();
            }
            break;
    }
    ctx.restore();
}

function drawSciFiMarker(ctx, x, y, marker) {
    ctx.save();
    ctx.translate(x, y);
    const glowPulse = (Math.sin(performance.now() * 0.004) + 1) / 2;
    ctx.fillStyle = marker.color + '33';
    ctx.beginPath();
    ctx.arc(0, 0, marker.size + 2 + glowPulse * 2, 0, Math.PI * 2);
    ctx.fill();
    drawMarkerSymbol(ctx, marker);
    ctx.restore();
}

function drawPlayerChevron(ctx) {
    ctx.save();
    ctx.fillStyle = playerMarker.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = playerMarker.color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.lineTo(9, 9); ctx.lineTo(0, 4); ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function createBackgroundGrid() {
    const patternCanvas = document.createElement('canvas');
    const patternCtx = patternCanvas.getContext('2d');
    const size = 40;
    patternCanvas.width = size;
    patternCanvas.height = size;
    patternCtx.strokeStyle = 'rgba(0, 179, 215, 0.58)';
    patternCtx.lineWidth = 0.5;
    patternCtx.beginPath();
    patternCtx.moveTo(0, size); patternCtx.lineTo(size, 0);
    patternCtx.moveTo(0, 0); patternCtx.lineTo(size, size);
    patternCtx.stroke();
    return patternCanvas;
}

export function createMinimap(sceneRef, physicsControllerRef, electroRef, zoeRef) {
    scene = sceneRef;
    physicsController = physicsControllerRef;
    electroCharacter = electroRef;
    zoeCharacter = zoeRef;
    container = document.createElement('div');
    container.id = 'minimap-container';
    document.body.appendChild(container); // Append map to body
    canvas = document.createElement('canvas');
    canvas.id = 'minimap-canvas';
    canvas.width = 210;
    canvas.height = 210;
    container.appendChild(canvas);
    ctx = canvas.getContext('2d');
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'minimap-toggle';
    toggleBtn.textContent = 'Hide Map';

    document.body.appendChild(toggleBtn);
    
    toggleBtn.addEventListener('click', () => {
        visible = !visible;
        container.classList.toggle('visible');
        toggleBtn.textContent = visible ? 'Hide Map' : 'Show Map';
    });
    const gridCanvas = createBackgroundGrid();
    backgroundPattern = ctx.createPattern(gridCanvas, 'repeat');
    setTimeout(() => {
        visible = true;
        container.classList.add('visible');
    }, 1200);
}

export function updateMinimap() {
    if (!visible || !ctx || !physicsController?.playerFunction?.player) return;
    const player = physicsController.playerFunction.player;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const mapRadius = centerX - 2;
    const scale = 2.5;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, mapRadius, 0, Math.PI * 2);
    ctx.clip();
    
    // This part draws the background grid
    ctx.translate(centerX, centerY);
    ctx.rotate(player.rotation.y);
    const offsetX = -(player.position.x * scale);
    const offsetY = -(player.position.z * scale);
    ctx.translate(offsetX, offsetY);
    ctx.fillStyle = backgroundPattern;
    ctx.fillRect(-centerX - offsetX, -centerY - offsetY, canvas.width, canvas.height);
    ctx.restore();

    const time = performance.now();
    
    // Sweeping scanner effect
    const sweepAngle = (time * 0.002) % (Math.PI * 2);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, mapRadius);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, mapRadius, sweepAngle - 0.3, sweepAngle + 0.3);
    ctx.closePath();
    ctx.fill();

    // Pulsing ring effect
    const pulse = (Math.sin(time * 0.002) + 1) / 2;
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 - pulse * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, mapRadius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(player.rotation.y);

    // This part draws the markers (triggers)
    for (const m of markers) {
        const relativeX = m.position.x - player.position.x;
        const relativeZ = m.position.z - player.position.z;
        const x = relativeX * scale;
        const y = relativeZ * scale;
        if (Math.hypot(x, y) < mapRadius) {
            drawSciFiMarker(ctx, x, y, m);
        }
    }

    ctx.restore();

    // This part draws the player's marker
    ctx.save();
    ctx.translate(centerX, centerY);
    drawPlayerChevron(ctx);
    ctx.restore();
}

export function cleanupMinimap() {
    // Remove event listener from toggle button if it exists
    if (toggleBtn) {
        toggleBtn.removeEventListener('click', toggleBtn.onclick || toggleBtn._listener);
        toggleBtn.innerHTML = ''; // Clear any inner content like SVG
    }
    // Clear container content and remove
    if (container) {
        container.innerHTML = ''; // Clear canvas and any potential SVG children
        container.remove();
    }
    // Explicitly remove toggle button
    if (toggleBtn && toggleBtn.parentNode) {
        toggleBtn.parentNode.removeChild(toggleBtn);
    }
    // Dispose pattern canvas if exists
    if (backgroundPattern && backgroundPattern.image) {
        backgroundPattern.image = null;
    }
    container = null;
    canvas = null;
    ctx = null;
    toggleBtn = null;
    visible = false;
    backgroundPattern = null;
}