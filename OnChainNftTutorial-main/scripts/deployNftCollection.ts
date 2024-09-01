import { Address, toNano } from '@ton/core';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';
import { buildCollectionContentCell, setItemContentCell } from './nftContent/onChain';

const randomSeed= Math.floor(Math.random() * 10000);

// Deploys collection and mints one item to the address of the 
export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: provider.sender().address!!, 
        nextItemIndex: 0,
        collectionContent: buildCollectionContentCell({
            name: "Elun Master",
            description: "Holds onchain metadata",
            image: "https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png"
        }),
        nftItemCode: await compile("NftItem"),
        royaltyParams: {
            royaltyFactor: Math.floor(Math.random() * 500), 
            royaltyBase: 1000,
            royaltyAddress: provider.sender().address as Address
        }
    }, await compile('NftCollection')));
    console.log("NFTITEM",compile("NftItem"))
    console.log(provider.sender().address as Address)
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    console.log()
    await provider.waitForDeploy(nftCollection.address);

    const mint = await nftCollection.sendMintNft(provider.sender(),{
        value: toNano("0.04"),
        queryId: randomSeed,
        amount: toNano("0.014"),
        itemIndex: 0,
        itemOwnerAddress: provider.sender().address!!,
        itemContent: setItemContentCell({
            name: "Elun Master",
            description: "Holds onchain metadata",
            image: "https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png",
        })
    })
    console.log(`NFT Item deployed at https://testnet.tonviewer.com/${nftCollection.address}`);
}
