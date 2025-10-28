# 🔧 UAT ENVIRONMENT SETUP GUIDE

## Required Environment Variables

Create or update your `.env` file with the following variables:

```bash
# ===== DATABASE (REQUIRED) =====
TURSO_CONNECTION_URL=libsql://your-database-url.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# ===== AUTHENTICATION (REQUIRED) =====
BETTER_AUTH_SECRET=your-secret-key-here
# Generate with: openssl rand -base64 32
# Or use: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

BETTER_AUTH_URL=http://localhost:3001
# For production: https://your-domain.com

# ===== EMAIL/SMTP CONFIGURATION (FOR DISPATCH FEATURE) =====
# Option 1: Gmail (Recommended for UAT)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=MEIBL Insurance Brokers

# Option 2: SendGrid
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=apikey
# SMTP_PASS=your-sendgrid-api-key
# SMTP_FROM=noreply@yourdomain.com
# SMTP_FROM_NAME=MEIBL Insurance Brokers

# Option 3: Mailgun
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=postmaster@your-domain.mailgun.org
# SMTP_PASS=your-mailgun-smtp-password
# SMTP_FROM=noreply@your-domain.com
# SMTP_FROM_NAME=MEIBL Insurance Brokers

# Option 4: Custom SMTP Server
# SMTP_HOST=mail.your-domain.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=your-email@your-domain.com
# SMTP_PASS=your-password
# SMTP_FROM=noreply@your-domain.com
# SMTP_FROM_NAME=MEIBL Insurance Brokers

# ===== APPLICATION SETTINGS =====
NODE_ENV=development
# For production: NODE_ENV=production

NEXT_PUBLIC_APP_NAME=MEIBL Insurance Brokerage System
NEXT_PUBLIC_APP_VERSION=1.0.0

# ===== OPTIONAL: RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=60000
# 1 minute window
RATE_LIMIT_MAX_REQUESTS=120
# Max 120 requests per window

# ===== OPTIONAL: FILE UPLOAD =====
MAX_FILE_SIZE=10485760
# 10MB in bytes
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png
```

---

## How to Get Gmail App Password (For UAT Testing)

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security
3. Enable 2-Step Verification

### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other (Custom name)"
3. Enter: "Insurance Brokerage System"
4. Click "Generate"
5. Copy the 16-character password
6. Use it in `SMTP_PASS`

**Note**: Never use your actual Gmail password - always use app-specific passwords!

---

## Testing Email Configuration

### Create test file: `scripts/test-email.js`

```javascript
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

async function testEmail() {
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: 'test@example.com', // Change to your email
      subject: 'Test Email from Insurance Brokerage System',
      text: 'If you receive this, email configuration is working!',
      html: '<b>If you receive this, email configuration is working!</b>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
```

### Run test:
```bash
npm install nodemailer
node scripts/test-email.js
```

---

## Vercel Deployment Environment Variables

When deploying to Vercel, add these variables in:
**Dashboard → Project → Settings → Environment Variables**

### Production Values:
```
TURSO_CONNECTION_URL = <your-production-database-url>
TURSO_AUTH_TOKEN = <your-production-token>
BETTER_AUTH_SECRET = <generate-new-secret-for-production>
BETTER_AUTH_URL = https://your-app.vercel.app
SMTP_HOST = <your-smtp-host>
SMTP_PORT = <your-smtp-port>
SMTP_SECURE = <true-or-false>
SMTP_USER = <your-smtp-user>
SMTP_PASS = <your-smtp-password>
SMTP_FROM = <your-from-email>
SMTP_FROM_NAME = MEIBL Insurance Brokers
NODE_ENV = production
```

---

## Security Best Practices

### ✅ DO:
- ✅ Use environment variables for all secrets
- ✅ Generate strong BETTER_AUTH_SECRET (32+ characters)
- ✅ Use app-specific passwords for Gmail
- ✅ Rotate secrets regularly
- ✅ Use different secrets for dev/staging/production
- ✅ Enable 2FA on all service accounts

### ❌ DON'T:
- ❌ Commit .env file to Git
- ❌ Use the same secret across environments
- ❌ Share secrets in plain text (Slack, email, etc.)
- ❌ Use weak/predictable secrets
- ❌ Use personal email accounts for production

---

## Troubleshooting

### Issue: "Authentication failed" when sending email
**Solution**: 
- Check SMTP_USER and SMTP_PASS are correct
- For Gmail: Use app-specific password, not account password
- Verify 2FA is enabled on Gmail account

### Issue: "Connection timeout"
**Solution**:
- Check SMTP_HOST and SMTP_PORT
- Verify firewall allows outbound SMTP connections
- Try different port (587, 465, or 25)

### Issue: "Self-signed certificate"
**Solution**:
- Set `SMTP_SECURE=false` for port 587
- Set `SMTP_SECURE=true` for port 465

### Issue: "Sender address rejected"
**Solution**:
- Verify SMTP_FROM matches authenticated email
- Check domain is verified (for custom domains)

---

## Quick Start (UAT)

1. **Copy .env.example to .env**:
   ```bash
   cp .env.example .env
   ```

2. **Update required variables**:
   - TURSO_CONNECTION_URL (already set)
   - TURSO_AUTH_TOKEN (already set)
   - BETTER_AUTH_SECRET (generate new)
   - SMTP credentials (use Gmail for testing)

3. **Test configuration**:
   ```bash
   node scripts/test-email.js
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Verify**:
   - Login works: http://localhost:3001/login
   - Dispatch test email from Notes page

---

## Status

### Current Status:
- ✅ Database configured (Turso)
- ✅ Auth configured (Better Auth)
- ⚠️ Email NOT configured (needs SMTP setup)

### For UAT:
- **Required**: Database + Auth ✅ (working)
- **Optional**: Email (can skip if not testing dispatch)

### For Production:
- **Required**: All variables must be configured
- **Required**: Use production-grade SMTP service
- **Required**: Generate new secrets

---

**Last Updated**: October 19, 2025  
**Next**: Configure SMTP and test email dispatch
