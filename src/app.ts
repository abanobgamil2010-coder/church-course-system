import express from 'express';
import cors from 'cors';
import { pinoHttp } from 'pino-http';

const app = express();

app.use(cors());
app.use(express.json());
app.use(pinoHttp());

// HTML Dashboard Interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>نظام إدارة الدورات الكنسية</title>
      <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; }
        body { background-color: #f4f6f9; color: #333; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
        .card { background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); width: 100%; max-width: 600px; padding: 30px; text-align: center; }
        .status { display: inline-block; padding: 6px 16px; border-radius: 20px; background-color: #e8f5e9; color: #2e7d32; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
        h1 { font-size: 24px; color: #1a237e; margin-bottom: 10px; }
        p { color: #666; margin-bottom: 25px; line-height: 1.6; }
        .btn-group { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .btn { display: inline-block; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; transition: 0.2s; cursor: pointer; border: none; }
        .btn-primary { background-color: #1a237e; color: white; }
        .btn-primary:hover { background-color: #283593; }
        .btn-secondary { background-color: #f0f0f0; color: #333; }
        .btn-secondary:hover { background-color: #e0e0e0; }
        .footer { margin-top: 30px; font-size: 12px; color: #aaa; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="status">● السيرفر يعمل بنجاح</div>
        <h1>نظام إدارة الدورات الكنسية</h1>
        <p>مرحباً بك في لوحة تحكم سيرفر Backend API. السيرفر متصل وجاهز لاستقبال الطلبات ومعالجة بيانات الطلاب والكارنيهات.</p>
        <div class="btn-group">
          <a href="/api/health" class="btn btn-secondary">فحص حالة النظام (Health Check)</a>
        </div>
        <div class="footer">Church Course System API v1.0</div>
      </div>
    </body>
    </html>
  `);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
