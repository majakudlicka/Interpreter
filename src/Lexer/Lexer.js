import { Token } from './token';
import { TokenTypes, TokenValues, TokenStructure } from './tokenStructure';
import { CharUtils } from './charUtils';
import { FSM } from './FSM';

export class Lexer {
	constructor(input) {
		this.input = input;
		this.position = 0;
		this.line = 1;
	}

	// / Returns the next recognized 'Token' in the input.
	nextToken() {
		if (this.position >= this.input.length) {
			return new Token(TokenTypes.EndOfInput, TokenValues.EndOfInput, this.line);
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

		if (CharUtils.isNonASCII(character)) {
			return this.recognizeEmoji(character);
		}

		this.throwLexerError(character);


	}

	tokenize() {
		let token = this.nextToken();
		const tokens = [];

		while (token.type !== TokenTypes.EndOfInput) {
			tokens.push(token);
			token = this.nextToken();
		}

		return tokens;
	}

	throwLexerError(char) {
		throw new Error(`[LEXER]: Unrecognized character ${char} at line ${this.line}`);
	}

	skipWhitespaces() {
		while (this.position < this.input.length && CharUtils.isWhitespace(this.input.charAt(this.position))) {
			this.position += 1;
		}
	}

	recognizeDelimiter() {
		const { position, line } = this;
		const character = this.input.charAt(position);
		this.position += 1;
		return new Token(TokenTypes.Delimiter, character, line);
	}


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

		this.throwLexerError(character);

	}

	recognizeComparisonOperator() {
		const { position, line } = this;
		const character = this.input.charAt(position);
		const lookahead = position + 1 < this.input.length ? this.input.charAt(position + 1) : null;
		const isLookaheadEqualSymbol = lookahead !== null && lookahead === '=';

		this.position += 1;

		if (isLookaheadEqualSymbol) {
			this.position += 1;
		}

		let tokenType = TokenTypes.Comparison;
		let tokenValue;
		switch (character) {
			case '>':
				tokenValue = isLookaheadEqualSymbol ? TokenValues.GreaterOrEqual : TokenValues.Greater;
				break;
			case '<':
				tokenValue = isLookaheadEqualSymbol ? TokenValues.LessOrEqual : TokenValues.Less;
				break;
			case '=':
				tokenValue = isLookaheadEqualSymbol ? TokenValues.Equal : TokenValues.Assignment;
				tokenType = isLookaheadEqualSymbol ? TokenTypes.Comparison : TokenTypes.Assignment;
				break;
			default:
				this.throwLexerError(character);
		}
		return new Token(tokenType, tokenValue, line);
	}

	recognizeBooleanOperator() {
		const { position, line } = this;
		const character = this.input.charAt(position);
		const lookahead = position + 1 < this.input.length ? this.input.charAt(position + 1) : null;
		const isLookaheadEqualSymbol = lookahead !== null;

		this.position += 1;

		if (isLookaheadEqualSymbol) {
			this.position += 1;
		}

		switch (character) {
			case '!':
				return isLookaheadEqualSymbol && lookahead === '='
					? new Token(TokenTypes.Logical, TokenValues.NotEqual, line)
					: new Token(TokenTypes.Not, '!', line);

			case '&':
				return isLookaheadEqualSymbol && lookahead === '&'
					? new Token(TokenTypes.Logical, TokenValues.And, line)
					: new Error(`Unrecognized character ${character} at line ${this.line}.`);

			case '|':
				return isLookaheadEqualSymbol
					? new Token(TokenTypes.Logical, TokenValues.Or, line)
					: new Error(`Unrecognized character ${character} at line ${this.line}.`);


			default:
				this.throwLexerError(character);
		}

	}

	recognizeArithmeticOperator() {
		const { position, line } = this;
		const character = this.input.charAt(position);
		this.position += 1;
		return new Token(TokenTypes.Arithmetic, character, line);
	}

	recognizeNewLine() {
		const { line, position } = this;
		const character = this.input.charAt(position);
		this.position += 1;
		this.line += 1;
		return new Token(TokenTypes.Delimiter, character, line);
	}

	recognizeDot() {
		const { line } = this;
		this.position += 1;
		return new Token(TokenTypes.Accessor, TokenValues.Dot, line);
	}

	recognizeIdentifier() {
		let identifier = '';
		const { line } = this;
		let { position } = this;

		while (position < this.input.length) {
			const character = this.input.charAt(position);

			if (!CharUtils.isIdentifier(character)) {
				break;
			}

			identifier += character;
			position += 1;
		}

		this.position += identifier.length;

		// TODO Ugh, ugly!
		if (Object.values(TokenStructure.Keyword.values).includes(identifier)) {
			return new Token(TokenTypes.Keyword, identifier, line);
		} if (Object.values(TokenStructure.Greeting.values).includes(identifier)) {
			return new Token(TokenTypes.Greeting, identifier, line);
		} if (Object.values(TokenStructure.FunctionInvocation.values).includes(identifier)) {
			return new Token(TokenTypes.FunctionInvocation, identifier, line);
		} if (Object.values(TokenStructure.Gratitude.values).includes(identifier)) {
			return new Token(TokenTypes.Gratitude, identifier, line);
		} if (Object.values(TokenStructure.Farewell.values).includes(identifier)) {
			return new Token(TokenTypes.Farewell, identifier, line);
		}

		return new Token(TokenTypes.Identifier, identifier, line);
	}

	recognizeNumberOrDot() {
		const { line } = this;
		const fsm = this.buildNumberRecognizer();
		const fsmInput = this.input.substring(this.position);
		const { isNumberRecognized, number, state } = fsm.run(fsmInput);

		if (isNumberRecognized) {
			this.position += number.length;
			let tokenType;
			if (state === 2) {
				tokenType = TokenTypes.Integer;
			} else if (state === 4) {
				tokenType = TokenTypes.Decimal;
			}
			return new Token(tokenType, number, line);
		} if (number === TokenValues.Dot && state === 3) {
        	return this.recognizeDot();
		}
		this.throwLexerError(number);
	}

	recognizeString() {
		let string = '"';
		const { line } = this;
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

		return new Token(TokenTypes.String, string, line);
	}

	recognizeEmoji() {
		const { line } = this;
		let { position } = this;
		const char = this.input.charAt(position);
		let emoji = `${char}`;

		position = this.position + 1;

		while (position < this.input.length) {
			const character = this.input.charAt(position);

			if (CharUtils.isWhitespace(character)) {
				break;
			}

			emoji += character;
			position += 1;
		}

		this.position += emoji.length;
		if (CharUtils.isWaveHandEmoji(emoji)) {
			return new Token(TokenTypes.Greeting, TokenValues.WaveEmoji, line);
		} if (CharUtils.isPleaseEmoji(emoji)) {
			return new Token(TokenTypes.FunctionInvocation, TokenValues.PleaseEmoji, line);
		} if (CharUtils.isHeartFaceEmoji(emoji)) {
			return new Token(TokenTypes.Gratitude, TokenValues.HeartFaceEmoji, line);
		} if (CharUtils.isHeartEmoji(emoji)) {
			return new Token(TokenTypes.Gratitude, TokenValues.HeartEmoji, line);
		} if (CharUtils.isHugEmoji(emoji)) {
			return new Token(TokenTypes.Gratitude, TokenValues.HugEmoji, line);
		} if (CharUtils.isByeEmoji(emoji)) {
			return new Token(TokenTypes.Farewell, TokenValues.ByeEmoji, line);
		} if (CharUtils.isKissEmoji(emoji)) {
			return new Token(TokenTypes.Farewell, TokenValues.KissEmoji, line);
		}
		return new Token(TokenTypes.CommonEmoji, emoji, line);

		//
		// this.throwLexerError(character);
	}

	// Use Finite State Machine to recognize different types of numbers
	buildNumberRecognizer() {
		// We name our states for readability.
		const State = {
			Initial: 1,
			Integer: 2,
			BeginNumberWithFractionalPart: 3,
			NumberWithFractionalPart: 4,
			NoNextState: -1
		};

		const fsm = new FSM();
		fsm.states = new Set([State.Initial, State.Integer, State.BeginNumberWithFractionalPart,
			State.NumberWithFractionalPart, State.NoNextState]);
		fsm.initialState = State.Initial;
		fsm.acceptingStates = new Set([State.Integer, State.NumberWithFractionalPart]);
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

					break;


				default:
					break;
			}

			return State.NoNextState;
		};

		return fsm;
	}


}
