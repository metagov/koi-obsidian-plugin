import { App, Modal, Setting } from "obsidian";


export class SetupModal extends Modal {
    constructor(
        app: App, 
        onSubmit: (
            { nodeName, firstContactRid, firstContactUrl }: {
                nodeName: string,
                firstContactRid: string,
                firstContactUrl: string
            }
        ) => void
    ) {
        super(app);
        this.setTitle("Set up your KOI node!");
        let nodeName = "";
        let firstContactRid = "";
        let firstContactUrl = "";

        new Setting(this.contentEl)
            .setName('Node name:')
            .addText((text) =>
                text.onChange((value) => {
                    nodeName = value;
                }));

        new Setting(this.contentEl)
            .setName('First contact RID:')
            .addText((text) =>
                text.onChange((value) => {
                    firstContactRid = value;
                }));

        new Setting(this.contentEl)
            .setName('First contact URL:')
            .addText((text) =>
                text.onChange((value) => {
                    firstContactUrl = value;
                }));

        new Setting(this.contentEl)
            .addButton((btn) =>
                btn.setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        onSubmit({
                            nodeName, 
                            firstContactRid, 
                            firstContactUrl
                        });
                    }));
    }
}