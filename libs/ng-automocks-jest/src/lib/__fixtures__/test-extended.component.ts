import { Component, Directive, input } from '@angular/core';

@Directive()
abstract class BaseComponent {
    public readonly value1 = input('');
    public readonly value2 = input.required<string>();
}

@Component({
    selector: 'test',
    template: 'this is a test',
    standalone: true,
    styles: [':host { display: block; }'],
})
export class TestComponent extends BaseComponent {
    public readonly value3 = input('', {
        alias: 'aValue3',
    });
    public readonly value4 = input.required({
        alias: 'aValue4',
    });

    method() {}
}
