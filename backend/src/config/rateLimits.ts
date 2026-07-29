export interface RateLimitConfig {
  windowMs: number
  limit: number
  keyPrefix?: string
}

export const RateLimitTiers = {
  auth: {
    windowMs: 60 * 1000, // 1 minute
    limit: 5,
    keyPrefix: 'auth',
  },
  kyc_submit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3,
    keyPrefix: 'kyc_submit',
  },
  deal_apply: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
    keyPrefix: 'deal_apply',
  },
  payment_initiate: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20,
    keyPrefix: 'payment_initiate',
  },
  staking: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20,
    keyPrefix: 'staking',
  },
  deposit: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
    keyPrefix: 'deposit',
  },
  wallet_withdrawal: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    keyPrefix: 'wallet_withdrawal',
  },
  wallet_topup: {
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 10,
    keyPrefix: 'wallet_topup',
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    limit: 60,
    keyPrefix: 'search',
  },
  public: {
    windowMs: 60 * 1000, // 1 minute
    limit: 120,
    keyPrefix: 'public',
  },
} as const
