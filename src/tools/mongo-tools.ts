import type { Command } from "commander";
import fs from "fs";
import type { Db } from "mongodb";

import { type Mem, dedupePhotos } from "../lib/common/mems.js";
import { executeQuery, getDbClient } from "../lib/db.server.js";

const DEFAULT_MEM_USER_ID = "BB8zGVrCbrQ2QryHyiZNaUZJjQ93";

// Legacy Firebase exports carry an `id` field that is converted to Mongo's `_id`.
type ImportMem = Mem & { id?: string };

const importMems = async (
  mems: ImportMem[],
  memUserId: string,
  dbUser: string,
  dbPassword: string
) => {
  let hasNoId: number = 0;
  for (const mem of mems) {
    if (mem.id === undefined) {
      hasNoId++;
    }
  }

  // Convert id to to _id
  const writableMems = mems.map((mem) => {
    const memId = mem.id;
    delete mem.id;
    return { _id: memId, userId: memUserId, ...mem };
  });

  const client = await getDbClient(dbUser, dbPassword);
  await executeQuery(client, async (db: Db) => {
    const collection = db.collection<{ _id?: string }>("mems");
    //await db.command({ ping: 1 });
    await collection.deleteMany({});
    await collection.insertMany(writableMems);
    console.log("Success");
  });
};

export const addMongoCommands = (program: Command, dbUser: string, dbPassword: string) => {
  program
    .command("import-mems")
    .description("Import mems from a file")
    .option("-u --user-id <userId>", "User ID", DEFAULT_MEM_USER_ID)
    .option("-f, --file <file>", "File to import")
    .action(async (options: any) => {
      const file = options.file;
      const data = fs.readFileSync(file, "utf8");
      const mems = JSON.parse(data);
      const memUser = options.userId;

      importMems(mems, memUser, dbUser, dbPassword);
    });

  program
    .command("dedupe-photos")
    .description("Remove duplicate images from mem photos lists")
    .option("-u --user-id <userId>", "User ID", DEFAULT_MEM_USER_ID)
    .option("--dry-run", "Report what would change without writing", false)
    .action(async (options: any) => {
      const client = await getDbClient(dbUser, dbPassword);
      await executeQuery(client, async (db: Db) => {
        const collection = db.collection<{ _id: string }>("mems");
        // Only mems with 2+ photos can have duplicates.
        const cursor = collection.find({
          userId: options.userId,
          "photos.1": { $exists: true }
        });

        let scanned = 0;
        let changed = 0;
        let removed = 0;
        for await (const doc of cursor) {
          scanned++;
          const mem = doc as unknown as Mem;
          const photos = mem.photos ?? [];
          const deduped = dedupePhotos(photos);
          if (deduped.length === photos.length) {
            continue;
          }
          changed++;
          removed += photos.length - deduped.length;
          if (!options.dryRun) {
            await collection.updateOne({ _id: mem._id! }, { $set: { photos: deduped } });
          }
        }

        const prefix = options.dryRun ? "[dry-run] " : "";
        console.log(
          `${prefix}scanned ${scanned} mems with 2+ photos; ${changed} had duplicates; removed ${removed} duplicate photos`
        );
      });
    });

  program
    .command("ping")
    .description("ping")
    .action(async (options: any) => {
      const client = await getDbClient(dbUser, dbPassword);
      await executeQuery(client, async (db: Db) => {
        const res = await db.command({ ping: 1 });
        console.log(res);
      });
    });
};
