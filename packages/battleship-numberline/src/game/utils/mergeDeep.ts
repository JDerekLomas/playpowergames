/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { RecursivePartial } from '../interfaces/recursivePartial';

export function mergeObjects<T>(obj1: T, obj2: RecursivePartial<T>): T {
    if (typeof obj2 !== 'object' || obj2 === null) {
        return obj1;
    }

    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        return obj2.map((item, index) => {
            if (index < obj1.length) {
                return mergeObjects(obj1[index], item);
            }
            return item;
        }) as T;
    }

    const result = { ...obj1 };

    for (const key in obj2) {
        if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
            continue;
        }

        const value2 = obj2[key];
        if (value2 === undefined) {
            continue;
        }
        if (
            obj1 &&
            Object.prototype.hasOwnProperty.call(obj1, key) &&
            typeof (obj1 as any)[key] === 'object' &&
            (obj1 as any)[key] !== null &&
            typeof value2 === 'object' &&
            value2 !== null
        ) {
            result[key] = mergeObjects((obj1 as any)[key], value2);
        } else {
            result[key] = value2 as T[Extract<keyof T, string>];
        }
    }

    return result;
}

