import { Delta } from '@typewriter/editor';

export function decorate(root: HTMLElement, contents: Delta) {
  const decorators = new Decorators(contents);
  root.dispatchEvent(new CustomEvent('decorate', { detail: decorators }));
  const change = decorators.getChange();

  if (change.ops.length) {
    change.forEach(op => {
      if (op.delete || (op.retain && op.attributes && !op.attributes.decorator) || (op.insert && !op.insert.decorator)) {
        throw new Error('Decorators may not insert text or delete contents.');
      }
    });
    contents = contents.compose(change);
  }
  return contents;
}


class Decorators {
  private change: Delta;
  private delta: Delta;
  private position: number;

  constructor(public contents: Delta) {
    this.change;
    this.delta = new Delta();
    this.position = 0;
  }

  mark(from: number, to: number, attributes: { [name: string]: any }) {
    [ from, to ] = this.updatePosition(from, to);
    const length = to - from;
    this.delta.retain(length, { decorator: attributes });
    this.position += length;
  }

  embed(at: number, attributes: { [name: string]: any }) {
    at = this.updatePosition(at);
    this.delta.insert({ decorator: attributes });
    this.position += 1;
  }

  getChange() {
    return this.change ? this.change.compose(this.delta) : this.delta;
  }

  private updatePosition(from: number, to?: number): any {
    if (this.change) {
      from = this.change.transformPosition(from);
      if (to != null) to = this.change.transformPosition(to);
    }

    // Optimize by adding to the existing delta when possible, compose is slow
    if (this.position < from) {
      this.delta.retain(from - this.position);
      this.position = from;
    } else if (this.position) {
      this.change = this.getChange();
      from = this.change.transformPosition(from);
      if (to != null) to = this.change.transformPosition(to);
      this.delta = new Delta();
      this.delta.retain(from);
      this.position = from;
    }

    return to != null ? [ from, to ] : from;
  }
}