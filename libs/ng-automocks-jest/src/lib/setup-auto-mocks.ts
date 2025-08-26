import { stubAnything } from './stub-anything';
import { StubCache } from './stub-cache';

export function setupAutoMocks(): void {
    const cache = new StubCache();

    jest.onGenerateMock((modulePath: string, moduleMock: unknown) => {
        const moduleActual = jest.requireActual(modulePath);

        stubAnything(cache, moduleActual, moduleMock);

        return moduleMock;
    });
}
