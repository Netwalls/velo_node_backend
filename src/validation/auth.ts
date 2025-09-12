import Joi from 'joi';
import { ChainType } from '../types';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const otpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phoneNumber: Joi.string().optional()
});

export const addAddressSchema = Joi.object({
  chain: Joi.string().valid(...Object.values(ChainType)).required(),
  address: Joi.string().required()
});

