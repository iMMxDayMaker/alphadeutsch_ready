require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(express.static(__dirname));

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

app.post('/api/contact', async (req, res) => {
    const { vorname, nachname, email, telefon, nachricht, language } = req.body || {};

    if (!vorname || !nachname || !email || !nachricht) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ error: 'INVALID_EMAIL' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.status(500).json({ error: 'SMTP_NOT_CONFIGURED' });
    }

    const subject = `Neue Kontaktanfrage – ${vorname} ${nachname}`;
    const text = [
        'Neue Kontaktanfrage von ALPHADEUTSCH', '',
        `Vorname: ${vorname}`,
        `Nachname: ${nachname}`,
        `E-Mail: ${email}`,
        `Telefon: ${telefon || '-'}`,
        `Sprache: ${language || '-'}`, '',
        'Nachricht:', nachricht
    ].join('\n');

    const html = `
        <h2>Neue Kontaktanfrage von ALPHADEUTSCH</h2>
        <p><strong>Vorname:</strong> ${escapeHtml(vorname)}</p>
        <p><strong>Nachname:</strong> ${escapeHtml(nachname)}</p>
        <p><strong>E-Mail:</strong> ${escapeHtml(email)}</p>
        <p><strong>Telefon:</strong> ${escapeHtml(telefon || '-')}</p>
        <p><strong>Sprache:</strong> ${escapeHtml(language || '-')}</p>
        <hr>
        <p><strong>Nachricht:</strong></p>
        <p>${escapeHtml(nachricht).replace(/\n/g, '<br>')}</p>`;

    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: process.env.GMAIL_USER,
            replyTo: email,
            subject,
            text,
            html
        });
        res.json({ ok: true });
    } catch (error) {
        console.error('SMTP send error:', error);
        res.status(500).json({ error: 'SEND_FAILED' });
    }
});

app.get("/{*splat}", (req, re, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`ALPHADEUTSCH running at http://localhost:${PORT}`);
});
