export class DownloadProgress {
  constructor (
    public version: string,
    public progress: number,
    public progressBytes: number,
    public failed: boolean,
    public queued: boolean,
    public hash_checking: boolean,
    public speed: number,
    public size: number,
    public etaSecs: number,
    public unzipping: boolean,
    public unzipTotal: number,
    public unzipped: number
  ) {}
}
