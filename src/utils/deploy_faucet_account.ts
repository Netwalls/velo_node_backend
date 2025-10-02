import { Account, RpcProvider, CallData, hash, ec } from 'starknet';

const faucetPrivateKey = '0x7baec1ba187f1d7a0ca59101df8dac72119d4d47a1104a88a1209dd47479131';
const faucetPublicKey = '0x3f5880a2d3f081ec7d1e81ba1eff033e3ce14b7fec829c5e209bcb6213662d2';
const faucetAccountAddress = '0x0bbc850380670ae92b3a24a9ca533a20c03ced12b765b58ab6a2de4c6e04f52';
const openZeppelinClassHash = '0x540d7f5ec7ecf317e68d48564934cb99259781b1ee3cedbbc37ec5337f8e688'; // OpenZeppelin v0.8.1

const nodeUrl = `https://starknet-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_STARKNET_KEY}`;
const provider = new RpcProvider({ nodeUrl });

async function deployFaucetAccount() {
    // Prepare constructor calldata for OpenZeppelin (just the public key)
    const constructorCalldata = CallData.compile({ publicKey: faucetPublicKey });

    // Create undeployed account instance
    const account = new Account(provider, faucetAccountAddress, faucetPrivateKey);

    // Deploy the account
    const deployAccountPayload = {
        classHash: openZeppelinClassHash,
        constructorCalldata,
        contractAddress: faucetAccountAddress,
        addressSalt: faucetPublicKey,
    };

    const { transaction_hash, contract_address } = await account.deployAccount(deployAccountPayload);
    console.log('Deployed faucet account at:', contract_address);
    console.log('Tx hash:', transaction_hash);
}

deployFaucetAccount().catch(console.error);