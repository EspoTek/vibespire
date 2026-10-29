// The engine tsconfig has no DOM lib; structuredClone exists in Node 17+ and every browser we target.
declare function structuredClone<T>(value: T): T;
