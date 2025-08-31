const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ModbusRTU = require('modbus-serial');
const { SerialPort } = require('serialport');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Global variables
let modbusClient = new ModbusRTU();
let isConnected = false;
let currentConnectionType = null; // 'serial' or 'ethernet'
let readInterval = null;

// Function to create a fresh Modbus client
function createFreshModbusClient() {
    if (modbusClient && isConnected) {
        try {
            modbusClient.close(() => {});
        } catch (e) {
            // Ignore errors during close
        }
    }
    modbusClient = new ModbusRTU();
    isConnected = false;
}
let currentConfig = {
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
        registerType: 'holdingRegisters' // 'coils', 'discreteInputs', 'inputRegisters', 'holdingRegisters'
    },
    interval: 1000, // 1 second
    aliases: {} // Store address aliases: { address: "alias_name" }
};

// Get available serial ports
app.get('/api/serial-ports', async (req, res) => {
    try {
        const ports = await SerialPort.list();
        res.json(ports.map(port => ({
            path: port.path,
            manufacturer: port.manufacturer,
            vendorId: port.vendorId,
            productId: port.productId
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connect to Modbus device
app.post('/api/connect', async (req, res) => {
    try {
        const { type, config } = req.body;
        
        // Disconnect if already connected and create fresh client
        if (isConnected) {
            await disconnect();
        }
        createFreshModbusClient();

        console.log(`Attempting to connect via ${type}...`);

        currentConnectionType = type;
        
        if (type === 'serial') {
            currentConfig.serial = { ...currentConfig.serial, ...config };
            await modbusClient.connectRTUBuffered(
                currentConfig.serial.port,
                {
                    baudRate: currentConfig.serial.baudRate,
                    dataBits: currentConfig.serial.dataBits,
                    stopBits: currentConfig.serial.stopBits,
                    parity: currentConfig.serial.parity
                }
            );
        } else if (type === 'ethernet') {
            currentConfig.ethernet = { ...currentConfig.ethernet, ...config };
            await modbusClient.connectTCP(
                currentConfig.ethernet.ip,
                { port: currentConfig.ethernet.port }
            );
        }

        // Set up error handlers for connection stability
        modbusClient.on('error', (err) => {
            console.log('Modbus client error:', err.message);
            if (err.code === 'ECONNRESET' || err.code === 'ENOTCONN') {
                console.log('Connection lost, will attempt to reconnect on next operation');
                isConnected = false;
                io.emit('connectionStatus', { connected: false, error: 'Connection lost' });
            }
        });

        modbusClient.on('close', () => {
            console.log('Modbus connection closed');
            isConnected = false;
            io.emit('connectionStatus', { connected: false });
        });

        isConnected = true;
        currentConnectionType = type;
        
        res.json({ success: true, message: `Connected via ${type}` });
        io.emit('connectionStatus', { connected: true, type });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
        io.emit('connectionStatus', { connected: false, error: error.message });
    }
});

// Disconnect from Modbus device
app.post('/api/disconnect', async (req, res) => {
    try {
        await disconnect();
        res.json({ success: true, message: 'Disconnected' });
        io.emit('connectionStatus', { connected: false });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

async function disconnect() {
    if (readInterval) {
        clearInterval(readInterval);
        readInterval = null;
    }
    if (isConnected) {
        try {
            modbusClient.close(() => {});
        } catch (e) {
            // Ignore errors during close
        }
        isConnected = false;
        currentConnectionType = null;
    }
}

// Reconnect to Modbus device (useful after connection loss)
app.post('/api/reconnect', async (req, res) => {
    try {
        if (!currentConnectionType) {
            return res.status(400).json({ success: false, error: 'No previous connection type found' });
        }

        console.log(`Attempting to reconnect via ${currentConnectionType}...`);
        
        // Create fresh client and reconnect
        createFreshModbusClient();
        
        if (currentConnectionType === 'serial') {
            await modbusClient.connectRTUBuffered(
                currentConfig.serial.port,
                {
                    baudRate: currentConfig.serial.baudRate,
                    dataBits: currentConfig.serial.dataBits,
                    stopBits: currentConfig.serial.stopBits,
                    parity: currentConfig.serial.parity
                }
            );
        } else if (currentConnectionType === 'ethernet') {
            await modbusClient.connectTCP(
                currentConfig.ethernet.ip,
                { port: currentConfig.ethernet.port }
            );
        }

        // Set up error handlers again
        modbusClient.on('error', (err) => {
            console.log('Modbus client error:', err.message);
            if (err.code === 'ECONNRESET' || err.code === 'ENOTCONN') {
                console.log('Connection lost, will attempt to reconnect on next operation');
                isConnected = false;
                io.emit('connectionStatus', { connected: false, error: 'Connection lost' });
            }
        });

        modbusClient.on('close', () => {
            console.log('Modbus connection closed');
            isConnected = false;
            io.emit('connectionStatus', { connected: false });
        });

        isConnected = true;
        
        res.json({ success: true, message: `Reconnected via ${currentConnectionType}` });
        io.emit('connectionStatus', { connected: true, type: currentConnectionType });
    } catch (error) {
        console.error('Reconnection failed:', error.message);
        res.status(500).json({ success: false, error: error.message });
        io.emit('connectionStatus', { connected: false, error: error.message });
    }
});

// Update Modbus configuration
app.post('/api/modbus-config', (req, res) => {
    try {
        const { slaveId, startAddress, quantity, registerType } = req.body;
        currentConfig.modbus = {
            slaveId: slaveId || currentConfig.modbus.slaveId,
            startAddress: startAddress !== undefined ? startAddress : currentConfig.modbus.startAddress,
            quantity: quantity || currentConfig.modbus.quantity,
            registerType: registerType || currentConfig.modbus.registerType
        };
        
        res.json({ success: true, config: currentConfig.modbus });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update read interval
app.post('/api/interval', (req, res) => {
    try {
        const { interval } = req.body;
        currentConfig.interval = interval * 1000; // Convert to milliseconds
        
        // Restart reading with new interval if currently reading
        if (readInterval) {
            stopReading();
            startReading();
        }
        
        res.json({ success: true, interval: currentConfig.interval / 1000 });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start continuous reading
app.post('/api/start-reading', (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({ success: false, error: 'Not connected to Modbus device' });
        }
        
        startReading();
        res.json({ success: true, message: 'Started reading' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Stop continuous reading
app.post('/api/stop-reading', (req, res) => {
    try {
        stopReading();
        res.json({ success: true, message: 'Stopped reading' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

function startReading() {
    if (readInterval) return;
    
    readInterval = setInterval(async () => {
        try {
            if (!isConnected) {
                stopReading();
                return;
            }
            
            modbusClient.setID(currentConfig.modbus.slaveId);
            let data;
            
            // Read different register types based on configuration
            switch (currentConfig.modbus.registerType) {
                case 'coils':
                    data = await modbusClient.readCoils(
                        currentConfig.modbus.startAddress,
                        currentConfig.modbus.quantity
                    );
                    break;
                case 'discreteInputs':
                    data = await modbusClient.readDiscreteInputs(
                        currentConfig.modbus.startAddress,
                        currentConfig.modbus.quantity
                    );
                    break;
                case 'inputRegisters':
                    data = await modbusClient.readInputRegisters(
                        currentConfig.modbus.startAddress,
                        currentConfig.modbus.quantity
                    );
                    break;
                case 'holdingRegisters':
                default:
                    data = await modbusClient.readHoldingRegisters(
                        currentConfig.modbus.startAddress,
                        currentConfig.modbus.quantity
                    );
                    break;
            }
            
            io.emit('modbusData', {
                success: true,
                timestamp: new Date().toISOString(),
                data: data.data,
                buffer: data.buffer,
                registerType: currentConfig.modbus.registerType
            });
        } catch (error) {
            console.log('Read error:', error.message);
            
            // Handle connection errors
            if (error.code === 'ECONNRESET' || error.code === 'ENOTCONN' || error.message.includes('not connected')) {
                console.log('Connection lost during read, stopping automatic reading');
                isConnected = false;
                stopReading();
                io.emit('connectionStatus', { connected: false, error: 'Connection lost during read' });
            }
            
            io.emit('modbusData', {
                success: false,
                timestamp: new Date().toISOString(),
                error: error.message
            });
        }
    }, currentConfig.interval);
}

function stopReading() {
    if (readInterval) {
        clearInterval(readInterval);
        readInterval = null;
    }
}

// Write single register or coil
app.post('/api/write-register', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({ success: false, error: 'Not connected to Modbus device' });
        }
        
        const { address, value } = req.body;
        const registerType = currentConfig.modbus.registerType;
        
        // Check if write operation is supported for current register type
        if (registerType !== 'holdingRegisters' && registerType !== 'coils') {
            return res.status(400).json({ 
                success: false, 
                error: `Write operations not supported for ${registerType}. Only coils and holding registers can be written.` 
            });
        }
        
        modbusClient.setID(currentConfig.modbus.slaveId);
        
        if (registerType === 'coils') {
            // For coils, value should be boolean (0 or 1)
            const boolValue = Boolean(value);
            await modbusClient.writeCoil(address, boolValue);
            res.json({ success: true, message: `Written ${boolValue ? 'ON' : 'OFF'} to coil ${address}` });
        } else {
            // For holding registers
            await modbusClient.writeRegister(address, value);
            res.json({ success: true, message: `Written value ${value} to holding register ${address}` });
        }
        
        io.emit('writeResult', { success: true, address, value, registerType });
    } catch (error) {
        console.error('Write register error:', error.message);
        
        // Handle connection errors
        if (error.code === 'ECONNRESET' || error.code === 'ENOTCONN' || error.message.includes('not connected')) {
            console.log('Connection lost during write operation');
            isConnected = false;
            io.emit('connectionStatus', { connected: false, error: 'Connection lost during write' });
        }
        
        res.status(500).json({ success: false, error: error.message });
        io.emit('writeResult', { success: false, error: error.message });
    }
});

// Write string block to holding registers
app.post('/api/write-string', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({ success: false, error: 'Not connected to Modbus device' });
        }
        
        const { startAddress, text, maxLength } = req.body;
        const registerType = currentConfig.modbus.registerType;
        
        // String writes are only supported for holding registers
        if (registerType !== 'holdingRegisters') {
            return res.status(400).json({ 
                success: false, 
                error: 'String write operations are only supported for holding registers' 
            });
        }
        
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ success: false, error: 'Invalid text data' });
        }
        
        if (text.length > maxLength) {
            return res.status(400).json({ 
                success: false, 
                error: `Text too long. Maximum ${maxLength} characters allowed` 
            });
        }
        
        // Convert string to register values (2 characters per register)
        // Add null terminator (0) at the end to indicate end of string
        const textWithNull = text + '\0';
        const registers = [];
        
        for (let i = 0; i < textWithNull.length; i += 2) {
            const char1 = textWithNull.charCodeAt(i) || 0;
            const char2 = textWithNull.charCodeAt(i + 1) || 0;
            // Combine two characters into one 16-bit register (big-endian)
            const registerValue = (char1 << 8) | char2;
            registers.push(registerValue);
        }
        
        if (registers.length === 0) {
            return res.status(400).json({ success: false, error: 'No data to write' });
        }
        
        modbusClient.setID(currentConfig.modbus.slaveId);
        
        // Write all registers
        if (registers.length === 1) {
            await modbusClient.writeRegister(startAddress, registers[0]);
        } else {
            await modbusClient.writeRegisters(startAddress, registers);
        }
        
        res.json({ 
            success: true, 
            message: `String "${text}" with null terminator written to ${registers.length} register(s) starting at address ${startAddress}`,
            registersWritten: registers.length,
            startAddress: startAddress,
            endAddress: startAddress + registers.length - 1,
            textLength: text.length,
            totalLength: textWithNull.length
        });
        
        io.emit('writeResult', { 
            success: true, 
            startAddress, 
            registersWritten: registers.length,
            text,
            registerType: 'string' 
        });
        
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
        io.emit('writeResult', { success: false, error: error.message });
    }
});

// Get current configuration
app.get('/api/config', (req, res) => {
    res.json({
        ...currentConfig,
        connected: isConnected,
        connectionType: currentConnectionType,
        reading: readInterval !== null
    });
});

// Set address alias
app.post('/api/set-alias', (req, res) => {
    try {
        const { address, alias } = req.body;
        if (alias && alias.trim()) {
            currentConfig.aliases[address] = alias.trim();
        } else {
            delete currentConfig.aliases[address];
        }
        res.json({ success: true, aliases: currentConfig.aliases });
        io.emit('aliasUpdated', { address, alias: currentConfig.aliases[address] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all aliases
app.get('/api/aliases', (req, res) => {
    res.json(currentConfig.aliases);
});

// Delete alias
app.delete('/api/alias/:address', (req, res) => {
    try {
        const address = req.params.address;
        delete currentConfig.aliases[address];
        res.json({ success: true, aliases: currentConfig.aliases });
        io.emit('aliasUpdated', { address, alias: null });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current status to new client
    socket.emit('connectionStatus', {
        connected: isConnected,
        type: currentConnectionType
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await disconnect();
    server.close(() => {
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Modbus Tester running on http://localhost:${PORT}`);
});
