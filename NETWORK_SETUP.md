# Network Access Setup Guide

## Accessing from Other Devices on Same WiFi

### Step 1: Start the Server

```bash
npm start
```

The server will display:
```
🚀 Server running on:
   Local:   http://localhost:3000
   Network: http://192.168.1.XXX:3000

📱 Other devices can access via: http://192.168.1.XXX:3000
```

### Step 2: Find Your Host IP Address

The server automatically displays your local IP address when it starts.

**Alternative ways to find your IP:**

**On macOS:**
```bash
ipconfig getifaddr en0
```

**On Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter.

**On Linux:**
```bash
hostname -I
```

### Step 3: Access from Other Devices

From any device on the same WiFi network, open a web browser and navigate to:
```
http://YOUR_IP_ADDRESS:3000
```

For example: `http://192.168.1.105:3000`

---

## Setting Up Friendly Hostname Alias

### Option 1: Using Hosts File (Recommended for Small Network)

This method requires editing the hosts file on **each device** that wants to use the friendly name.

#### On Client Devices (that will access the app):

**macOS/Linux:**
1. Open terminal and edit hosts file:
   ```bash
   sudo nano /etc/hosts
   ```

2. Add this line (replace with your actual IP):
   ```
   192.168.1.105    handspa.local
   ```

3. Save (Ctrl+X, then Y, then Enter)

4. Flush DNS cache:
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemctl restart nscd
   ```

**Windows:**
1. Run Notepad as Administrator

2. Open file: `C:\Windows\System32\drivers\etc\hosts`

3. Add this line (replace with your actual IP):
   ```
   192.168.1.105    handspa.local
   ```

4. Save and close

5. Flush DNS cache:
   ```cmd
   ipconfig /flushdns
   ```

**iOS/iPadOS:**
- Not possible without jailbreak
- Use the IP address or Option 2 below

**Android:**
- Requires root access or use Option 2

#### Access the App:
After setting up, you can access the app using:
```
http://handspa.local:3000
```

---

### Option 2: Using Bonjour/mDNS (macOS Host Only)

If your server is running on **macOS**, it automatically broadcasts via Bonjour.

**Access from other Apple devices:**
```
http://YOUR-MAC-NAME.local:3000
```

To find your Mac's hostname:
```bash
scutil --get LocalHostName
```

Example: If it shows `MacBook-Pro`, use:
```
http://MacBook-Pro.local:3000
```

**Note:** This works automatically on:
- macOS devices
- iOS/iPadOS devices
- Windows with Bonjour installed (comes with iTunes)
- Linux with Avahi installed

---

### Option 3: Router DNS (Best for Multiple Devices)

If you have access to your router's admin panel:

1. Log into your router (usually `192.168.1.1` or `192.168.0.1`)

2. Find **DHCP Settings** or **DNS Settings**

3. Set a **DHCP Reservation** for your server's MAC address to always get the same IP

4. Add a **Local DNS entry**:
   - Hostname: `handspa`
   - IP Address: Your server's IP

5. Save settings and reboot router if needed

**Access from any device:**
```
http://handspa:3000
```

Common routers with this feature:
- TP-Link: Advanced > Network > DHCP Server > Address Reservation
- ASUS: LAN > DHCP Server > Manual Assignment
- Netgear: Advanced > Setup > LAN Setup > Address Reservation
- Ubiquiti: Settings > Networks > Create New Network

---

### Option 4: Local DNS Server (Advanced)

For tech-savvy users, set up a local DNS server:

**Using Pi-hole or AdGuard Home:**
1. Install Pi-hole on a Raspberry Pi or spare computer
2. Add local DNS record: `handspa.local` → Your server IP
3. Set Pi-hole as DNS server in router settings
4. All devices will automatically use the friendly name

---

## Firewall Configuration

### macOS:
If you can't access from other devices, check firewall:

```bash
# Check firewall status
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Allow Node.js (if blocked)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
```

Or go to: **System Settings > Network > Firewall** and allow Node.js.

### Windows:
If Windows Firewall is blocking:

1. Open **Windows Defender Firewall**
2. Click **Advanced Settings**
3. **Inbound Rules > New Rule**
4. Port: **3000**, Protocol: **TCP**
5. Allow the connection
6. Name it "Hand Spa Booking"

### Linux:
```bash
# UFW
sudo ufw allow 3000/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

---

## Testing Connection

### From the server machine:
```bash
# Test local access
curl http://localhost:3000/api/services

# Test network access
curl http://YOUR_IP:3000/api/services
```

### From another device:
1. Make sure both devices are on the **same WiFi network**
2. Try pinging the server:
   ```bash
   ping YOUR_IP
   ```
3. Open browser and navigate to `http://YOUR_IP:3000`

---

## Troubleshooting

### Can't connect from other devices:
1. ✅ Both devices on same WiFi network?
2. ✅ Server is running on `0.0.0.0` (not just `localhost`)?
3. ✅ Firewall allows port 3000?
4. ✅ Using correct IP address?
5. ✅ Port 3000 not used by another application?

### Hostname doesn't resolve:
1. ✅ Hosts file edited correctly?
2. ✅ DNS cache flushed?
3. ✅ Using `.local` domain for mDNS?
4. ✅ Router DNS configured if using that method?

### Check port availability:
```bash
# macOS/Linux
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

---

## Security Considerations

⚠️ **Important Notes:**

1. **Local Network Only**: This setup only works on your local WiFi. The app is NOT accessible from the internet.

2. **No Authentication**: Currently, there's no login system. Anyone on your WiFi can access the app.

3. **Production Use**: For internet access or production deployment, you need:
   - HTTPS/SSL certificates
   - User authentication
   - Firewall rules
   - Reverse proxy (nginx/Apache)
   - Consider using services like ngrok for testing

---

## Quick Reference

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| IP Address | Works immediately | Hard to remember, changes with DHCP | Quick testing |
| Hosts File | Easy, no router access needed | Must configure each device | Small teams |
| Bonjour/mDNS | Automatic on Apple devices | Limited device support | Apple ecosystem |
| Router DNS | Works for all devices | Requires router access | Home/office |
| Local DNS Server | Most flexible | Complex setup | Advanced users |

---

## Example Usage

After setup, your team can access the app using:

```
http://handspa.local:3000
```

Instead of:

```
http://192.168.1.105:3000
```

Much easier to remember and share! 🎉
