// Socket.io connection
const socket = io();

// DOM elements
const connectionTypeRadios = document.querySelectorAll('input[name="connectionType"]');
const serialSettings = document.getElementById('serialSettings');
const ethernetSettings = document.getElementById('ethernetSettings');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const reconnectBtn = document.getElementById('reconnectBtn');
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

// Config save/load elements
const saveConfigBtn = document.getElementById('saveConfig');
const loadConfigBtn = document.getElementById('loadConfig');
const fileInput = document.getElementById('fileInput');

// String write elements
const stringStartAddress = document.getElementById('stringStartAddress');
const stringLength = document.getElementById('stringLength');
const stringData = document.getElementById('stringData');
const stringCharCount = document.getElementById('stringCharCount');
const stringRegCount = document.getElementById('stringRegCount');
const writeStringBtn = document.getElementById('writeString');
const clearStringBtn = document.getElementById('clearString');
const writeStringNotSupported = document.getElementById('writeStringNotSupported');

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

// Configuration storage for all register types
let configurationData = {
    serial: {
        port: 'COM1',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
    },
    ethernet: {
        ip: '192.168.1.100',
        port: 502
    },
    modbus: {
        slaveId: 1,
        startAddress: 0,
        quantity: 10,
        registerType: 'holdingRegisters'
    },
    interval: 1,
    connectionType: 'serial',
    aliases: {
        coils: {},
        discreteInputs: {},
        inputRegisters: {},
        holdingRegisters: {}
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadSerialPorts();
    loadCurrentConfig();
    updateStringInfo(); // Initialize string counter
});

function setupEventListeners() {
    // Connection type radio buttons
    connectionTypeRadios.forEach(radio => {
        radio.addEventListener('change', toggleConnectionSettings);
    });

    // Connection buttons
    connectBtn.addEventListener('click', connect);
    disconnectBtn.addEventListener('click', disconnect);
    reconnectBtn.addEventListener('click', reconnect);
    refreshPortsBtn.addEventListener('click', loadSerialPorts);

    // Reading control buttons
    startReadingBtn.addEventListener('click', startReading);
    stopReadingBtn.addEventListener('click', stopReading);
    singleReadBtn.addEventListener('click', singleRead);

    // Configuration buttons
    updateConfigBtn.addEventListener('click', updateModbusConfig);
    updateIntervalBtn.addEventListener('click', updateInterval);

    // Register type change
    document.getElementById('registerType').addEventListener('change', (event) => {
        // Save current aliases for the previous register type
        const previousRegisterType = configurationData.modbus.registerType;
        if (previousRegisterType) {
            configurationData.aliases[previousRegisterType] = { ...addressAliases };
        }
        
        // Load aliases for the new register type
        const newRegisterType = event.target.value;
        configurationData.modbus.registerType = newRegisterType;
        addressAliases = { ...configurationData.aliases[newRegisterType] };
        
        updateWriteVisibility();
        updateDataDisplay();
        
        addLogEntry('info', `Switched to ${newRegisterType} - ${Object.keys(addressAliases).length} aliases loaded`);
    });

    // Write register button
    writeRegisterBtn.addEventListener('click', writeRegister);

    // Log clear button
    clearLogBtn.addEventListener('click', clearLog);

    // Config save/load buttons
    saveConfigBtn.addEventListener('click', saveConfiguration);
    loadConfigBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', loadConfiguration);

    // String write functionality
    stringData.addEventListener('input', updateStringInfo);
    stringLength.addEventListener('input', updateStringInfo);
    writeStringBtn.addEventListener('click', writeStringBlock);
    clearStringBtn.addEventListener('click', clearStringData);

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
        document.getElementById('registerType').value = config.modbus.registerType || 'holdingRegisters';
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
        
        // Initialize configuration data structure
        const currentRegisterType = config.modbus.registerType || 'holdingRegisters';
        configurationData = {
            serial: { ...config.serial },
            ethernet: { ...config.ethernet },
            modbus: { ...config.modbus },
            interval: config.interval / 1000,
            connectionType: config.connectionType || 'serial',
            aliases: {
                coils: {},
                discreteInputs: {},
                inputRegisters: {},
                holdingRegisters: {}
            }
        };
        
        // Set current aliases for the active register type
        configurationData.aliases[currentRegisterType] = { ...addressAliases };
        
        // Update UI state
        isConnected = config.connected;
        isReading = config.reading;
        updateUIState();
        updateWriteVisibility();
        
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

async function reconnect() {
    try {
        reconnectBtn.disabled = true;
        reconnectBtn.textContent = 'Reconnecting...';
        addLogEntry('info', 'Attempting to reconnect...');
        
        const response = await fetch('/api/reconnect', {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', result.message);
        } else {
            addLogEntry('error', `Reconnect failed: ${result.error}`);
        }
    } catch (error) {
        addLogEntry('error', `Reconnect failed: ${error.message}`);
    } finally {
        reconnectBtn.disabled = false;
        reconnectBtn.textContent = 'Reconnect';
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
        quantity: parseInt(document.getElementById('quantity').value),
        registerType: document.getElementById('registerType').value
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
            addLogEntry('success', `Modbus configuration updated - Type: ${config.registerType}`);
            // Clear current data when config changes
            currentData = [];
            updateDataDisplay();
            updateWriteVisibility();
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
    const registerType = document.getElementById('registerType').value;
    
    modalAddress.value = address;
    
    if (registerType === 'coils') {
        modalValue.value = currentValue ? 1 : 0;
        modalValue.max = 1;
        modalValue.min = 0;
        modalValue.step = 1;
        document.querySelector('label[for="modalValue"]').textContent = 'New Value (0=OFF, 1=ON):';
    } else {
        modalValue.value = currentValue;
        modalValue.max = 65535;
        modalValue.min = 0;
        modalValue.step = 1;
        document.querySelector('label[for="modalValue"]').textContent = 'New Value:';
    }
    
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
    const currentRegisterType = document.getElementById('registerType').value;
    
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
            // Also update the configuration storage for current register type
            configurationData.aliases[currentRegisterType] = { ...addressAliases };
            updateDataDisplay();
            addLogEntry('success', `Alias ${alias ? 'set' : 'removed'} for address ${address} (${currentRegisterType})`);
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
    const currentRegisterType = document.getElementById('registerType').value;
    
    try {
        const response = await fetch(`/api/alias/${address}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            addressAliases = result.aliases;
            // Also update the configuration storage for current register type
            configurationData.aliases[currentRegisterType] = { ...addressAliases };
            updateDataDisplay();
            addLogEntry('success', `Alias removed for address ${address} (${currentRegisterType})`);
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
        
        const registerTypeName = getRegisterTypeName(data.registerType || 'holdingRegisters');
        addLogEntry('success', `Read ${data.data.length} ${registerTypeName}: [${data.data.join(', ')}]`);
    } else {
        responseStatus.textContent = `Error: ${data.error}`;
        responseStatus.style.color = '#dc3545';
        addLogEntry('error', `Read failed: ${data.error}`);
    }
}

function getRegisterTypeName(registerType) {
    switch (registerType) {
        case 'coils':
            return 'coils';
        case 'discreteInputs':
            return 'discrete inputs';
        case 'inputRegisters':
            return 'input registers';
        case 'holdingRegisters':
            return 'holding registers';
        default:
            return 'registers';
    }
}

function handleWriteResult(result) {
    if (result.success) {
        let message = `Successfully wrote value ${result.value} to address ${result.address}`;
        if (result.retries && result.retries > 0) {
            message += ` (after ${result.retries} retry${result.retries > 1 ? 'ies' : ''})`;
        }
        addLogEntry('success', message);
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
    const registerType = document.getElementById('registerType').value;
    
    currentData.forEach((value, index) => {
        const address = startAddress + index;
        const alias = addressAliases[address];
        const dataItem = document.createElement('div');
        dataItem.className = 'data-item';
        
        // Format address display based on register type
        let addressPrefix = '';
        switch (registerType) {
            case 'coils':
                addressPrefix = '0x';
                break;
            case 'discreteInputs':
                addressPrefix = '1x';
                break;
            case 'inputRegisters':
                addressPrefix = '3x';
                break;
            case 'holdingRegisters':
                addressPrefix = '4x';
                break;
        }
        
        // Format value display based on register type
        let displayValue = value;
        let valueClass = '';
        if (registerType === 'coils' || registerType === 'discreteInputs') {
            displayValue = value ? 'ON' : 'OFF';
            valueClass = value ? 'on' : 'off';
        }
        
        dataItem.innerHTML = `
            ${alias ? `<div class="alias">${alias}</div>` : ''}
            <div class="address">${addressPrefix}${address.toString().padStart(5, '0')}</div>
            <div class="value ${valueClass}">${displayValue}</div>
            <div class="controls">
                <button class="control-btn alias-btn" title="Set Alias" onclick="event.stopPropagation(); openAliasModal(${address})">A</button>
            </div>
        `;
        
        dataItem.addEventListener('click', (event) => {
            // Only open write modal if clicking on the data item itself and write is supported
            if (!event.target.classList.contains('control-btn')) {
                const writeSupported = registerType === 'holdingRegisters' || registerType === 'coils';
                if (writeSupported) {
                    openWriteModal(address, value);
                } else {
                    addLogEntry('info', `Write operations not supported for ${registerType}`);
                }
            }
        });
        
        dataGrid.appendChild(dataItem);
    });
}

function updateUIState() {
    // Connection buttons
    connectBtn.disabled = isConnected;
    disconnectBtn.disabled = !isConnected;
    reconnectBtn.disabled = isConnected; // Only enable when disconnected
    
    // Reading buttons
    startReadingBtn.disabled = !isConnected || isReading;
    stopReadingBtn.disabled = !isConnected || !isReading;
    singleReadBtn.disabled = !isConnected || isReading;
    
    // Write button - depends on connection and register type
    updateWriteVisibility();
    
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

function updateWriteVisibility() {
    const registerType = document.getElementById('registerType').value;
    const writeNotSupported = document.getElementById('writeNotSupported');
    const writeRegisterBtn = document.getElementById('writeRegister');
    const writeAddressInput = document.getElementById('writeAddress');
    const writeValueInput = document.getElementById('writeValue');
    
    // Check if register type supports write operations
    const writeSupported = registerType === 'holdingRegisters' || registerType === 'coils';
    const stringWriteSupported = registerType === 'holdingRegisters';
    
    if (writeSupported) {
        writeNotSupported.style.display = 'none';
        writeRegisterBtn.disabled = !isConnected;
        writeAddressInput.disabled = false;
        writeValueInput.disabled = false;
        
        // Update value input constraints for coils
        if (registerType === 'coils') {
            writeValueInput.max = '1';
            writeValueInput.min = '0';
            writeValueInput.placeholder = '0 (OFF) or 1 (ON)';
        } else {
            writeValueInput.max = '65535';
            writeValueInput.min = '0';
            writeValueInput.placeholder = '0-65535';
        }
    } else {
        writeNotSupported.style.display = 'block';
        writeRegisterBtn.disabled = true;
        writeAddressInput.disabled = true;
        writeValueInput.disabled = true;
    }
    
    // Handle string write visibility
    if (stringWriteSupported) {
        writeStringNotSupported.style.display = 'none';
        writeStringBtn.disabled = !isConnected;
        stringStartAddress.disabled = false;
        stringLength.disabled = false;
        stringData.disabled = false;
    } else {
        writeStringNotSupported.style.display = 'block';
        writeStringBtn.disabled = true;
        stringStartAddress.disabled = true;
        stringLength.disabled = true;
        stringData.disabled = true;
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

function updateStringInfo() {
    const text = stringData.value;
    const maxLength = parseInt(stringLength.value) || 0;
    const charCount = text.length;
    // Add 1 for null terminator that will be automatically added
    const totalCharsWithNull = charCount + 1;
    const regCount = Math.ceil(totalCharsWithNull / 2);
    const maxRegCount = Math.ceil(maxLength / 2);
    
    stringCharCount.textContent = `${charCount} (+1 null)`;
    stringRegCount.textContent = regCount;
    
    // Update character count color based on limit (including null terminator)
    if (totalCharsWithNull > maxLength) {
        stringCharCount.style.color = '#dc3545';
        stringRegCount.style.color = '#dc3545';
    } else {
        stringCharCount.style.color = '#667eea';
        stringRegCount.style.color = '#667eea';
    }
    
    // Update max length constraint
    stringData.maxLength = maxLength;
}

function clearStringData() {
    stringData.value = '';
    updateStringInfo();
}

async function writeStringBlock() {
    const startAddress = parseInt(stringStartAddress.value);
    const text = stringData.value;
    const maxLength = parseInt(stringLength.value);
    
    if (!text) {
        addLogEntry('error', 'Please enter text to write');
        return;
    }
    
    // Check if text + null terminator exceeds max length
    if (text.length + 1 > maxLength) {
        addLogEntry('error', `Text too long. Maximum ${maxLength - 1} characters allowed (reserving 1 for null terminator)`);
        return;
    }
    
    try {
        const response = await fetch('/api/write-string', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                startAddress, 
                text, 
                maxLength 
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            addLogEntry('success', `String "${text}" with null terminator written to registers ${startAddress}-${startAddress + result.registersWritten - 1} (${result.registersWritten} registers, ${result.textLength} chars + null)`);
        } else {
            addLogEntry('error', result.error);
        }
    } catch (error) {
        addLogEntry('error', `Failed to write string: ${error.message}`);
    }
}

function saveConfiguration() {
    try {
        // Collect current form values
        const currentConfig = {
            serial: {
                port: document.getElementById('serialPort').value,
                baudRate: parseInt(document.getElementById('baudRate').value),
                dataBits: parseInt(document.getElementById('dataBits').value),
                stopBits: parseInt(document.getElementById('stopBits').value),
                parity: document.getElementById('parity').value
            },
            ethernet: {
                ip: document.getElementById('ipAddress').value,
                port: parseInt(document.getElementById('tcpPort').value)
            },
            modbus: {
                slaveId: parseInt(document.getElementById('slaveId').value),
                startAddress: parseInt(document.getElementById('startAddress').value),
                quantity: parseInt(document.getElementById('quantity').value),
                registerType: document.getElementById('registerType').value
            },
            interval: parseFloat(document.getElementById('readInterval').value),
            connectionType: document.querySelector('input[name="connectionType"]:checked').value,
            aliases: {
                coils: configurationData.aliases.coils || {},
                discreteInputs: configurationData.aliases.discreteInputs || {},
                inputRegisters: configurationData.aliases.inputRegisters || {},
                holdingRegisters: configurationData.aliases.holdingRegisters || {}
            },
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        // Update current aliases for active register type
        const currentRegisterType = document.getElementById('registerType').value;
        currentConfig.aliases[currentRegisterType] = { ...addressAliases };

        // Create and download JSON file
        const configJson = JSON.stringify(currentConfig, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `modbus-config-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addLogEntry('success', 'Configuration saved successfully');
    } catch (error) {
        addLogEntry('error', `Failed to save configuration: ${error.message}`);
    }
}

function loadConfiguration(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const config = JSON.parse(e.target.result);
            
            // Validate configuration structure
            if (!config.serial || !config.ethernet || !config.modbus || !config.aliases) {
                throw new Error('Invalid configuration file format');
            }

            // Update form fields
            document.getElementById('serialPort').value = config.serial.port || 'COM1';
            document.getElementById('baudRate').value = config.serial.baudRate || 9600;
            document.getElementById('dataBits').value = config.serial.dataBits || 8;
            document.getElementById('stopBits').value = config.serial.stopBits || 1;
            document.getElementById('parity').value = config.serial.parity || 'none';

            document.getElementById('ipAddress').value = config.ethernet.ip || '192.168.1.100';
            document.getElementById('tcpPort').value = config.ethernet.port || 502;

            document.getElementById('slaveId').value = config.modbus.slaveId || 1;
            document.getElementById('startAddress').value = config.modbus.startAddress || 0;
            document.getElementById('quantity').value = config.modbus.quantity || 10;
            document.getElementById('registerType').value = config.modbus.registerType || 'holdingRegisters';
            document.getElementById('readInterval').value = config.interval || 1;

            // Set connection type
            const connectionType = config.connectionType || 'serial';
            document.querySelector(`input[name="connectionType"][value="${connectionType}"]`).checked = true;
            toggleConnectionSettings();

            // Load aliases for all register types
            configurationData.aliases = {
                coils: config.aliases.coils || {},
                discreteInputs: config.aliases.discreteInputs || {},
                inputRegisters: config.aliases.inputRegisters || {},
                holdingRegisters: config.aliases.holdingRegisters || {}
            };

            // Load aliases for current register type
            const currentRegisterType = config.modbus.registerType || 'holdingRegisters';
            addressAliases = { ...configurationData.aliases[currentRegisterType] };

            // Update UI
            updateWriteVisibility();
            updateDataDisplay();

            addLogEntry('success', `Configuration loaded successfully (${config.timestamp ? new Date(config.timestamp).toLocaleString() : 'Unknown date'})`);
            
            // Show loaded configuration summary
            const summary = `Loaded: ${connectionType.toUpperCase()}, ${config.modbus.registerType}, ${Object.keys(addressAliases).length} aliases`;
            addLogEntry('info', summary);

        } catch (error) {
            addLogEntry('error', `Failed to load configuration: ${error.message}`);
        }
    };
    
    reader.readAsText(file);
    // Clear the input so the same file can be loaded again
    event.target.value = '';
}
