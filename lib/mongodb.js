import { MongoClient } from "mongodb";

const dbName = process.env.MONGODB_DB_NAME || "AZhu-Veggie-Stall";

// 延遲到第一次呼叫才檢查環境變數與建立連線，
// 避免 build 階段（沒有 .env 的機器）在 module load 就炸掉。
// 開發模式 hot-reload 時重用同一個連線，避免連線數爆掉。
export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("缺少環境變數 MONGODB_URI，請確認 .env 檔案");
  }
  if (!globalThis._mongoClientPromise) {
    globalThis._mongoClientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
    })
      .connect()
      .catch((err) => {
        // 連線失敗時清掉快取，下一個請求才會重試，而不是永遠拿到同一個失敗的 promise
        globalThis._mongoClientPromise = null;
        throw err;
      });
  }
  const client = await globalThis._mongoClientPromise;
  return client.db(dbName);
}
