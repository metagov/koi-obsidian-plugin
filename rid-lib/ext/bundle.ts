import { Manifest } from "./manifest";
import { sha256HashJson } from "./utils";


export class Bundle {
    manifest: Manifest;
    contents: Record<string, unknown>;

    constructor(
        manifest: Manifest,
        contents: Record<string, unknown>
    ) {
        this.manifest = manifest,
        this.contents = contents;
    }

    get rid(): string {
        return this.manifest.rid;
    }

    static generate(rid: string, contents: Record<string, unknown>) {
        const manifest = new Manifest(
            rid,
            new Date(),
            sha256HashJson(contents)
        );

        return new Bundle(manifest, contents);
    }
}

const bundle = Bundle.generate(
    "orn:slack.workspace:TMQ3PKXT9",
    {
        "id": "TMQ3PKXT9",
        "name": "Metagov",
        "url": "https://metagov.slack.com/",
        "domain": "metagov",
        "email_domain": "",
        "icon": {
          "image_default": false,
          "image_34": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_34.png",
          "image_44": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_44.png",
          "image_68": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_68.png",
          "image_88": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_88.png",
          "image_102": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_102.png",
          "image_230": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_230.png",
          "image_132": "https://avatars.slack-edge.com/2019-08-23/738149717927_1b1244de5d45739c3713_132.png"
        },
        "avatar_base_url": "https://ca.slack-edge.com/",
        "is_verified": false,
        "lob_sales_home_enabled": false
    }
)

console.log(bundle);