import express from 'express';
// const sqlite3 = require('sqlite3').verbose();
import path from 'path';
import cors from 'cors';
import axios from 'axios';

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { networkInterfaces } from 'os';


dotenv.config();

const app = express();
const PORT = 3456;

// Initialize the Neon SQL client using the environment variable
const sql = neon(process.env.DATABASE_URL);

// Telegram configuration
// const TELEGRAM_TOKEN = "8504939451:AAGk6SWzsz75eTxcRnHrObsKW7hBtfOjpjQ";
// const TELEGRAM_CHAT_ID = 8445814360;
// const TELEGRAM_CHAT_ID = 8199860956;
const TELEGRAM_TOKEN = "8566802281:AAEvStO3wZGw-5nAgOtnNgOzcCJPVFAR5nk";
const TELEGRAM_CHAT_ID = 8445814360;
const ALERT_MINUTES = 20;
const BUFFER_MINUTES = 10;
const __dirname = import.meta.dirname;

// Middleware
app.use(cors());
app.use(express.json());
// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));


// Database initialization
// const db = new sqlite3.Database('./bookings.db', (err) => {
//   if (err) {
//     console.error('Database connection error:', err);
//   } else {
//     console.log('Connected to SQLite database');
//     initDatabase();
//   }
// });

async function initDatabase() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer TEXT NOT NULL,
                service TEXT NOT NULL,
                bed TEXT NOT NULL,
                note TEXT DEFAULT '',
                start TEXT NOT NULL,
                "end" TEXT NOT NULL,
                price INTEGER DEFAULT 0,
                notified INTEGER DEFAULT 0
            );` 
    } catch (error) {
        console.error('Error creating table:', err);
        // res.status(500).json({ success: false, error: error.message });
    }
    await sql(`ALTER TABLE bookings ADD COLUMN note TEXT DEFAULT ''`);
    console.log('Database table ready');
}

// API Routes

// Get all bookings for a specific date
app.get('/api/bookings/:date', async (req, res) => {
  const date = req.params.date;
  try {
    //  WHERE date(start) = ${date}
    const rows = await sql`
        SELECT id, customer, service, bed, note, start, "end", price
        FROM bookings
        WHERE date(start) = ${date}::date
        ORDER BY start`;

    res.json(rows || []);  
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  
});

// Create new booking
app.post('/api/bookings', async (req, res) => {
  const { customer, service, bed, note, start, end, price } = req.body;
  
  // Check for overlaps
  const startDate = new Date(start);
  const dateStr = startDate.toISOString().split('T')[0];
  
  try {
    const rows = await sql
    `SELECT start, "end" FROM bookings
     WHERE bed = ${bed} AND date(start) = ${dateStr}::date`;

     // Check for overlaps: strictly disallow any overlap
      const newStart = new Date(start);
      const newEnd = new Date(end);

      for (const row of rows) {
        const existingStart = new Date(row.start);
        const existingEnd = new Date(row.end);
        if (newStart < existingEnd && newEnd > existingStart) {
          return res.status(400).json({ error: 'Khung giờ bị trùng' });
        }
      }
      
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
      
      
      // Insert new booking
      try {
        await sql
        `INSERT INTO bookings (customer, service, bed, note, start, "end", price, notified)
         VALUES (${customer || ''}, ${service}, ${bed}, ${note || ''}, ${start}, ${end}, ${price || 0}, 0)`;
      } catch (err) {
        console.log('======== loi gi ', err)
        res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Booking created successfully' });
});

// Update existing booking
app.put('/api/bookings/:id', async (req, res) => {
  const id = req.params.id;
  const { customer, service, bed, note, start, end, price } = req.body;

  const startDate = new Date(start);
  const dateStr = startDate.toISOString().split('T')[0];

  try {
   const rows = await sql
    `SELECT start, "end" FROM bookings
     WHERE bed = ${bed} AND date(start) = ${dateStr}::date AND id != ${id}`;

     // Check for overlaps: strictly disallow any overlap
      const newStart = new Date(start);
      const newEnd = new Date(end);
      for (const row of rows) {
        const existingStart = new Date(row.start);
        const existingEnd = new Date(row.end);
        if (newStart < existingEnd && newEnd > existingStart) {
          return res.status(400).json({ error: 'Khung giờ bị trùng' });
        }
      }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

      

      try {
        await sql
            `UPDATE bookings SET customer = ${customer || ''}, service = ${service}, bed = ${bed}, note = ${note || ''}, start = ${start}, "end" = ${end}, price = ${price || 0}
            WHERE id = ${id}`;
      } catch (err) {
        res.status(500).json({ error: err.message });
        }
      res.json({ id, message: 'Booking updated successfully' });
});

// Delete booking
app.delete('/api/bookings/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    await sql`DELETE FROM bookings WHERE id = ${id}`;
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
    res.json({ message: 'Booking deleted successfully' });
});

// Get services
app.get('/api/services', (req, res) => {
    // Duration
    const femaleMassageDuration = 60;
    const maleMassageDuration = 50;
    const neckShoulderDuration = 50;
    const backPainDuration = 50;
    const bellyDuration = 30;
    // const hairCareDuration1 = 40;
    // const hairCareDuration2 = 60;
    // const hairCareDuration3 = 80;
    // const hairCareDuration4 = 95;
    // const hairCareDuration5 = 110;
    const hairCareDuration1 = 35;
    const hairCareDuration2 = 50;
    const hairCareDuration3 = 60;
    const hairCareDuration4 = 85;
    const hairCareDuration5 = 100;
    const extraServiceDuration = 15;
    
  // Price
  const femaleMassagePrice = 150;
  const maleMassagePrice   = 150;
  const neckShoulderPrice = 180;
  const backPainPrice = 180;
  const bellyPrice = 150;
  const hairCarePrice1 = 50;
  const hairCarePrice2 = 70;
  const hairCarePrice3 = 90;
  const hairCarePrice4 = 150;
  const hairCarePrice110 = 200;
  const extraServicePrice = 0;

  const services = {
    [`Massage body nữ (${femaleMassageDuration}p) - ${femaleMassagePrice}K`]: { duration: femaleMassageDuration, price: femaleMassagePrice, subName: `Body nữ (${femaleMassageDuration}p) - ${femaleMassagePrice}K` },
    [`Massage body nam (${maleMassageDuration}p) - ${maleMassagePrice}K`]: { duration: maleMassageDuration, price: maleMassagePrice, subName: `Body nam (${maleMassageDuration}p) - ${maleMassagePrice}K` },
    [`Trị liệu cổ vai gáy (${neckShoulderDuration}p) - ${neckShoulderPrice}K`]: { duration: neckShoulderDuration, price: neckShoulderPrice, subName: `Cổ vai gáy (${neckShoulderDuration}p) - ${neckShoulderPrice}K` },
    [`Trị liệu đau lưng (${backPainDuration}p) - ${backPainPrice}K`]: { duration: backPainDuration, price: backPainPrice, subName: `Đau lưng (${backPainDuration}p) - ${backPainPrice}K` },
    [`Massage bụng (${bellyDuration}p) - ${bellyPrice}K`]: { duration: bellyDuration, price: bellyPrice, subName: `Bụng (${bellyDuration}p) - ${bellyPrice}K` },
    [`Gội đầu dưỡng sinh (${hairCareDuration1}p) - ${hairCarePrice1}K`]: { duration: hairCareDuration1, price: hairCarePrice1, subName: `Gội (${hairCareDuration1}p) - ${hairCarePrice1}K` },
    [`Gội đầu dưỡng sinh (${hairCareDuration2}p) - ${hairCarePrice2}K`]: { duration: hairCareDuration2, price: hairCarePrice2, subName: `Gội (${hairCareDuration2}p) - ${hairCarePrice2}K` },
    [`Gội đầu dưỡng sinh (${hairCareDuration3}p) - ${hairCarePrice3}K`]: { duration: hairCareDuration3, price: hairCarePrice3, subName: `Gội (${hairCareDuration3}p) - ${hairCarePrice3}K` },
    [`Gội đầu dưỡng sinh (${hairCareDuration4}p) - ${hairCarePrice4}K`]: { duration: hairCareDuration4, price: hairCarePrice4, subName: `Gội (${hairCareDuration4}p) - ${hairCarePrice4}K` },
    [`Gội đầu dưỡng sinh (${hairCareDuration5}p) - ${hairCarePrice110}K`]: { duration: hairCareDuration5, price: hairCarePrice110, subName: `Gội (${hairCareDuration5}p) - ${hairCarePrice110}K` },
    [`Dịch vụ thêm (${extraServiceDuration}p)`]: { duration: extraServiceDuration, price: extraServicePrice, subName: `Thêm (${extraServiceDuration}p) - ${extraServicePrice}K` }
  };
  res.json(services);
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://${getLocalIP()}:${PORT}`);
  console.log(`\n📱 Other devices can access via: http://${getLocalIP()}:${PORT}`);
//   startTelegramLoop();
});

// Get local IP address
function getLocalIP() {
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Graceful shutdown
process.on('SIGINT', () => {
//   db.close((err) => {
//     if (err) {
//       console.error('Error closing database:', err);
//     } else {
//       console.log('Database connection closed');
//     }
//    process.exit(0);
//   });
    process.exit(0);
});
