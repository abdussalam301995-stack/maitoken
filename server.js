const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Temporary in-memory database
const users = {};

// 1. Fetch or Register User
app.post('/api/user', (req, res) => {
  const { telegramId, username } = req.body;

  if (!telegramId) {
    return res.status(400).json({ success: false, message: 'telegramId is required' });
  }

  // Register user if they don't exist yet
  if (!users[telegramId]) {
    users[telegramId] = {
      telegramId,
      username: username || 'User',
      balance: 58.36,
      miningSpeed: 0.0000578,
      farmingTime: 28747 // ~8 hours in seconds
    };
  }

  return res.json(users[telegramId]);
});

// 2. Click / Earn Endpoint
app.post('/api/earn', (req, res) => {
  const { telegramId, amount } = req.body;

  if (!telegramId) {
    return res.status(400).json({ success: false, message: 'telegramId is required' });
  }

  if (users[telegramId]) {
    const earnAmount = typeof amount === 'number' && amount > 0 ? amount : 1;
    users[telegramId].balance += earnAmount;

    return res.json({
      success: true,
      balance: users[telegramId].balance
    });
  }

  return res.status(404).json({ success: false, message: 'User not found' });
});

// Server Initialization
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});