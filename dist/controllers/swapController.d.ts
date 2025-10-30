import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class SwapController {
    static getQuoteSimple(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getQuote(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static execute(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static executeSimple(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCrossChainQuote(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static executeCrossChainSwap(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getCrossChainStatus(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    static getSupportedChains(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
export default SwapController;
//# sourceMappingURL=swapController.d.ts.map