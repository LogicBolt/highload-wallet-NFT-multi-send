import { TonClient } from "@ton/ton";
import { Address, internal, beginCell, Dictionary, MessageRelaxed, SendMode, toNano, Cell, storeStateInit } from "@ton/core";
import { mnemonicToPrivateKey, sign, sha256_sync } from "@ton/crypto";
import { HighloadWalletContractV2 } from "ton-highload-wallet-contract";
import {
  getHttpEndpoint
} from "@orbs-network/ton-access";
import { Maybe } from "@ton/core/dist/utils/maybe";
import { HighloadWalletDictionaryValue } from "./types/HighloadWalletDictionaryValue";

export function toSha256(s: string): bigint {
  return BigInt('0x' + sha256_sync(s).toString('hex'))
}
export function toTextCell(s: string): Cell {
  return beginCell().storeUint(0, 8).storeStringTail(s).endCell()
}

async function createHighloadWalletTransferV2(args: {
  secretKey: Buffer,
  sendMode: SendMode,
  walletId: number,
  messages: MessageRelaxed[],
  timeout?: Maybe<number>
}) {
  if (args.messages.length > 254) {
    throw Error("Maximum number of messages is 254");
  }

  // Generate queryId
  const queryId = HighloadWalletContractV2.generateQueryId(args.timeout || 60); // default timeout: 60 seconds

  // Create message
  const signingMessage = beginCell()
    .storeUint(args.walletId, 32)
    .storeUint(queryId, 64);

  const dictBuilder = Dictionary.empty(Dictionary.Keys.Int(16), HighloadWalletDictionaryValue);
  for (let i = 0; i < args.messages.length; i++) {
    const message = args.messages[i];

    dictBuilder.set(i, {
      sendMode: args.sendMode,
      message,
    });
  }
  signingMessage.storeDict(dictBuilder);

  // Sign message
  const signature = sign(signingMessage.endCell().hash(), args.secretKey);

  // Body
  const body = beginCell()
    .storeBuffer(signature)
    .storeBuilder(signingMessage)
    .endCell();

  return { body, queryId };
}


async function main() {
  try {

    const endpoint = await getHttpEndpoint({
      network: "testnet",
    });
    const client = new TonClient({
      endpoint
    });
    // cell calculate_nft_item_state_init(int item_index, cell nft_item_code) {
    //   cell data = begin_cell().store_uint(item_index, 64).store_slice(my_address()).end_cell();
    //   return begin_cell().store_uint(0, 2).store_dict(nft_item_code).store_dict(data).store_uint(0, 1).end_cell();
    // }
    
    // slice calculate_nft_item_address(int wc, cell state_init) {
    //   return begin_cell().store_uint(4, 3)
    //            .store_int(wc, 8)
    //            .store_uint(cell_hash(state_init), 256)
    //            .end_cell()
    //            .begin_parse();

    const mnemonic = "tag pretty cycle quote hip toilet concert echo myself identify unusual weird scan train accident cable trigger beef defy afford lounge flower fiber humble";

    const key = await mnemonicToPrivateKey(mnemonic.split(" "));
    const contract = client.open(HighloadWalletContractV2.create({ publicKey: key.publicKey, workchain: 0 }));

    console.log("============ contract address ===============", contract.address)


    const collectionAddress = Address.parse("kQDUoYUYu6nit65pXUSm6g9LzalSUJ-R3Sq48n0xi_6v16OX")
    const contractAddress = Address.parse("0QDbR3yZKM98zeoGg3DhxooqsLDkCWTo2Cm1rOjPTdCh2mnr")
    const forwardPayload = beginCell()
      .storeUint(0, 32)
      .storeStringTail("NFT Transfer")
      .endCell();

      const NftItemCode = "te6ccgECDgEAAf8AART/APSkE/S88sgLAQIBYgIDAgLOBAUACaEfn+AFAgEgBgcCASAMDQLHDIhxwCSXwPg0NMDAXGwkl8D4PpA+kAx+gAxcdch+gAx+gAwc6m0APACBLOOFDBsIjRSMscF8uGVAfpA1DAQI/AD4AbTH9M/ghBfzD0UUjC64wI2OIIQBRONkbrjAl8HhA/y8IAgJABE+kQwcLry4U2ACrDIQN14yQBNRNccF8uGR+kAh8AH6QNIAMfoAINdJwgDy4sSCCvrwgBuhIZRTFaCh3iLXCwHDACCSBqGRNuIgwv/y4ZIhlBAqN1vjDQKTMDI04w1VAvADCgsAwFFFxwXy4ZEC+kAh8AH6QDHSADH6ADEg10nCAPLixHGCEAUTjZHIUAjPFljPFlMSBRA0EDhJmXCAEMjLBVAHzxZQBfoCFctqEssfyz8ibrOUWM8XAZEy4gHJAfsAUCPwAwB8ghAFE42RyFAJzxZQC88WcSRJFFRGoHCAEMjLBVAHzxZQBfoCFctqEssfyz8ibrOUWM8XAZEy4gHJAfsAEEcAaibwAYIQ1TJ22xA3RABtcXCAEMjLBVAHzxZQBfoCFctqEssfyz8ibrOUWM8XAZEy4gHJAfsAADs7UTQ0z/6QCDXScIAmn8B+kDUMBAkECPgMHBZbW2AAHQDyMs/WM8WAc8WzMntVIA=="
      const destinationAddress = Address.parse("0QA2t5gx0w4g_P103vvD144fOlLAxKe_60GGPIYRhjnamOZ7")
      const data = beginCell()
      .storeUint(3, 32)  // operation
      .storeAddress(collectionAddress)
      .storeAddress(contractAddress)
      .storeRef(
        beginCell()
          .storeUint(0, 8)
          .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
            .set(toSha256("name"), toTextCell("Elun Master"))
            .set(toSha256("description"), toTextCell("Holds onchain metadata"))
            .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/banner.png")))
          .endCell()
      )  // body
      .endCell();
   
    await contract.sendTransfer({
      secretKey: key.secretKey,
      messages: [
        internal({
          to: new Address(0,
            beginCell().store(storeStateInit({
              code: Cell.fromBase64(NftItemCode),
              data : beginCell()
              .storeUint(0, 32)  // operation
              .storeAddress(collectionAddress)
              .storeAddress(contractAddress)
              .storeRef(
                beginCell()
                  .storeUint(0, 8)
                  .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
                    .set(toSha256("name"), toTextCell("Elun Master"))
                    .set(toSha256("description"), toTextCell("Holds onchain metadata"))
                    .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/banner.png")))
                  .endCell()
              )  // body
              .endCell(),
            }))
              .endCell().hash()
          ),
          value: "0.00205",
          body: beginCell()
            .storeUint(0x05138d91, 32) // Opcode for NFT transfer
            .storeUint(0, 64) // query_id
            .storeAddress(Address.parse("UQB6jlR7s12b8yvlL-50VRpqp443FbAKDEdbEi0ep0i0kBLQ")) // new_owner
            .storeAddress(Address.parse("UQB6jlR7s12b8yvlL-50VRpqp443FbAKDEdbEi0ep0i0kBLQ")) // response_destination for excesses
            .storeBit(0) // we do not have custom_payload
            .storeCoins(toNano("1")) // forward_amount
            .storeBit(1) // we store forward_payload as a reference
            .storeRef(forwardPayload) // store forward_payload as a .reference
            .endCell(),
          bounce: true,
          init: {
            data:beginCell()
            .storeUint(0, 32)  // operation
            .storeAddress(collectionAddress)
            .storeAddress(contractAddress)
            .storeRef(
              beginCell()
                .storeUint(0, 8)
                .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
                  .set(toSha256("name"), toTextCell("Elun Master"))
                  .set(toSha256("description"), toTextCell("Holds onchain metadata"))
                  .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/banner.png")))
                .endCell()
            )  // body
            .endCell(),
            code: Cell.fromBase64(NftItemCode)
          },
        }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(5, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/3.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("UQBxMaW4_fGtRjuKUKos6oHM0zpr4pY5YV1NiUZUiGb2ZhaE")) // new_owner
        //     .storeAddress(Address.parse("UQBxMaW4_fGtRjuKUKos6oHM0zpr4pY5YV1NiUZUiGb2ZhaE")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(5, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(6, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("UQAZaKh6A127PaM2GKHWe3TfZ7Afr6eRQQ3MyZaPTOEx_Zxa")) // new_owner
        //     .storeAddress(Address.parse("UQAZaKh6A127PaM2GKHWe3TfZ7Afr6eRQQ3MyZaPTOEx_Zxa")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(6, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(9, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("UQBxMaW4_fGtRjuKUKos6oHM0zpr4pY5YV1NiUZUiGb2ZhaE")) // new_owner
        //     .storeAddress(Address.parse("UQBxMaW4_fGtRjuKUKos6oHM0zpr4pY5YV1NiUZUiGb2ZhaE")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(9, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(10, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("0QCgU2d33nOEdUWKDflQwOewxBQ7xImPH_0I9GyDrEHZiFBC")) // new_owner
        //     .storeAddress(Address.parse("0QCgU2d33nOEdUWKDflQwOewxBQ7xImPH_0I9GyDrEHZiFBC")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(10, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(11, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("0QAtWstT2v0MyXmw4IRdmSobJkYQp9rwA8oR_bu1MAfIv_Dz")) // new_owner
        //     .storeAddress(Address.parse("0QAtWstT2v0MyXmw4IRdmSobJkYQp9rwA8oR_bu1MAfIv_Dz")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(11, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(12, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("0QAmia4zH-_4BSZt-qlkKx5JeUse6tmjlIJv-v49Q1HJS3nI")) // new_owner
        //     .storeAddress(Address.parse("0QAmia4zH-_4BSZt-qlkKx5JeUse6tmjlIJv-v49Q1HJS3nI")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(12, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),



        // internal({
        //   to: new Address(0,
        //     beginCell().store(storeStateInit({
        //       code: Cell.fromBase64(NftItemCode),
        //       data : beginCell()
        //       .storeUint(13, 32)  // operation
        //       .storeAddress(collectionAddress)
        //       .storeAddress(contractAddress)
        //       .storeRef(
        //         beginCell()
        //           .storeUint(0, 8)
        //           .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //             .set(toSha256("name"), toTextCell("Elun Master"))
        //             .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //             .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //           .endCell()
        //       )  // body
        //       .endCell(),
        //     }))
        //       .endCell().hash()
        //   ),
        //   value: "0.00205",
        //   body: beginCell()
        //     .storeUint(0x05138d91, 32) // Opcode for NFT transfer
        //     .storeUint(0, 64) // query_id
        //     .storeAddress(Address.parse("0QBMJlTBX9OZ7t3aqpX5zgooIyDH-lCRDuIzj5DZ4AwzbugD")) // new_owner
        //     .storeAddress(Address.parse("0QBMJlTBX9OZ7t3aqpX5zgooIyDH-lCRDuIzj5DZ4AwzbugD")) // response_destination for excesses
        //     .storeBit(0) // we do not have custom_payload
        //     .storeCoins(toNano("1")) // forward_amount
        //     .storeBit(1) // we store forward_payload as a reference
        //     .storeRef(forwardPayload) // store forward_payload as a .reference
        //     .endCell(),
        //   bounce: true,
        //   init: {
        //     data : beginCell()
        //     .storeUint(13, 32)  // operation
        //     .storeAddress(collectionAddress)
        //     .storeAddress(contractAddress)
        //     .storeRef(
        //       beginCell()
        //         .storeUint(0, 8)
        //         .storeDict(Dictionary.empty(Dictionary.Keys.BigUint(256), Dictionary.Values.Cell())
        //           .set(toSha256("name"), toTextCell("Elun Master"))
        //           .set(toSha256("description"), toTextCell("Holds onchain metadata"))
        //           .set(toSha256("image"), toTextCell("https://gateway.pinata.cloud/ipfs/QmXPGjKKGfPEN6NX15EKz5MdAzmgtPrXTdS7u7whm6dpv7/0.png")))
        //         .endCell()
        //     )  // body
        //     .endCell(),
        //     code: Cell.fromBase64(NftItemCode)
        //   },
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 2",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 2",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 2",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
        // internal({
        //     to: "EQBYivdc0GAk-nnczaMnYNuSjpeXu2nJS3DZ4KqLjosX5sVC",
        //     value: "0.05",
        //     body: "test 1",
        //     bounce: false,
        // }),
      ],
    });

    // const balance = await contract.getBalance();
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();


