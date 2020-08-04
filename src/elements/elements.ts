import {
	ComponentOptions, TypeOf, ChildOptions, PipeOptions,
	ServiceOptions, DirectiveOptions, JSXRender
} from '../core/decorators.js';
import { findByTagName, Tag } from './tags.js';
import {
	isOnInit, isOnChanges, isDoCheck,
	isAfterContentInit, isAfterContentChecked,
	isAfterViewInit, isAfterViewChecked, isOnDestroy,
} from '../core/lifecycle.js';
import { BaseComponent } from './component.js';
import { ComponentRender } from '../jsx/render.js';
import { dependencyInjector } from '../providers/injector.js';
import { ClassRegistry } from '../providers/provider.js';
import { JsxComponent } from '../jsx/factory.js';
import { Observable } from '../core/observable.js';
import { findByModelClassOrCreat } from '../reflect/bootstrap-data.js';

export class PropertyRef {
	constructor(public modelProperty: string, private _viewNanme?: string, descriptor?: PropertyDescriptor) { }
	get viewAttribute(): string {
		return this._viewNanme || this.modelProperty;
	}
}

export class ChildRef {
	constructor(public modelName: string, public selector: string | { new(): HTMLElement; prototype: HTMLElement } | CustomElementConstructor, public childOptions?: ChildOptions) { }
}

export class ListenerRef {
	constructor(public eventName: string, public args: string[], public modelCallbackName: string) { }
}

export class HostBindingRef {
	constructor(public viewProperty: string, public hostPropertyName: string) { }
}

export interface BootstropMatadata {
	[key: string]: any;
}

export interface ServiceRef extends ServiceOptions {
	descriptors: PropertyDescriptor[];
}

export interface PipeRef extends PipeOptions {
	name: string;
	pure: boolean;
	descriptors: PropertyDescriptor[];
}
export interface DirectiveRef extends DirectiveOptions {
	inputs: PropertyRef[];
	outputs: PropertyRef[];
	view: string;
	viewChild: ChildRef[];
	ViewChildren: ChildRef[];
	hostListeners: ListenerRef[];
	hostBindings: HostBindingRef[];
	directiveOptions: DirectiveOptions;
	descriptors: PropertyDescriptor[];
}

export interface ComponentRef<T> {
	selector: string;
	template: string | JSXRender<T>;
	styles: string;
	extend: Tag;

	viewClass: CustomElementConstructor;
	inputs: PropertyRef[];
	outputs: PropertyRef[];
	view: string;
	viewChild: ChildRef[];
	ViewChildren: ChildRef[];
	hostBindings: HostBindingRef[];
	hostListeners: ListenerRef[];
	descriptors: PropertyDescriptor[];
}


export class ComponentElement {

	static addOptional(modelProperty: Object, propertyName: string, index: number) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
	}

	static addInput(modelProperty: Object, modelName: string, viewNanme: string, descriptor?: PropertyDescriptor) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.inputs = bootstrap.inputs || [];
		bootstrap.inputs.push(new PropertyRef(modelName, viewNanme, descriptor));
	}

	static addOutput(modelProperty: Object, modelName: string, viewNanme: string) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.outputs = bootstrap.outputs || [];
		bootstrap.outputs.push(new PropertyRef(modelName, viewNanme));
	}

	static setComponentView(modelProperty: Object, modelName: string) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.view = modelName;
	}

	static addViewChild(modelProperty: Object, modelName: string, selector: string | typeof HTMLElement | CustomElementConstructor, childOptions?: ChildOptions) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.viewChild = bootstrap.viewChild || [];
		bootstrap.viewChild.push(new ChildRef(modelName, selector, childOptions));
	}

	static addViewChildren(modelProperty: Object, modelName: string, selector: string | typeof HTMLElement | CustomElementConstructor) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.ViewChildren = bootstrap.ViewChildren || [];
		bootstrap.ViewChildren.push(new ChildRef(modelName, selector));
	}

	static addHostListener(modelProperty: Object, propertyKey: string, eventName: string, args: string[]) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.hostListeners = bootstrap.hostListeners || [];
		bootstrap.hostListeners.push(new ListenerRef(eventName, args, propertyKey));
	}

	static addHostBinding(modelProperty: Object, propertyKey: string, hostPropertyName: string) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelProperty);
		bootstrap.hostBinding = bootstrap.hostBinding || [];
		bootstrap.hostBinding.push(
			new HostBindingRef(propertyKey, hostPropertyName)
		);
	}

	static defineDirective(modelClass: Function, opts: DirectiveOptions) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelClass.prototype);
		for (const key in opts) {
			bootstrap[key] = Reflect.get(opts, key);
		}
		dependencyInjector.getInstance(ClassRegistry).registerDirective(modelClass);
	}

	static definePipe(modelClass: Function, opts: PipeOptions) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelClass.prototype);
		for (const key in opts) {
			bootstrap[key] = Reflect.get(opts, key);
		}
		dependencyInjector.getInstance(ClassRegistry).registerPipe(modelClass);
	}

	static defineService(modelClass: Function, opts: ServiceOptions) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelClass.prototype);
		for (const key in opts) {
			bootstrap[key] = Reflect.get(opts, key);
		}
		dependencyInjector.getInstance(ClassRegistry).registerService(modelClass);
	}

	static defineComponent<T>(modelClass: Function, opts: ComponentOptions<T>) {
		var bootstrap: BootstropMatadata = findByModelClassOrCreat(modelClass.prototype);
		for (const key in opts) {
			bootstrap[key] = Reflect.get(opts, key);
		}
		bootstrap.extend = findByTagName(opts.extend);
		var componentRef: ComponentRef<T> = bootstrap as ComponentRef<T>;
		componentRef.viewClass = initViewClass(
			modelClass as TypeOf<Function>,
			componentRef
		);

		dependencyInjector.getInstance(ClassRegistry).registerComponent(modelClass);
		dependencyInjector
			.getInstance(ClassRegistry)
			.registerView(bootstrap.viewClass);
		// setBootstrapMatadata(modelClass.prototype, componentRef);

		const options: ElementDefinitionOptions = {};
		const parentTagName = componentRef.extend?.name;
		if (parentTagName) {
			if (parentTagName !== '!' && parentTagName.indexOf('-') === -1) {
				options.extends = parentTagName;
			}
		}
		customElements.define(
			componentRef?.selector as string,
			componentRef.viewClass as CustomElementConstructor,
			options
		);
	}
}

function initViewClass<T>(modelClass: TypeOf<Function>, componentRef: ComponentRef<T>): CustomElementConstructor {
	const viewClassName = `${modelClass.name}View`;
	const attributes: string[] = componentRef.inputs.map(input => input.viewAttribute);
	const htmlParent = (componentRef.extend as Tag).classRef as TypeOf<HTMLElement>;
	let viewClass: CustomElementConstructor;
	viewClass = class extends htmlParent implements BaseComponent {

		_model: any;
		_observable: Observable;
		_render: ComponentRender<T>;

		_nativeSetAttribute: Function;
		_nativeGetAttribute: Function;

		constructor() {
			super();
			this._model = new modelClass();
			this._observable = new Observable();
			this._render = new ComponentRender(this, componentRef);

			this._nativeSetAttribute = this.setAttribute;
			this._nativeGetAttribute = this.getAttribute;

			this.setAttribute = this._setAttributeModel;
			this.getAttribute = this._getAttributeModel;

			attributes.forEach(attr => this._nativeSetAttribute(attr, this._model[attr]));

		}
		_setAttributeModel(qualifiedName: string, value: string): void {
			Reflect.set(this._model, qualifiedName, value);
			this._nativeSetAttribute(qualifiedName, value);
			this._observable.emit(qualifiedName);
		}

		_getAttributeModel(qualifiedName: string): string | null {
			return Reflect.get(this._model, qualifiedName);
		}

		doBlockCallback = (): void => {
			if (isDoCheck(this._model)) {
				this._model.doCheck();
			}
		};

		attributeChangedCallback(name: string, oldValue: string, newValue: string) {
			if (newValue === oldValue) {
				return;
			}
			this._observable.emit(name);
			if (isOnChanges(this._model)) {
				this._model.onChanges();
			}
			this.doBlockCallback();
		}
		connectedCallback() {
			if (isOnChanges(this._model)) {
				this._model.onChanges();
			}
			if (isOnInit(this._model)) {
				this._model.onInit();
			}
			if (isDoCheck(this._model)) {
				this._model.doCheck();
			}
			if (isAfterContentInit(this._model)) {
				this._model.afterContentInit();
			}
			if (isAfterContentChecked(this._model)) {
				this._model.afterContentChecked();
			}

			// setup ui view
			if (componentRef.template) {
				this._render.initView();
			}

			if (componentRef.view) {
				this._model[componentRef.view] = this;
			}

			if (isAfterViewInit(this._model)) {
				this._model.afterViewInit();
			}
			if (isAfterViewChecked(this._model)) {
				this._model.afterViewChecked();
			}
			this.doBlockCallback = () => {
				if (isDoCheck(this._model)) {
					this._model.doCheck();
				}
				if (isAfterContentChecked(this._model)) {
					this._model.afterContentChecked();
				}
				if (isAfterViewChecked(this._model)) {
					this._model.afterViewChecked();
				}
			};
		}

		adoptedCallback() {
			// restart the process
			this.connectedCallback();
		}
		disconnectedCallback() {
			if (isOnDestroy(this._model)) {
				this._model.onDestroy();
			}
		}
	};
	attributes.forEach(prop => {
		Object.defineProperty(viewClass.prototype, prop, {
			get(): any {
				return this._model[prop];
			},
			set(value: any) {
				// this._model[prop] = value;
				this.setAttribute(prop, value);
			},
			enumerable: true
		});
	});
	Object.defineProperty(viewClass, 'observedAttributes', {
		get() {
			return attributes;
		}
	});
	Object.defineProperty(modelClass, viewClassName, { value: viewClass });
	Object.defineProperty(viewClass, 'name', { value: viewClassName });
	return viewClass;
}
