const express = require('express');
const cors = require('cors');
const path = require('path');
const avatarRoutes = require('./routes/avatar');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Static files: /static/avatars/*.glb
app.use('/static/avatars', express.static(path.join(__dirname, 'static', 'avatars')));

app.use('/avatar', avatarRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Avatar API running at http://localhost:${PORT}`);
});
