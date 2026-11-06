"use strict";

(() => {
  const expressionDisplay = document.querySelector("#expression");
  const resultDisplay = document.querySelector("#result");
  const messageDisplay = document.querySelector("#display-message");
  const angleToggle = document.querySelector(".angle-toggle");
  const historyList = document.querySelector("#history-list");
  const clearHistoryButton = document.querySelector("#clear-history");
  const calculator = document.querySelector(".calculator-card");

  let expression = "";
  let answer = 0;
  let radians = false;
  let justEvaluated = false;
  const history = [];

  const functions = {
    sin: (value) => Math.sin(toRadians(value)),
    cos: (value) => Math.cos(toRadians(value)),
    tan: (value) => Math.tan(toRadians(value)),
    asin: (value) => fromRadians(Math.asin(value)),
    acos: (value) => fromRadians(Math.acos(value)),
    atan: (value) => fromRadians(Math.atan(value)),
    sqrt: Math.sqrt,
    abs: Math.abs,
    ln: Math.log,
    log: Math.log10,
  };

  function toRadians(value) {
    return radians ? value : value * Math.PI / 180;
  }

  function fromRadians(value) {
    return radians ? value : value * 180 / Math.PI;
  }

  function tokenize(source) {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const rest = source.slice(index);
      const numberMatch = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      const wordMatch = rest.match(/^[a-zA-Z]+/);

      if (/\s/.test(source[index])) {
        index += 1;
      } else if (numberMatch) {
        tokens.push({ type: "number", value: Number(numberMatch[0]) });
        index += numberMatch[0].length;
      } else if (wordMatch) {
        tokens.push({ type: "word", value: wordMatch[0] });
        index += wordMatch[0].length;
      } else if ("+-*/%^!()".includes(source[index])) {
        tokens.push({ type: "operator", value: source[index] });
        index += 1;
      } else {
        throw new Error("Unrecognized character");
      }
    }

    return tokens;
  }

  function evaluate(source) {
    const tokens = tokenize(source);
    let position = 0;

    function peek() {
      return tokens[position];
    }

    function take(value) {
      if (peek()?.value === value) {
        position += 1;
        return true;
      }
      return false;
    }

    function parseExpression() {
      let value = parseTerm();
      while (peek()?.value === "+" || peek()?.value === "-") {
        const operator = tokens[position++].value;
        const right = parseTerm();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }

    function startsPrimary(token) {
      return token && (token.type === "number" || token.type === "word" || token.value === "(");
    }

    function parseTerm() {
      let value = parseUnary();
      while (peek() && (["*", "/", "%"].includes(peek().value) || startsPrimary(peek()))) {
        const operator = startsPrimary(peek()) ? "*" : tokens[position++].value;
        const right = parseUnary();
        if ((operator === "/" || operator === "%") && right === 0) {
          throw new Error("Cannot divide by zero");
        }
        if (operator === "*") value *= right;
        else if (operator === "/") value /= right;
        else value %= right;
      }
      return value;
    }

    function parseUnary() {
      if (take("+")) return parseUnary();
      if (take("-")) return -parseUnary();
      return parsePower();
    }

    function parsePower() {
      let value = parsePostfix();
      if (take("^")) value **= parseUnary();
      return value;
    }

    function parsePostfix() {
      let value = parsePrimary();
      while (take("!")) {
        if (!Number.isInteger(value) || value < 0 || value > 170) {
          throw new Error("Factorial needs a whole number from 0 to 170");
        }
        let factorial = 1;
        for (let factor = 2; factor <= value; factor += 1) factorial *= factor;
        value = factorial;
      }
      return value;
    }

    function parsePrimary() {
      const token = tokens[position++];
      if (!token) throw new Error("Incomplete expression");

      if (token.type === "number") return token.value;
      if (token.value === "(") {
        const value = parseExpression();
        if (!take(")")) throw new Error("Missing closing parenthesis");
        return value;
      }
      if (token.type === "word") {
        if (token.value === "pi") return Math.PI;
        if (token.value === "e") return Math.E;
        if (token.value === "Ans") return answer;
        if (Object.hasOwn(functions, token.value)) {
          if (!take("(")) throw new Error("Function needs parentheses");
          const argument = parseExpression();
          if (!take(")")) throw new Error("Missing closing parenthesis");
          if ((token.value === "asin" || token.value === "acos") && Math.abs(argument) > 1) {
            throw new Error("Inverse trig input must be between −1 and 1");
          }
          if (token.value === "sqrt" && argument < 0) throw new Error("Cannot take the square root of a negative number");
          if ((token.value === "ln" || token.value === "log") && argument <= 0) throw new Error("Log input must be greater than zero");
          if (token.value === "tan" && Math.abs(Math.cos(toRadians(argument))) < 1e-14) {
            throw new Error("Tangent is undefined at this angle");
          }
          return functions[token.value](argument);
        }
      }
      throw new Error("Check your expression");
    }

    if (tokens.length === 0) throw new Error("Enter a calculation");
    const value = parseExpression();
    if (position !== tokens.length) throw new Error("Check your expression");
    if (!Number.isFinite(value)) throw new Error("Result is outside the supported range");
    return value;
  }

  function format(value) {
    if (Object.is(value, -0)) return "0";
    if (Math.abs(value) >= 1e15 || (Math.abs(value) > 0 && Math.abs(value) < 1e-9)) {
      return value.toExponential(8).replace(/\.?0+e/, "e").replace("e+", "e");
    }
    return Number(value.toPrecision(12)).toString();
  }

  function displayExpression(value) {
    return value
      .replaceAll("pi", "π")
      .replaceAll("Ans", "Ans")
      .replaceAll("*", "×")
      .replaceAll("/", "÷")
      .replaceAll("-", "−");
  }

  function updateDisplay() {
    expressionDisplay.textContent = displayExpression(expression);
    resultDisplay.classList.remove("is-error");

    if (!expression) {
      resultDisplay.textContent = "0";
      messageDisplay.textContent = "Ready when you are";
      return;
    }

    try {
      resultDisplay.textContent = format(evaluate(expression));
      messageDisplay.textContent = "Live preview";
    } catch (error) {
      resultDisplay.textContent = "—";
      messageDisplay.textContent = error.message;
    }
  }

  function addToHistory(source, value) {
    history.unshift({ expression: source, result: value });
    if (history.length > 8) history.pop();
    renderHistory();
  }

  function renderHistory() {
    clearHistoryButton.disabled = history.length === 0;
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty"><span class="history-empty-icon" aria-hidden="true">↗</span><p>Your calculations<br>will show up here.</p></div>';
      return;
    }

    historyList.replaceChildren(...history.map((item, index) => {
      const entry = document.createElement("div");
      entry.className = "history-item";
      const source = document.createElement("div");
      source.className = "history-expression";
      source.textContent = displayExpression(item.expression);
      const result = document.createElement("button");
      result.className = "history-result";
      result.type = "button";
      result.dataset.historyIndex = String(index);
      result.textContent = format(item.result);
      entry.append(source, result);
      return entry;
    }));
  }

  function append(value) {
    if (justEvaluated && (/^[0-9.]$/.test(value) || value === "00" || value === "pi" || value === "e")) {
      expression = "";
    }
    justEvaluated = false;
    expression += value;
    updateDisplay();
  }

  function calculate() {
    try {
      const value = evaluate(expression);
      const source = expression;
      answer = value;
      expression = format(value);
      justEvaluated = true;
      expressionDisplay.textContent = `${displayExpression(source)} =`;
      resultDisplay.textContent = format(value);
      resultDisplay.classList.remove("is-error");
      messageDisplay.textContent = "Added to your history";
      addToHistory(source, value);
    } catch (error) {
      resultDisplay.textContent = "Error";
      resultDisplay.classList.add("is-error");
      messageDisplay.textContent = error.message;
    }
  }

  calculator.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.value !== undefined) {
      append(button.dataset.value);
    } else if (button.dataset.action === "clear") {
      expression = "";
      justEvaluated = false;
      updateDisplay();
    } else if (button.dataset.action === "backspace") {
      expression = expression.slice(0, -1);
      justEvaluated = false;
      updateDisplay();
    } else if (button.dataset.action === "sign") {
      expression = expression ? `-(${expression})` : "-";
      justEvaluated = false;
      updateDisplay();
    } else if (button.dataset.action === "equals") {
      calculate();
    }
  });

  angleToggle.addEventListener("click", () => {
    radians = !radians;
    angleToggle.classList.toggle("is-rad", radians);
    angleToggle.setAttribute("aria-label", `Angle mode: ${radians ? "radians" : "degrees"}. Toggle angle mode`);
    updateDisplay();
  });

  document.querySelector(".theme-toggle").addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  clearHistoryButton.addEventListener("click", () => {
    history.length = 0;
    renderHistory();
  });

  historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-history-index]");
    if (!button) return;
    const item = history[Number(button.dataset.historyIndex)];
    if (!item) return;
    expression = format(item.result);
    answer = item.result;
    justEvaluated = true;
    updateDisplay();
  });

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9.]$/.test(event.key)) append(event.key);
    else if ("+-*/%^()!".includes(event.key)) append(event.key);
    else if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      calculate();
    } else if (event.key === "Backspace") {
      expression = expression.slice(0, -1);
      justEvaluated = false;
      updateDisplay();
    } else if (event.key === "Escape" || event.key === "Delete") {
      expression = "";
      justEvaluated = false;
      updateDisplay();
    }
  });

  updateDisplay();
})();
