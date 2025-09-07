import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH || "analyses.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  title TEXT,
  summary TEXT NOT NULL,
  topics TEXT NOT NULL,     -- JSON array
  sentiment TEXT NOT NULL,  -- 'positive' | 'neutral' | 'negative'
  keywords TEXT NOT NULL,   -- JSON array
  confidence REAL NOT NULL, -- 0..1
  input_len INTEGER NOT NULL,
  raw TEXT NOT NULL
);
`);

const insertStmt = db.prepare(`
  INSERT INTO analysis
  (created_at,title,summary,topics,sentiment,keywords,confidence,input_len,raw)
  VALUES (@created_at,@title,@summary,@topics,@sentiment,@keywords,@confidence,@input_len,@raw)
`);

export type Row = {
  id?: number;
  created_at: number;
  title: string | null;
  summary: string;
  topics: string[];
  sentiment: "positive" | "neutral" | "negative";
  keywords: string[];
  confidence: number;
  input_len: number;
  raw: string;
};

export function insert(row: Row): number {
  const info = insertStmt.run({
    ...row,
    topics: JSON.stringify(row.topics),
    keywords: JSON.stringify(row.keywords),
  });
  return Number(info.lastInsertRowid);
}

export function searchByTopicOrKeyword(args: {
  topic?: string;
  keyword?: string;
}): Row[] {
  const rows = db.prepare(`SELECT * FROM analysis`).all();
  const t = args.topic?.toLowerCase();
  const k = args.keyword?.toLowerCase();
  const keep = rows.filter((r: any) => {
    const topics: string[] = JSON.parse(r.topics);
    const keywords: string[] = JSON.parse(r.keywords);
    return t
      ? topics.some((x) => x.toLowerCase().includes(t!))
      : k
      ? keywords.some((x) => x.toLowerCase().includes(k!))
      : true;
  });
  return keep.map(deserialize);
}

function deserialize(r: any): Row {
  return {
    id: r.id,
    created_at: r.created_at,
    title: r.title,
    summary: r.summary,
    topics: JSON.parse(r.topics),
    sentiment: r.sentiment,
    keywords: JSON.parse(r.keywords),
    confidence: r.confidence,
    input_len: r.input_len,
    raw: r.raw,
  };
}
