// =============================================
//  Mobile Controller Logic (Premium UI)
// =============================================

const socket = io();

const UI = {
  hrValue: document.getElementById('hrValue'),
  stressValue: document.getElementById('stressValue'),
  btnConnect: document.getElementById('btnConnect'),
  statusPill: document.getElementById('statusPill'),
  statusText: document.getElementById('statusText'),
  serverDot: document.getElementById('serverDot'),
  serverStatusText: document.getElementById('serverStatusText'),
  
  // Debug Elements
  debugToggle: document.getElementById('debugToggle'),
  debugBody: document.getElementById('debugBody'),
  hrRange: document.getElementById('hrRange'),
  stressRange: document.getElementById('stressRange'),
  
  // Visual Elements
  stressBarFill: document.getElementById('stressBarFill'),
  pulseGraph: document.getElementById('pulseGraph'),
  
  // Mode Selector
  modeBtns: document.querySelectorAll('.mode-btn')
};

let currentMode = 1;
let currentHR = 72;
let currentStress = 20;

// Mode Switching
UI.modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    UI.modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMode = parseInt(btn.dataset.mode);
    socket.emit('modeChange', { mode: currentMode });
  });
});

// Socket.IO Connection Status
socket.on('connect', () => {
  UI.serverDot.className = 'server-dot active';
  UI.serverStatusText.textContent = 'Visualizer Link: Online';
});

socket.on('disconnect', () => {
  UI.serverDot.className = 'server-dot inactive';
  UI.serverStatusText.textContent = 'Visualizer Link: Offline';
});

// Update UI & Broadcast
function updateState() {
  UI.hrValue.textContent = currentHR;
  UI.stressValue.textContent = currentStress;
  
  // Update Stress Bar Width
  UI.stressBarFill.style.width = Math.min(100, Math.max(5, currentStress)) + '%';
  
  // Adjust Pulse Graph animation speed based on HR
  const speed = 60 / currentHR;
  UI.pulseGraph.style.animation = `pulseSlide ${speed}s infinite linear`;

  socket.emit('biometrics', {
    hr: currentHR,
    stress: currentStress
  });
}

// ── Web Bluetooth Setup ────────────────────────
UI.btnConnect.addEventListener('click', async () => {
  if (!navigator.bluetooth) {
    alert('Web Bluetooth API is not available on this browser/context. Use a secure context (HTTPS).');
    return;
  }

  try {
    UI.btnConnect.querySelector('.btn-text').textContent = 'Scanning...';
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['heart_rate']
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    const characteristic = await service.getCharacteristic('heart_rate_measurement');

    await characteristic.startNotifications();
    
    UI.statusPill.className = 'status-pill connected';
    UI.statusText.textContent = `SYNCED`;
    UI.btnConnect.className = 'btn-primary glass-action connected';
    UI.btnConnect.querySelector('.btn-text').textContent = 'Disconnect';

    characteristic.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;
      const flags = value.getUint8(0);
      let heartRate = flags & 0x01 ? value.getUint16(1, true) : value.getUint8(1);
      
      currentHR = heartRate;
      currentStress = Math.min(100, Math.max(0, (currentHR - 60) * 1.5));
      updateState();
    });

  } catch (err) {
    console.error('Bluetooth error:', err);
    UI.btnConnect.querySelector('.btn-text').textContent = 'Connect Device';
    UI.statusPill.className = 'status-pill';
    UI.statusText.textContent = 'Failed';
  }
});

// ── Debug Toggle & Overrides ───────────────────
UI.debugToggle.addEventListener('change', (e) => {
  if (e.target.checked) {
    UI.debugBody.classList.add('open');
    UI.statusPill.className = 'status-pill connected';
    UI.statusText.textContent = 'MANUAL OVERRIDE';
    
    // Initial sync
    currentHR = parseInt(UI.hrRange.value);
    currentStress = parseInt(UI.stressRange.value);
    updateState();
  } else {
    UI.debugBody.classList.remove('open');
    UI.statusPill.className = 'status-pill';
    UI.statusText.textContent = 'STANDBY';
  }
});

UI.hrRange.addEventListener('input', (e) => {
  if (UI.debugToggle.checked) {
    currentHR = parseInt(e.target.value);
    updateState();
  }
});

UI.stressRange.addEventListener('input', (e) => {
  if (UI.debugToggle.checked) {
    currentStress = parseInt(e.target.value);
    updateState();
  }
});

// Initial Broadcast
setTimeout(() => {
  updateState();
  socket.emit('modeChange', { mode: currentMode });
}, 1000);
