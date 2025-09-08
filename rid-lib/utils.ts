const NAMESPACE_SCHEMES = new Set<string>([
    "orn", "urn"
]);

export function parseRidString(
    str: string,
    contextOnly: boolean = false
): { 
    scheme: string;
    namespace: string | undefined; 
    ridType: string; 
    reference: string | undefined;
} {
    let scheme: string | undefined = undefined;
    let namespace: string | undefined = undefined;
    let reference: string | undefined = undefined;

    if (typeof str !== "string") {
        throw new TypeError(`RID type string '${str}' must be of type 'string'`);
    }

    const i = str.indexOf(":");

    if (i < 0) {
        if (!contextOnly) {
            throw new TypeError(`RID string '${str}' should contain a ':'-separated context and reference component`);
        }

        scheme = str;
        namespace = undefined;

        if (NAMESPACE_SCHEMES.has(scheme)) {
            throw new TypeError(`RID type string '${str}' is a namespace scheme but is missing a namespace component`);
        }
    } else {
        scheme = str.slice(0, i);
        if (NAMESPACE_SCHEMES.has(scheme)) {
            const j = str.indexOf(":", i + 1);

            if (j < 0) {
                if (contextOnly) {
                    namespace = str.slice(i + 1);
                } else {
                    throw new TypeError(`RID string '${str}' is missing a reference component`);
                }
            } else {
                if (contextOnly) {
                    throw new TypeError(`RID type string '${str}' should contain a maximum of two ':'-separated components`);
                } else {
                    namespace = str.slice(i + 1, j);
                    reference = str.slice(j + 1);
                }
            }
        } else {
            if (contextOnly) {
                throw new TypeError(`RID type string '${str}' contains a ':'-separated namespace component, but scheme doesn't support namespaces`);
            } else {
                reference = str.slice(i + 1);
            }
        }
    }

    if (scheme === "") {
        throw new TypeError(`RID type string '${str}' cannot have an empty scheme`);
    }

    if (namespace === "") {
        throw new TypeError(`RID type string '${str}' cannot have an empty namespace`);
    }

    if (reference === "") {
        throw new TypeError(`RID string '${str}' cannot have an empty reference`);
    }

    const ridType = scheme + ":" + (namespace || "");

    return {
        scheme, namespace, ridType, reference
    };
}