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
