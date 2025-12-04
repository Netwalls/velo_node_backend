import { Request, Response } from "express";
interface PaystackWebhookBody {
    event: string;
    data: {
        reference: string;
        amount: number;
        [key: string]: any;
    };
}
export declare class PaystackController {
    private userRepository;
    private transactionRepository;
    fundWallet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    verifyTransactionWithWebhook: (req: Request<{}, {}, PaystackWebhookBody>, res: Response) => Promise<Response<any, Record<string, any>>>;
}
export {};
//# sourceMappingURL=paystackFiatController.d.ts.map