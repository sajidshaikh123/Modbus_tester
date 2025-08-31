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
        quantity: 10
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
        
        // Disconnect if already connected
        if (isConnected) {
            await disconnect();
        }

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

        modbusClient.setTimeout(5000);
        isConnected = true;
        
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

// Update Modbus configuration
app.post('/api/modbus-config', (req, res) => {
    try {
        const { slaveId, startAddress, quantity } = req.body;
        currentConfig.modbus = {
            slaveId: slaveId || currentConfig.modbus.slaveId,
            startAddress: startAddress !== undefined ? startAddress : currentConfig.modbus.startAddress,
            quantity: quantity || currentConfig.modbus.quantity
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
            const data = await modbusClient.readHoldingRegisters(
                currentConfig.modbus.startAddress,
                currentConfig.modbus.quantity
            );
            
            io.emit('modbusData', {
                success: true,
                timestamp: new Date().toISOString(),
                data: data.data,
                buffer: data.buffer
            });
        } catch (error) {
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

// Write single register
app.post('/api/write-register', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(400).json({ success: false, error: 'Not connected to Modbus device' });
        }
        
        const { address, value } = req.body;
        modbusClient.setID(currentConfig.modbus.slaveId);
        await modbusClient.writeRegister(address, value);
        
        res.json({ success: true, message: `Written value ${value} to address ${address}` });
        io.emit('writeResult', { success: true, address, value });
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
