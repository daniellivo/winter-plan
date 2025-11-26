/**
 * Simple proxy server to handle POST requests for shifts data
 * This allows n8n to send HTTP POST requests to receive shifts
 * 
 * Usage:
 * 1. Start this server: node server-proxy.js
 * 2. From n8n, POST to: http://localhost:3001/api/receive-shifts?professionalId=pro_123
 * 3. Body: [{"shiftDetails": {...}}, ...]
 */

import express from 'express'
import cors from 'cors'
import { createProxyMiddleware } from 'http-proxy-middleware'

const app = express()
const PORT = 3001

// Enable CORS for all origins (adjust in production)
app.use(cors())

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }))

// Store received shifts temporarily (in-memory)
const shiftsStore = new Map()

// POST endpoint to receive shifts
app.post('/api/receive-shifts', (req, res) => {
  try {
    const shiftsData = req.body
    const professionalId = req.query.professionalId

    console.log('📥 Received shifts data:', {
      count: Array.isArray(shiftsData) ? shiftsData.length : 0,
      professionalId
    })

    // Validate data
    if (!Array.isArray(shiftsData)) {
      return res.status(400).json({
        status: 'error',
        message: 'Body must be an array of shifts'
      })
    }

    if (!professionalId) {
      return res.status(400).json({
        status: 'error',
        message: 'professionalId query parameter is required'
      })
    }

    // Store shifts for this professional
    shiftsStore.set(professionalId, {
      data: shiftsData,
      timestamp: new Date().toISOString()
    })

    console.log('✅ Shifts stored successfully')

    // Return success response
    res.json({
      status: 'success',
      count: shiftsData.length,
      professionalId,
      message: 'Shifts received and stored',
      redirectUrl: `http://localhost:4173/winter-plan/calendar?professionalId=${professionalId}`
    })
  } catch (error) {
    console.error('❌ Error receiving shifts:', error)
    res.status(500).json({
      status: 'error',
      message: error.message
    })
  }
})

// GET endpoint to retrieve stored shifts
app.get('/api/shifts/:professionalId', (req, res) => {
  const { professionalId } = req.params
  const stored = shiftsStore.get(professionalId)

  if (!stored) {
    return res.status(404).json({
      status: 'error',
      message: 'No shifts found for this professional'
    })
  }

  res.json({
    status: 'success',
    data: stored.data,
    timestamp: stored.timestamp
  })
})

// Proxy all other requests to Vite dev server
app.use('/', createProxyMiddleware({
  target: 'http://localhost:4173',
  changeOrigin: true,
  ws: true
}))

app.listen(PORT, () => {
  console.log(`
🚀 Proxy server running on http://localhost:${PORT}

📡 POST endpoint: http://localhost:${PORT}/api/receive-shifts?professionalId=pro_123
📊 GET endpoint: http://localhost:${PORT}/api/shifts/:professionalId

💡 From n8n, send POST request to:
   http://localhost:${PORT}/api/receive-shifts?professionalId=pro_123
   
   Body: [{"shiftDetails": {...}}, ...]
  `)
})

