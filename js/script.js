// script.js

/* =========================================================
   MONEYFLOW — PERSONAL FINANCE DASHBOARD
   Vanilla JavaScript · LocalStorage · Chart.js
========================================================= */

const STORAGE_KEY = "moneyflow_transactions_v1";
const GOALS_KEY = "moneyflow_goals_v1";
const NOTIFICATIONS_KEY = "moneyflow_notifications_v1";

// =========================================================
// DARK MODE SYSTEM
// =========================================================

const THEME_KEY = "moneyflow_theme_v1";

function applyTheme(theme) {
    const isDark = theme === "dark";

    document.body.classList.toggle("dark-mode", isDark);

    const icon = document.getElementById("themeIcon");
    const button = document.getElementById("themeToggle");

    if (icon) {
        icon.className = isDark
            ? "fa-solid fa-sun"
            : "fa-solid fa-moon";
    }

    if (button) {
        button.title = isDark
            ? "Aktifkan Light Mode"
            : "Aktifkan Dark Mode";
    }

    localStorage.setItem(THEME_KEY, theme);
}

function initializeTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "light";
    applyTheme(savedTheme);
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark-mode");

    const newTheme = isDark ? "light" : "dark";

    applyTheme(newTheme);

    // Refresh grafik agar warna grid dan teks ikut menyesuaikan
    renderCharts();

    showToast(
        newTheme === "dark" ? "Dark Mode aktif" : "Light Mode aktif",
        "Tampilan MoneyFlow berhasil diubah."
    );
}

const $ = (selector) => document.querySelector(selector);

const formatRupiah = (amount) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const formatCompact = (amount) => {
    if (amount >= 1000000000) {
        return "Rp " + (amount / 1000000000).toLocaleString("id-ID", {
            maximumFractionDigits: 1
        }) + " M";
    }

    if (amount >= 1000000) {
        return "Rp " + (amount / 1000000).toLocaleString("id-ID", {
            maximumFractionDigits: 1
        }) + " jt";
    }

    if (amount >= 1000) {
        return "Rp " + (amount / 1000).toLocaleString("id-ID", {
            maximumFractionDigits: 1
        }) + " rb";
    }

    return formatRupiah(amount);
};

const formatDate = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString + "T00:00:00");

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
};

const getToday = () => {
    const now = new Date();
    const localOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - localOffset).toISOString().slice(0, 10);
};

const safeParse = (key, fallback) => {
    try {
        const result = JSON.parse(localStorage.getItem(key));
        return result ?? fallback;
    } catch {
        return fallback;
    }
};

let transactions = safeParse(STORAGE_KEY, []);
let goals = safeParse(GOALS_KEY, {
    savings: {
        amount: 0,
        target: 10000000
    },
    emergency: {
        amount: 0,
        target: 5000000
    }
});
let notifications = safeParse(NOTIFICATIONS_KEY, []);
let cashflowChart = null;
let expenseChart = null;
let selectedType = "expense";
let currentModal = null;
let showAllTransactions = false;

const chartColors = [
    "#426bff",
    "#20c78a",
    "#f4a340",
    "#9472e8",
    "#f16e8e",
    "#48b9d3",
    "#7d8ca6",
    "#b1a1e7",
    "#80c98d",
    "#ff9f74"
];

const categories = {
    income: [
        "Gaji",
        "Uang Saku",
        "Freelance",
        "Bonus",
        "Penjualan",
        "Investasi",
        "Hadiah",
        "Lainnya"
    ],
    expense: [
        "Makanan",
        "Transportasi",
        "Belanja",
        "Pendidikan",
        "Tagihan",
        "Kesehatan",
        "Hiburan",
        "Kebutuhan",
        "Sosial",
        "Lainnya"
    ]
};

const categoryIcons = {
    "Gaji": "fa-money-bill-wave",
    "Uang Saku": "fa-wallet",
    "Freelance": "fa-laptop-code",
    "Bonus": "fa-gift",
    "Penjualan": "fa-shop",
    "Investasi": "fa-chart-line",
    "Hadiah": "fa-gift",
    "Makanan": "fa-utensils",
    "Transportasi": "fa-car",
    "Belanja": "fa-bag-shopping",
    "Pendidikan": "fa-graduation-cap",
    "Tagihan": "fa-file-invoice",
    "Kesehatan": "fa-heart-pulse",
    "Hiburan": "fa-gamepad",
    "Kebutuhan": "fa-box",
    "Sosial": "fa-hand-holding-heart",
    "Lainnya": "fa-circle-dot"
};

/* =========================================================
   STORAGE
========================================================= */

function saveTransactions() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function saveGoals() {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

function saveNotifications() {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

/* =========================================================
   INITIALIZATION
========================================================= */

function init() {
    initializeTheme();
    setCurrentDate();
    bindEvents();
    renderDashboard();
    renderNotifications();
    renderExcelTable();
}

function setCurrentDate() {
    $("#currentDate").textContent = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

/* =========================================================
   DASHBOARD RENDERING
========================================================= */

function getTotals() {
    const income = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const expense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

    const savings = Number(goals.savings.amount || 0);
    const emergency = Number(goals.emergency.amount || 0);

    return {
        income,
        expense,
        balance: income - expense,
        savings,
        emergency,
        totalSaved: savings + emergency
    };
}

function renderDashboard() {
    const totals = getTotals();

    $("#totalBalance").textContent = formatCompact(totals.balance);
    $("#totalIncome").textContent = formatCompact(totals.income);
    $("#totalExpense").textContent = formatCompact(totals.expense);
    $("#totalSavings").textContent = formatCompact(totals.totalSaved);
    $("#donutTotal").textContent = formatCompact(totals.expense);

    renderGoals();
    renderTransactions();
    renderCharts();
    renderExcelTable();

    $("#excelSyncStatus").textContent = "Tersinkron";
    $("#lastSyncTime").textContent =
        "Terakhir diperbarui " +
        new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
}

/* =========================================================
   GOALS
========================================================= */

function renderGoals() {
    renderGoal("savings");
    renderGoal("emergency");
}

function renderGoal(key) {
    const goal = goals[key];
    const prefix = key === "savings" ? "savings" : "emergency";

    const amount = Number(goal.amount || 0);
    const target = Number(goal.target || 0);
    const percentage = target > 0
        ? Math.min((amount / target) * 100, 100)
        : 0;

    const remaining = Math.max(target - amount, 0);

    $(`#${prefix}Amount`).textContent = formatCompact(amount);
    $(`#${prefix}Target`).textContent = formatCompact(target);
    $(`#${prefix}Percentage`).textContent = `${percentage.toFixed(1).replace(/\.0$/, "")}%`;
    $(`#${prefix}Progress`).style.width = `${percentage}%`;
    $(`#${prefix}Remaining`).textContent = remaining > 0
        ? `${formatCompact(remaining)} lagi`
        : "Target tercapai!";
}

/* =========================================================
   TRANSACTION TABLE
========================================================= */

function renderTransactions() {
    const tbody = $("#transactionTableBody");
    const empty = $("#transactionEmpty");

    tbody.innerHTML = "";

    const sorted = [...transactions].sort((a, b) => {
        return new Date(b.date) - new Date(a.date) ||
            (b.createdAt || 0) - (a.createdAt || 0);
    });

    const visible = showAllTransactions ? sorted : sorted.slice(0, 6);

    empty.classList.toggle("show", transactions.length === 0);

    $("#viewAllTransactions").innerHTML = showAllTransactions
        ? 'Tampilkan sedikit <i class="fa-solid fa-arrow-up"></i>'
        : 'Lihat semua <i class="fa-solid fa-arrow-right"></i>';

    visible.forEach(transaction => {
        const tr = document.createElement("tr");

        const icon = categoryIcons[transaction.category] || "fa-circle-dot";
        const typeClass = transaction.type === "income" ? "income" : "expense";
        const sign = transaction.type === "income" ? "+" : "-";

        tr.innerHTML = `
            <td>
                <div class="transaction-name-cell">
                    <div class="transaction-icon ${typeClass}">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <div class="transaction-name">${escapeHTML(transaction.name || transaction.category)}</div>
                        <div class="transaction-desc">${escapeHTML(transaction.description || transaction.category)}</div>
                    </div>
                </div>
            </td>
            <td><span class="category-badge">${escapeHTML(transaction.category)}</span></td>
            <td class="transaction-date">${formatDate(transaction.date)}</td>
            <td class="transaction-amount ${typeClass}">${sign}${formatCompact(transaction.amount)}</td>
            <td>
                <button class="delete-transaction" data-delete-id="${transaction.id}" title="Hapus transaksi">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-delete-id]").forEach(button => {
        button.addEventListener("click", () => {
            deleteTransaction(button.dataset.deleteId);
        });
    });
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function deleteTransaction(id) {
    const transaction = transactions.find(t => String(t.id) === String(id));
    if (!transaction) return;

    openConfirmModal(
        "Hapus transaksi?",
        `Transaksi "${transaction.name}" sebesar ${formatRupiah(transaction.amount)} akan dihapus.`,
        () => {
            transactions = transactions.filter(t => String(t.id) !== String(id));
            saveTransactions();
            renderDashboard();

            addNotification(
                "Transaksi dihapus",
                `${transaction.name} · ${formatRupiah(transaction.amount)}`,
                "warning",
                "fa-trash-can"
            );

            showToast("Transaksi dihapus", "Data berhasil diperbarui.");
        }
    );
}

/* =========================================================
   CHARTS
========================================================= */

function renderCharts() {
    renderCashflowChart();
    renderExpenseChart();
}

function getMonthlyCashflow() {
    const labels = [];
    const incomes = [];
    const expenses = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setDate(1);
        date.setMonth(date.getMonth() - i);

        const year = date.getFullYear();
        const month = date.getMonth();

        labels.push(date.toLocaleDateString("id-ID", {
            month: "short"
        }));

        const monthTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.date + "T00:00:00");
            return transactionDate.getFullYear() === year &&
                transactionDate.getMonth() === month;
        });

        incomes.push(monthTransactions
            .filter(t => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0));

        expenses.push(monthTransactions
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0));
    }

    return { labels, incomes, expenses };
}

function renderCashflowChart() {
    const canvas = $("#cashflowChart");
    if (!canvas) return;

    const data = getMonthlyCashflow();

    if (cashflowChart) {
        cashflowChart.destroy();
    }

    cashflowChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: "Pemasukan",
                    data: data.incomes,
                    backgroundColor: "#426bff",
                    borderRadius: 5,
                    barPercentage: .58,
                    categoryPercentage: .65
                },
                {
                    label: "Pengeluaran",
                    data: data.expenses,
                    backgroundColor: "#20c78a",
                    borderRadius: 5,
                    barPercentage: .58,
                    categoryPercentage: .65
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 650
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: "#202a3d",
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatRupiah(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: "#a0a9b8",
                        font: {
                            family: "DM Sans",
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: "#f1f3f7",
                        drawBorder: false
                    },
                    border: {
                        display: false,
                        dash: [4, 4]
                    },
                    ticks: {
                        maxTicksLimit: 5,
                        color: "#a0a9b8",
                        font: {
                            family: "DM Sans",
                            size: 9
                        },
                        callback: value => {
                            if (value >= 1000000) return (value / 1000000) + "jt";
                            if (value >= 1000) return (value / 1000) + "rb";
                            return value;
                        }
                    }
                }
            }
        }
    });
}

function getExpenseComposition() {
    const map = {};

    transactions
        .filter(t => t.type === "expense")
        .forEach(t => {
            map[t.category] = (map[t.category] || 0) + Number(t.amount);
        });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    return {
        labels: entries.map(e => e[0]),
        values: entries.map(e => e[1])
    };
}

function renderExpenseChart() {
    const canvas = $("#expenseChart");
    if (!canvas) return;

    const data = getExpenseComposition();

    if (expenseChart) {
        expenseChart.destroy();
    }

    if (!data.values.length) {
        data.labels = ["Belum ada data"];
        data.values = [1];
    }

    expenseChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: data.values.length === 1 && !getExpenseComposition().values.length
                    ? ["#edf1f7"]
                    : chartColors,
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "77%",
            animation: {
                duration: 700
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: getExpenseComposition().values.length > 0,
                    backgroundColor: "#202a3d",
                    padding: 10,
                    callbacks: {
                        label: context => `${context.label}: ${formatRupiah(context.raw)}`
                    }
                }
            }
        }
    });

    renderExpenseLegend();
}

function renderExpenseLegend() {
    const container = $("#expenseLegend");
    const data = getExpenseComposition();

    container.innerHTML = "";

    if (!data.values.length) {
        container.innerHTML = `
            <div class="legend-item">
                <div class="legend-left">
                    <span class="legend-color" style="background:#edf1f7"></span>
                    <span>Belum ada pengeluaran</span>
                </div>
                <span class="legend-value">—</span>
            </div>
        `;
        return;
    }

    const total = data.values.reduce((a, b) => a + b, 0);

    data.labels.slice(0, 5).forEach((label, index) => {
        const value = data.values[index];
        const percentage = total ? (value / total * 100) : 0;

        const row = document.createElement("div");
        row.className = "legend-item";

        row.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background:${chartColors[index % chartColors.length]}"></span>
                <span>${escapeHTML(label)} · ${percentage.toFixed(0)}%</span>
            </div>
            <span class="legend-value">${formatCompact(value)}</span>
        `;

        container.appendChild(row);
    });

    if (data.labels.length > 5) {
        const remaining = data.labels.length - 5;
        const othersTotal = data.values.slice(5).reduce((a, b) => a + b, 0);

        const row = document.createElement("div");
        row.className = "legend-item";
        row.innerHTML = `
            <div class="legend-left">
                <span class="legend-color" style="background:${chartColors[5]}"></span>
                <span>${remaining} kategori lainnya</span>
            </div>
            <span class="legend-value">${formatCompact(othersTotal)}</span>
        `;
        container.appendChild(row);
    }
}

/* =========================================================
   EXCEL / CSV
========================================================= */

function getMonthlySummary() {
    const map = {};

    transactions.forEach(t => {
        const date = new Date(t.date + "T00:00:00");
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        if (!map[key]) {
            map[key] = {
                period: key,
                income: 0,
                expense: 0,
                count: 0
            };
        }

        if (t.type === "income") map[key].income += Number(t.amount);
        if (t.type === "expense") map[key].expense += Number(t.amount);
        map[key].count++;
    });

    return Object.values(map).sort((a, b) => b.period.localeCompare(a.period));
}

function renderExcelTable() {
    const tbody = $("#excelTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const summary = getMonthlySummary();

    if (!summary.length) {
        tbody.innerHTML = `
            <tr>
                <td class="row-number">1</td>
                <td>Belum ada data</td>
                <td>Rp 0</td>
                <td>Rp 0</td>
                <td>Rp 0</td>
                <td>0</td>
            </tr>
        `;
        return;
    }

    summary.forEach((row, index) => {
        const net = row.income - row.expense;
        const date = new Date(row.period + "-01T00:00:00");
        const periodLabel = date.toLocaleDateString("id-ID", {
            month: "long",
            year: "numeric"
        });

        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="row-number">${index + 1}</td>
            <td>${periodLabel}</td>
            <td>${formatRupiah(row.income)}</td>
            <td>${formatRupiah(row.expense)}</td>
            <td class="${net >= 0 ? "positive" : "negative"}">${formatRupiah(net)}</td>
            <td>${row.count}</td>
        `;

        tbody.appendChild(tr);
    });
}

function exportCSV() {
    if (!transactions.length) {
        showToast("Data masih kosong", "Tambahkan transaksi sebelum mengekspor.", "warning");
        return;
    }

    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    const rows = [
        ["LAPORAN TRANSAKSI MONEYFLOW"],
        ["Dibuat", new Date().toLocaleString("id-ID")],
        [],
        ["No", "Tanggal", "Jenis", "Kategori", "Nama Transaksi", "Deskripsi", "Nominal (IDR)"]
    ];

    sorted.forEach((t, index) => {
        rows.push([
            index + 1,
            t.date,
            t.type === "income" ? "Pemasukan" : "Pengeluaran",
            t.category,
            t.name,
            t.description || "",
            Number(t.amount)
        ]);
    });

    rows.push([]);
    rows.push(["REKAP PER BULAN"]);
    rows.push(["Periode", "Pemasukan", "Pengeluaran", "Saldo Bersih", "Jumlah Transaksi"]);

    getMonthlySummary().forEach(row => {
        rows.push([
            row.period,
            row.income,
            row.expense,
            row.income - row.expense,
            row.count
        ]);
    });

    rows.push([]);
    const totals = getTotals();
    rows.push(["TOTAL KESELURUHAN"]);
    rows.push(["Total Pemasukan", totals.income]);
    rows.push(["Total Pengeluaran", totals.expense]);
    rows.push(["Saldo Bersih", totals.balance]);
    rows.push(["Total Tabungan", totals.savings]);
    rows.push(["Total Dana Darurat", totals.emergency]);

    const csvContent = rows.map(row =>
        row.map(csvEscape).join(";")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `MoneyFlow_Rekap_${getToday()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    addNotification(
        "Excel berhasil diekspor",
        `${transactions.length} transaksi telah diekspor ke CSV.`,
        "success",
        "fa-file-excel"
    );

    showToast("Ekspor berhasil", "File CSV siap dibuka di Excel.");
}

function csvEscape(value) {
    const string = String(value ?? "");
    return `"${string.replace(/"/g, '""')}"`;
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function addNotification(title, message, type = "info", icon = "fa-bell") {
    notifications.unshift({
        id: Date.now() + Math.random(),
        title,
        message,
        type,
        icon,
        time: new Date().toISOString()
    });

    notifications = notifications.slice(0, 30);

    saveNotifications();
    renderNotifications();
}

function renderNotifications() {
    const container = $("#notificationList");
    const empty = $("#notificationEmpty");

    container.innerHTML = "";

    empty.classList.toggle("show", notifications.length === 0);

    notifications.forEach(notification => {
        const item = document.createElement("div");
        item.className = "notification-item";

        const date = new Date(notification.time);
        const timeText = date.toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });

        item.innerHTML = `
            <div class="notification-icon ${notification.type}">
                <i class="fa-solid ${notification.icon}"></i>
            </div>
            <div class="notification-content">
                <strong>${escapeHTML(notification.title)}</strong>
                <p>${escapeHTML(notification.message)}</p>
                <span class="notification-time">${timeText}</span>
            </div>
        `;

        container.appendChild(item);
    });

    const count = notifications.length;

    $("#notificationCount").textContent = count > 99 ? "99+" : count;
    $("#notificationIndicator").style.display = count ? "block" : "none";
}

function clearNotifications() {
    notifications = [];
    saveNotifications();
    renderNotifications();
    showToast("Notifikasi dibersihkan", "Semua aktivitas notifikasi dihapus.");
}

/* =========================================================
   TOAST
========================================================= */

function showToast(title, message, type = "success") {
    const container = $("#toastContainer");

    const toast = document.createElement("div");
    toast.className = "toast";

    const icon = type === "warning"
        ? "fa-triangle-exclamation"
        : type === "info"
            ? "fa-circle-info"
            : "fa-circle-check";

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="toast-content">
            <strong>${escapeHTML(title)}</strong>
            <span>${escapeHTML(message)}</span>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hide");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* =========================================================
   MODALS
========================================================= */

function openModal(title, content) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = content;
    $("#modalOverlay").classList.add("show");
    document.body.style.overflow = "hidden";
    currentModal = title;
}

function closeModal() {
    $("#modalOverlay").classList.remove("show");
    document.body.style.overflow = "";
    currentModal = null;
}

function openTransactionModal(type = "expense") {
    selectedType = type;

    openModal("Tambah Transaksi", `
        <form id="transactionForm">
            <div class="type-toggle">
                <button type="button" data-type="income" class="${selectedType === "income" ? "active income" : ""}">
                    <i class="fa-solid fa-arrow-down"></i> Pemasukan
                </button>
                <button type="button" data-type="expense" class="${selectedType === "expense" ? "active expense" : ""}">
                    <i class="fa-solid fa-arrow-up"></i> Pengeluaran
                </button>
            </div>

            <div class="form-group">
                <label for="transactionAmount">Nominal (Rupiah)</label>
                <input class="form-control" id="transactionAmount" inputmode="numeric" placeholder="Contoh: 50000" required min="1" type="number">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="transactionCategory">Kategori</label>
                    <select class="form-control" id="transactionCategory" required></select>
                </div>
                <div class="form-group">
                    <label for="transactionDate">Tanggal</label>
                    <input class="form-control" id="transactionDate" type="date" value="${getToday()}" required>
                </div>
            </div>

            <div class="form-group">
                <label for="transactionName">Nama transaksi</label>
                <input class="form-control" id="transactionName" placeholder="Contoh: Makan siang" maxlength="80" required>
            </div>

            <div class="form-group">
                <label for="transactionDescription">Catatan (opsional)</label>
                <textarea class="form-control" id="transactionDescription" placeholder="Tambahkan catatan transaksi..." rows="3" maxlength="250" style="resize:vertical"></textarea>
            </div>

            <button type="submit" class="form-submit">Simpan Transaksi</button>
            <p class="form-note"><i class="fa-solid fa-lock"></i> Data transaksi disimpan secara lokal pada perangkat kamu.</p>
        </form>
    `);

    populateCategories();

    $("#modalBody").querySelectorAll("[data-type]").forEach(button => {
        button.addEventListener("click", () => {
            selectedType = button.dataset.type;
            updateTypeToggle();
            populateCategories();
        });
    });

    $("#transactionForm").addEventListener("submit", handleTransactionSubmit);
}

function updateTypeToggle() {
    $("#modalBody").querySelectorAll("[data-type]").forEach(button => {
        button.classList.remove("active", "income", "expense");

        if (button.dataset.type === selectedType) {
            button.classList.add("active", selectedType);
        }
    });
}

function populateCategories() {
    const select = $("#transactionCategory");
    const list = categories[selectedType];

    select.innerHTML = list.map(category =>
        `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
    ).join("");
}

function handleTransactionSubmit(event) {
    event.preventDefault();

    const amount = Number($("#transactionAmount").value);
    const name = $("#transactionName").value.trim();
    const category = $("#transactionCategory").value;
    const date = $("#transactionDate").value;
    const description = $("#transactionDescription").value.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
        showToast("Nominal tidak valid", "Masukkan nominal lebih dari nol.", "warning");
        return;
    }

    if (!name || !date || !category) {
        showToast("Form belum lengkap", "Lengkapi data transaksi terlebih dahulu.", "warning");
        return;
    }

    const transaction = {
        id: Date.now().toString(),
        type: selectedType,
        amount,
        name,
        category,
        date,
        description,
        createdAt: Date.now()
    };

    transactions.push(transaction);
    saveTransactions();

    closeModal();
    renderDashboard();

    const label = selectedType === "income" ? "Pemasukan" : "Pengeluaran";

    addNotification(
        `${label} baru dicatat`,
        `${name} · ${formatRupiah(amount)}`,
        selectedType === "income" ? "success" : "info",
        selectedType === "income" ? "fa-arrow-down" : "fa-arrow-up"
    );

    showToast("Transaksi berhasil disimpan", `${name} · ${formatRupiah(amount)}`);

    checkExpenseWarning();
}

function checkExpenseWarning() {
    const totals = getTotals();

    if (totals.income > 0 && totals.expense >= totals.income * 0.8) {
        addNotification(
            "Pengingat pengeluaran",
            "Pengeluaran sudah mencapai 80% atau lebih dari total pemasukan.",
            "warning",
            "fa-triangle-exclamation"
        );
    }
}

/* =========================================================
   GOAL MODALS
========================================================= */

function openGoalModal(key) {
    const isSavings = key === "savings";
    const goal = goals[key];
    const title = isSavings ? "Pengaturan Tabungan" : "Pengaturan Dana Darurat";
    const name = isSavings ? "Tabungan" : "Dana Darurat";

    openModal(title, `
        <form id="goalForm">
            <div class="form-group">
                <label>Saldo terkumpul ${name}</label>
                <input class="form-control" type="number" min="0" id="goalAmount" value="${goal.amount}" required>
            </div>
            <div class="form-group">
                <label>Target ${name}</label>
                <input class="form-control" type="number" min="0" id="goalTarget" value="${goal.target}" required>
            </div>
            <button type="submit" class="form-submit">Simpan Pengaturan</button>
            <p class="form-note">Kamu bisa menyesuaikan saldo awal dan target sesuai rencana keuangan.</p>
        </form>
    `);

    $("#goalForm").addEventListener("submit", event => {
        event.preventDefault();

        const amount = Number($("#goalAmount").value);
        const target = Number($("#goalTarget").value);

        if (amount < 0 || target < 0) {
            showToast("Nilai tidak valid", "Nilai target dan saldo tidak boleh negatif.", "warning");
            return;
        }

        goals[key].amount = amount;
        goals[key].target = target;

        saveGoals();
        closeModal();
        renderDashboard();

        addNotification(
            `${name} diperbarui`,
            `Saldo ${formatRupiah(amount)} · Target ${formatRupiah(target)}`,
            "success",
            "fa-bullseye"
        );

        showToast(`${name} diperbarui`, "Target keuangan berhasil disimpan.");
    });
}

function openContributionModal(key) {
    const isSavings = key === "savings";
    const name = isSavings ? "Tabungan" : "Dana Darurat";

    openModal(`Tambah ${name}`, `
        <form id="contributionForm">
            <div class="form-group">
                <label>Jumlah dana (Rupiah)</label>
                <input class="form-control" type="number" id="contributionAmount" min="1" placeholder="Contoh: 100000" required>
            </div>
            <div class="form-group">
                <label>Catatan (opsional)</label>
                <input class="form-control" type="text" id="contributionNote" placeholder="Contoh: Tabungan minggu ini" maxlength="80">
            </div>
            <button class="form-submit" type="submit">Tambah Dana</button>
            <p class="form-note">Kontribusi dicatat pada tujuan ${name} dan tersimpan secara otomatis.</p>
        </form>
    `);

    $("#contributionForm").addEventListener("submit", event => {
        event.preventDefault();

        const amount = Number($("#contributionAmount").value);
        const note = $("#contributionNote").value.trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            showToast("Nominal tidak valid", "Masukkan nominal lebih dari nol.", "warning");
            return;
        }

        goals[key].amount += amount;
        saveGoals();

        closeModal();
        renderDashboard();

        addNotification(
            `Dana ${name} bertambah`,
            `${formatRupiah(amount)}${note ? " · " + note : ""}`,
            "success",
            "fa-piggy-bank"
        );

        showToast("Dana berhasil ditambahkan", `${name} +${formatRupiah(amount)}`);
    });
}

function openConfirmModal(title, description, onConfirm) {
    openModal(title, `
        <p style="font-size:12px;line-height:1.7;color:#8490a4;margin-bottom:22px;">
            ${escapeHTML(description)}
        </p>
        <div class="form-row">
            <button class="outline-button" id="confirmCancel" style="justify-content:center;width:100%">Batal</button>
            <button class="form-submit" id="confirmAction" style="margin:0;background:#ef6868">Ya, hapus</button>
        </div>
    `);

    $("#confirmCancel").addEventListener("click", closeModal);

    $("#confirmAction").addEventListener("click", () => {
        closeModal();
        onConfirm();
    });
}

/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {
    openModal("Pengaturan", `
        <div class="settings-grid">
            <div class="form-group">
                <label>Data dashboard</label>
                <p class="form-note">Semua transaksi, target tabungan, dan notifikasi tersimpan pada browser ini menggunakan localStorage.</p>
            </div>
            <div class="settings-danger">
                <button class="danger-button" id="resetDataBtn"><i class="fa-solid fa-trash"></i> Reset seluruh data MoneyFlow</button>
                <p class="form-note">Tindakan ini menghapus semua transaksi, target, dan notifikasi. Data yang sudah dihapus tidak bisa dikembalikan.</p>
            </div>
        </div>
    `);

    $("#resetDataBtn").addEventListener("click", () => {
        openConfirmModal(
            "Reset seluruh data?",
            "Semua transaksi, tabungan, dana darurat, dan notifikasi akan dihapus permanen dari browser ini.",
            () => {
                transactions = [];
                goals = {
                    savings: { amount: 0, target: 10000000 },
                    emergency: { amount: 0, target: 5000000 }
                };
                notifications = [];

                saveTransactions();
                saveGoals();
                saveNotifications();

                closeModal();
                renderDashboard();
                renderNotifications();

                showToast("Data berhasil direset", "Dashboard kembali ke kondisi awal.");
            }
        );
    });
}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
    $("#addTransactionBtn").addEventListener("click", () => openTransactionModal("expense"));

    $("#modalClose").addEventListener("click", closeModal);

    $("#modalOverlay").addEventListener("click", event => {
        if (event.target === $("#modalOverlay")) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && currentModal) closeModal();
    });

    $("#addSavingsBtn").addEventListener("click", () => openContributionModal("savings"));
    $("#addEmergencyBtn").addEventListener("click", () => openContributionModal("emergency"));

    document.querySelectorAll(".goal-menu").forEach(button => {
        button.addEventListener("click", () => openGoalModal(button.dataset.goal));
    });

    $("#exportCsvBtn").addEventListener("click", exportCSV);
    $("#clearNotifications").addEventListener("click", clearNotifications);

    $("#viewAllTransactions").addEventListener("click", () => {
        showAllTransactions = !showAllTransactions;
        renderTransactions();
    });

    $("#notificationBtn").addEventListener("click", () => {
        $("#notifications").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    $("#notificationNav").addEventListener("click", () => {
        closeSidebar();
        $("#notifications").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });

    // Dark Mode Toggle
    $("#themeToggle").addEventListener("click", toggleTheme);

    $("#settingsBtn").addEventListener("click", openSettings);

    // Sidebar mobile
    $("#menuToggle").addEventListener("click", toggleSidebar);
    $("#sidebarOverlay").addEventListener("click", closeSidebar);

    // Sidebar navigation
    document.querySelectorAll(".nav-link[data-section]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();

            document.querySelectorAll(".nav-link[data-section]").forEach(item => {
                item.classList.remove("active");
            });

            link.classList.add("active");

            const section = link.dataset.section;

            if (section === "dashboard") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
                const element = document.getElementById(section);
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }

            closeSidebar();
        });
    });
}

function toggleSidebar() {
    $("#sidebar").classList.toggle("open");
    $("#sidebarOverlay").classList.toggle("show");
}

function closeSidebar() {
    $("#sidebar").classList.remove("open");
    $("#sidebarOverlay").classList.remove("show");
}

/* =========================================================
   START
========================================================= */

document.addEventListener("DOMContentLoaded", init);