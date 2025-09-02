import express from 'express';
const app = express();
const port = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

app.get('/', (req, res) => {
  res.send('Hello from REVALIDA Backend!');
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
