# Modbus RTU Tester

A comprehensive Node.js application for testing Modbus RTU communication over both Serial (RS485/RS232) and Ethernet connections with advanced address aliasing functionality.

## Features

✅ **All Requested Features Implemented:**

1. **Change Serial COM Port and Settings**
   - Dynamic detection of available COM ports with refresh functionality
   - Configurable baud rate (9600, 19200, 38400, 57600, 115200)
   - Configurable data bits (7, 8)
   - Configurable stop bits (1, 2)
   - Configurable parity (None, Even, Odd)

2. **Change Ethernet IP Address and Port**
   - Configurable IP address for Modbus TCP server
   - Configurable TCP port (default: 502)
   - Real-time connection switching between Serial and Ethernet

3. **Text Editor for Modbus Configuration**
   - Modbus slave ID (1-247)
   - Start address (0-65535)
   - Number of registers to read (1-125)
   - Real-time configuration updates

4. **Facility to Update Register Values**
   - Click on any data cell to open write popup
   - Modal dialog for entering new values
   - Write single register functionality
   - Immediate feedback on write operations

5. **Set Modbus Data Read Interval**
   - Configurable read interval in seconds (0.1-60)
   - Real-time interval updates
   - Automatic restart with new timing

6. **Display Response Status**
   - Success/Error status display
   - Detailed error messages
   - Real-time connection status
   - Comprehensive logging system with timestamps

7. **🆕 Address Aliasing System**
   - Assign custom names to Modbus addresses (e.g., "Temperature", "Pressure", "Motor Speed")
   - Aliases displayed prominently while keeping addresses visible
   - Easy alias management with hover controls
   - Real-time alias updates across all connected clients
   - Persistent alias storage during session

## Additional Features

- **Real-time Web Interface**: Modern, responsive design that works on desktop and mobile
- **Live Data Grid**: Visual display of all register values with customizable aliases
- **Address Aliasing**: Name your addresses with meaningful labels (e.g., "Tank Level", "Pump Status")
- **Hover Controls**: Intuitive interface with alias management controls that appear on demand
- **Comprehensive Logging**: Timestamped log entries with color-coded success/error indication
- **Connection Management**: Easy connect/disconnect with real-time status indicators
- **Single Read Option**: One-time read functionality for testing individual operations
- **Background Reading**: Continuous data reading with configurable intervals
- **Socket.IO Integration**: Real-time updates without page refresh
- **Cross-platform Compatibility**: Works on Windows, Linux, and macOS
- **Mobile Responsive**: Optimized interface for tablets and smartphones

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
   - Use alias controls to name your addresses
   - Monitor status and logs in real-time

## Using Address Aliases

The application now supports naming your Modbus addresses with meaningful aliases:

### Setting Aliases
1. **Start reading data** from your Modbus device
2. **Hover over any data cell** - an "A" button will appear
3. **Click the "A" button** to open the alias management dialog
4. **Enter a descriptive name** (e.g., "Motor Speed", "Tank Level", "Temperature")
5. **Click "Set Alias"** to save the name

### Managing Aliases
- **Update**: Click the "A" button again and enter a new name
- **Remove**: Click "Remove Alias" in the alias dialog
- **View**: Aliases appear prominently above the address in each data cell

### Example Display
```
┌─────────────────┐
│   Temperature   │  ← Your custom alias (blue)
│    Addr: 40001  │  ← Original address (gray)
│      2450       │  ← Current value (large)
└─────────────────┘
```

### Benefits
- **Industrial Applications**: Use meaningful names like "Pump Status", "Flow Rate"
- **Team Collaboration**: Everyone sees the same descriptive names
- **Quick Identification**: No need to remember what each address represents
- **Maintains Technical Info**: Original addresses remain visible for debugging

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
- `POST /api/set-alias` - Set or update address alias
- `GET /api/aliases` - Get all current aliases
- `DELETE /api/alias/:address` - Remove specific address alias

## Socket.IO Events

- `connectionStatus` - Connection state updates
- `modbusData` - Real-time data updates
- `writeResult` - Write operation results
- `aliasUpdated` - Address alias changes

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

### Alias Issues
- Aliases are stored in memory and will be lost when the server restarts
- If aliases don't appear, check the browser console for JavaScript errors
- Ensure you're hovering over the data cells to see the alias controls
- Maximum alias length is 20 characters to maintain layout

## Common Use Cases

### Industrial Applications
- **Temperature Sensors**: "Furnace_Temp", "Ambient_Temp", "Coolant_Temp"
- **Motor Controls**: "Pump_Speed", "Fan_RPM", "Conveyor_Speed"
- **Tank Monitoring**: "Water_Level", "Oil_Pressure", "Tank_Volume"
- **Process Variables**: "Flow_Rate", "Pressure_PSI", "Valve_Position"

### Testing and Development
- **Register Mapping**: Quickly identify what each address represents
- **Team Communication**: Share meaningful names across development team
- **Documentation**: Generate clear reports with named parameters
- **Debugging**: Maintain technical address info while using friendly names

## License

MIT License - feel free to use and modify as needed.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Review the application logs in the web interface
3. Verify your Modbus device configuration
4. Test with known working Modbus devices/simulators
