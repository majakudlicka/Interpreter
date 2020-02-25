import { AstNode } from './AstNode';

export class ConditionalNode extends AstNode {
	constructor(condition, trueExpr, falseExpr) {
		super();
		this.condition = condition;
		this.trueExpr = trueExpr;
		this.falseExpr = falseExpr;
	}

	isConditionalNode() {
		return true;
	}
}