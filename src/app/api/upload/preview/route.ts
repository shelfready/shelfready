import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/require-merchant";
import { guessMapping, parseUpload } from "@/connectors/csv";

/** Step 1 of upload: parse headers + a sample, guess the column mapping. */
export async function POST(req: Request) {
  await requireMerchant();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const { headers, rows } = await parseUpload(
    file.name,
    Buffer.from(await file.arrayBuffer()),
  );
  if (headers.length === 0) {
    return NextResponse.json(
      { error: "could not detect a header row" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    headers,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 10),
    guessedColumns: guessMapping(headers),
  });
}
