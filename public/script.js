// Socket.io connection
const socket = io();

// DOM elements
const connectionTypeRadios = document.querySelectorAll('input[name="connectionType"]');
const serialSettings = document.getElementById('serialSettings');
const ethernetSettings = document.getElementById('ethernetSettings');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const refreshPortsBtn = document.getElementById('refreshPorts');
const serialPortSelect = document.getElementById('serialPort');
const connectionStatus = document.getElementById('connectionStatus');
const readingStatus = document.getElementById('readingStatus');
const startReadingBtn = document.getElementById('startReading');
const stopReadingBtn = document.getElementById('stopReading');
const singleReadBtn = document.getElementById('singleRead');
const updateConfigBtn = document.getElementById('updateConfig');
const updateIntervalBtn = document.getElementById('updateInterval');
const writeRegisterBtn = document.getElementById('writeRegister');
const dataGrid = document.getElementById('dataGrid');
const logContent = document.getElementById('logContent');
const clearLogBtn = document.getElementById('clearLog');
const lastUpdate = document.getElementById('lastUpdate');
const responseStatus = document.getElementById('responseStatus');

// Modal elements
const writeModal = document.getElementById('writeModal');
const modalClose = document.querySelector('.close');
const modalAddress = document.getElementById('modalAddress');
const modalValue = document.getElementById('modalValue');
const confirmWriteBtn = document.getElementById('confirmWrite');
const cancelWriteBtn = document.getElementById('cancelWrite');

// Alias modal elements
const aliasModal = document.getElementById('aliasModal');
const aliasModalClose = document.querySelector('.close-alias');
const aliasAddress = document.getElementById('aliasAddress');
const aliasName = document.getElementById('aliasName');
const confirmAliasBtn = document.getElementById('confirmAlias');
const removeAliasBtn = document.getElementById('removeAlias');
const cancelAliasBtn = document.getElementById('cancelAlias');

// Application state
let isConnected = false;
let isReading = false;
let currentData = [];
let logEntries = [];
let addressAliases = {};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadSerialPorts();
    loadCurrentConfig();
});

function setupEventListeners() {
    // Connection type radio buttons
    connectionTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleConnectionSettings);
    });

    // Connection buttons
    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);
    refreshPortsBtn.addEventListener('click', loadSerialPorts);

    // Reading control buttons
    startReadingBtn.addEventListener('click', startReading);
    stopReadingBtn.addEventListener('click', stopReading);
    singleReadBtn.addEventListener('click', singleRead);

    // Configuration buttons
    updateConfigBtn.addEventListener('click', updateModbusConfig);
    updateIntervalBtn.addEventListener('click', updateInterval);

    // Write register button
    writeRegisterBtn.addEventListener('click', writeRegister);

    // Log clear button
    clearLogBtn.addEventListener('click', clearLog);

    // Modal events
    modalClose.addEventListener('click', closeModal);
    cancelWriteBtn.addEventListener('click', closeModal);
    confirmWriteBtn.addEventListener('click', confirmWrite);
    
    // Alias modal events
    aliasModalClose.addEventListener('click', closeAliasModal);
    cancelAliasBtn.addEventListener('click', closeAliasModal);
    confirmAliasBtn.addEventListener('click', confirmAlias);
    removeAliasBtn.addEventListener('click', removeAlias);
    
    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === writeModal) {
            closeModal();
        }
        if (event.target === aliasModal) {
            closeAliasModal();
        }
    });

    // Socket.io events
    socket.on('connectionStatus', handleConnectionStatus);
    socket.on('modbusData', handleModbusData);
    socket.on('writeResult', handleWriteResult);
    socket.on('aliasUpdated', handleAliasUpdated);
}

function toggleConnectionSettings() {
    const selectedType = document.querySelector('input[name="connectionType"]:checked').value;
    
    if (selectedType === 'serial') {
        serialSettings.style.display = 'block';
        ethernetSettings.style.display = 'none';
    } else {
        serialSettings.style.display = 'none';
        ethernetSettings.style.display = 'block';
    }
}

async function loadSerialPorts() {
    try {
        const response = await fetch('/api/serial-ports');
        const ports = await response.json();
        
        serialPortSelect.innerHTML = '';
        
        if (ports.length === 0) {
            serialPortSelect.innerHTML = '<option value="">No ports available</option>';
        } else {
            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} ${port.manufacturer ? `(${port.manufacturer})` : ''}`;
                serialPortSelect.appendChild(option);
            });
        }
    } catch (error) {
        addLogEntry('error', `Failed to load serial ports: ${error.message}`);
    }
}

async function loadCurrentConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        // Update form fields with current config
        document.getElementById('slaveId').value = config.modbus.slaveId;
        document.getElementById('startAddress').value = config.modbus.startAddress;
        document.getElementById('quantity').value = config.modbus.quantity;
        document.getElementById('readInterval').value = config.interval / 1000;
        
        // Update serial settings
        document.getElementById('baudRate').value = config.serial.baudRate;
        document.getElementById('dataBits').value = config.serial.dataBits;
        document.getElementById('stopBits').value = config.serial.stopBits;
        document.getElementById('parity').value = config.serial.parity;
        
        // Update ethernet settings
        document.getElementById('ipAddress').value = config.ethernet.ip;
        document.getElementById('tcpPort').value = config.ethernet.port;
        
        // Load aliases
        addressAliases = config.aliases || {};
        
        // Update UI state
        isConnected = config.connected;
        isReading = config.reading;
        updateUIState();
        
        if (config.connected) {
            const connectionType = config.connectionType || 'unknown';
            connectionStatus.textContent = `Connected (${connectionType.toUpperCase()})`;
            connectionStatus.className = 'status connected';
        }
        
        if (config.reading) {
            readingStatus.textContent = 'Reading';
            readingStatus.className = 'status reading';
        }
        
    } catch (error) {
        addLogEntry('error', `Failed to load configuration: ${error.message}`);
    }
}

async function connect() {
    const connectionType = document.querySelector('input[name="connectionType"]:checked').value;
    let config = {};
    
    if (connectionType === 'serial') {
        config = {
            port: document.getElementById('serialPort').value,
            baudRate: parseInt(document.getElementById('baudRate').value),
            dataBits: parseInt(document.getElementById('dataBits').value),
            stopBits: parseInt(document.getElementById('stopBits').value),
            parity: document.getElementById('parity').value
        };
    } else {
        config = {
            ip: document.getElementById('ipAddress').value,
            port: parseInt(document.getElementById('tcpPort').value)
        };
    }
    
    try {
        connectBtn.disabled = true;
        addLogEntry('info', `Attempting to connect via ${connectionType}...`);
        
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type: connectionType, config })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', result.message);
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Connection failed: ${error.message}`);
    } finally {
        connectBtn.disabled = false;
    }
}

async function disconnect() {
    try {
        disconnectBtn.disabled = true;
        addLogEntry('info', 'Disconnecting...');
        
        const response = await fetch('/api/disconnect', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', result.message);
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Disconnect failed: ${error.message}`);
    } finally {
        disconnectBtn.disabled = false;
    }
}

async function startReading() {
    try {
        const response = await fetch('/api/start-reading', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            isReading = true;
            updateUIState();
            addLogEntry('success', 'Started continuous reading');
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to start reading: ${error.message}`);
    }
}

async function stopReading() {
    try {
        const response = await fetch('/api/stop-reading', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            isReading = false;
            updateUIState();
            addLogEntry('success', 'Stopped continuous reading');
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to stop reading: ${error.message}`);
    }
}

async function singleRead() {
    // For single read, we start and immediately stop reading
    // This is a simple implementation - you could also add a dedicated endpoint
    await startReading();
    setTimeout(async () => {
        await stopReading();
    }, 100);
}

async function updateModbusConfig() {
    const config = {
        slaveId: parseInt(document.getElementById('slaveId').value),
        startAddress: parseInt(document.getElementById('startAddress').value),
        quantity: parseInt(document.getElementById('quantity').value)
    };
    
    try {
        const response = await fetch('/api/modbus-config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', 'Modbus configuration updated');
            // Clear current data when config changes
            currentData = [];
            updateDataDisplay();
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to update config: ${error.message}`);
    }
}

async function updateInterval() {
    const interval = parseFloat(document.getElementById('readInterval').value);
    
    try {
        const response = await fetch('/api/interval', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ interval })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', `Read interval updated to ${result.interval} seconds`);
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to update interval: ${error.message}`);
    }
}

async function writeRegister() {
    const address = parseInt(document.getElementById('writeAddress').value);
    const value = parseInt(document.getElementById('writeValue').value);
    
    try {
        const response = await fetch('/api/write-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address, value })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', result.message);
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to write register: ${error.message}`);
    }
}

function openWriteModal(address, currentValue) {
    modalAddress.value = address;
    modalValue.value = currentValue;
    writeModal.style.display = 'block';
}

function closeModal() {
    writeModal.style.display = 'none';
}

function openAliasModal(address) {
    aliasAddress.value = address;
    aliasName.value = addressAliases[address] || '';
    aliasModal.style.display = 'block';
}

function closeAliasModal() {
    aliasModal.style.display = 'none';
}

async function confirmWrite() {
    const address = parseInt(modalAddress.value);
    const value = parseInt(modalValue.value);
    
    try {
        const response = await fetch('/api/write-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address, value })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', result.message);
            closeModal();
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to write register: ${error.message}`);
    }
}

async function confirmAlias() {
    const address = parseInt(aliasAddress.value);
    const alias = aliasName.value.trim();
    
    try {
        const response = await fetch('/api/set-alias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ address, alias })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addressAliases = result.aliases;
            updateDataDisplay();
            addLogEntry('success', `Alias ${alias ? 'set' : 'removed'} for address ${address}`);
            closeAliasModal();
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to set alias: ${error.message}`);
    }
}

async function removeAlias() {
    const address = parseInt(aliasAddress.value);
    
    try {
        const response = await fetch(`/api/alias/${address}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addressAliases = result.aliases;
            updateDataDisplay();
            addLogEntry('success', `Alias removed for address ${address}`);
            closeAliasModal();
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to remove alias: ${error.message}`);
    }
}

function handleConnectionStatus(status) {
    isConnected = status.connected;
    
    if (status.connected) {
        connectionStatus.textContent = `Connected (${status.type.toUpperCase()})`;
        connectionStatus.className = 'status connected';
    } else {
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'status disconnected';
        isReading = false;
        readingStatus.textContent = 'Stopped';
        readingStatus.className = 'status stopped';
        
        if (status.error) {
            addLogEntry('error', `Connection error: ${status.error}`);
        }
    }
    
    updateUIState();
}

function handleModbusData(data) {
    if (data.success) {
        currentData = data.data;
        updateDataDisplay();
        lastUpdate.textContent = new Date(data.timestamp).toLocaleTimeString();
        responseStatus.textContent = 'Success';
        responseStatus.style.color = '#28a745';
        
        readingStatus.textContent = 'Reading';
        readingStatus.className = 'status reading';
        
        addLogEntry('success', `Read ${data.data.length} registers: [${data.data.join(', ')}]`);
    } else {
        responseStatus.textContent = `Error: ${data.error}`;
        responseStatus.style.color = '#dc3545';
        addLogEntry('error', `Read failed: ${data.error}`);
    }
}

function handleWriteResult(result) {
    if (result.success) {
        addLogEntry('success', `Successfully wrote value ${result.value} to address ${result.address}`);
    } else {
        addLogEntry('error', `Write failed: ${result.error}`);
    }
}

function handleAliasUpdated(data) {
    if (data.alias) {
        addressAliases[data.address] = data.alias;
    } else {
        delete addressAliases[data.address];
    }
    updateDataDisplay();
}

function updateDataDisplay() {
    dataGrid.innerHTML = '';
    
    if (currentData.length === 0) {
        dataGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #6c757d; padding: 20px;">No data available</div>';
        return;
    }
    
    const startAddress = parseInt(document.getElementById('startAddress').value) || 0;
    
    currentData.forEach((value, index) => {
        const address = startAddress + index;
        const alias = addressAliases[address];
        const dataItem = document.createElement('div');
        dataItem.className = 'data-item';
        
        dataItem.innerHTML = `
            ${alias ? `<div class="alias">${alias}</div>` : ''}
            <div class="address">Addr: ${address}</div>
            <div class="value">${value}</div>
            <div class="controls">
                <button class="control-btn alias-btn" title="Set Alias" onclick="event.stopPropagation(); openAliasModal(${address})">A</button>
            </div>
        `;
        
        dataItem.addEventListener('click', (event) => {
            // Only open write modal if clicking on the data item itself, not on control buttons
            if (!event.target.classList.contains('control-btn')) {
                openWriteModal(address, value);
            }
        });
        
        dataGrid.appendChild(dataItem);
    });
}

function updateUIState() {
    // Connection buttons
    connectBtn.disabled = isConnected;
    disconnectBtn.disabled = !isConnected;
    
    // Reading buttons
    startReadingBtn.disabled = !isConnected || isReading;
    stopReadingBtn.disabled = !isConnected || !isReading;
    singleReadBtn.disabled = !isConnected || isReading;
    
    // Write button
    writeRegisterBtn.disabled = !isConnected;
    
    // Update reading status display
    if (!isConnected) {
        readingStatus.textContent = 'Stopped';
        readingStatus.className = 'status stopped';
    } else if (isReading) {
        readingStatus.textContent = 'Reading';
        readingStatus.className = 'status reading';
    } else {
        readingStatus.textContent = 'Stopped';
        readingStatus.className = 'status stopped';
    }
}

function addLogEntry(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span>${message}`;
    
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
    
    // Keep only last 100 entries
    while (logContent.children.length > 100) {
        logContent.removeChild(logContent.firstChild);
    }
}

function clearLog() {
    logContent.innerHTML = '<p>Log cleared...</p>';
}
