import type { Response } from "express";
import { EventEncoder } from "@ag-ui/encoder";
import type { BaseEvent } from "@ag-ui/core";

/**
 * Thin wrapper around Express' Response that encodes AG-UI events as SSE.
 * One instance per run; `.send()` per event, `.end()` once finished.
 */
export class AguiStream {
  private encoder = new EventEncoder();

  constructor(private res: Response) {
    res.setHeader("Content-Type", this.encoder.getContentType());
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
  }

  send(event: BaseEvent): void {
    this.res.write(this.encoder.encodeSSE(event));
  }

  end(): void {
    this.res.end();
  }

  onClose(cb: () => void): void {
    this.res.on("close", cb);
  }
}
