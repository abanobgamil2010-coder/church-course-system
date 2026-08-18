import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp());

app.get('/', (req, res) => {
  res.json({ message: 'Church Course System API is running successfully!' });
});

export default app;
