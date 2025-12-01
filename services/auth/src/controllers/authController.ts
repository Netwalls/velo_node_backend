// services/auth-service/src/controllers/AuthController.ts
import { Request, Response } from 'express';

// CORRECT: AppDataSource comes from local config (which uses shared)
import { AppDataSource } from '../config/database';

// CORRECT: env from shared (only 1 level up from services)
import { env } from '../../../../shared/config/env';

// CORRECT: Entities from local service
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

// Utils (local)
import { generateOTP, getOTPExpiry, isOTPExpired } from '../utils/otp';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendMailtrapMail } from '../utils/mailtrap';
import { resendOtpTemplate, passwordResetRequestTemplate } from '../utils/templates';

// CORRECT: Shared errors (only 1 level up)
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  // sendError,
} from '../../../../shared/errors';
import { sendError } from '../../../../shared/errors/response';
import axios from 'axios';
import { sendRegistrationEmails } from '../services/emailService';

// Wallet client — uses shared env
const walletClient = axios.create({
  baseURL: env.WALLET_SERVICE_URL,
  headers: {
    'x-api-key': env.INTERNAL_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 8000,
});

export class AuthController {
  // All your methods stay EXACTLY the same
  // Only the imports are fixed
  static async register(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        throw new BadRequestError('Email and password are required');

      const userRepo = AppDataSource.getRepository(User);
      if (await userRepo.findOne({ where: { email } }))
        throw new ConflictError('User already exists');

      const otp = generateOTP();
      const user = userRepo.create({
        email,
        password,
        emailOTP: otp,
        emailOTPExpiry: getOTPExpiry(),
      });
      await userRepo.save(user);

      await walletClient.post('/api/wallet/internal/create-all', { userId: user.id });

      // await sendMailtrapMail({
      //   to: email,
      //   subject: 'Verify Your Email',
      //   html: resendOtpTemplate(email, otp),
      // });
      await sendRegistrationEmails(email, otp);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        userId: user.id,
      });
    } catch (err) {
      sendError(res, err);
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const userRepo = AppDataSource.getRepository(User);
      const tokenRepo = AppDataSource.getRepository(RefreshToken);

      const user = await userRepo.findOne({ where: { email } });
      if (!user || !(await user.comparePassword(password)))
        throw new UnauthorizedError('Invalid credentials');

      if (!user.isEmailVerified)
        throw new BadRequestError('Please verify your email first');

      const payload = { userId: user.id!, email: user.email! };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await tokenRepo.save({
        token: refreshToken,
        userId: user.id!,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Auto-upgrade wallets with new chains
      walletClient.post('/api/wallet/internal/create-missing', { userId: user.id }).catch(() => {});

      res.json({
        success: true,
        message: 'Login successful',
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          isEmailVerified: true,
          hasTransactionPin: !!user.transactionPin,
        },
      });
    } catch (err) {
      sendError(res, err);
    }
  }

  static async googleSignup(req: Request, res: Response) {
  try {
    const { idToken, firstName, lastName } = req.body;
    if (!idToken) throw new BadRequestError('idToken required');

    const { data } = await axios.get<{
      aud?: string;
      email_verified?: string | boolean;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
    }>(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

    if (data.aud !== env.GOOGLE_CLIENT_ID) throw new BadRequestError('Invalid token');
    const emailVerified = data.email_verified === true || data.email_verified === 'true';
    if (!emailVerified) throw new BadRequestError('Email not verified');

    const email = data.email!;
    const userRepo = AppDataSource.getRepository(User);
    let user = await userRepo.findOne({ where: { email } });

    if (user) throw new ConflictError('User already exists');

    // Create user
    user = userRepo.create({
      email,
      password: Math.random().toString(36), // dummy password
      firstName: firstName || data.given_name || data.name?.split(' ')[0],
      lastName: lastName || data.family_name || data.name?.split(' ').slice(1).join(' '),
      isEmailVerified: true,
    });
    await userRepo.save(user);

    // Create all wallets
    await walletClient.post('/api/wallet/internal/create-all', { userId: user.id });

    const payload = { userId: user.id!, email: user.email! };
    res.status(201).json({
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isEmailVerified: true,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
}

  static async googleSignIn(req: Request, res: Response) {
    try {
      const { idToken } = req.body;
      if (!idToken) throw new BadRequestError('idToken required');

      const { data } = await axios.get<{
        aud: string;
        email_verified?: string | boolean;
        email?: string;
        name?: string;
      }>(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);

      if (data.aud !== env.GOOGLE_CLIENT_ID)
        throw new BadRequestError('Invalid Google token');

      const emailVerified = data.email_verified === true || data.email_verified === 'true';
      if (!emailVerified)
        throw new BadRequestError('Google email not verified');

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { email: data.email } });

      if (!user) {
        return res.json({ exists: false, email: data.email, name: data.name });
      }

      walletClient.post('/internal/create-missing', { userId: user.id }).catch(() => {});

      const payload = { userId: user.id!, email: user.email! };
      res.json({
        exists: true,
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isEmailVerified: true,
        },
      });
    } catch (err) {
      sendError(res, err);
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { email } });
      if (!user) throw new NotFoundError('User not found');

      if (user.emailOTP !== otp || isOTPExpired(user.emailOTPExpiry!))
        throw new BadRequestError('Invalid or expired OTP expired');

      user.isEmailVerified = true;
      user.emailOTP = undefined;
      user.emailOTPExpiry = undefined;
      await userRepo.save(user);

      const payload = { userId: user.id!, email: user.email! };
      res.json({
        success: true,
        message: 'Email verified',
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
      });
    } catch (err) {
      sendError(res, err);
    }
  }

  static async resendOTP(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const userRepo = AppDataSource.getRepository(User);

      const user = await userRepo.findOne({ where: { email } });
      if (!user) throw new NotFoundError('User not found');
      if (user.isEmailVerified) throw new BadRequestError('Email already verified');

      const otp = generateOTP();
      user.emailOTP = otp;
      user.emailOTPExpiry = getOTPExpiry();
      await userRepo.save(user);

      // await sendMailtrapMail({
      //   to: email,
      //   subject: 'Your New OTP Code',
      //   html: resendOtpTemplate(email, otp),
      // });

      res.json({ success: true, message: 'OTP sent' });
    } catch (err) {
      sendError(res, err);
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await AppDataSource.getRepository(RefreshToken).update(
          { token: refreshToken },
          { isRevoked: true }
        );
      }
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      sendError(res, err);
    }
  }

  // static async forgotPassword(req: Request, res: Response) {
  //   try {
  //     const { email } = req.body;
  //     const userRepo = AppDataSource.getRepository(User);

  //     const user = await userRepo.findOne({ where: { email } });

  //     if (user) {
  //       const token = generateOTP();
  //       user.passwordResetToken = token;
  //       user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
  //       await userRepo.save(user);
  //       await sendMailtrapMail({
  //         to: email,
  //         subject: 'Password Reset Request',
  //         html: passwordResetRequestTemplate(email, token),
  //       });
  //     }
  //     res.json({ message: 'If email exists, a reset code was sent' });
  //   } catch (err) {
  //     sendError(res, err);
  //   }
  // }

  // In AuthController.forgotPassword
static async forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) throw new BadRequestError('Email is required');

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { email } });

    if (user) {
      const token = generateOTP();
      user.passwordResetToken = token;
      user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
      await userRepo.save(user);

      // await sendMailtrapMail();
    }

    // Always return same message (security)
    res.json({ message: 'If email exists, a reset code was sent' });
  } catch (err) {
    sendError(res, err);
  }
}

}
  // ... rest of your methods (login, googleSignIn, verifyOTP, etc.) stay 100% the same
  // Only imports were wrong — now fixed
