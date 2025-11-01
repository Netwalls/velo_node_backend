import { Router } from 'express';
import { ChangellyController } from '../controllers/changellyController';

const router = Router();

// Public endpoints to proxy Changelly fiat API
router.get('/providers', ChangellyController.getProviders);
router.get('/currencies', ChangellyController.getCurrencies);
router.get('/available-countries', ChangellyController.getAvailableCountries);
router.get('/offers', ChangellyController.getOffers);
router.post('/orders', ChangellyController.createOrder);
router.post('/validate-address', ChangellyController.validateAddress);

// Simplified single-endpoint flows for frontend
// POST /fiat/changelly/crypto/deposit  -> create on-ramp order (NGN -> crypto)
router.post('/crypto/deposit', ChangellyController.deposit);
// POST /fiat/changelly/crypto/withdraw -> create off-ramp order (crypto -> NGN)
router.post('/crypto/withdraw', ChangellyController.withdraw);

// Off-ramp
router.get('/sell/offers', ChangellyController.getSellOffers);
router.post('/sell/orders', ChangellyController.createSellOrder);

// Orders listing
router.get('/orders', ChangellyController.getOrders);

export default router;
