import { AstNode } from './astNode';

export class SymbolNode extends AstNode {
	constructor(name, line) {
		super(line);
		this.name = name;
	}

	isSymbolNode() {
		return true;
	}
}
