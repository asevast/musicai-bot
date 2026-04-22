export const __esModule: boolean;
export namespace Prisma {
  let TransactionIsolationLevel: any;
  namespace UserScalarFieldEnum {
    let id: string;
    let telegramId: string;
    let username: string;
    let firstName: string;
    let credits: string;
    let subscriptionTier: string;
    let subscriptionExpiresAt: string;
    let defaultSettings: string;
    let referredById: string;
    let createdAt: string;
    let updatedAt: string;
  }
  namespace TrackScalarFieldEnum {
    let id_1: string;
    export { id_1 as id };
    export let userId: string;
    export let model: string;
    export let type: string;
    export let prompt: string;
    export let negativePrompt: string;
    export let lyrics: string;
    export let parameters: string;
    export let status: string;
    export let gcsUrl: string;
    export let durationSec: string;
    export let isPublic: string;
    export let telegramFileId: string;
    export let revisedPrompt: string;
    export let creditsCharged: string;
    export let isRegeneration: string;
    export let sourceTrackId: string;
    let createdAt_1: string;
    export { createdAt_1 as createdAt };
  }
  namespace SynthJobScalarFieldEnum {
    let id_2: string;
    export { id_2 as id };
    export let trackId: string;
    export let bullJobId: string;
    export let attempts: string;
    export let errorCode: string;
    export let errorMessage: string;
    export let vertexRequestId: string;
    export let startedAt: string;
    export let finishedAt: string;
    let createdAt_2: string;
    export { createdAt_2 as createdAt };
  }
  namespace CreditTransactionScalarFieldEnum {
    let id_3: string;
    export { id_3 as id };
    let userId_1: string;
    export { userId_1 as userId };
    export let amount: string;
    let type_1: string;
    export { type_1 as type };
    export let description: string;
    export let paymentId: string;
    let trackId_1: string;
    export { trackId_1 as trackId };
    let createdAt_3: string;
    export { createdAt_3 as createdAt };
  }
  namespace SortOrder {
    let asc: string;
    let desc: string;
  }
  namespace JsonNullValueInput {
    import JsonNull = Prisma.JsonNull;
    export { JsonNull };
  }
  namespace QueryMode {
    let _default: string;
    export { _default as default };
    export let insensitive: string;
  }
  namespace JsonNullValueFilter {
    import DbNull = Prisma.DbNull;
    export { DbNull };
    import JsonNull_1 = Prisma.JsonNull;
    export { JsonNull_1 as JsonNull };
    import AnyNull = Prisma.AnyNull;
    export { AnyNull };
  }
  namespace NullsOrder {
    let first: string;
    let last: string;
  }
  namespace ModelName {
    let User: string;
    let Track: string;
    let SynthJob: string;
    let CreditTransaction: string;
  }
}
export namespace $Enums {
  namespace SubscriptionTier {
    let free: string;
    let pro: string;
    let unlimited: string;
  }
  namespace TrackStatus {
    let queued: string;
    let processing: string;
    let done: string;
    let failed: string;
  }
  namespace TrackType {
    let full_song: string;
    let clip: string;
    let instrumental: string;
  }
  namespace Intensity {
    let low: string;
    let medium: string;
    let high: string;
    let epic: string;
  }
  namespace CreditTxType {
    let earn: string;
    let spend: string;
    let buy: string;
    let bonus: string;
    let refund: string;
  }
}
export namespace SubscriptionTier {
  let free_1: string;
  export { free_1 as free };
  let pro_1: string;
  export { pro_1 as pro };
  let unlimited_1: string;
  export { unlimited_1 as unlimited };
}
export namespace TrackStatus {
  let queued_1: string;
  export { queued_1 as queued };
  let processing_1: string;
  export { processing_1 as processing };
  let done_1: string;
  export { done_1 as done };
  let failed_1: string;
  export { failed_1 as failed };
}
export namespace TrackType {
  let full_song_1: string;
  export { full_song_1 as full_song };
  let clip_1: string;
  export { clip_1 as clip };
  let instrumental_1: string;
  export { instrumental_1 as instrumental };
}
export namespace Intensity {
  let low_1: string;
  export { low_1 as low };
  let medium_1: string;
  export { medium_1 as medium };
  let high_1: string;
  export { high_1 as high };
  let epic_1: string;
  export { epic_1 as epic };
}
export namespace CreditTxType {
  let earn_1: string;
  export { earn_1 as earn };
  let spend_1: string;
  export { spend_1 as spend };
  let buy_1: string;
  export { buy_1 as buy };
  let bonus_1: string;
  export { bonus_1 as bonus };
  let refund_1: string;
  export { refund_1 as refund };
}
export namespace Prisma {
  export namespace prismaVersion {
    let client: string;
    let engine: string;
  }
  export { PrismaClientKnownRequestError };
  export { PrismaClientUnknownRequestError };
  export { PrismaClientRustPanicError };
  export { PrismaClientInitializationError };
  export { PrismaClientValidationError };
  export { Decimal };
  export { sqltag as sql };
  export { empty };
  export { join };
  export { raw };
  export let validator: any;
  export let getExtensionContext: any;
  export let defineExtension: any;
  let DbNull_1: any;
  export { DbNull_1 as DbNull };
  let JsonNull_2: any;
  export { JsonNull_2 as JsonNull };
  let AnyNull_1: any;
  export { AnyNull_1 as AnyNull };
  export namespace NullTypes {
    let DbNull_2: any;
    export { DbNull_2 as DbNull };
    let JsonNull_3: any;
    export { JsonNull_3 as JsonNull };
    let AnyNull_2: any;
    export { AnyNull_2 as AnyNull };
  }
}
export const PrismaClient: any;
import { PrismaClientKnownRequestError } from './runtime/wasm-engine-edge.js';
import { PrismaClientUnknownRequestError } from './runtime/wasm-engine-edge.js';
import { PrismaClientRustPanicError } from './runtime/wasm-engine-edge.js';
import { PrismaClientInitializationError } from './runtime/wasm-engine-edge.js';
import { PrismaClientValidationError } from './runtime/wasm-engine-edge.js';
import { Decimal } from './runtime/wasm-engine-edge.js';
import { sqltag } from './runtime/wasm-engine-edge.js';
import { empty } from './runtime/wasm-engine-edge.js';
import { join } from './runtime/wasm-engine-edge.js';
import { raw } from './runtime/wasm-engine-edge.js';
//# sourceMappingURL=wasm.d.ts.map
