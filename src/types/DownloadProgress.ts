export class DownloadProgress {
  constructor (
    public version: string,
    public progress: number,
    public progressBytes: number,
    public failed: boolean,
    public downloading: boolean,
    public paused: boolean,
    public canceled: boolean,
    public queued: boolean,
    public hash_checking: boolean,
    public speed: number,
    public size: number,
    public etaSecs: number,
    public unzipping: boolean,
    public unzipTotal: number,
    public unzipped: number,
    public url: string | null,
    public executable: string | null,
    public hash: string | null,
    public type: 0 | 1 | 2,
    public modDownload: number | null,
    public modGame: number | null,
    public modId: number | null,
    public modVersion: string | null
  ) {}
}
