import { KOI_NET_NODE_TYPE, OBSIDIAN_NOTE_TYPE, TELESCOPED_TYPE } from "consts";
import { App, Modal, Setting } from "obsidian";


export class SetupModal extends Modal {
    constructor(
        app: App, 
        onSubmit: (
            { nodeName, firstContactRid, firstContactUrl, interestedRidTypes }: {
                nodeName: string,
                firstContactRid: string,
                firstContactUrl: string,
                interestedRidTypes: Array<string>
            }
        ) => void
    ) {
        super(app);
        this.setTitle("Set up your KOI node!");
        let nodeName = "";
        let firstContactRid = "";
        let firstContactUrl = "";
        let interestedRidTypes = Array<string>(
            KOI_NET_NODE_TYPE,
            OBSIDIAN_NOTE_TYPE, 
            TELESCOPED_TYPE
        );

        new Setting(this.contentEl)
            .setName('Node name:')
            .setDesc("Use only alphanumeric characters, hyphen, or underscore")
            .addText(text =>
                text.onChange((value) => {
                    nodeName = value.trim();
                }));

        new Setting(this.contentEl)
            .setName('First contact RID:')
            .addText(text =>
                text.onChange((value) => {
                    firstContactRid = value.trim();
                }));

        new Setting(this.contentEl)
            .setName('First contact URL:')
            .addText(text =>
                text.onChange((value) => {
                    firstContactUrl = value.trim();
                }));

        new Setting(this.contentEl)
            .setName('RID types of interest')
            .setDesc('Enter one RID type per line')
            .addTextArea(text => text
                .setValue(`${OBSIDIAN_NOTE_TYPE}\n${TELESCOPED_TYPE}`)
                .onChange((value) => {
                    interestedRidTypes = value.split('\n');
                })
            )

        new Setting(this.contentEl)
            .addButton((btn) =>
                btn.setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        onSubmit({
                            nodeName, 
                            firstContactRid, 
                            firstContactUrl,
                            interestedRidTypes
                        });
                    }));
    }
}