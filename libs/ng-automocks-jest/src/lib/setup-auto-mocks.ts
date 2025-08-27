import { stubAnything } from './stub-anything';
import { StubCache } from './stub-cache';

export function setupAutoMocks(): void {
    const cache = new StubCache();

    jest.onGenerateMock((modulePath: string, moduleMock: unknown) => {
        const moduleActual = jest.requireActual(modulePath);

        try {
            stubAnything(cache, moduleActual, moduleMock);
        } catch (e) {
            throw new Error(
                `[ng-automocks-jest] Failed to stub module ${modulePath}`,
                { cause: e }
            );
        }

        return moduleMock;
    });
}
