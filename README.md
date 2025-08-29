# ng-automocks-jest

<img src="./images/logo.svg" width="40%" alt="logo">

When testing Angular applications, you often need to isolate a component or service under test from its Angular dependencies. In the past, this meant manually creating stub components, using `NO_ERRORS_SCHEMA`, `TestBed.override...` functions, third party libraries, or creating mock entities manually. With `ng-automocks-jest`, you can generate **stubbed Angular components, directives, pipes, modules, and services** on the fly whenever you use Jest’s module mocking. This helps to:

- **Simplify Test Setup:** Avoid writing boilerplate stubs for every child component or injected service, avoid using third-party libraries. Instead, let Jest auto-mock entire Angular modules or libraries, and the preset will replace Angular classes with safe stubs.
- **Prevent Injection Errors:** By default, Jest’s auto-mocks replace Angular factory functions (`ɵfac`) with `jest.fn()` returning `undefined`, causing injection to fail. The automatic mocking system fixes these by providing factories that return stub instances, so your components can inject services without errors.
- **Isolate External Dependencies:** You can mock out an entire Angular library with a single `jest.mock('some-angular-lib')` call. The preset will stub all components/directives/pipes from that library, so your tests don’t execute their templates or logic.

---

## Installation

```bash
npm i -D ng-automocks-jest
```

To activate this feature, you need to register it in your `jest-setup.ts`. The package provides a function `setupAutoMocks()` which uses Jest’s `jest.onGenerateMock()` hook internally. Here’s how to configure it:

```typescript
import {setupAutoMocks} from "ng-automocks-jest";

setupAutoMocks();
```

---


## Using Automatic Mocks in Tests

Once enabled, using the auto-mocking is straightforward. You trigger it by mocking the modules or components you want stubbed. This can be done via explicit `jest.mock` calls (or by setting `automock: true` in your Jest config, though explicit mocking is more common in Angular tests).

Here are some usage examples:

### Mocking Angular Service

Suppose you have `SomeService` provided in `root` by an external library `external-lib`, and your component uses `inject(SomeService)`.

#### my.component.ts

```ts
import { Component, inject } from '@angular/core';
import { SomeService } from 'external-lib';

@Component({
  selector: 'my',
  template: `<button (click)="onButtonClick()">Click me</button>`,
})
export class MyComponent {
  private readonly someService = inject(SomeService);

  public onButtonClick(): void {
    this.someService.doSomething();
  }
}
```

#### my.component.spec.ts

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SomeService } from 'external-lib';

import { MyComponent } from './my.component';

jest.mock('external-lib');

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let someService: jest.Mocked<SomeService>;

  beforeEach(() => {
    someService = jest.mocked(TestBed.inject(SomeService));

    fixture = TestBed.createComponent(MyComponent);
    fixture.detectChanges();
  });

  describe('on button click', () => {
    beforeEach(() => {
      fixture.debugElement.query(By.css('button')).triggerEventHandler('click', null);
    });

    it('should call doSomething on SomeService', () => {
      expect(someService.doSomething).toHaveBeenCalled();
    });
  });
});
```

Now `SomeService` is replaced by a stub class. Its Angular factory (`ɵfac`) is adjusted to return a new instance of the stub, so `inject(SomeService)` will get a valid object (not `undefined`). Any methods on the service are Jest mocks (no-op by default), which you can spy on or configure as needed. For example, `SomeService.prototype.myMethod` will be a `jest.fn` that you can `.mockReturnValue(...)` in your test. Your component can call `someService.doSomething()` without error, and you can verify the call via `expect(someService.myMethod).toHaveBeenCalled()`.

### Mocking Angular Component

Suppose you have `SomeComponent` provided by an external library `external-lib`, and your component uses imports `SomeComponent` and provides some inputs/outputs to it.

#### my.component.ts

```ts
import { Component, input, signal } from '@angular/core';
import { SomeComponent } from 'external-lib';

@Component({
  selector: 'my',
  template: `
    @if (isVisible()) {
      <some [value]="value()" (helloWorld)="onHelloWorld($event)" />
    }
  `,
  imports: [SomeComponent],
})
export class MyComponent {
  public readonly isVisible = input(false);
  public readonly value = signal('');

  public onHelloWorld(data: string): void {
    console.log(data);
  }
}
```

#### my.component.spec.ts

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SomeComponent } from 'external-lib';

import { MyComponent } from './my.component';

jest.mock('external-lib');

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let component: MyComponent;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('if isVisible is true', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isVisible', true);
      fixture.detectChanges();
    });

    it('should render SomeComponent', () => {
      expect(fixture.debugElement.query(By.directive(SomeComponent))).toBeTruthy();
    });

    describe('on helloWorld event', () => {
      beforeEach(() => {
        jest.spyOn(component, 'onHelloWorld');

        fixture.debugElement.query(By.directive(SomeComponent)).triggerEventHandler('helloWorld', 'hello');
      });

      it('should call onHelloWorld', () => {
        expect(component.onHelloWorld).toHaveBeenCalledWith('hello');
      });
    });
  });

  describe('if isVisible is false', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('isVisible', false);
      fixture.detectChanges();
    });

    it('should not render SomeComponent', () => {
      expect(fixture.debugElement.query(By.directive(SomeComponent))).toBeFalsy();
    });
  });
});
```

With `external-lib` mocked, `SomeComponent` is now a stub Component. These stub components have the same selector and input properties as the real ones, but their template is empty and their methods are no-ops. This means Angular’s rendering won’t error out – it recognizes the `<some>` element via the stub – but none of the real component’s logic runs. In your test, you can still interact with `MyComponent` and even set inputs on the stubbed child component if needed. The stub child’s outputs are omitted, so you can emit values by `debugSomeElement.triggerEventHandler('event', data)`.

### Mocking Angular Pipe

#### my.component.ts

```ts
import { Component, signal } from '@angular/core';
import { SomePipe } from 'external-lib';

@Component({
  selector: 'my',
  template: ` <p>{{ value() | some }}</p> `,
  imports: [SomePipe],
})
export class MyComponent {
  public readonly value = signal('');
}
```

#### my.component.spec.ts

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SomePipe } from 'external-lib';

import { MyComponent } from './my.component';

jest.mock('external-lib');

describe('MyComponent', () => {
  let fixture: ComponentFixture<MyComponent>;
  let component: MyComponent;

  beforeEach(() => {
    jest.mocked(SomePipe).prototype.transform.mockReturnValue('transformed');

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render transformed value', () => {
    expect(fixture.nativeElement.textContent).toBe('transformed');
  });

  describe('if value changes', () => {
    beforeEach(() => {
      component.value.set('new value');
      jest.mocked(SomePipe).prototype.transform.mockReturnValue('new transformed');
      fixture.detectChanges();
    });

    it('should render new transformed value', () => {
      expect(fixture.nativeElement.textContent).toBe('new transformed');
    });
  });
});
```

Similarly, if your component template uses a pipe or directive from an external module, auto-mocking that module will stub those as well. A stub pipe implements a `transform()` method that by default returns `undefined` and is a `jest.fn` – so your component’s template can call the pipe without error.

These examples demonstrate how you can quickly stub out entire dependencies. You no longer need to specify schemas or declare dummy components for every child – a single `jest.mock()` does the job. The stubbed pieces will seamlessly integrate, letting you focus on testing the logic of your component or service under test.

## How Does It Work?

Under the hood, the automatic mocking system relies on several utilities to create minimal Angular-compatible substitutes:

- **[Jest automatic mock](https://jestjs.io/docs/es6-class-mocks#automatic-mock)** – Jest’s built-in `jest.mock()` function creates a mock module that can be used in your tests. It replaces all statically accessible methods and classes of original module by `jest.fn()`.

- **[Jest onGenerateMock hook](https://jestjs.io/blog/2025/06/04/jest-30#jestongeneratemockcallback)** – Jest 30 introduced the `jest.onGenerateMock(callback)` API, which allows transforming automatically generated mocks. `setupAutoMocks()` registers a callback that is invoked whenever Jest auto-mocks a module. The callback receives the module’s mock exports and scans through them to find any Angular Ivy entities.

In summary, when you mock a module using Jest, the preset’s hook transforms the resulting module object by replacing each export with either the original Jest mock (for non-Angular entities) or a rich stub (for Angular entities). The outcome is that your test sees a module where Angular classes are present (so Angular can consume them) but they are all dummy implementations. This all happens behind the scenes when the module is first imported in the test.

## Notes and Limitations

Keep the following in mind when using the automatic mocking:

- **Opt-In Behavior:** Automatic mocking is _not_ enabled by default to avoid surprising behaviors in existing tests. You must call `setupAutoMocks()` (typically in your `setupFilesAfterEnv`). If you decide not to use it, Jest will continue to auto-mock modules in the normal way (and Angular internals might remain problematic without manual intervention).

- **Only Affects Auto-Mocks:** The `onGenerateMock` hook only runs for **automatically generated mocks** – that is, when you use `jest.mock('moduleName')` with no manual factory, or if you have `automock: true` for all modules. It **does not** run for modules that you manually mock with a factory or those with a custom `__mocks__` implementation. In those cases, you are responsible for providing any needed stubs. (You can still manually use the stub utilities if desired, but that’s an advanced use case.)

- **Combining with Manual Spies:** The stubbed classes and instances are still Jest mocks under the hood. You can treat them like any mock – for example, use `.mockReturnValue` or `.mockImplementation` on stubbed methods to tailor their behavior. A stubbed pipe’s `transform` can be overridden to return specific values if your component logic depends on it. The automatic stub provides the structure, and you are free to customize the behavior in your test.

- **No Real Logic Executed:** By design, **none** of the original component/directive/pipe logic runs. If your test inadvertently relies on some effect of an external component (e.g. a child component’s lifecycle setting up something, or a pipe computing a value), be aware that with the dependency stubbed, that effect won’t happen. Usually this is what you want in unit tests. If you do need the real behavior, you should not mock that particular module or component.

- **Maintaining API:** The stub generation attempts to preserve the public API of components/directives so that binding to them in templates won’t throw errors. However, the **values** of those inputs are not used by any internal logic (since there is none). If a child stub component has an input that your component sets, it will accept the value, but it doesn’t do anything with it. Similarly, outputs won’t emit on their own. You can manually trigger an output if needed for your test scenario (via `debugElement.triggerEventHandler` method).

- **Module Imports and Providers:** When stubbing an NgModule, the system will recursively stub its declarations (and possibly imported modules).

- **Interaction with Other Mocking Libraries:** If you are using libraries like `ng-mocks` or others that provide their own Angular stubs, be cautious. The automatic Ivy mocks from `ng-automocks-jest` may overlap in purpose. It’s recommended to use one approach consistently. If you enable `setupAutoMocks()`, you typically do not need to call `MockComponent`/`MockService` from other libraries for the same dependencies, as the preset will have already replaced them.

- **Troubleshooting:** If a mock isn’t behaving as expected, you can inspect the stub. For example, logging `fixture.debugElement.query(By.directive(SomeChildComponent)).componentInstance.method`. If it is an instance of `jest.Mock`, this can help confirm that the auto-mocking occurred. We welcome issues or PRs if you find something that the automatic stubbing doesn’t cover.

By leveraging automatic mocks, you can significantly streamline your Angular unit tests. Instead of spending time writing dummy implementations of components or worrying about Angular internals in your mocks, you let `ng-automocks-jest` handle the heavy lifting. Focus on your test assertions, and enjoy fewer setup headaches when dealing with Angular entities!

---

## Authors

| <a href="https://github.com/MillerSvt"><img src="https://github.com/MillerSvt.png?size=100" alt="Svyatoslav Zaytsev" width="100" style="border-radius:20%;" /></a> |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                                                       [**Svyatoslav Zaytsev**](https://github.com/MillerSvt)                                                       |
|                                                          💻 [sviatsv@yandex.ru](mailto:sviatsv@yandex.ru)                                                          |

---

## License

MIT © 2025
