# Modbus RTU Tester

A comprehensive Node.js application for testing Modbus RTU communication over both Serial (RS485/RS232) and Ethernet connections.

## Features

✅ **All Requested Features Implemented:**

1. **Change Serial COM Port and Settings**
   - Dynamic detection of available COM ports
   - Configurable baud rate (9600, 19200, 38400, 57600, 115200)
   - Configurable data bits (7, 8)
   - Configurable stop bits (1, 2)
   - Configurable parity (None, Even, Odd)

2. **Change Ethernet IP Address and Port**
   - Configurable IP address for Modbus TCP server
   - Configurable TCP port (default: 502)

3. **Text Editor for Modbus Configuration**
   - Modbus slave ID (1-247)
   - Start address (0-65535)
   - Number of registers to read (1-125)

4. **Facility to Update Register Values**
   - Click on any data cell to open write popup
   - Modal dialog for entering new values
   - Write single register functionality

5. **Set Modbus Data Read Interval**
   - Configurable read interval in seconds (0.1-60)
   - Real-time interval updates

6. **Display Response Status**
   - Success/Error status display
   - Detailed error messages
   - Real-time connection status
   - Comprehensive logging system

## Additional Features

- **Real-time Data Visualization**: Live grid display of register values
- **Connection Management**: Easy connect/disconnect with status indicators
- **Comprehensive Logging**: Timestamped log entries with success/error indication
- **Responsive Design**: Works on desktop and mobile devices
- **Single Read Option**: One-time read functionality
- **Background Reading**: Continuous data reading with configurable intervals

## Installation

1. **Clone or download** this project to your local machine

2. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Choose LTS version

3. **Install dependencies**:
   ```bash
   npm install
   ```

## Usage

1. **Start the application**:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

2. **Open your web browser** and navigate to:
   ```
   http://localhost:3000
   ```

3. **Configure Connection**:
   - Choose Serial (RTU) or Ethernet (TCP)
   - For Serial: Select COM port and configure settings
   - For Ethernet: Enter IP address and port

4. **Configure Modbus Settings**:
   - Set Slave ID
   - Set Start Address
   - Set Number of registers to read
   - Set Read Interval

5. **Connect and Test**:
   - Click "Connect" to establish connection
   - Click "Start Reading" for continuous data monitoring
   - Click on any data cell to write new values
   - Monitor status and logs in real-time

## Project Structure

```
Modbus_tester/
├── package.json          # Project dependencies and scripts
├── app.js                # Main server application
├── README.md             # This file
└── public/               # Web interface files
    ├── index.html        # Main HTML page
    ├── styles.css        # CSS styling
    └── script.js         # Client-side JavaScript
```

## Dependencies

- **express**: Web server framework
- **socket.io**: Real-time bidirectional communication
- **modbus-serial**: Modbus RTU/TCP library
- **serialport**: Serial port communication

## API Endpoints

- `GET /api/serial-ports` - Get available serial ports
- `POST /api/connect` - Connect to Modbus device
- `POST /api/disconnect` - Disconnect from device
- `POST /api/modbus-config` - Update Modbus configuration
- `POST /api/interval` - Update read interval
- `POST /api/start-reading` - Start continuous reading
- `POST /api/stop-reading` - Stop continuous reading
- `POST /api/write-register` - Write single register
- `GET /api/config` - Get current configuration

## Socket.IO Events

- `connectionStatus` - Connection state updates
- `modbusData` - Real-time data updates
- `writeResult` - Write operation results

## Troubleshooting

### Serial Connection Issues
- Ensure the COM port is not being used by another application
- Check cable connections and RS485/RS232 wiring
- Verify baud rate and other serial settings match your device
- On Windows, check Device Manager for correct COM port numbers

### Ethernet Connection Issues
- Verify IP address and port of Modbus TCP server
- Check network connectivity
- Ensure firewall is not blocking the connection
- Verify the target device supports Modbus TCP

### Permission Issues
- On Linux/Mac, you may need to add your user to the dialout group for serial access
- Run with appropriate permissions for serial port access

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the application logs in the web interface
3. Verify your Modbus device configuration
4. Test with known working Modbus devices/simulators
