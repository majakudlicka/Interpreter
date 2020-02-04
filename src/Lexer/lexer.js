import { Token } from './token';
import { TokenType } from './tokentype';
import { CharUtils } from './charUtils';
import { FSM } from './FSM';

export class Lexer {
	constructor(input) {
		this.input = input;
		this.position = 0;
		this.line = 0;
		this.column = 0;
	}

	recognizeDelimiter() {
		const position = this.position;
		const line = this.line;
		const column = this.column;
		const character = this.input.charAt(position);

		this.position += 1;
		this.column += 1;

		return new Token(character, character, line, column);
	}

	// / Recognizes and returns an operator token.
	recognizeOperator() {
		const character = this.input.charAt(this.position);

		if (CharUtils.isComparisonOperator(character)) {
			return this.recognizeComparisonOperator();
		}

		if (CharUtils.isArithmeticOperator(character)) {
			return this.recognizeArithmeticOperator();
		}

		if (CharUtils.isBooleanOperator(character)) {
        	return this.recognizeBooleanOperator();
		}

	}

	recognizeComparisonOperator() {
		const position = this.position;
		const line = this.line;
		const column = this.column;
		const character = this.input.charAt(position);

		// 'lookahead' is the next character in the input
		// or 'null' if 'character' was the last character.
		const lookahead = position + 1 < this.input.length ? this.input.charAt(position + 1) : null;

		// Whether the 'lookahead' character is the equal symbol '='.
		const isLookaheadEqualSymbol = lookahead !== null && lookahead === '=';

		this.position += 1;
		this.column += 1;

		if (isLookaheadEqualSymbol) {
			this.position += 1;
			this.column += 1;
		}

		switch (character) {
			case '>':
				return isLookaheadEqualSymbol
					? new Token(TokenType.GreaterOrEqual, '>=', line, column)
					: new Token(TokenType.Greater, '>', line, column);

			case '<':
				return isLookaheadEqualSymbol
					? new Token(TokenType.LessOrEqual, '<=', line, column)
					: new Token(TokenType.Less, '<', line, column);

			case '=':
				return isLookaheadEqualSymbol
					? new Token(TokenType.Equal, '==', line, column)
					: new Token(TokenType.Assign, '=', line, column);

			default:
				break;
		}

	}

	recognizeBooleanOperator() {
		const position = this.position;
		const line = this.line;
		const column = this.column;
		const character = this.input.charAt(position);

		// 'lookahead' is the next character in the input
		// or 'null' if 'character' was the last character.
		const lookahead = position + 1 < this.input.length ? this.input.charAt(position + 1) : null;

		// Whether the 'lookahead' character exists'.
		const isLookaheadEqualSymbol = lookahead !== null;

		this.position += 1;
		this.column += 1;

		if (isLookaheadEqualSymbol) {
			this.position += 1;
			this.column += 1;
		}

		switch (character) {
			case '!':
				return isLookaheadEqualSymbol && lookahead === '='
					? new Token(TokenType.NotEqual, '!=', line, column)
					: new Token(TokenType.Not, '!', line, column);

			case '&':
				return isLookaheadEqualSymbol && lookahead === '&'
					? new Token(TokenType.And, '&&', line, column)
					: new Error('Unrecognized character ${character} at line ${this.line} and column ${this.column}.');

			case '|':
				return isLookaheadEqualSymbol
					? new Token(TokenType.Or, '||', line, column)
					: new Error('Unrecognized character ${character} at line ${this.line} and column ${this.column}.');


			default:
				break;
		}

	}

	recognizeArithmeticOperator() {
		const position = this.position;
		const line = this.line;
		const column = this.column;
		const character = this.input.charAt(position);

		this.position += 1;
		this.column += 1;

		switch (character) {
			case '+':
				return new Token(TokenType.Plus, '+', line, column);

			case '-':
				return new Token(TokenType.Minus, '-', line, column);

			case '*':
				return new Token(TokenType.Times, '*', line, column);

			case '/':
				return new Token(TokenType.Div, '/', line, column);

			case '%':
				return new Token(TokenType.Modulo, '%', line, column);
		}
	}

	recognizeNewLine() {
		const line = this.line;
		const column = this.column;

		this.position += 1;
		this.column = 0;
		this.line += 1;
		return new Token(TokenType.Newline, '\n', line, column);
	}

	recognizeDot() {
		const line = this.line;
		const column = this.column;

		this.position += 1;
		this.column += 1;
		return new Token(TokenType.Dot, '.', line, column);
	}

	// / Recognizes and returns an identifier token.
	recognizeIdentifier() {
		let identifier = '';
		const line = this.line;
		const column = this.column;
		let position = this.position;

		while (position < this.input.length) {
			const character = this.input.charAt(position);

			if (!(CharUtils.isLetter(character) || CharUtils.isDigit(character) || ['_', '-', '$'].includes(character))) {
				break;
			}

			identifier += character;
			position += 1;
		}

		this.position += identifier.length;
		this.column += identifier.length;

		const keywords = [
			'class',
			'else',
			'extends',
			'false',
			'final',
			'func',
			'for',
			'if',
			'in',
			'let',
			'new',
			'null',
			'override',
			'private',
			'return',
			'super',
			'to',
			'this',
			'true',
			'var',
			'while'
		];

		if (keywords.includes(identifier)) {
			return new Token(identifier, identifier, line, column);
		}

		return new Token(TokenType.Identifier, identifier, line, column);
	}

	// / Recognizes and returns a number token.
	// Decimal number can start with a dot...
	recognizeNumberOrDot() {
		const line = this.line;
		const column = this.column;

		// We delegate the building of the FSM to a helper method.
		const fsm = this.buildNumberRecognizer();

		// The input to the FSM will be all the characters from
		// the current position to the rest of the lexer's input.
		const fsmInput = this.input.substring(this.position);

		// Here, in addition of the FSM returning whether a number
		// has been recognized or not, it also returns the number
		// recognized in the 'number' variable. If no number has
		// been recognized, 'number' will be 'null'.
		const { isNumberRecognized, number, state } = fsm.run(fsmInput);

		if (isNumberRecognized) {
			this.position += number.length;
			this.column += number.length;
			let tokenType;
			if (state === 2) {
				tokenType = TokenType.Integer;
			} else if (state === 4) {
				tokenType = TokenType.Decimal;
			}
			return new Token(tokenType, number, line, column);
		} if (number === '.' && state === 3) {
        	return this.recognizeDot();
		}
	}

	recognizeString() {
		let string = '"';
		const line = this.line;
		const column = this.column;
		let position = this.position + 1;

		while (position < this.input.length) {
			const character = this.input.charAt(position);

			if (character === '"') {
				string += character;
				break;
			}

			string += character;
			position += 1;
		}

		this.position += string.length;
		this.column += string.length;

		return new Token(TokenType.String, string, line, column);
	}

	buildNumberRecognizer() {
		// We name our states for readability.
		const State = {
			Initial: 1,
			Integer: 2,
			BeginNumberWithFractionalPart: 3,
			NumberWithFractionalPart: 4,
			BeginNumberWithExponent: 5,
			BeginNumberWithSignedExponent: 6,
			NumberWithExponent: 7,
			NoNextState: -1
		};

		const fsm = new FSM();
		fsm.states = new Set([State.Initial, State.Integer, State.BeginNumberWithFractionalPart, State.NumberWithFractionalPart,
			State.BeginNumberWithFractionalPart, State.BeginNumberWithExponent, State.BeginNumberWithSignedExponent,
			State.NumberWithExponent, State.NoNextState]);
		fsm.initialState = State.Initial;
		fsm.acceptingStates = new Set([State.Integer, State.NumberWithFractionalPart, State.NumberWithExponent]);
		fsm.nextState = (currentState, character) => {
			switch (currentState) {
				case State.Initial:
					if (CharUtils.isDigit(character)) {
						return State.Integer;
					}

					if (character === '.') {
						return State.BeginNumberWithFractionalPart;
					}

					break;

				case State.Integer:
					if (CharUtils.isDigit(character)) {
						return State.Integer;
					}

					if (character === '.') {
						return State.BeginNumberWithFractionalPart;
					}

					if (character.toLowerCase() === 'e') {
						return State.BeginNumberWithExponent;
					}

					break;

				case State.BeginNumberWithFractionalPart:
					if (CharUtils.isDigit(character)) {
						return State.NumberWithFractionalPart;
					}

					break;

				case State.NumberWithFractionalPart:
					if (CharUtils.isDigit(character)) {
						return State.NumberWithFractionalPart;
					}

					if (character.toLowerCase() === 'e') {
						return State.BeginNumberWithExponent;
					}

					break;

				case State.BeginNumberWithExponent:
					if (character === '+' || character === '-') {
						return State.BeginNumberWithSignedExponent;
					}

					if (CharUtils.isDigit()) {
						return State.NumberWithExponent;
					}

					break;

				case State.BeginNumberWithSignedExponent:
					if (CharUtils.isDigit()) {
						return State.NumberWithExponent;
					}

					break;

				default:
					break;
			}

			return State.NoNextState;
		};

		return fsm;
	}

	// / Returns the next recognized 'Token' in the input.
	nextToken() {
		if (this.position >= this.input.length) {
			return new Token(TokenType.EndOfInput);
		}

		// We skip all the whitespaces and new lines in the input.
		this.skipWhitespaces();

		const character = this.input.charAt(this.position);

		if (CharUtils.isNewLine(character)) {
			return this.recognizeNewLine();
		}

		if (CharUtils.isLetterOrUnderscore(character)) {
			return this.recognizeIdentifier();
		}

		if (CharUtils.isValidPartOfNumber(character)) {
			return this.recognizeNumberOrDot();
		}

		if (CharUtils.isOperator(character)) {
			return this.recognizeOperator();
		}

		if (CharUtils.isDelimiter(character)) {
			return this.recognizeDelimiter();
		}

		if (character === '"') {
			return this.recognizeString();
		}

		// Throw an error if the current character does not match
		// any production rule of the lexical grammar.
		throw new Error('Unrecognized character ${character} at line ${this.line} and column ${this.column}.');
	}

	skipWhitespaces() {
		while (this.position < this.input.length && CharUtils.isWhitespace(this.input.charAt(this.position))) {
			this.position += 1;
           	this.column += 1;
		}
	}

	tokenize() {
		let token = this.nextToken();
		const tokens = [];

		while (token.type !== TokenType.EndOfInput) {
			tokens.push(token);
			token = this.nextToken();
		}

		return tokens;
	}
}
