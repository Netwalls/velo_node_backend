// import { Router } from 'express';
// import { FiatController } from '../controllers/fiatController';
// import changellyRoute from './changellyRoute';

// const router = Router();

// // Mount Changelly endpoints under /fiat/changelly
// // Some bundlers/transpilers may wrap default exports as { default: Router }
// // so unwrap to ensure we pass an actual Router/middleware function to router.use
// const _changelly = (changellyRoute as any)?.default ?? changellyRoute;
// router.use('/changelly', _changelly);

// // router.post('/deposit/initiate', FiatController.initiateDeposit);
// // router.post('/deposit/webhook', FiatController.paystackWebhook);

// export default router;
