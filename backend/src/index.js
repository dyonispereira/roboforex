require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const licenseRouter = require('./routes/license');
const adminRouter   = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/',       licenseRouter);
app.use('/admin',  adminRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`C1 Trader Pro API rodando na porta ${PORT}`));
