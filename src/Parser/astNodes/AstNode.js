export class AstNode {

	constructor() {
		this.line = -1;
		this.column = -1;
	}

	isSymbolNode() {
		return false;
	}

	isWhileLoopNode() {
		return false;
	}

	isAssignmentNode() {
		return false;
	}

	isBlockNode() {
		return false;
	}

	isConditionalNode() {
		return false;
	}

	isConstantNode() {
		return false;
	}

	isFunctionAssignmentNode() {
		return false;
	}

	isFunctionNode() {
		return false;
	}

	isOperatorNode() {
		return false;
	}

	isParenthesisNode() {
		return false;
	}
}
