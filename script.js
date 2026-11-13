const display = document.getElementById("display");
const historyText = document.getElementById("history");
const historyList = document.getElementById("historyList");

let expression = "";
let justCalculated = false;

// MEMORY

let memoryValue = 0;

// SOUND

let soundEnabled = true;

function toggleSound() {
    soundEnabled = !soundEnabled;

    document.getElementById("soundBtn").textContent =
        soundEnabled ? "🔊" : "🔇";
}

function playClick() {
    if (!soundEnabled) return;

    const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.frequency.value = 600;
    gain.gain.value = 0.05;

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.05);

    oscillator.onended = () => audio.close();
}

// APPEND BUTTON VALUES

function append(value) {

    if (justCalculated && /[0-9.(]/.test(value)) {
        expression = "";
    }

    justCalculated = false;

    if (expression.length >= 100) return;

    expression += value;
    display.value = expression || "0";
}

// CLEAR DISPLAY

function clearDisplay() {
    expression = "";
    display.value = "0";
    historyText.textContent = "Ready to calculate";
    justCalculated = false;
}

// DELETE LAST CHARACTER

function deleteLast() {

    if (justCalculated) {
        clearDisplay();
        return;
    }

    expression = expression.slice(0, -1);
    display.value = expression || "0";
}

// TOKENIZE EXPRESSION

function tokenize(input) {

    input = input.replace(/\s/g, "");

    const tokens = input.match(
        /\d*\.?\d+|[()+\-*/%]/g
    );

    if (!tokens || tokens.join("") !== input) {
        throw new Error("Invalid expression");
    }

    return tokens;
}

// CALCULATE EXPRESSION

function calculateExpression(input) {

    const tokens = tokenize(input);
    let position = 0;

    function primary() {

        let token = tokens[position];

        if (token === "+" || token === "-") {
            position++;

            const value = primary();

            return token === "-" ? -value : value;
        }

        if (token === "(") {

            position++;

            const value = addSub();

            if (tokens[position] !== ")") {
                throw new Error("Missing bracket");
            }

            position++;

            return value;
        }

        if (!token || !/^\d*\.?\d+$/.test(token)) {
            throw new Error("Invalid number");
        }

        position++;

        return Number(token);
    }

    function percent() {

        let value = primary();

        while (tokens[position] === "%") {
            position++;
            value /= 100;
        }

        return value;
    }

    function multiplyDivide() {

        let value = percent();

        while (
            tokens[position] === "*" ||
            tokens[position] === "/"
        ) {

            const operator = tokens[position++];
            const next = percent();

            if (operator === "/" && next === 0) {
                throw new Error("Cannot divide by zero");
            }

            value = operator === "*"
                ? value * next
                : value / next;
        }

        return value;
    }

    function addSub() {

        let value = multiplyDivide();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {

            const operator = tokens[position++];
            const next = multiplyDivide();

            value = operator === "+"
                ? value + next
                : value - next;
        }

        return value;
    }

    const result = addSub();

    if (
        position !== tokens.length ||
        !Number.isFinite(result)
    ) {
        throw new Error("Invalid calculation");
    }

    return result;
}

// ADD HISTORY

function addHistory(text, reusableExpression) {

    const item = document.createElement("li");

    item.textContent = text;
    item.dataset.expression = reusableExpression;

    historyList.prepend(item);
}

// MAIN CALCULATION

function calculate() {

    if (!expression) return;

    try {

        const oldExpression = expression;

        const result = calculateExpression(expression);

        const formatted = Number(result.toPrecision(12));

        historyText.textContent = oldExpression + " =";

        addHistory(
            oldExpression + " = " + formatted,
            oldExpression
        );

        expression = String(formatted);
        display.value = expression;

        justCalculated = true;

    } catch (error) {

        historyText.textContent = error.message;
        expression = "";
        display.value = "Error";

        justCalculated = true;
    }
}

// SCIENTIFIC FUNCTIONS

function scientific(type) {

    if (!expression) return;

    try {

        const value = calculateExpression(expression);
        let result;

        switch (type) {

            case "sin":
                result = Math.sin(value * Math.PI / 180);
                break;

            case "cos":
                result = Math.cos(value * Math.PI / 180);
                break;

            case "tan":
                result = Math.tan(value * Math.PI / 180);
                break;

            case "sqrt":

                if (value < 0) {
                    throw new Error("Invalid square root");
                }

                result = Math.sqrt(value);
                break;

            case "square":
                result = value * value;
                break;

            default:
                throw new Error("Unknown operation");
        }

        if (!Number.isFinite(result)) {
            throw new Error("Invalid result");
        }

        const oldExpression = type + "(" + expression + ")";

        result = Number(result.toPrecision(12));

        historyText.textContent = oldExpression + " =";

        addHistory(
            oldExpression + " = " + result,
            String(result)
        );

        expression = String(result);
        display.value = expression;

        justCalculated = true;

    } catch (error) {

        historyText.textContent = error.message;
    }
}

// MEMORY FUNCTIONS

function getCurrentValue() {

    if (!expression) {
        return Number(display.value) || 0;
    }

    return calculateExpression(expression);
}

function memoryClear() {

    memoryValue = 0;
    historyText.textContent = "Memory cleared";
}

function memoryRecall() {

    expression = String(memoryValue);
    display.value = expression;

    historyText.textContent = "Memory recalled";

    justCalculated = false;
}

function memoryAdd() {

    try {

        memoryValue += getCurrentValue();

        historyText.textContent =
            "Memory: " + memoryValue;

    } catch (error) {

        historyText.textContent = error.message;
    }
}

function memorySubtract() {

    try {

        memoryValue -= getCurrentValue();

        historyText.textContent =
            "Memory: " + memoryValue;

    } catch (error) {

        historyText.textContent = error.message;
    }
}

// CLEAR HISTORY

function clearHistory() {
    historyList.innerHTML = "";
}

// CLICKABLE HISTORY

historyList.addEventListener("click", function(event) {

    const item = event.target.closest("li");

    if (!item || !item.dataset.expression) return;

    expression = item.dataset.expression;

    display.value = expression;

    historyText.textContent = "Previous calculation loaded";

    justCalculated = false;
});

// DARK AND LIGHT MODE

function toggleTheme() {

    document.body.classList.toggle("dark");

    document.getElementById("themeBtn").textContent =
        document.body.classList.contains("dark")
            ? "☾"
            : "☀";
}

// KEYBOARD SUPPORT

document.addEventListener("keydown", function(event) {

    const key = event.key;

    if (/^[0-9.+\-*/()%]$/.test(key)) {

        event.preventDefault();
        append(key);

    } else if (key === "Enter" || key === "=") {

        event.preventDefault();
        calculate();

    } else if (key === "Backspace") {

        deleteLast();

    } else if (key === "Escape") {

        clearDisplay();
    }
});

// BUTTON CLICK SOUND

document.addEventListener("click", function(event) {

    if (event.target.closest("button")) {
        playClick();
    }
});