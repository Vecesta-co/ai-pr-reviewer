declare module 'parse-diff' {
  export interface Change {
    type: 'add' | 'del' | 'normal';
    del?: boolean;
    add?: boolean;
    normal?: boolean;
    ln?: number;
    ln1?: number;
    ln2?: number;
    content: string;
  }

  export interface Chunk {
    content: string;
    changes: Change[];
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
  }

  export interface File {
    chunks: Chunk[];
    deletions: number;
    additions: number;
    from?: string;
    to?: string;
    index?: string[];
    deleted?: boolean;
    new?: boolean;
  }

  function parse(diff: string): File[];
  export = parse;
}
