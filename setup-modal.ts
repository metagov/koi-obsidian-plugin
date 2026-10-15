import { KOI_NET_NODE_TYPE, OBSIDIAN_NOTE_TYPE, TELESCOPED_TYPE } from "consts";
import { App, Modal, Setting } from "obsidian";
import { parseRidString } from "rid-lib/utils";

const NODE_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

function validateNodeName(value: string): string | null {
    if (!value) return "This field is required";
    if (!NODE_NAME_PATTERN.test(value)) return "Invalid characters used";
    return null;
}

function validateFirstContactRid(value: string): string | null {
    if (!value) return "This field is required";
    try {
        const { ridType } = parseRidString(value);
        if (ridType !== KOI_NET_NODE_TYPE) {
            return `RID must be of type '${KOI_NET_NODE_TYPE}'.`;
        }
    } catch (e) {
        return e instanceof Error ? e.message : `Invalid RID '${value}'.`;
    }
    return null;
}

function validateFirstContactUrl(value: string): string | null {
    if (!value) return "This field is required";
    try {
        new URL(value);
    } catch {
        return "Enter a valid URL (e.g. https://example.com).";
    }
    return null;
}

function validateInterestedRidTypes(lines: Array<string>): string | null {
    if (lines.length === 0) return "Enter at least one RID type.";
    for (const line of lines) {
        try {
            parseRidString(line, true);
        } catch (e) {
            return e instanceof Error ? e.message : `Invalid RID type '${line}'.`;
        }
    }
    return null;
}

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

        let attemptedSubmit = false;

        new Setting(this.contentEl)
            .setName('Node name:')
            .setDesc("Use only alphanumeric characters, hyphen, or underscores")
            .addText(text =>
                text.onChange((value) => {
                    nodeName = value.trim();
                    if (attemptedSubmit) showError(nodeNameError, validateNodeName(nodeName));
                }));
        const nodeNameError = this.contentEl.createDiv({ cls: "koi-setup-error" });

        new Setting(this.contentEl)
            .setName('First contact RID:')
            .addText(text =>
                text.onChange((value) => {
                    firstContactRid = value.trim();
                    if (attemptedSubmit) showError(firstContactRidError, validateFirstContactRid(firstContactRid));
                }));
        const firstContactRidError = this.contentEl.createDiv({ cls: "koi-setup-error" });

        new Setting(this.contentEl)
            .setName('First contact URL:')
            .addText(text =>
                text.onChange((value) => {
                    firstContactUrl = value.trim();
                    if (attemptedSubmit) showError(firstContactUrlError, validateFirstContactUrl(firstContactUrl));
                }));
        const firstContactUrlError = this.contentEl.createDiv({ cls: "koi-setup-error" });

        new Setting(this.contentEl)
            .setName('RID types of interest')
            .setDesc('Enter one RID type per line')
            .addTextArea(text => text
                .setValue(`${OBSIDIAN_NOTE_TYPE}\n${TELESCOPED_TYPE}`)
                .onChange((value) => {
                    interestedRidTypes = value.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                    if (attemptedSubmit) showError(interestedRidTypesError, validateInterestedRidTypes(interestedRidTypes));
                })
            )
        const interestedRidTypesError = this.contentEl.createDiv({ cls: "koi-setup-error" });

        function showError(el: HTMLElement, message: string | null) {
            el.setText(message ?? "");
            el.toggleClass("is-visible", message !== null);
        }

        new Setting(this.contentEl)
            .addButton((btn) =>
                btn.setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        attemptedSubmit = true;

                        const nodeNameMessage = validateNodeName(nodeName);
                        const firstContactRidMessage = validateFirstContactRid(firstContactRid);
                        const firstContactUrlMessage = validateFirstContactUrl(firstContactUrl);
                        const interestedRidTypesMessage = validateInterestedRidTypes(interestedRidTypes);

                        showError(nodeNameError, nodeNameMessage);
                        showError(firstContactRidError, firstContactRidMessage);
                        showError(firstContactUrlError, firstContactUrlMessage);
                        showError(interestedRidTypesError, interestedRidTypesMessage);

                        if (
                            nodeNameMessage
                            || firstContactRidMessage
                            || firstContactUrlMessage
                            || interestedRidTypesMessage
                        ) {
                            return;
                        }

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
