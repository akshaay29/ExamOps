import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import prisma from '../lib/prisma'

const router = Router()

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

type BrevoResponse = {
  messageId?: string
  message?: string
  code?: string
}

// Production uses Brevo's HTTPS API so Render does not need outbound SMTP ports.
// Local development can still fall back to SMTP when BREVO_API_KEY is not set.

async function sendEmail(to: string, subject: string, html: string) {
  const brevoKey = process.env.BREVO_API_KEY

  if (brevoKey) {
    // Brevo transactional email API.
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER
    const senderName = process.env.BREVO_SENDER_NAME || 'ExamOps'

    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL must be set to a verified Brevo sender email')
    }

    console.log(`[EMAIL] Sending via Brevo to: ${to}`)

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoKey
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    })

    const result = await response.json().catch(async () => {
      const text = await response.text().catch(() => '')
      return { message: text || response.statusText }
    }) as BrevoResponse

    if (!response.ok) {
      console.error('[EMAIL] Brevo error:', response.status, result)
      throw new Error(`Brevo failed (${response.status}): ${result.message || JSON.stringify(result)}`)
    }

    console.log(`[EMAIL] Sent successfully via Brevo. MessageId: ${result.messageId}`)
    return result
  } else {
    // Local dev fallback: Nodemailer SMTP.
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT) || 465
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (!smtpUser || !smtpPass) {
      throw new Error('No email provider configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL in production.')
    }

    console.log(`[EMAIL] Sending via Nodemailer SMTP -> ${smtpHost}:${smtpPort} to: ${to}`)

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const info = await transporter.sendMail({
      from: `"ExamOps" <${smtpUser}>`,
      to,
      subject,
      html
    })

    console.log(`[EMAIL] Sent successfully via Nodemailer. MessageId: ${info.messageId}`)
    return info
  }
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const rollNo = typeof req.body.rollNo === 'string' ? req.body.rollNo.trim() : ''
  if (!rollNo) { res.status(400).json({ error: 'Roll number is required' }); return }

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { rollNo },
      include: { user: true }
    })
    if (!profile) { res.status(404).json({ error: 'Student not found' }); return }
    if (!profile.user.email) { res.status(400).json({ error: 'No email registered for this student' }); return }

    const otp = generateOTP()
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    await prisma.user.update({
      where: { id: profile.userId },
      data: { otp, otpExpiry }
    })

    try {
      await sendEmail(
        profile.user.email,
        'ExamOps: Your Login OTP',
        `
          <div style="font-family: sans-serif; text-align: center; padding: 20px; color: #1e2240;">
            <h2 style="margin-bottom: 10px;">ExamOps Login</h2>
            <p style="margin-bottom: 20px; font-size: 16px;">Here is your One-Time Password for accessing your Hall Ticket:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 6px; padding: 15px 30px; background: #f3f4f6; color: #10b981; display: inline-block; border-radius: 12px; border: 1px solid #e5e7eb;">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          </div>
        `
      )
    } catch (mailError) {
      console.error('Failed to send OTP email:', mailError)
      await prisma.user.update({
        where: { id: profile.userId },
        data: { otp: null, otpExpiry: null }
      })
      res.status(502).json({ error: 'Failed to send OTP email' })
      return
    }

    res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { role, email, password, rollNo, otp } = req.body

  try {
    if (role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({
        where: { rollNo },
        include: { user: true },
      })
      if (!profile) { res.status(401).json({ error: 'Invalid roll number' }); return }

      const user = profile.user
      if (!otp) { res.status(400).json({ error: 'OTP is required' }); return }

      if (!user.otp || user.otp !== otp || !user.otpExpiry || user.otpExpiry < new Date()) {
        res.status(401).json({ error: 'Invalid or expired OTP' }); return
      }

      // Clear the OTP to prevent reuse
      await prisma.user.update({
        where: { id: user.id },
        data: { otp: null, otpExpiry: null }
      })

      const token = jwt.sign(
        { userId: profile.userId, role: 'STUDENT' },
        process.env.JWT_SECRET!,
        { expiresIn: '12h' }
      )
      res.json({ token, user: { name: profile.user.name, rollNo, role: 'STUDENT' } })
      return
    }

    // Admin / Invigilator auth: email + password
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.role !== role) { res.status(401).json({ error: 'Invalid credentials' }); return }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) { res.status(401).json({ error: 'Invalid credentials' }); return }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    )
    res.json({ token, user: { name: user.name, email: user.email, role: user.role } })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── POST /api/auth/register (Admin only, for seeding users) ─────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body
  try {
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, passwordHash: hash, role }
    })
    res.status(201).json({ id: user.id, email: user.email, role: user.role })
  } catch (err: any) {
    if (err.code === 'P2002') { res.status(409).json({ error: 'Email already exists' }); return }
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ─── POST /api/auth/magic-link ────────────────────────────────────────────────
router.post('/magic-link', async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email) { res.status(400).json({ error: 'Email is required' }); return }

  console.log(`[MAGIC-LINK] Request initiated for email: "${email}"`)
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log(`[MAGIC-LINK] Error: User not found in database for email: "${email}"`)
      res.status(404).json({ error: 'User not found' })
      return
    }

    console.log(`[MAGIC-LINK] Found user: ${user.id} with role: ${user.role}`)

    if (user.role !== 'ADMIN' && user.role !== 'INVIGILATOR') {
      console.log(`[MAGIC-LINK] Error: Role ${user.role} is not permitted for magic links.`)
      res.status(403).json({ error: 'Magic link is only available for Admin and Invigilator' })
      return
    }

    console.log(`[MAGIC-LINK] Generating JWT token...`)

    const token = jwt.sign(
      { userId: user.id, email: user.email, magicAuth: true, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const magicLinkUrl = `${frontendUrl}/auth/callback?token=${token}`

    await sendEmail(
      user.email!,
      'ExamOps: Magic Login Link',
      `
        <div style="font-family: sans-serif; text-align: center; padding: 20px; color: #1e2240;">
          <h2 style="margin-bottom: 10px;">ExamOps Login</h2>
          <p style="margin-bottom: 20px; font-size: 16px;">Click the button below to securely login to your account. This link is valid for 10 minutes.</p>
          <a href="${magicLinkUrl}" style="display: inline-block; padding: 12px 24px; background: #3b5bf5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Login to ExamOps
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 25px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    )

    res.json({ message: 'Verification link sent successfully' })
  } catch (error) {
    console.error('Magic link error:', error)
    res.status(500).json({ error: 'Failed to send verification link' })
  }
})

// ─── GET /api/auth/verify-link ────────────────────────────────────────────────
router.get('/verify-link', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query
  if (!token || typeof token !== 'string') { res.status(400).json({ error: 'Token is required' }); return }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, magicAuth: boolean }
    if (!decoded.magicAuth) { res.status(401).json({ error: 'Invalid token type' }); return }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    const sessionToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '12h' }
    )

    res.json({ token: sessionToken, user: { name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    console.error('Verify link error:', error)
    res.status(401).json({ error: 'Invalid or expired magic link' })
  }
})

export default router
