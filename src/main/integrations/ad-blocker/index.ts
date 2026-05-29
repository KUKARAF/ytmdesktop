import path from "path";
import { app, session } from "electron";
import log from "electron-log";
import { ElectronBlocker } from "@cliqz/adblocker-electron";
import IIntegration from "../integration";

export default class AdBlocker implements IIntegration {
  private isEnabled = false;
  private blocker: ElectronBlocker | null = null;
  private blockerReady: Promise<ElectronBlocker> | null = null;

  private get partition(): string {
    return app.isPackaged ? "persist:ytmview" : "persist:ytmview-dev";
  }

  public provide(): void {
    if (this.blockerReady) return;

    const cacheFile = path.join(app.getPath("userData"), "adblocker-cache.bin");

    this.blockerReady = ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
      path: cacheFile,
      read: p => import("fs/promises").then(fs => fs.readFile(p)),
      write: (p, data) => import("fs/promises").then(fs => fs.writeFile(p, data))
    })
      .then(blocker => {
        this.blocker = blocker;
        log.info("Ad blocker: filter lists ready");
        if (this.isEnabled) this.attach(blocker);
        return blocker;
      })
      .catch(err => {
        log.error("Ad blocker: failed to load filter lists", err);
        throw err;
      });
  }

  public enable(): void {
    this.isEnabled = true;

    if (this.blocker) {
      this.attach(this.blocker);
    } else if (this.blockerReady) {
      this.blockerReady
        .then(blocker => {
          if (this.isEnabled) this.attach(blocker);
        })
        .catch(() => {});
    }
  }

  public disable(): void {
    this.isEnabled = false;

    if (this.blocker) {
      try {
        this.blocker.disableBlockingInSession(session.fromPartition(this.partition));
        log.info("Ad blocker: disabled");
      } catch (err) {
        log.error("Ad blocker: error disabling", err);
      }
    }
  }

  public getYTMScripts(): { name: string; script: string }[] {
    return [];
  }

  private attach(blocker: ElectronBlocker): void {
    try {
      blocker.enableBlockingInSession(session.fromPartition(this.partition));
      log.info("Ad blocker: enabled on", this.partition);
    } catch (err) {
      log.error("Ad blocker: error enabling", err);
    }
  }
}
