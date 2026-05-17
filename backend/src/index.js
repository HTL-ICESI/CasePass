const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { authenticateToken } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');
const handoffRoutes = require('./routes/handoffs');
const summaryRoutes = require('./routes/summary');
const { publicSharedRouter, privateShareRouter } = require('./routes/share');
const userRoutes = require('./routes/users');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const uploadDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173' }));
app.use(express.json());
// Uploaded files are served through authenticated handoff document endpoints.

app.use('/api/auth', authRoutes);
app.use('/api', publicSharedRouter);
app.use('/api', authenticateToken);
app.use('/api/cases', caseRoutes);
app.use('/api', documentRoutes);
app.use('/api', chatRoutes);
app.use('/api', handoffRoutes);
app.use('/api', summaryRoutes);
app.use('/api', privateShareRouter);
app.use('/api/users', userRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

function startServer() {
  return app.listen(port, () => {
    console.log(`CasePass backend listening on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
