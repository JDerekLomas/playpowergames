/**
 * Recursively makes all properties of an object optional.
 * @template Type The type of the object to make partial.
 * @returns A new object with all properties recursively made optional.
 * @see https://gist.github.com/graffhyrum/7f267cea2021ad4246be23ec5f6d4a4e
 */
export type RecursivePartial<Type> = {
    [Prop in keyof Type]?: Type[Prop] extends (infer U)[]
        ? RecursivePartial<U>[]
        : Type[Prop] extends object | undefined
        ? RecursivePartial<Type[Prop]>
        : Type[Prop];
};
