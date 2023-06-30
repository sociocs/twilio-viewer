// converts an object to array of label value pair
export const toLabelValArray = (object: Record<string, any>, keys: Array<string>) => {
    const result = [] as Array<Record<string, string>>;

    for (let i = 0; i < keys?.length; i++) {
        const key = keys[i];

        result.push({ label: key.toString(), value: object[key]?.toString() || "None" });
    }

    return result;
};

// converts a nested object to flat one, useful when rendering data
export const flattenObject = (ob: Record<string, any>) => {
    let result = {} as Record<string, any>;

    for (const i in ob) {
        if (typeof ob[i] === 'object' && !Array.isArray(ob[i])) {
            const temp = flattenObject(ob[i]);
            for (const j in temp) {
                result[i + '.' + j] = temp[j];
            }
        }
        else {
            result[i] = ob[i];
        }
    }

    return result;
};

export const localDate = (value: string) => {
    return (new Date(value)).toLocaleString();
};

const priceFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
});

export const formatPrice = (value: number) => {
    // if (isNaN(value)) {
    //     value = parseFloat(value);
    // }

    return priceFormatter.format(value);
};