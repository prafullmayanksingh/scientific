"use strict";

(() => {
  const form = document.querySelector("#converter-form");
  const title = document.querySelector("#converter-title");
  const description = document.querySelector("#converter-description");
  const badge = document.querySelector("#converter-badge-text");
  const result = document.querySelector("#converter-result");
  const message = document.querySelector("#converter-message");
  const disclaimer = document.querySelector("#converter-disclaimer");
  const categoryButtons = [...document.querySelectorAll(".category-button")];
  const tabButtons = [...document.querySelectorAll(".workspace-tab")];
  const panels = {
    calculator: document.querySelector("#calculator-panel"),
    converter: document.querySelector("#converter-panel"),
  };
  const currencyCodes = ["USD", "EUR", "GBP", "INR", "INR-paisa", "JPY", "CAD", "AUD", "CHF", "CNY", "NZD", "SGD", "AED"];
  const currencyNames = {
    USD: "US Dollar", EUR: "Euro", GBP: "British Pound", INR: "Indian Rupee",
    "INR-paisa": "Paisa (1/100 INR)",
    JPY: "Japanese Yen", CAD: "Canadian Dollar", AUD: "Australian Dollar",
    CHF: "Swiss Franc", CNY: "Chinese Yuan", NZD: "New Zealand Dollar",
    SGD: "Singapore Dollar", AED: "UAE Dirham",
  };
  const currencyUnits = {
    USD: { code: "USD", factor: 1 },
    EUR: { code: "EUR", factor: 1 },
    GBP: { code: "GBP", factor: 1 },
    INR: { code: "INR", factor: 1 },
    "INR-paisa": { code: "INR", factor: 0.01 },
    JPY: { code: "JPY", factor: 1 },
    CAD: { code: "CAD", factor: 1 },
    AUD: { code: "AUD", factor: 1 },
    CHF: { code: "CHF", factor: 1 },
    CNY: { code: "CNY", factor: 1 },
    NZD: { code: "NZD", factor: 1 },
    SGD: { code: "SGD", factor: 1 },
    AED: { code: "AED", factor: 1 },
  };
  const currencyLabels = { "INR-paisa": "paisa" };

  function currencyLabel(currency) {
    return currencyLabels[currency] || currency;
  }
  const units = {
    length: {
      label: "Length",
      base: "meter",
      note: "Traditional and historical measures use conventional values; actual local definitions can vary.",
      options: { meter: 1, kilometer: 1000, centimeter: 0.01, millimeter: 0.001, mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254, hand: 0.1016, cubit: 0.4572, gaj: 0.9144, chain: 20.1168, furlong: 201.168 },
    },
    mass: {
      label: "Mass",
      base: "kilogram",
      note: "Tola, ratti, seer, and maund use conventional historical Indian values; regional standards may differ.",
      options: { kilogram: 1, gram: 0.001, milligram: 0.000001, pound: 0.45359237, ounce: 0.028349523125, tonne: 1000, ratti: 0.0116638038 / 96, tola: 0.0116638038, seer: 0.9331, maund: 37.324 },
    },
    time: {
      label: "Time",
      base: "second",
      note: "Traditional ghadi, muhurta, and prahara use commonly cited conventional durations.",
      options: { second: 1, millisecond: 0.001, minute: 60, hour: 3600, day: 86400, week: 604800, fortnight: 1209600, ghadi: 1440, muhurta: 2880, prahara: 10800 },
    },
    area: {
      label: "Area",
      base: "square meter",
      note: "Bigha varies by region. These are named reference definitions, not interchangeable local land records.",
      displayNames: { bigha_bengal: "Bigha (Bengal, 1,600 yd²)", bigha_pucca: "Bigha (pucca, 3,025 yd²)", bigha_reference: "Bigha (1,000 yd² reference)" },
      options: { "square meter": 1, "square kilometer": 1000000, hectare: 10000, acre: 4046.8564224, "square foot": 0.09290304, "square yard": 0.83612736, bigha_bengal: 1337.803776, bigha_pucca: 2529.285264, bigha_reference: 836.12736 },
    },
    volume: {
      label: "Volume",
      base: "liter",
      note: "Imperial units use standard definitions. Seer is shown as an approximate water-volume equivalent only; its historical capacity varies.",
      displayNames: { seer_water: "Seer (water, approx.)" },
      options: { liter: 1, milliliter: 0.001, "cubic meter": 1000, "US gallon": 3.785411784, "US quart": 0.946352946, "US cup": 0.2365882365, "US fluid ounce": 0.0295735295625, "Imperial gallon": 4.54609, "Imperial quart": 1.1365225, "Imperial pint": 0.56826125, seer_water: 0.9331 },
    },
    speed: {
      label: "Speed",
      base: "meter per second",
      options: { "meter per second": 1, "kilometer per hour": 1 / 3.6, "mile per hour": 0.44704, knot: 0.5144444444, "foot per second": 0.3048, "yard per second": 0.9144, "mile per day": 1609.344 / 86400 },
    },
  };
  const exchangeRates = new Map();
  let activeCategory = "currency";
  let gstMode = "add";
  let bmiMode = "metric";
  let currencyRequestId = 0;

  function numberField(id, label, value, options = {}) {
    return `<div class="converter-field"><label for="${id}">${label}</label><input id="${id}" type="number" step="any" ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} value="${value}" placeholder="${options.placeholder || "Enter a value"}"></div>`;
  }

  function selectField(id, label, values, selected, names = {}) {
    const options = values.map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${names[value] || value}</option>`).join("");
    return `<div class="converter-field"><label for="${id}">${label}</label><select id="${id}">${options}</select></div>`;
  }

  function configureCurrency() {
    activeCategory = "currency";
    title.innerHTML = "Currency converter<span class=\"brand-period\">.</span>";
    description.textContent = "Convert between currencies with live reference exchange rates.";
    badge.textContent = "LIVE RATES";
    disclaimer.textContent = "Paisa is treated as 1/100 of an Indian rupee. Other exchange rates are indicative European Central Bank reference rates via Frankfurter.";
    form.innerHTML = `<div class="converter-fields-row"><div class="converter-field"><label for="convert-amount">Amount</label><input id="convert-amount" type="number" step="any" value="1" placeholder="Enter an amount"></div><button class="converter-swap" type="button" aria-label="Swap currencies">⇄</button><span></span></div><div class="converter-fields-row"><div>${selectField("convert-from", "From", currencyCodes, "USD", currencyNames)}</div><span aria-hidden="true"></span><div>${selectField("convert-to", "To", currencyCodes, "EUR", currencyNames)}</div></div>`;
    result.textContent = "—";
    message.textContent = "Fetching reference rate when you enter an amount.";
    recalculate();
  }

  function configureUnit(category) {
    activeCategory = category;
    const config = units[category];
    const options = Object.keys(config.options);
    const names = config.displayNames || {};
    title.innerHTML = `${config.label} converter<span class="brand-period">.</span>`;
    description.textContent = `Convert ${config.label.toLowerCase()} between common units.`;
    badge.textContent = "UNIT CONVERSION";
    disclaimer.textContent = config.note || "Conversions use standard unit definitions.";
    form.innerHTML = `<div class="converter-fields-row"><div class="converter-field"><label for="convert-amount">Amount</label><input id="convert-amount" type="number" step="any" value="1" placeholder="Enter an amount"></div><button class="converter-swap" type="button" aria-label="Swap units">⇄</button><span></span></div><div class="converter-fields-row"><div>${selectField("convert-from", "From", options, options[0], names)}</div><span aria-hidden="true"></span><div>${selectField("convert-to", "To", options, options[1] || options[0], names)}</div></div>`;
    recalculate();
  }

  function configureTemperature() {
    activeCategory = "temperature";
    title.innerHTML = "Temperature converter<span class=\"brand-period\">.</span>";
    description.textContent = "Switch between Celsius, Fahrenheit, Kelvin, and Rankine.";
    badge.textContent = "TEMPERATURE";
    disclaimer.textContent = "Temperatures below absolute zero are not physically valid. Rankine is a historical absolute temperature scale.";
    form.innerHTML = `<div class="converter-fields-row"><div class="converter-field"><label for="convert-amount">Temperature</label><input id="convert-amount" type="number" step="any" value="0" placeholder="Enter a temperature"></div><button class="converter-swap" type="button" aria-label="Swap units">⇄</button><span></span></div><div class="converter-fields-row"><div>${selectField("convert-from", "From", ["Celsius", "Fahrenheit", "Kelvin", "Rankine"], "Celsius")}</div><span aria-hidden="true"></span><div>${selectField("convert-to", "To", ["Celsius", "Fahrenheit", "Kelvin", "Rankine"], "Fahrenheit")}</div></div>`;
    recalculate();
  }

  function configureDiscount() {
    activeCategory = "discount";
    title.innerHTML = "Discount calculator<span class=\"brand-period\">.</span>";
    description.textContent = "See your savings and the final price after a discount.";
    badge.textContent = "SAVINGS";
    disclaimer.textContent = "This calculation does not include taxes, shipping, or additional fees.";
    form.innerHTML = `<div class="converter-fields-row single">${numberField("discount-price", "Original price", 100, { min: 0 })}${numberField("discount-rate", "Discount (%)", 10, { min: 0, max: 100 })}</div>`;
    recalculate();
  }

  function configureNumber() {
    activeCategory = "number";
    title.innerHTML = "Number system converter<span class=\"brand-period\">.</span>";
    description.textContent = "Convert a whole number between common number bases.";
    badge.textContent = "BASE CONVERSION";
    disclaimer.textContent = "Input must be a non-negative whole number valid in the selected base.";
    const bases = ["2", "8", "10", "16", "roman"];
    const baseNames = { "2": "Binary (2)", "8": "Octal (8)", "10": "Decimal (10)", "16": "Hexadecimal (16)", roman: "Roman numerals" };
    form.innerHTML = `<div class="converter-fields-row single"><div class="converter-field"><label for="number-value">Number</label><input id="number-value" type="text" inputmode="text" value="255" autocomplete="off"></div>${selectField("convert-from", "From system", bases, "10", baseNames)}</div><div class="converter-fields-row single">${selectField("convert-to", "To system", bases, "2", baseNames)}<span></span></div>`;
    recalculate();
  }

  function configureBmi() {
    activeCategory = "bmi";
    title.innerHTML = "BMI calculator<span class=\"brand-period\">.</span>";
    description.textContent = "Estimate body mass index using metric or traditional US/Imperial measurements.";
    badge.textContent = "BODY MASS INDEX";
    disclaimer.textContent = "BMI is a screening measure, not a medical diagnosis. Adult categories shown are general WHO ranges.";
    renderBmiForm();
    recalculate();
  }

  function renderBmiForm() {
    const metric = bmiMode === "metric";
    const toggle = `<div class="converter-toggle" role="group" aria-label="BMI measurement system"><button type="button" data-bmi-mode="metric" class="${metric ? "is-active" : ""}">Metric</button><button type="button" data-bmi-mode="imperial" class="${metric ? "" : "is-active"}">US / Imperial</button></div>`;
    if (metric) {
      form.innerHTML = `${toggle}<div class="converter-fields-row single">${numberField("bmi-weight", "Weight (kg)", 70, { min: 0 })}${numberField("bmi-height", "Height (cm)", 170, { min: 0 })}</div><p class="converter-hint">Enter weight in kilograms and height in centimeters.</p>`;
    } else {
      form.innerHTML = `${toggle}<div class="converter-fields-row single">${numberField("bmi-weight", "Weight (lb)", 154, { min: 0 })}${numberField("bmi-height-feet", "Height (ft)", 5, { min: 0 })}</div><div class="converter-fields-row single">${numberField("bmi-height-inches", "Additional height (in)", 7, { min: 0, max: 11 })}<span></span></div><p class="converter-hint">Enter weight in pounds and height in feet plus remaining inches.</p>`;
    }
  }

  function configureGst() {
    activeCategory = "gst";
    title.innerHTML = "GST calculator<span class=\"brand-period\">.</span>";
    description.textContent = "Add GST to a price or find the tax included in a total.";
    badge.textContent = "TAX ESTIMATE";
    disclaimer.textContent = "Tax rates vary by location and product. Confirm the applicable rate with your local tax authority.";
    form.innerHTML = `<div class="converter-fields-row single">${numberField("gst-price", "Amount", 1000, { min: 0 })}${numberField("gst-rate", "GST rate (%)", 18, { min: 0 })}</div><div class="converter-toggle" role="group" aria-label="GST calculation mode"><button type="button" data-gst-mode="add" class="is-active">Add GST</button><button type="button" data-gst-mode="remove">Remove GST</button></div>`;
    recalculate();
  }

  function configureCategory(category) {
    categoryButtons.forEach((button) => {
      const selected = button.dataset.category === category;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (category === "currency") configureCurrency();
    else if (units[category]) configureUnit(category);
    else if (category === "temperature") configureTemperature();
    else if (category === "discount") configureDiscount();
    else if (category === "number") configureNumber();
    else if (category === "bmi") configureBmi();
    else if (category === "gst") configureGst();
  }

  function numericValue(id) {
    const field = form.querySelector(`#${id}`);
    if (!field || field.value.trim() === "") return null;
    const value = Number(field.value);
    return Number.isFinite(value) ? value : null;
  }

  function formatted(value, maximumSignificantDigits = 12) {
    return new Intl.NumberFormat(undefined, { maximumSignificantDigits }).format(value);
  }

  async function getExchangeRate(from, to) {
    const key = `${from}:${to}`;
    if (exchangeRates.has(key)) return exchangeRates.get(key);
    const request = fetch(`https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("The exchange-rate service is unavailable.");
        const data = await response.json();
        const rate = data.rates?.[to];
        if (!Number.isFinite(rate)) throw new Error("No exchange rate is available for this currency pair.");
        return { rate, date: data.date };
      })
      .catch((error) => {
        exchangeRates.delete(key);
        throw error;
      });
    exchangeRates.set(key, request);
    return request;
  }

  async function calculateCurrency() {
    const requestId = ++currencyRequestId;
    const amount = numericValue("convert-amount");
    const from = form.querySelector("#convert-from").value;
    const to = form.querySelector("#convert-to").value;
    if (amount === null) {
      result.textContent = "—";
      message.textContent = "Enter an amount to convert.";
      return;
    }
    const fromUnit = currencyUnits[from];
    const toUnit = currencyUnits[to];
    if (from === to) {
      result.textContent = `${formatted(amount)} ${currencyLabel(to)}`;
      message.textContent = "Same currency selected.";
      return;
    }
    result.textContent = "Loading…";
    message.textContent = "Getting the latest available reference rate.";
    try {
      const { rate, date } = fromUnit.code === toUnit.code
        ? { rate: 1, date: "fixed denomination ratio" }
        : await getExchangeRate(fromUnit.code, toUnit.code);
      if (requestId !== currencyRequestId) return;
      const converted = amount * rate * fromUnit.factor / toUnit.factor;
      result.textContent = `${formatted(converted)} ${currencyLabel(to)}`;
      const rateText = `${formatted(rate * fromUnit.factor / toUnit.factor)} ${currencyLabel(to)}`;
      message.textContent = date === "fixed denomination ratio"
        ? `1 ${from} = ${rateText}`
        : `1 ${from} = ${rateText} · rate dated ${date}`;
    } catch (error) {
      if (requestId !== currencyRequestId) return;
      result.textContent = "Rate unavailable";
      message.textContent = `${error.message} Check your connection and try again.`;
    }
  }

  function convertTemperature(value, from, to) {
    let kelvin;
    if (from === "Celsius") kelvin = value + 273.15;
    else if (from === "Fahrenheit") kelvin = (value + 459.67) * 5 / 9;
    else if (from === "Rankine") kelvin = value * 5 / 9;
    else kelvin = value;
    if (kelvin < 0) return null;
    if (to === "Celsius") return kelvin - 273.15;
    if (to === "Fahrenheit") return kelvin * 9 / 5 - 459.67;
    if (to === "Rankine") return kelvin * 9 / 5;
    return kelvin;
  }

  const romanValues = [
    ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
    ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
    ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1],
  ];

  function toRoman(value) {
    if (!Number.isInteger(value) || value < 1 || value > 3999) return null;
    let remainder = value;
    let numeral = "";
    for (const [symbol, amount] of romanValues) {
      while (remainder >= amount) {
        numeral += symbol;
        remainder -= amount;
      }
    }
    return numeral;
  }

  function fromRoman(input) {
    const numeral = input.toUpperCase();
    if (!/^[MDCLXVI]+$/.test(numeral)) return null;
    let value = 0;
    for (let index = 0; index < numeral.length; index += 1) {
      const current = romanValues.find(([symbol]) => symbol === numeral[index])[1];
      const next = romanValues.find(([symbol]) => symbol === numeral[index + 1])?.[1] || 0;
      value += current < next ? -current : current;
    }
    return toRoman(value) === numeral ? value : null;
  }

  function recalculate() {
    if (activeCategory === "currency") {
      void calculateCurrency();
      return;
    }

    const amount = numericValue("convert-amount");
    if (units[activeCategory]) {
      const config = units[activeCategory];
      const from = form.querySelector("#convert-from").value;
      const to = form.querySelector("#convert-to").value;
      if (amount === null) return showResult("—", "Enter an amount to convert.");
      const converted = amount * config.options[from] / config.options[to];
      const fromLabel = config.displayNames?.[from] || from;
      const toLabel = config.displayNames?.[to] || to;
      return showResult(`${formatted(converted)} ${toLabel}`, `${formatted(amount)} ${fromLabel} = ${formatted(converted)} ${toLabel}`);
    }

    if (activeCategory === "temperature") {
      const from = form.querySelector("#convert-from").value;
      const to = form.querySelector("#convert-to").value;
      if (amount === null) return showResult("—", "Enter a temperature to convert.");
      const converted = convertTemperature(amount, from, to);
      if (converted === null) return showResult("Invalid temperature", "The value is below absolute zero.");
      const symbols = { Celsius: "°C", Fahrenheit: "°F", Kelvin: "K", Rankine: "°R" };
      return showResult(`${formatted(converted)} ${symbols[to]}`, `${formatted(amount)} ${symbols[from]} = ${formatted(converted)} ${symbols[to]}`);
    }

    if (activeCategory === "discount") {
      const price = numericValue("discount-price");
      const rate = numericValue("discount-rate");
      if (price === null || rate === null) return showResult("—", "Enter a price and discount percentage.");
      if (price < 0 || rate < 0 || rate > 100) return showResult("Invalid input", "Price must be non-negative and discount must be 0–100%.");
      const savings = price * rate / 100;
      return showResult(formatted(price - savings), `You save ${formatted(savings)} (${formatted(rate)}% off).`);
    }

    if (activeCategory === "number") {
      const input = form.querySelector("#number-value").value.trim();
      const from = form.querySelector("#convert-from").value;
      const to = form.querySelector("#convert-to").value;
      if (!input) return showResult("—", "Enter a number to convert.");
      let decimal;
      if (from === "roman") {
        decimal = fromRoman(input);
        if (decimal === null) return showResult("Invalid Roman numeral", "Use a canonical Roman numeral from I to MMMCMXCIX.");
      } else {
        const base = Number(from);
        const valid = base === 16 ? /^[\da-f]+$/i.test(input) : new RegExp(`^[0-${base - 1}]+$`).test(input);
        if (!valid) return showResult("Invalid number", `Use digits valid for base ${base}.`);
        decimal = Number.parseInt(input, base);
      }
      if (!Number.isSafeInteger(decimal)) return showResult("Number too large", "Enter a whole number within the safe integer range.");
      if (to === "roman") {
        const numeral = toRoman(decimal);
        if (numeral === null) return showResult("Out of range", "Roman numerals support whole numbers from 1 to 3,999.");
        return showResult(numeral, `Roman numeral · decimal value ${formatted(decimal)}`);
      }
      const base = Number(to);
      const baseName = { 2: "Binary", 8: "Octal", 10: "Decimal", 16: "Hexadecimal" }[base];
      return showResult(decimal.toString(base).toUpperCase(), `${baseName} (base ${base}) · decimal value ${formatted(decimal)}`);
    }

    if (activeCategory === "bmi") {
      const weight = numericValue("bmi-weight");
      const feet = bmiMode === "imperial" ? numericValue("bmi-height-feet") : 0;
      const inches = bmiMode === "imperial" ? numericValue("bmi-height-inches") : 0;
      const metricHeight = bmiMode === "metric" ? numericValue("bmi-height") : null;
      const height = bmiMode === "metric" ? metricHeight : (feet ?? 0) * 12 + (inches ?? 0);
      if (weight === null || height === null || !Number.isFinite(height)) return showResult("—", "Enter weight and height.");
      if (bmiMode === "imperial" && (feet === null || inches === null)) return showResult("—", "Enter both feet and inches.");
      if (weight <= 0 || height <= 0) return showResult("Invalid input", "Weight and height must be greater than zero.");
      if (bmiMode === "imperial" && (feet < 0 || inches < 0 || inches >= 12)) return showResult("Invalid input", "Use non-negative feet and 0–11 remaining inches.");
      const bmi = bmiMode === "metric"
        ? weight / ((height / 100) ** 2)
        : (weight * 0.45359237) / ((height * 0.0254) ** 2);
      const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obesity range";
      return showResult(formatted(bmi, 3), category);
    }

    if (activeCategory === "gst") {
      const price = numericValue("gst-price");
      const rate = numericValue("gst-rate");
      if (price === null || rate === null) return showResult("—", "Enter an amount and GST rate.");
      if (price < 0 || rate < 0) return showResult("Invalid input", "Amount and GST rate must not be negative.");
      const inclusive = gstMode === "remove";
      const taxable = inclusive ? price / (1 + rate / 100) : price;
      const tax = inclusive ? price - taxable : price * rate / 100;
      const total = inclusive ? price : price + tax;
      return showResult(formatted(total), `Taxable amount ${formatted(taxable)} · GST ${formatted(tax)} at ${formatted(rate)}%`);
    }
  }

  function showResult(value, detail) {
    result.textContent = value;
    message.textContent = detail;
  }

  form.addEventListener("input", recalculate);
  form.addEventListener("change", recalculate);
  form.addEventListener("click", (event) => {
    const swap = event.target.closest(".converter-swap");
    if (swap) {
      const from = form.querySelector("#convert-from");
      const to = form.querySelector("#convert-to");
      [from.value, to.value] = [to.value, from.value];
      recalculate();
      return;
    }
    const mode = event.target.closest("[data-gst-mode]");
    if (mode) {
      gstMode = mode.dataset.gstMode;
      form.querySelectorAll("[data-gst-mode]").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.gstMode === gstMode);
      });
      recalculate();
      return;
    }
    const bmiModeButton = event.target.closest("[data-bmi-mode]");
    if (bmiModeButton) {
      bmiMode = bmiModeButton.dataset.bmiMode;
      renderBmiForm();
      recalculate();
    }
  });

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => configureCategory(button.dataset.category));
  });

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.id === "calculator-tab" ? "calculator" : "converter";
      tabButtons.forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      Object.entries(panels).forEach(([name, panel]) => {
        panel.hidden = name !== selected;
      });
    });
  });

  configureCategory("currency");
})();
