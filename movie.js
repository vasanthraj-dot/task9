let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let budget = Number(localStorage.getItem("budget")) || 0;
let form = document.getElementById("form");
let rows = document.getElementById("rows");
function getTodayDate() {
    let date = new Date();
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}
let today = getTodayDate();
document.getElementById("date").value = today;
document.getElementById("budget").value = budget;
function saveData() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("budget", budget);
}
function isCurrentMonth(expense) {
    return expense.date.substring(0, 7) === today.substring(0, 7);
}
function updateSummary() {
    let total = 0;
    let count = 0;
    for (let i = 0; i < expenses.length; i++) {
        if (isCurrentMonth(expenses[i])) {
            total += Number(expenses[i].amount);
            count++;
        }
    }
    document.getElementById("spent").textContent = "₹" + total.toFixed(2);
    document.getElementById("count").textContent = count;
    document.getElementById("left").textContent = "₹" + (budget - total).toFixed(2);
    document.getElementById("warning").textContent =
        budget > 0 && total > budget ? "Budget exceeded!" : "";
}
function deleteExpense(id) {
    let newExpenses = [];
    for (let i = 0; i < expenses.length; i++) {
        if (expenses[i].id !== id) {
            newExpenses.push(expenses[i]);
        }
    }
    expenses = newExpenses;
    saveData();
    displayExpenses();
}
function displayExpenses() {
    rows.innerHTML = "";
    let categoryFilter = document.getElementById("filter").value;
    let sortOption = document.getElementById("sort").value;
    let visibleExpenses = [];
    for (let i = 0; i < expenses.length; i++) {
        if (categoryFilter === "" || expenses[i].category === categoryFilter) {
            visibleExpenses.push(expenses[i]);
        }
    }
    if (sortOption === "new") {
        visibleExpenses.sort(function (a, b) { return b.date.localeCompare(a.date); });
    } else if (sortOption === "old") {
        visibleExpenses.sort(function (a, b) { return a.date.localeCompare(b.date); });
    } else if (sortOption === "high") {
        visibleExpenses.sort(function (a, b) { return b.amount - a.amount; });
    } else if (sortOption === "low") {
        visibleExpenses.sort(function (a, b) { return a.amount - b.amount; });
    }
    for (let i = 0; i < visibleExpenses.length; i++) {
        let expense = visibleExpenses[i];
        let row = document.createElement("tr");
        let values = [expense.name, "₹" + Number(expense.amount).toFixed(2), expense.category, expense.date];
        for (let j = 0; j < values.length; j++) {
            let cell = document.createElement("td");
            cell.textContent = values[j];
            row.appendChild(cell);
        }
        let actionCell = document.createElement("td");
        let deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "delete";
        deleteButton.onclick = function () { deleteExpense(expense.id); };
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        rows.appendChild(row);
    }
    document.getElementById("empty").hidden = visibleExpenses.length > 0;
    updateSummary();
}
form.onsubmit = function (event) {
    event.preventDefault();
    let name = document.getElementById("name").value.trim();
    let amount = Number(document.getElementById("amount").value);
    let category = document.getElementById("category").value;
    let date = document.getElementById("date").value;
    if (name === "" || amount <= 0 || !Number.isFinite(amount) || category === "" || date === "") {
        alert("Please enter valid expense details.");
        return;
    }
    expenses.push({ id: Date.now(), name: name, amount: amount, category: category, date: date });
    saveData();
    form.reset();
    document.getElementById("date").value = today;
    document.getElementById("message").textContent = "Expense added!";
    displayExpenses();
};
document.getElementById("budget").onchange = function () {
    budget = Math.max(0, Number(this.value) || 0);
    this.value = budget;
    saveData();
    updateSummary();
};
document.getElementById("filter").onchange = displayExpenses;
document.getElementById("sort").onchange = displayExpenses;
document.getElementById("clear").onclick = function () {
    if (confirm("Delete all expenses?")) {
        expenses = [];
        saveData();
        displayExpenses();
        document.getElementById("message").textContent = "All expenses cleared.";
    }
};
document.getElementById("export").onclick = function () {
    let file = new Blob([JSON.stringify(expenses, null, 2)], { type: "application/json" });
    let fileURL = URL.createObjectURL(file);
    let link = document.createElement("a");
    link.href = fileURL;
    link.download = "expenses.json";
    link.click();
    URL.revokeObjectURL(fileURL);
};
document.getElementById("import").onchange = async function () {
    let file = this.files[0];
    if (!file) return;
    try {
        let data = JSON.parse(await file.text());
        if (!Array.isArray(data)) throw new Error("Invalid file");
        for (let i = 0; i < data.length; i++) {
            let item = data[i];
            if (!item || typeof item.name !== "string" || item.name.trim() === "" ||
                !Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0 ||
                typeof item.category !== "string" || item.category === "" ||
                typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
                throw new Error("Invalid file");
            }
        }
        if (confirm("Replace your current expenses with this file?")) {
            let importedExpenses = [];
            for (let i = 0; i < data.length; i++) {
                importedExpenses.push({
                    id: Date.now() + i,
                    name: data[i].name,
                    amount: Number(data[i].amount),
                    category: data[i].category,
                    date: data[i].date
                });
            }
            expenses = importedExpenses;
            saveData();
            displayExpenses();
            document.getElementById("message").textContent = "Expenses imported!";
        }
    } catch (error) {
        alert("Invalid JSON file. Please select a valid file.");
    }
    this.value = "";
};
document.getElementById("convert").onclick = async function () {
    let total = 0;
    let result = document.getElementById("result");
    for (let i = 0; i < expenses.length; i++) {
        if (isCurrentMonth(expenses[i])) total += Number(expenses[i].amount);
    }
    result.textContent = "Converting...";
    try {
        let response = await fetch("https://open.er-api.com/v6/latest/INR");
        if (!response.ok) throw new Error("Rate unavailable");
        let data = await response.json();
        if (!data.rates || !data.rates.USD) throw new Error("Rate unavailable");
        result.textContent = "$" + (total * data.rates.USD).toFixed(2) + " USD";
    } catch (error) {
        result.textContent = "Conversion failed. Check your internet connection.";
    }
};
displayExpenses();