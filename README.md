# Modbus RTU/TCP Tester

A comprehensive Node.js application for testing Modbus RTU/TCP communication with advanced features including serial/ethernet support, address aliasing, register type selection, string writing, and robust connection recovery.

## 🚀 Features

### **Core Communication Features**
- **Serial (RTU) Support**: RS485/RS232 communication with full COM port configuration
- **Ethernet (TCP) Support**: TCP/IP Modbus communication with configurable IP and port
- **Dynamic Connection Switching**: Seamless switching between serial and ethernet modes
- **Connection Recovery**: Automatic detection and recovery from connection drops (ECONNRESET handling)
- **Real-time Status**: Live connection status and data updates via WebSocket

### **Modbus Register Support**
- **All Register Types**: Support for Coils (0x), Discrete Inputs (1x), Input Registers (3x), and Holding Registers (4x)
- **Register Type Dropdown**: Easy selection between different Modbus function codes
- **Configurable Range**: Start address (0-65535) and quantity (1-125) settings
- **Real-time Reading**: Configurable read intervals (0.1-60 seconds)

### **Advanced Write Operations**
- **Single Register Write**: Click any data cell to write new values
- **String Block Write**: Write text strings to consecutive holding registers
- **Null Terminator Support**: Automatic null termination for string data
- **Write Validation**: Type-specific write operation validation
- **Immediate Feedback**: Real-time write operation results

### **Address Aliasing System**
- **Custom Names**: Assign meaningful names to Modbus addresses (e.g., "Temperature", "Motor Speed")
- **Persistent Aliases**: Aliases maintained per register type throughout session
- **Visual Display**: Aliases prominently displayed with addresses still visible
- **Easy Management**: Simple click-to-edit alias functionality
- **Configuration Save/Load**: Aliases included in configuration exports

### **User Interface Features**
- **Responsive Design**: Professional web interface that works on all devices
- **Real-time Updates**: Live data display with automatic refresh
- **Color-coded Status**: Visual indicators for ON/OFF states and connection status
- **Comprehensive Logging**: Detailed operation logs with timestamps
- **Configuration Management**: Save and load complete configuration sets as JSON

### **Connection Management**
- **Smart Reconnection**: Automatic reconnection capability after connection loss
- **Error Recovery**: Graceful handling of communication errors
- **Fresh Client Creation**: Clean connection reestablishment for stability
- **Connection Monitoring**: Real-time detection of connection drops

## Additional Features

- **Real-time Web Interface**: Modern, responsive design that works on desktop and mobile
## 🛠 Installation

### Prerequisites
- **Node.js** (v14 or higher) - Download from [nodejs.org](https://nodejs.org/)
- **Serial Port Access** (for RTU communication) - Ensure proper drivers are installed
- **Network Access** (for TCP communication) - Firewall configuration may be needed

### Setup Steps

1. **Clone or download** this project:
   ```bash
   git clone <repository-url>
   cd Modbus_tester
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   Open your web browser and navigate to: `http://localhost:3000`

## 📖 Usage Guide

### **Initial Setup**
1. **Choose Connection Type**: Select Serial (RTU) or Ethernet (TCP) using radio buttons
2. **Configure Connection Parameters**:
   - **Serial**: Select COM port, baud rate, data bits, stop bits, parity
   - **Ethernet**: Enter IP address and port number
3. **Set Modbus Parameters**: Slave ID, start address, quantity, register type
4. **Connect**: Click the "Connect" button to establish communication

### **Reading Data**
1. **Start Continuous Reading**: Click "Start Reading" for automatic data updates
2. **Single Read**: Use "Single Read" for one-time data retrieval
3. **Adjust Interval**: Change read interval in real-time (0.1-60 seconds)
4. **Monitor Status**: Watch connection and reading status indicators

### **Writing Data**
1. **Single Register Write**: Click any data cell to open write dialog
2. **String Block Write**: Use the string write panel for text data
   - Enter text in the textarea
   - Automatic null termination for C-style strings
   - Real-time character and register count display
3. **Write Validation**: Only supported register types allow write operations

### **Address Aliasing**
1. **Set Aliases**: Click the "A" button next to any address
2. **Manage Names**: Enter meaningful names like "Temperature", "Motor Speed"
### **Connection Recovery**
1. **Automatic Detection**: Application automatically detects connection drops
2. **Manual Reconnection**: Use the "Reconnect" button to restore connection
3. **Fresh Client Creation**: Each reconnection uses a clean client instance
4. **Error Handling**: Graceful handling of ECONNRESET and similar errors

## 🔧 Technical Details

### **Supported Modbus Functions**
- **01 - Read Coils**: Read multiple coil status (0x references)
- **02 - Read Discrete Inputs**: Read input status (1x references)  
- **03 - Read Holding Registers**: Read multiple holding registers (4x references)
- **04 - Read Input Registers**: Read multiple input registers (3x references)
- **05 - Write Single Coil**: Write single coil value
- **06 - Write Single Register**: Write single holding register
- **16 - Write Multiple Registers**: Write string blocks to holding registers

### **String Writing Features**
- **Automatic Null Termination**: Strings automatically get null terminator (\\0)
- **Character Encoding**: 2 characters per 16-bit register (big-endian)
- **Length Validation**: Ensures string + null terminator fits in specified length
- **Visual Feedback**: Real-time character count with null terminator indication
- **Register Calculation**: Automatic register count calculation

### **Connection Types**
- **Serial RTU**: RS485/RS232 with full parameter configuration
- **Ethernet TCP**: Standard Modbus TCP over IP networks
- **Dynamic Switching**: Change connection types without restart

### **Error Handling**
- **Connection Recovery**: Automatic detection and recovery from dropped connections
- **ECONNRESET Handling**: Graceful handling of server-side connection resets
- **Timeout Management**: Built-in timeout handling with meaningful error messages
- **Retry Logic**: Configurable retry mechanisms for robust communication

## 📱 User Interface

### **Responsive Design**
- **Desktop Optimized**: Full-featured interface for desktop browsers
- **Mobile Friendly**: Touch-optimized controls for tablets and phones
- **Real-time Updates**: Live data refresh via WebSocket connections
- **Professional Styling**: Clean, modern interface with intuitive controls

### **Data Visualization**
- **Grid Layout**: Organized display of register values
- **Color Coding**: Visual indicators for ON/OFF states and connection status
- **Address Formatting**: Proper Modbus address formatting (0x, 1x, 3x, 4x prefixes)
- **Alias Integration**: Seamless display of custom names with addresses

### **Logging System**
- **Timestamped Entries**: All operations logged with precise timestamps
- **Color-coded Messages**: Success (green), errors (red), info (blue)
- **Detailed Information**: Comprehensive operation details and results
- **Auto-scroll**: Latest entries automatically visible

## 🔍 Troubleshooting

### **Connection Issues**
- **Serial Problems**: Check COM port availability, driver installation, cable connections
- **Ethernet Problems**: Verify IP address, port number, network connectivity, firewall settings
- **ECONNRESET Errors**: Use the reconnect feature, check server-side connection limits

### **Data Reading Issues**
- **Timeout Errors**: Verify slave ID, check device responsiveness, ensure correct register addresses
- **Invalid Data**: Confirm register type matches device configuration
- **No Response**: Check physical connections, power supply, communication parameters

### **String Writing Issues**
- **Length Errors**: Ensure text + null terminator fits within specified max length
- **Encoding Problems**: Verify device expects ASCII encoding and big-endian format
- **Write Failures**: Confirm device supports write operations on target registers
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
## 📦 Dependencies

### **Core Dependencies**
- **express** (^4.18.2): Web server framework for REST API and static file serving
- **socket.io** (^4.7.5): Real-time bidirectional communication between client and server
- **modbus-serial** (^8.0.17): Comprehensive Modbus RTU/TCP communication library
- **serialport** (^12.0.0): Cross-platform serial port access for RTU communication

### **Development Dependencies**
- **nodemon** (^3.0.2): Auto-restart server during development

## 🌐 API Reference

### **Connection Management**
- `GET /api/serial-ports` - Retrieve available COM ports with device information
- `POST /api/connect` - Establish connection to Modbus device (serial or ethernet)
- `POST /api/disconnect` - Gracefully disconnect from current device
- `POST /api/reconnect` - Reconnect using last successful connection parameters

### **Configuration**
- `POST /api/modbus-config` - Update Modbus parameters (slave ID, addresses, register type)
- `POST /api/interval` - Modify read interval for continuous monitoring
- `GET /api/config` - Retrieve current complete configuration

### **Data Operations**
- `POST /api/start-reading` - Begin continuous data reading with configured interval
- `POST /api/stop-reading` - Stop continuous data reading
- `POST /api/write-register` - Write single register or coil value
- `POST /api/write-string` - Write string block with automatic null termination

### **Alias Management**
- `POST /api/set-alias` - Create or update address alias
- `GET /api/aliases` - Retrieve all current aliases for active register type
- `DELETE /api/alias/:address` - Remove specific address alias

### **Socket.IO Events**
- `connectionStatus` - Real-time connection state updates
- `modbusData` - Live data updates from continuous reading
- `writeResult` - Write operation results and feedback
- `aliasUpdated` - Address alias change notifications

## 🎯 Use Cases

### **Industrial Automation**
- Monitor PLC registers and I/O status
- Test HMI communication interfaces
- Debug Modbus device configurations
- Validate automation system communications

### **Device Development**
- Test embedded Modbus implementations
- Verify register mappings and data formats
- Debug communication protocols
- Validate string handling in devices

### **System Integration**
- Test network connectivity between devices
- Verify Modbus gateway configurations
- Debug serial communication issues
- Validate TCP/IP Modbus implementations

### **Educational & Training**
- Learn Modbus protocol fundamentals
- Practice industrial communication concepts
- Demonstrate real-time data acquisition
- Understand register addressing schemes

## 🚨 Known Limitations

- **Session Storage**: Aliases are stored in memory and reset on server restart
- **Single Client**: Optimized for single user, multiple concurrent users may conflict
- **Register Limits**: Respects Modbus protocol limits (125 registers max per read)
- **Platform Dependencies**: Serial communication requires platform-specific drivers

## 🔮 Future Enhancements

- **Database Storage**: Persistent alias and configuration storage
- **Multi-user Support**: Session management for multiple concurrent users
- **Data Logging**: Historical data storage and export capabilities
- **Advanced Diagnostics**: Communication statistics and performance metrics
- **Protocol Extensions**: Support for additional Modbus variants and custom functions

## 📄 License

MIT License - Feel free to use, modify, and distribute as needed.

## 📞 Support & Contributing

### **Getting Help**
- Check the troubleshooting section above for common issues
- Review the console logs in both browser and server terminal
- Verify hardware connections and device configurations
- Test with known working Modbus devices first

### **Reporting Issues**
- Provide detailed error messages and console logs
- Include connection type, device details, and configuration used
- Specify operating system and Node.js version
- Describe expected vs actual behavior

### **Contributing**
- Fork the repository and create feature branches
- Follow existing code style and structure
- Test thoroughly with both serial and ethernet connections
- Update documentation for new features

## 🎉 Acknowledgments

This application was developed to provide a comprehensive, user-friendly tool for Modbus communication testing and monitoring. Special thanks to the Node.js community and the maintainers of the excellent libraries that made this project possible.

---

**Happy Modbus Testing!** 🚀

For issues or questions:
1. Check the browser console for error messages
2. Review the application logs in the web interface
3. Verify your Modbus device configuration
4. Test with known working Modbus devices/simulators
