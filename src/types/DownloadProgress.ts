export class DownloadProgress {
  constructor (
    public version: string,
    public failed: boolean,
    public queued: boolean,
    public finishing: boolean
  ) {}
}
