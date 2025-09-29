// Data Management
class BudgetApp {
    constructor() {
        this.data = this.loadData();
        this.currentAssetType = null;
        this.currentFilter = 'all';
        this.chart = null;
        this.pendingAllowanceTransaction = null;
        this.editingTransactionId = null;
        this.currentTab = 'expense'; // 當前選中的分頁
        this.selectedMonth = new Date().getMonth(); // 當前選中的月份
        this.selectedYear = new Date().getFullYear(); // 當前選中的年份
        this.timeRange = 'daily'; // 當前選中的時間範圍：daily, monthly, yearly, custom
        this.incomePage = 1; // 收入當前頁碼
        this.expensePage = 1; // 支出當前頁碼
        this.itemsPerPage = 3; // 每頁顯示項目數
        this.init();
    }

    loadData() {
        const defaultData = {
            assets: {
                bank: 0,
                cash: 0,
                creditCards: []
            },
            transactions: [],
            settings: {
                currency: 'TWD'
            },
            customCategories: {
                income: [],
                expense: []
            }
        };

        const saved = localStorage.getItem('budgetAppData');
        return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
    }

    saveData() {
        localStorage.setItem('budgetAppData', JSON.stringify(this.data));
    }

    init() {
        this.setupEventListeners();
        // Delay category options update to ensure DOM is ready
        setTimeout(() => {
            this.updateCategoryOptions();
            this.updateAssetsDisplay();
            this.updateTodaySummary();
            this.initializeChart();
            this.initializeDateSelectors();
            // Show today's expenses after chart is initialized
            this.showTodayExpenses();
        }, 100);
    }

    // Category Management
    getBaseCategories() {
        return {
            income: [
                { value: 'salary', label: '💰 薪資' },
                { value: 'allowance', label: '💵 零用錢' },
                { value: 'interest', label: '💹 利息' },
                { value: 'dividend', label: '📈 配息' },
                { value: 'custom', label: '✏️ 自訂' }
            ],
            expense: [
                { value: 'food', label: '🍽️ 餐飲' },
                { value: 'clothing', label: '👕 服飾' },
                { value: 'housing', label: '🏠 居住' },
                { value: 'transport', label: '🚗 交通' },
                { value: 'daily', label: '📅 日常' },
                { value: 'entertainment', label: '🎬 娛樂' },
                { value: 'payment', label: '💳 已繳清' },
                { value: 'custom', label: '✏️ 自訂' }
            ]
        };
    }

    updateCategoryOptions() {
        const categorySelect = document.getElementById('quick-category');
        if (!categorySelect) {
            console.log('Category select element not found');
            return;
        }
        
        const currentType = document.querySelector('.type-btn.active')?.dataset.type || 'income';
        const baseCategories = this.getBaseCategories();
        const customCategories = this.data.customCategories[currentType] || [];
        
        // Clear existing options
        categorySelect.innerHTML = '';
        
        // Add base categories
        baseCategories[currentType].forEach(category => {
            const option = document.createElement('option');
            option.value = category.value;
            option.textContent = category.label;
            categorySelect.appendChild(option);
        });
        
        // Add custom categories
        customCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = `✏️ ${category}`;
            categorySelect.appendChild(option);
        });
        
        console.log('Category options updated for type:', currentType);
    }

    setupEventListeners() {
        // Quick transaction form
        document.getElementById('quick-transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addQuickTransaction();
        });

        // Initial assets form
        document.getElementById('initial-assets-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInitialAssets();
        });

        // Transaction type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTransactionType(e.target.dataset.type);
            });
        });

        // Modal close
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', this.closeModal);
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }


    // Quick Transaction Management
    quickAddTransaction(assetType) {
        console.log('Opening quick transaction modal for:', assetType);
        this.currentAssetType = assetType;
        const modal = document.getElementById('quick-transaction-modal');
        const title = document.getElementById('quick-modal-title');
        
        if (assetType === 'bank') {
            title.textContent = '銀行存款 - 快速新增交易';
        } else if (assetType === 'cash') {
            title.textContent = '現金 - 快速新增交易';
        } else if (assetType === 'credit') {
            title.textContent = '信用卡 - 快速新增交易';
        }

        // Reset form and set today's date
        const form = document.getElementById('quick-transaction-form');
        if (form) {
            form.reset();
            console.log('Form reset successfully');
        }
        
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('quick-date');
        if (dateInput) {
            dateInput.value = today;
            console.log('Date set to:', today);
        }
        
        // Update category options before showing modal
        this.updateCategoryOptions();
        
        // Hide custom category input initially
        const customGroup = document.getElementById('custom-category-group');
        if (customGroup) {
            customGroup.style.display = 'none';
        }
        
        // Show modal and focus on amount input
        if (modal) {
            modal.style.display = 'block';
            console.log('Modal displayed');
            
            setTimeout(() => {
                const amountInput = document.getElementById('quick-amount');
                if (amountInput) {
                    amountInput.focus();
                    console.log('Amount input focused');
                } else {
                    console.error('Amount input not found');
                }
            }, 100);
        } else {
            console.error('Modal not found');
        }
    }

    setTransactionType(type) {
        // Update button states
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Update category options
        this.updateCategoryOptions();
        
        // Hide custom category input initially
        document.getElementById('custom-category-group').style.display = 'none';
    }

    addQuickTransaction() {
        const form = document.getElementById('quick-transaction-form');
        const activeTypeBtn = document.querySelector('.type-btn.active');
        const type = activeTypeBtn.dataset.type;
        const categoryValue = document.getElementById('quick-category').value;
        const customCategory = document.getElementById('custom-category').value;
        
        let finalCategory = categoryValue;
        
        // Handle custom category
        if (categoryValue === 'custom' && customCategory.trim()) {
            finalCategory = customCategory.trim();
            
            // Add to custom categories if not already exists
            if (!this.data.customCategories[type].includes(finalCategory)) {
                this.data.customCategories[type].push(finalCategory);
                this.saveData();
            }
        }
        
        const amount = parseFloat(document.getElementById('quick-amount').value);
        
        // Check if it's cash income with allowance category
        if (this.currentAssetType === 'cash' && type === 'income' && finalCategory === 'allowance') {
            this.showAllowanceWithdrawalModal(amount);
            return;
        }
        
        // Check if it's credit card payment
        if (this.currentAssetType === 'credit' && type === 'expense' && finalCategory === 'payment') {
            if (!this.selectedPaymentMethod) {
                alert('請選擇繳清方式');
                return;
            }
            this.handleCreditCardPayment(amount, finalCategory, document.getElementById('quick-date').value, document.getElementById('quick-notes').value || '');
            return;
        }
        
        const transactionData = {
            type: type,
            amount: amount,
            category: finalCategory,
            date: document.getElementById('quick-date').value,
            notes: document.getElementById('quick-notes').value || '',
            account: this.currentAssetType // 記錄是哪個帳戶的交易
        };

        if (this.editingTransactionId) {
            // Update existing transaction
            const transactionIndex = this.data.transactions.findIndex(t => t.id === this.editingTransactionId);
            if (transactionIndex !== -1) {
                this.data.transactions[transactionIndex] = {
                    ...this.data.transactions[transactionIndex],
                    ...transactionData
                };
            }
            this.editingTransactionId = null;
        } else {
            // Add new transaction
            const transaction = {
                id: Date.now(),
                ...transactionData
            };
            this.data.transactions.unshift(transaction);
        }

        this.saveData();
        
        // 同步更新所有相關顯示
        this.updateTodaySummary();
        this.updateChart();
        this.updateAssetsDisplay();
        
        // Refresh current view
        if (document.getElementById('selected-category').textContent === '當月交易細項') {
            this.showTodayExpenses();
        } else {
            const currentCategory = this.getCurrentCategoryFromHeader();
            if (currentCategory) {
                this.showCategoryDetails(currentCategory);
            }
        }
        
        form.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('quick-date').value = today;
        document.getElementById('custom-category-group').style.display = 'none';
        this.closeModal();
    }


    manageCreditCards() {
        const modal = document.getElementById('credit-modal');
        this.updateCreditCardsList();
        modal.style.display = 'block';
    }

    updateCreditCardsList() {
        const container = document.getElementById('credit-cards-list');
        container.innerHTML = '';

        if (this.data.assets.creditCards.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>尚未新增任何信用卡。</p></div>';
            return;
        }

        this.data.assets.creditCards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'credit-card-item';
            cardElement.innerHTML = `
                <div class="credit-card-info">
                    <h4>${card.name}</h4>
                    <p>餘額: NT$${card.balance.toFixed(0)}</p>
                </div>
                <div class="credit-card-actions">
                    <button class="edit-btn" onclick="budgetApp.editCreditCard(${index})">編輯</button>
                    <button class="delete-btn" onclick="budgetApp.deleteCreditCard(${index})">刪除</button>
                </div>
            `;
            container.appendChild(cardElement);
        });
    }

    addCreditCard() {
        const name = prompt('請輸入信用卡名稱:');
        if (!name) return;

        const balanceStr = prompt('請輸入目前餘額 (負數表示負債):');
        const balance = parseFloat(balanceStr) || 0;

        this.data.assets.creditCards.push({
            name: name,
            balance: balance
        });

        this.saveData();
        this.updateCreditCardsList();
        this.updateAssetsDisplay();
    }

    editCreditCard(index) {
        const card = this.data.assets.creditCards[index];
        const newName = prompt('請輸入新名稱:', card.name);
        if (newName === null) return;

        const newBalanceStr = prompt('請輸入新餘額:', card.balance);
        const newBalance = parseFloat(newBalanceStr);
        if (isNaN(newBalance)) return;

        this.data.assets.creditCards[index] = {
            name: newName,
            balance: newBalance
        };

        this.saveData();
        this.updateCreditCardsList();
        this.updateAssetsDisplay();
    }

    deleteCreditCard(index) {
        if (confirm('確定要刪除這張信用卡嗎？')) {
            this.data.assets.creditCards.splice(index, 1);
            this.saveData();
            this.updateCreditCardsList();
            this.updateAssetsDisplay();
        }
    }

    saveAsset() {
        const amount = parseFloat(document.getElementById('asset-amount').value);
        if (isNaN(amount)) return;

        if (this.currentAssetType === 'bank') {
            this.data.assets.bank = amount;
        } else if (this.currentAssetType === 'cash') {
            this.data.assets.cash = amount;
        }

        this.saveData();
        this.updateAssetsDisplay();
        this.closeModal();
    }

    updateAssetsDisplay() {
        // Calculate assets based on transactions
        const bankBalance = this.calculateBankBalance();
        const cashBalance = this.calculateCashBalance();
        const creditBalance = this.calculateCreditBalance();

        // Update individual assets
        document.getElementById('bank-amount').textContent = `NT$${bankBalance.toFixed(0)}`;
        document.getElementById('cash-amount').textContent = `NT$${cashBalance.toFixed(0)}`;
        document.getElementById('credit-total').textContent = `NT$${creditBalance.toFixed(0)}`;

        // Calculate total assets
        const totalAssets = bankBalance + cashBalance + creditBalance;
        document.getElementById('total-assets').textContent = `NT$${totalAssets.toFixed(0)}`;
    }

    calculateBankBalance() {
        // Start with initial bank balance
        let balance = this.data.assets.bank;
        
        // Add all bank-related transactions
        this.data.transactions.forEach(transaction => {
            if (transaction.account === 'bank') {
                if (transaction.type === 'income') {
                    balance += transaction.amount;
                } else if (transaction.type === 'expense') {
                    balance -= transaction.amount;
                }
            }
        });
        
        return balance;
    }

    calculateCashBalance() {
        // Start with initial cash balance
        let balance = this.data.assets.cash;
        
        // Add all cash-related transactions
        this.data.transactions.forEach(transaction => {
            if (transaction.account === 'cash') {
                if (transaction.type === 'income') {
                    balance += transaction.amount;
                } else if (transaction.type === 'expense') {
                    balance -= transaction.amount;
                }
            }
        });
        
        return balance;
    }

    calculateCreditBalance() {
        // Start with initial credit card balances
        let totalBalance = this.data.assets.creditCards.reduce((sum, card) => sum + card.balance, 0);
        
        // Add all credit-related transactions
        this.data.transactions.forEach(transaction => {
            if (transaction.account === 'credit') {
                if (transaction.type === 'income') {
                    totalBalance += transaction.amount;
                } else if (transaction.type === 'expense') {
                    totalBalance -= transaction.amount;
                }
            }
        });
        
        return totalBalance;
    }


    updateTodaySummary() {
        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = this.data.transactions.filter(t => t.date === today);

        const todayIncome = todayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayExpense = todayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayNet = todayIncome - todayExpense;

        document.getElementById('today-income').textContent = `NT$${todayIncome.toFixed(0)}`;
        document.getElementById('today-expense').textContent = `NT$${todayExpense.toFixed(0)}`;
        document.getElementById('today-net').textContent = `NT$${todayNet.toFixed(0)}`;
    }


    // Time Range Management
    getFilteredTransactions() {
        const now = new Date();
        const transactionDate = new Date();
        
        return this.data.transactions.filter(t => {
            if (t.type !== 'expense') return false;
            
            // Only include cash and credit expenses
            if (t.account !== 'cash' && t.account !== 'credit') return false;
            
            const tDate = new Date(t.date);
            
            switch (this.timeRange) {
                case 'daily':
                    return tDate.toDateString() === now.toDateString();
                case 'monthly':
                    return tDate.getMonth() === now.getMonth() && 
                           tDate.getFullYear() === now.getFullYear();
                case 'yearly':
                    return tDate.getFullYear() === now.getFullYear();
                case 'custom':
                    return tDate.getMonth() === this.selectedMonth && 
                           tDate.getFullYear() === this.selectedYear;
                default:
                    return false;
            }
        });
    }

    getDateRangeText() {
        const now = new Date();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        switch (this.timeRange) {
            case 'daily':
                return `日期範圍：${now.getFullYear()}年${monthNames[now.getMonth()]}${now.getDate()}日`;
            case 'monthly':
                return `日期範圍：${now.getFullYear()}年${monthNames[now.getMonth()]}`;
            case 'yearly':
                return `日期範圍：${now.getFullYear()}年`;
            case 'custom':
                return `日期範圍：${this.selectedYear}年${monthNames[this.selectedMonth]}`;
            default:
                return '';
        }
    }

    getFilteredTransactionsForDetails() {
        const now = new Date();
        
        return this.data.transactions.filter(t => {
            const tDate = new Date(t.date);
            
            switch (this.timeRange) {
                case 'daily':
                    return tDate.toDateString() === now.toDateString();
                case 'monthly':
                    return tDate.getMonth() === now.getMonth() && 
                           tDate.getFullYear() === now.getFullYear();
                case 'yearly':
                    return tDate.getFullYear() === now.getFullYear();
                case 'custom':
                    return tDate.getMonth() === this.selectedMonth && 
                           tDate.getFullYear() === this.selectedYear;
                default:
                    return false;
            }
        });
    }

    getTimeRangeText() {
        const now = new Date();
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        
        switch (this.timeRange) {
            case 'daily':
                return `${now.getFullYear()}年${monthNames[now.getMonth()]}${now.getDate()}日`;
            case 'monthly':
                return `${now.getFullYear()}年${monthNames[now.getMonth()]}`;
            case 'yearly':
                return `${now.getFullYear()}年`;
            case 'custom':
                return `${this.selectedYear}年${monthNames[this.selectedMonth]}`;
            default:
                return '';
        }
    }


    // Chart Management
    initializeChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        this.updateChart();
    }

    updateChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        
        // Filter transactions based on time range
        const expenses = this.getFilteredTransactions();
        
        // Calculate category totals for cash and credit expenses only
        const categoryTotals = {};
        expenses.forEach(transaction => {
            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }
            categoryTotals[transaction.category] += transaction.amount;
        });

        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);

        if (this.chart) {
            this.chart.destroy();
        }

        if (categories.length === 0) {
            // Show empty state
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.fillStyle = '#718096';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('沒有支出資料可顯示', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];

        const categoryNames = {
            // Income categories
            salary: '薪資',
            allowance: '零用錢',
            interest: '利息',
            dividend: '配息',
            // Expense categories
            food: '餐飲',
            clothing: '服飾',
            housing: '居住',
            transport: '交通',
            daily: '日常',
            entertainment: '娛樂',
            other: '其他'
        };

        this.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categories.map(cat => categoryNames[cat] || cat),
                datasets: [{
                    data: amounts,
                    backgroundColor: colors.slice(0, categories.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: NT$${context.parsed.toFixed(0)} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const categoryIndex = elements[0].index;
                        const category = categories[categoryIndex];
                        this.showCategoryDetails(category);
                    }
                }
            }
        });

        // Update date info
        this.updateDateInfo();
    }

    updateDateInfo() {
        const dateInfoEl = document.getElementById('chart-date-info');
        if (dateInfoEl) {
            dateInfoEl.textContent = this.getDateRangeText();
        }
    }

    initializeDateSelectors() {
        const transactionMonthEl = document.getElementById('transaction-month');
        
        if (transactionMonthEl) {
            // Populate month options
            this.populateMonthOptions();
            // Don't set default month, let time range buttons control the display
            transactionMonthEl.value = '';
        }
    }

    populateMonthOptions() {
        const transactionMonthEl = document.getElementById('transaction-month');
        if (!transactionMonthEl) return;
        
        // Clear existing options except the first one
        transactionMonthEl.innerHTML = '<option value="">全部月份</option>';
        
        // Generate options for the last 24 months (2 years)
        const now = new Date();
        for (let i = 0; i < 24; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const option = document.createElement('option');
            option.value = `${date.getFullYear()}-${date.getMonth()}`;
            option.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月`;
            transactionMonthEl.appendChild(option);
        }
    }

    showCategoryDetails(category) {
        const categoryNames = {
            // Income categories
            salary: '薪資',
            allowance: '零用錢',
            interest: '利息',
            dividend: '配息',
            // Expense categories
            food: '餐飲',
            clothing: '服飾',
            housing: '居住',
            transport: '交通',
            daily: '日常',
            entertainment: '娛樂',
            other: '其他'
        };

        const categoryName = categoryNames[category] || category;
        
        // Filter expenses by time range and category
        const allExpenses = this.getFilteredTransactions();
        const expenses = allExpenses.filter(t => 
            t.type === 'expense' && t.category === category
        ).sort((a, b) => new Date(b.date) - new Date(a.date));

        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        const selectedCategoryEl = document.getElementById('selected-category');
        const backBtnEl = document.getElementById('back-btn');
        const contentEl = document.getElementById('details-content');
        
        if (!selectedCategoryEl || !backBtnEl || !contentEl) {
            console.log('Required DOM elements not found for showCategoryDetails');
            return;
        }

        // Update header with selected time range
        const timeRangeText = this.getTimeRangeText();
        selectedCategoryEl.textContent = `${timeRangeText}${categoryName}支出細項`;
        backBtnEl.style.display = 'block';
        
        // Hide tabs when viewing specific category
        const tabsEl = document.querySelector('.transaction-tabs');
        if (tabsEl) {
            tabsEl.style.display = 'none';
        }

        // Update content
        if (expenses.length === 0) {
            contentEl.innerHTML = `
                <div class="no-selection">
                    <p>此分類暫無支出記錄</p>
                </div>
            `;
        } else {
            contentEl.innerHTML = `
                <div class="category-summary">
                    <h4>${categoryName}</h4>
                    <div class="total-amount">NT$${totalAmount.toFixed(0)}</div>
                    <div class="transaction-count">共 ${expenses.length} 筆交易</div>
                </div>
                <div class="expense-list">
                    ${expenses.map(expense => this.createExpenseItem(expense)).join('')}
                </div>
            `;
        }
    }

    createExpenseItem(expense) {
        const icon = this.getCategoryIcon(expense.category);
        const date = new Date(expense.date).toLocaleDateString();
        const accountNames = {
            bank: '銀行',
            cash: '現金',
            credit: '信用卡'
        };

        const categoryNames = {
            // Income categories
            salary: '薪資',
            allowance: '零用錢',
            interest: '利息',
            dividend: '配息',
            // Expense categories
            food: '餐飲',
            clothing: '服飾',
            housing: '居住',
            transport: '交通',
            daily: '日常',
            entertainment: '娛樂',
            other: '其他'
        };

        const displayCategory = categoryNames[expense.category] || expense.category;

        return `
            <div class="expense-item">
                <div class="expense-item-info">
                    <div class="expense-item-icon">${icon}</div>
                    <div class="expense-item-details">
                        <h4>${displayCategory}</h4>
                        <p>${date} • ${accountNames[expense.account] || expense.account}${expense.notes ? ' • ' + expense.notes : ''}</p>
                    </div>
                </div>
                <div class="expense-item-amount">NT$${expense.amount.toFixed(0)}</div>
            </div>
        `;
    }

    createExpenseItemWithActions(expense) {
        const icon = this.getCategoryIcon(expense.category);
        const date = new Date(expense.date).toLocaleDateString();
        const accountNames = {
            bank: '銀行',
            cash: '現金',
            credit: '信用卡'
        };

        const categoryNames = {
            // Income categories
            salary: '薪資',
            allowance: '零用錢',
            interest: '利息',
            dividend: '配息',
            // Expense categories
            food: '餐飲',
            clothing: '服飾',
            housing: '居住',
            transport: '交通',
            daily: '日常',
            entertainment: '娛樂',
            other: '其他'
        };

        const displayCategory = categoryNames[expense.category] || expense.category;

        return `
            <div class="expense-item">
                <div class="expense-item-info">
                    <div class="expense-item-icon">${icon}</div>
                    <div class="expense-item-details">
                        <h4>${displayCategory}</h4>
                        <p>${date} • ${accountNames[expense.account] || expense.account}${expense.notes ? ' • ' + expense.notes : ''}</p>
                    </div>
                </div>
                <div class="expense-item-actions">
                    <div class="expense-item-amount">NT$${expense.amount.toFixed(0)}</div>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="editTransaction(${expense.id})" title="編輯">✏️</button>
                        <button class="delete-btn" onclick="deleteTransaction(${expense.id})" title="刪除">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }

    createTransactionItem(transaction) {
        const icon = this.getCategoryIcon(transaction.category);
        const date = new Date(transaction.date).toLocaleDateString();
        const accountNames = {
            bank: '銀行',
            cash: '現金',
            credit: '信用卡'
        };

        const categoryNames = {
            // Income categories
            salary: '薪資',
            allowance: '零用錢',
            interest: '利息',
            dividend: '配息',
            // Expense categories
            food: '餐飲',
            clothing: '服飾',
            housing: '居住',
            transport: '交通',
            daily: '日常',
            entertainment: '娛樂',
            payment: '已繳清',
            other: '其他'
        };

        const displayCategory = categoryNames[transaction.category] || transaction.category;

        return `
            <div class="transaction-item">
                <div class="transaction-main">
                    <div class="transaction-info">
                        <div class="transaction-category">${icon} ${displayCategory}</div>
                        <div class="transaction-details">${date} • ${accountNames[transaction.account] || transaction.account}${transaction.notes ? ' • ' + transaction.notes : ''}</div>
                    </div>
                    <div class="transaction-amount">NT$${transaction.amount.toFixed(0)}</div>
                </div>
                <div class="transaction-actions">
                    <button class="action-btn edit-btn" onclick="editTransaction(${transaction.id})" title="編輯">✏️ 重新編輯</button>
                    <button class="action-btn delete-btn" onclick="deleteTransaction(${transaction.id})" title="刪除">🗑️ 刪除</button>
                </div>
            </div>
        `;
    }

    showTodayExpenses() {
        const selectedCategoryEl = document.getElementById('selected-category');
        const backBtnEl = document.getElementById('back-btn');
        
        if (!selectedCategoryEl || !backBtnEl) {
            console.log('Required DOM elements not found for showTodayExpenses');
            return;
        }
        
        // Update header with selected time range
        const timeRangeText = this.getTimeRangeText();
        selectedCategoryEl.textContent = `${timeRangeText}交易細項`;
        backBtnEl.style.display = 'none';
        
        // Update transaction details
        this.updateTransactionDetails();
    }

    updateTransactionDetails() {
        const incomeListEl = document.getElementById('income-list');
        const expenseListEl = document.getElementById('expense-list');
        const transactionMonthEl = document.getElementById('transaction-month');
        
        if (!incomeListEl || !expenseListEl) return;
        
        // Filter by type and selected month
        const selectedMonth = transactionMonthEl ? transactionMonthEl.value : null;
        
        let incomeTransactions, expenseTransactions;
        
        if (selectedMonth) {
            // If a specific month is selected, filter by that month from all transactions
            const [year, month] = selectedMonth.split('-').map(Number);
            const allTransactions = this.data.transactions;
            
            incomeTransactions = allTransactions.filter(t => {
                if (t.type !== 'income') return false;
                const transactionDate = new Date(t.date);
                return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
            });
            
            expenseTransactions = allTransactions.filter(t => {
                if (t.type !== 'expense') return false;
                const transactionDate = new Date(t.date);
                return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
            });
        } else {
            // If no specific month is selected, use the time range filter
            const allTransactions = this.getFilteredTransactionsForDetails();
            incomeTransactions = allTransactions.filter(t => t.type === 'income');
            expenseTransactions = allTransactions.filter(t => t.type === 'expense');
        }
        
        // Sort by date (newest first)
        incomeTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        expenseTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Reset page numbers when updating
        this.incomePage = 1;
        this.expensePage = 1;
        
        // Update income list with pagination
        this.updateTransactionList('income', incomeTransactions);
        
        // Update expense list with pagination
        this.updateTransactionList('expense', expenseTransactions);
    }

    updateTransactionList(type, transactions) {
        const listEl = document.getElementById(`${type}-list`);
        const paginationEl = document.getElementById(`${type}-pagination`);
        const pageInfoEl = document.getElementById(`${type}-page-info`);
        
        if (!listEl || !paginationEl || !pageInfoEl) return;
        
        const totalPages = Math.ceil(transactions.length / this.itemsPerPage);
        const currentPage = type === 'income' ? this.incomePage : this.expensePage;
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageTransactions = transactions.slice(startIndex, endIndex);
        
        // Update list content
        if (pageTransactions.length === 0) {
            listEl.innerHTML = '<div class="no-transactions">暫無記錄</div>';
        } else {
            listEl.innerHTML = pageTransactions.map(transaction => this.createTransactionItem(transaction)).join('');
        }
        
        // Update pagination controls
        if (totalPages <= 1) {
            paginationEl.style.display = 'none';
        } else {
            paginationEl.style.display = 'flex';
            
            // Update page info
            pageInfoEl.textContent = `第 ${currentPage} 頁，共 ${totalPages} 頁`;
            
            // Update button states
            const prevBtn = paginationEl.querySelector('.prev-btn');
            const nextBtn = paginationEl.querySelector('.next-btn');
            
            prevBtn.disabled = currentPage === 1;
            nextBtn.disabled = currentPage === totalPages;
        }
    }

    changePage(type, direction) {
        if (type === 'income') {
            this.incomePage += direction;
        } else if (type === 'expense') {
            this.expensePage += direction;
        }
        
        // Get current transactions and update the specific list
        this.refreshTransactionList(type);
    }

    refreshTransactionList(type) {
        const transactionMonthEl = document.getElementById('transaction-month');
        const selectedMonth = transactionMonthEl ? transactionMonthEl.value : null;
        
        let transactions;
        
        if (selectedMonth) {
            // If a specific month is selected, filter by that month from all transactions
            const [year, month] = selectedMonth.split('-').map(Number);
            const allTransactions = this.data.transactions;
            
            transactions = allTransactions.filter(t => {
                if (t.type !== type) return false;
                const transactionDate = new Date(t.date);
                return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
            });
        } else {
            // If no specific month is selected, use the time range filter
            const allTransactions = this.getFilteredTransactionsForDetails();
            transactions = allTransactions.filter(t => t.type === type);
        }
        
        // Sort by date (newest first)
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update the specific list with pagination
        this.updateTransactionList(type, transactions);
    }

    showAllCategories() {
        const selectedCategoryEl = document.getElementById('selected-category');
        const backBtnEl = document.getElementById('back-btn');
        
        if (!selectedCategoryEl || !backBtnEl) {
            console.log('Required DOM elements not found for showAllCategories');
            return;
        }
        
        // Update header with selected time range
        const timeRangeText = this.getTimeRangeText();
        selectedCategoryEl.textContent = `${timeRangeText}交易細項`;
        backBtnEl.style.display = 'none';

        // Update content to show monthly transactions
        this.updateTransactionDetails();
    }

    getCategoryIcon(category) {
        const icons = {
            food: '🍽️',
            clothing: '👕',
            housing: '🏠',
            transport: '🚗',
            daily: '📅',
            entertainment: '🎬',
            other: '📦',
            salary: '💰',
            allowance: '💵',
            interest: '💹',
            dividend: '📈'
        };
        return icons[category] || '📦';
    }

    editTransaction(transactionId) {
        const transaction = this.data.transactions.find(t => t.id === transactionId);
        if (!transaction) return;

        // Open quick transaction modal with pre-filled data
        this.currentAssetType = transaction.account;
        const modal = document.getElementById('quick-transaction-modal');
        const title = document.getElementById('quick-modal-title');
        
        title.textContent = '編輯交易';
        
        // Pre-fill form
        document.getElementById('quick-transaction-form').reset();
        document.getElementById('quick-amount').value = transaction.amount;
        document.getElementById('quick-date').value = transaction.date;
        document.getElementById('quick-notes').value = transaction.notes || '';
        
        // Set transaction type
        this.setTransactionType(transaction.type);
        
        // Set category
        setTimeout(() => {
            const categorySelect = document.getElementById('quick-category');
            categorySelect.value = transaction.category;
            if (transaction.category === 'custom') {
                document.getElementById('custom-category-group').style.display = 'block';
                document.getElementById('custom-category').value = transaction.category;
            }
        }, 100);
        
        // Store transaction ID for update
        this.editingTransactionId = transactionId;
        
        modal.style.display = 'block';
        document.getElementById('quick-amount').focus();
    }

    deleteTransaction(transactionId) {
        if (confirm('確定要刪除這筆交易嗎？')) {
            this.data.transactions = this.data.transactions.filter(t => t.id !== transactionId);
            this.saveData();
            
            // Update all displays
            this.updateTodaySummary();
            this.updateChart();
            this.updateAssetsDisplay();
            
            // Refresh current view
            if (document.getElementById('selected-category').textContent === '當月交易細項') {
                this.showTodayExpenses();
            } else {
                // If viewing a specific category, refresh that view
                const currentCategory = this.getCurrentCategoryFromHeader();
                if (currentCategory) {
                    this.showCategoryDetails(currentCategory);
                }
            }
            
            this.showSuccessMessage('交易已刪除');
        }
    }

    getCurrentCategoryFromHeader() {
        const headerText = document.getElementById('selected-category').textContent;
        if (headerText.includes('支出細項') && !headerText.includes('今日')) {
            // Extract category name from header
            const categoryName = headerText.replace(' 支出細項', '');
            // Convert back to category key
            const categoryNames = {
                '餐飲': 'food',
                '服飾': 'clothing',
                '居住': 'housing',
                '交通': 'transport',
                '日常': 'daily',
                '娛樂': 'entertainment',
                '其他': 'other'
            };
            return categoryNames[categoryName] || categoryName;
        }
        return null;
    }

    showAllowanceWithdrawalModal(amount) {
        const modal = document.getElementById('allowance-modal');
        const bankBalance = this.calculateBankBalance();
        
        // Update modal content
        document.getElementById('allowance-amount').textContent = `NT$${amount.toFixed(0)}`;
        document.getElementById('current-bank-balance').textContent = `NT$${bankBalance.toFixed(0)}`;
        
        // Store the transaction data for later use
        this.pendingAllowanceTransaction = {
            type: 'income',
            amount: amount,
            category: 'allowance',
            date: document.getElementById('quick-date').value,
            notes: document.getElementById('quick-notes').value || '',
            account: 'cash'
        };
        
        modal.style.display = 'block';
    }

    confirmAllowanceWithdrawal() {
        if (!this.pendingAllowanceTransaction) return;
        
        // Add cash income transaction
        const cashTransaction = {
            id: Date.now(),
            ...this.pendingAllowanceTransaction
        };
        this.data.transactions.unshift(cashTransaction);
        
        // Add bank expense transaction (withdrawal)
        const bankTransaction = {
            id: Date.now() + 1,
            type: 'expense',
            amount: this.pendingAllowanceTransaction.amount,
            category: 'allowance',
            date: this.pendingAllowanceTransaction.date,
            notes: `領取零用錢 - ${this.pendingAllowanceTransaction.notes || ''}`,
            account: 'bank'
        };
        this.data.transactions.unshift(bankTransaction);
        
        this.saveData();
        
        // 同步更新所有相關顯示
        this.updateTodaySummary();
        this.updateChart();
        this.updateAssetsDisplay();
        
        // Refresh current view
        if (document.getElementById('selected-category').textContent === '當月交易細項') {
            this.showTodayExpenses();
        } else {
            const currentCategory = this.getCurrentCategoryFromHeader();
            if (currentCategory) {
                this.showCategoryDetails(currentCategory);
            }
        }
        
        // Reset form and close modals
        document.getElementById('quick-transaction-form').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('quick-date').value = today;
        document.getElementById('custom-category-group').style.display = 'none';
        
        this.pendingAllowanceTransaction = null;
        this.closeModal();
        
        this.showSuccessMessage('零用錢領取成功！已從銀行存款中扣除相應金額。');
    }

    setInitialAssets() {
        const modal = document.getElementById('initial-assets-modal');
        
        // Set current values
        document.getElementById('initial-bank').value = this.data.assets.bank;
        document.getElementById('initial-cash').value = this.data.assets.cash;
        document.getElementById('initial-credit').value = this.data.assets.creditCards.reduce((sum, card) => sum + card.balance, 0);
        
        modal.style.display = 'block';
    }

    saveInitialAssets() {
        const bankAmount = parseFloat(document.getElementById('initial-bank').value) || 0;
        const cashAmount = parseFloat(document.getElementById('initial-cash').value) || 0;
        const creditAmount = parseFloat(document.getElementById('initial-credit').value) || 0;
        
        // Update initial assets
        this.data.assets.bank = bankAmount;
        this.data.assets.cash = cashAmount;
        
        // Update credit cards (simplified to single card for now)
        if (creditAmount !== 0) {
            this.data.assets.creditCards = [{
                name: '信用卡',
                balance: creditAmount
            }];
        } else {
            this.data.assets.creditCards = [];
        }
        
        this.saveData();
        this.updateAssetsDisplay();
        this.closeModal();
        
        // Show success message
        this.showSuccessMessage('初始資產設定已儲存！');
    }

    showSuccessMessage(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        successDiv.textContent = `✅ ${message}`;
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    resetAllData() {
        const modal = document.getElementById('reset-modal');
        modal.style.display = 'block';
    }

    confirmReset() {
        // Reset all data to default
        this.data = {
            assets: {
                bank: 0,  // 初始銀行存款
                cash: 0,  // 初始現金
                creditCards: []  // 初始信用卡
            },
            transactions: [],  // 清空所有交易記錄
            settings: {
                currency: 'TWD'
            },
            customCategories: {
                income: [],
                expense: []
            }
        };

        // Save the reset data
        this.saveData();
        
        // Reset form states
        this.resetFormStates();
        
        // Update all displays to show zero values
        this.updateCategoryOptions();
        this.updateAssetsDisplay();
        this.updateTodaySummary();
        this.updateChart();
        
        // Show success message
        this.showResetSuccessMessage();
        
        this.closeModal();
    }

    resetFormStates() {
        // Reset quick transaction form
        const form = document.getElementById('quick-transaction-form');
        if (form) {
            form.reset();
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('quick-date').value = today;
            document.getElementById('custom-category-group').style.display = 'none';
            document.getElementById('payment-method-group').style.display = 'none';
        }
        
        // Reset transaction type to income
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('[data-type="income"]').classList.add('active');
        
        // Reset payment method selection
        this.selectedPaymentMethod = null;
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Reset current filter
        this.currentFilter = 'all';
    }

    showResetSuccessMessage() {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        successDiv.textContent = '✅ 數據已成功歸零，可以繼續使用！';
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    switchTab(tabType) {
        this.currentTab = tabType;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${tabType}-tab`).classList.add('active');
        
        // Update content
        this.updateTransactionDetails();
    }


    selectTimeRange(timeRange) {
        this.timeRange = timeRange;
        
        // Update button states
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${timeRange}-btn`).classList.add('active');
        
        // Show/hide month buttons
        const monthButtons = document.getElementById('month-buttons');
        if (monthButtons) {
            if (timeRange === 'custom') {
                monthButtons.style.display = 'flex';
                // Set current month as active
                const currentMonth = new Date().getMonth();
                document.querySelectorAll('.month-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.month-btn')[currentMonth].classList.add('active');
            } else {
                monthButtons.style.display = 'none';
            }
        }
        
        // Clear month selector when switching time ranges (except when selecting custom)
        if (timeRange !== 'custom') {
            const transactionMonthEl = document.getElementById('transaction-month');
            if (transactionMonthEl) {
                transactionMonthEl.value = '';
            }
        }
        
        // Update chart and details
        this.updateChart();
        this.updateTransactionDetails();
    }

    selectMonth(month) {
        this.selectedMonth = month;
        this.selectedYear = new Date().getFullYear();
        this.timeRange = 'custom';
        
        // Update month button states
        document.querySelectorAll('.month-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.month-btn')[month].classList.add('active');
        
        // Set month selector to match the selected month
        const transactionMonthEl = document.getElementById('transaction-month');
        if (transactionMonthEl) {
            const currentYear = new Date().getFullYear();
            const monthValue = `${currentYear}-${month}`;
            transactionMonthEl.value = monthValue;
        }
        
        // Update chart and details
        this.updateChart();
        this.updateTransactionDetails();
    }

    selectPaymentMethod(method) {
        this.selectedPaymentMethod = method;
        
        // Update button states
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[onclick="selectPaymentMethod('${method}')"]`).classList.add('active');
    }

    handleCreditCardPayment(amount, category, date, notes) {
        // Create credit card payment transaction
        const creditTransaction = {
            id: Date.now(),
            type: 'expense',
            amount: amount,
            category: category,
            date: date,
            notes: notes,
            account: 'credit'
        };
        
        // Create payment source transaction
        const paymentTransaction = {
            id: Date.now() + 1,
            type: 'expense',
            amount: amount,
            category: 'credit_payment',
            date: date,
            notes: `信用卡繳清 - ${notes}`,
            account: this.selectedPaymentMethod
        };
        
        // Add both transactions
        this.data.transactions.push(creditTransaction);
        this.data.transactions.push(paymentTransaction);
        
        // Save data
        this.saveData();
        
        // Update displays
        this.updateAssetsDisplay();
        this.updateTodaySummary();
        this.updateChart();
        this.updateTransactionDetails();
        
        // Reset form
        this.resetFormStates();
        this.closeModal();
        
        // Show success message
        this.showSuccessMessage('信用卡繳清記錄已新增');
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

// Global functions for HTML onclick handlers
function quickAddTransaction(assetType) {
    budgetApp.quickAddTransaction(assetType);
}

function manageCreditCards() {
    budgetApp.manageCreditCards();
}

function addCreditCard() {
    budgetApp.addCreditCard();
}

function setInitialAssets() {
    budgetApp.setInitialAssets();
}

function resetAllData() {
    budgetApp.resetAllData();
}

function confirmReset() {
    budgetApp.confirmReset();
}

function handleCategoryChange() {
    const categorySelect = document.getElementById('quick-category');
    const customGroup = document.getElementById('custom-category-group');
    const paymentMethodGroup = document.getElementById('payment-method-group');
    
    if (categorySelect.value === 'custom') {
        customGroup.style.display = 'block';
        document.getElementById('custom-category').focus();
    } else {
        customGroup.style.display = 'none';
    }
    
    // Show payment method selection for credit card payment
    if (categorySelect.value === 'payment' && budgetApp.currentAssetType === 'credit') {
        paymentMethodGroup.style.display = 'block';
    } else {
        paymentMethodGroup.style.display = 'none';
    }
}

function showAllCategories() {
    budgetApp.showAllCategories();
}

function editTransaction(transactionId) {
    budgetApp.editTransaction(transactionId);
}

function deleteTransaction(transactionId) {
    budgetApp.deleteTransaction(transactionId);
}

function confirmAllowanceWithdrawal() {
    budgetApp.confirmAllowanceWithdrawal();
}

function switchTab(tabType) {
    budgetApp.switchTab(tabType);
}


function selectTimeRange(timeRange) {
    budgetApp.selectTimeRange(timeRange);
}

function selectMonth(month) {
    budgetApp.selectMonth(month);
}

function selectPaymentMethod(method) {
    budgetApp.selectPaymentMethod(method);
}

function updateTransactionDetails() {
    budgetApp.updateTransactionDetails();
}

function changePage(type, direction) {
    budgetApp.changePage(type, direction);
}

function closeModal() {
    budgetApp.closeModal();
}

// Initialize the app when the page loads
let budgetApp;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    budgetApp = new BudgetApp();
    console.log('App initialized successfully');
});
