import { App, Modal, Notice, Setting } from "obsidian";

export class ResetModal extends Modal {
    constructor(
        app: App,
        { syncFolderPath, cacheFolderPath }: {
            syncFolderPath: string,
            cacheFolderPath: string
        },
        onConfirm: () => Promise<void>
    ) {
        super(app);
        this.setTitle("Reset KOI-net plugin?");

        this.contentEl.createEl("p", {
            text: "This will tell the network your node is leaving, then permanently delete:"
        });
        const list = this.contentEl.createEl("ul");
        list.createEl("li", { text: `The sync folder "${syncFolderPath}" and every note in it` });
        list.createEl("li", { text: `The RID cache "${cacheFolderPath}"` });
        list.createEl("li", { text: "Your node's identity and private key, and all plugin settings" });
        this.contentEl.createEl("p", {
            text: "Your own notes and templates are kept. This can't be undone."
        });

        new Setting(this.contentEl)
            .addButton((btn) =>
                btn.setButtonText("Cancel")
                    .onClick(() => this.close()))
            .addButton((btn) =>
                btn.setButtonText("Reset")
                    .setWarning()
                    .onClick(() => {
                        this.close();
                        onConfirm().catch(err => {
                            console.error("KOI-net reset failed", err);
                            new Notice("KOI-net: Reset failed, see console for details");
                        });
                    }));
    }
}
