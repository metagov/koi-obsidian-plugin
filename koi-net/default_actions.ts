import { Bundle } from "rid-lib/ext/bundle";
import { ActionContext } from "./context";
import { EffectorAction } from "./effector";

export const dereferenceKoiNode: EffectorAction = (
    ctx: ActionContext, rid: string
) => {
    console.log("deref koi node")
    if (rid !== ctx.identity.rid) return;

    return Bundle.generate({
        rid: ctx.identity.rid,
        contents: ctx.identity.profile
    });
}