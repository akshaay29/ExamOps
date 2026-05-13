import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import prisma from '../lib/prisma'

const router = Router()

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/** Create a reusable SMTP transporter from env vars */
function createTransporter() {
  const smtpPort = Number(process.env.SMTP_PORT) || 465
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false }, // allow self-signed certs on some hosts
  })
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  const { rollNo } = req.body
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

    // Send OTP email — failure does NOT block the response (OTP is saved to DB)
    try {
      const smtpUser = process.env.SMTP_USER
      console.log(`[OTP-SMTP] Connecting to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} as ${smtpUser}`)

      const transporter = createTransporter()
      await transporter.sendMail({
        from: `"ExamOps" <${smtpUser}>`,
        to: profile.user.email,
        subject: 'ExamOps: Your Login OTP',
        html: `
          <div style="font-family: sans-serif; text-align: center; padding: 40px 20px; background: #0f172a; color: #f1f5f9;">
            <h2 style="margin-bottom: 8px; color: #ffffff; font-size: 24px;">ExamOps Login</h2>
            <p style="margin-bottom: 28px; font-size: 15px; color: #94a3b8;">Your One-Time Password for accessing your Hall Ticket:</p>
            <div style="font-size: 40px; font-weight: bold; letter-spacing: 10px; padding: 18px 36px; background: #1e293b; color: #10b981; display: inline-block; border-radius: 14px; border: 1px solid #334155;">
              ${otp}
            </div>
            <p style="color: #64748b; font-size: 13px; margin-top: 28px;">This OTP expires in <strong style="color: #f1f5f9;">10 minutes</strong>. Do not share it with anyone.</p>
          </div>
        `
      })
      console.log(`[OTP-SMTP] OTP email sent successfully to ${profile.user.email}`)
    } catch (mailError: any) {
      console.error('[OTP-SMTP] Failed to send OTP email:', mailError?.message || mailError)
      // Don't block login — OTP is saved in DB, student can still enter it
    }

    res.json({ message: 'OTP sent successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to send OTP' })
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
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

    // Admin / Invigilator auth: email + password (no longer used for Admin, kept for invigilator fallback)
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
// Sends a one-time verification link to Admin or Invigilator email via SMTP
router.post('/magic-link', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body
  console.log(`[MAGIC-LINK] Request for email: "${email}"`)

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log(`[MAGIC-LINK] User not found: "${email}"`)
      res.status(404).json({ error: 'User not found' })
      return
    }

    if (user.role !== 'ADMIN' && user.role !== 'INVIGILATOR') {
      res.status(403).json({ error: 'Magic link is only available for Admin and Invigilator' })
      return
    }

    // Generate a short-lived JWT magic token
    const magicToken = jwt.sign(
      { userId: user.id, email: user.email, magicAuth: true, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' }
    )

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const magicLinkUrl = `${frontendUrl}/auth/callback?token=${magicToken}`

    console.log(`[MAGIC-LINK] Sending verification email to ${user.email} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)

    try {
      const smtpUser = process.env.SMTP_USER
      const transporter = createTransporter()

      await transporter.sendMail({
        from: `"ExamOps" <${smtpUser}>`,
        to: user.email!,
        subject: 'ExamOps: Your Verification Link',
        html: `
          <div style="font-family: sans-serif; text-align: center; padding: 40px 20px; background: #0f172a; color: #f1f5f9;">
            <h2 style="margin-bottom: 8px; color: #ffffff; font-size: 24px;">ExamOps Secure Login</h2>
            <p style="margin-bottom: 28px; font-size: 15px; color: #94a3b8;">Click the button below to securely log in. This link expires in <strong style="color: #f1f5f9;">10 minutes</strong>.</p>
            <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b5bf5, #4f46e5); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; letter-spacing: 0.3px;">
              ✓ Login to ExamOps
            </a>
            <p style="margin-top: 24px; font-size: 12px; color: #475569;">Or copy this link into your browser:</p>
            <p style="font-size: 11px; color: #334155; word-break: break-all; margin: 8px auto; max-width: 480px;">${magicLinkUrl}</p>
            <p style="color: #475569; font-size: 12px; margin-top: 28px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      })

      console.log(`[MAGIC-LINK] Email sent successfully to ${user.email}`)
      res.json({ message: 'Verification link sent successfully' })
    } catch (smtpError: any) {
      console.error('[MAGIC-LINK] SMTP error:', smtpError?.message || smtpError)
      res.status(500).json({
        error: `Failed to send verification email: ${smtpError?.message || 'SMTP error'}. Check server SMTP configuration.`
      })
    }
  } catch (error) {
    console.error('Magic link error:', error)
    res.status(500).json({ error: 'Failed to send verification link' })
  }
})

// ─── GET /api/auth/verify-link ────────────────────────────────────────────────
// Called by the frontend /auth/callback page after user clicks the email link
router.get('/verify-link', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query
  if (!token || typeof token !== 'string') { res.status(400).json({ error: 'Token is required' }); return }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, magicAuth: boolean }
    if (!decoded.magicAuth) { res.status(401).json({ error: 'Invalid token type' }); return }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) { res.status(404).json({ error: 'User not found' }); return }

    // Issue a full session token
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
