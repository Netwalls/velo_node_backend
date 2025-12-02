import { z } from 'zod';

// Regex for basic address validation (can be refined per chain)
const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const btcAddressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/;

export const createPaymentSchema = z.object({
  body: z.object({
    userId: z.string().uuid({ message: 'Invalid User ID format' }),
    amount: z.number().positive({ message: 'Amount must be positive' }),
    chain: z.enum(['ethereum', 'bitcoin', 'solana', 'starknet', 'stellar', 'polkadot', 'usdt-erc20']),
    network: z.enum(['mainnet', 'testnet', 'devnet']).optional().default('mainnet'),
    address: z.string().min(1, 'Address is required').trim(), // Basic check, specific checks in service
    description: z.string().max(255).optional().transform(val => val?.replace(/<[^>]*>/g, '')), // Strip HTML tags
    ethAddress: z.string().regex(ethAddressRegex, 'Invalid Ethereum address').optional(),
    btcAddress: z.string().optional(), // Complex regex, handled in service or refined here
    solAddress: z.string().optional(),
    strkAddress: z.string().optional(),
    stellarAddress: z.string().optional(),
    polkadotAddress: z.string().optional(),
    usdtErc20Address: z.string().regex(ethAddressRegex, 'Invalid USDT ERC20 address').optional(),
    usdtTrc20Address: z.string().optional(),
  }).refine(data => {
    // Custom cross-field validation if needed
    return true;
  }),
});

export const getPaymentsSchema = z.object({
  query: z.object({
    userId: z.string().uuid({ message: 'Invalid User ID format' }),
    status: z.enum(['pending', 'completed', 'failed', 'cancelled']).optional(),
    chain: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});

export const paymentIdSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Payment ID format' }),
  }),
});

export const cancelPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Payment ID format' }),
  }),
  body: z.object({
    userId: z.string().uuid({ message: 'Invalid User ID format' }),
  }),
});

export const monitorPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Payment ID format' }),
  }),
});

export const getStatsSchema = z.object({
  query: z.object({
    userId: z.string().uuid({ message: 'Invalid User ID format' }),
  }),
});
