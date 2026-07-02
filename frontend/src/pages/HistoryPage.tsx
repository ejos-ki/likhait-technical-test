import React, { useState, useEffect } from "react";
import {
  getExpenses,
  createExpense,
  fetchCategories,
  createCategory,
} from "../services/api";
import { Expense, ExpenseFormData } from "../types";
import YearNavigation from "../components/YearNavigation";
import { MonthNavigation } from "../components/MonthNavigation";
import CategoryBreakdown from "../components/CategoryBreakdown";
import { CalendarExpenseTable } from "../components/CalendarExpenseTable";
import { ExpenseForm } from "../components/ExpenseForm";
import { Modal, Button, TextField } from "../vibes";
import { COLORS } from "../constants/colors";

const HistoryPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available categories fetched from the backend (source of truth for the
  // expense form dropdown). Kept separate from the per-month "category breakdown"
  // totals computed further down.
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Add Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | undefined>(
    undefined,
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Get year and month from URL params, default to current date if not provided
  const getInitialYearMonth = () => {
    const params = new URLSearchParams(window.location.search);
    const currentDate = new Date();
    const yearParam = params.get("year");
    const monthParam = params.get("month");

    return {
      year: yearParam ? parseInt(yearParam) : currentDate.getFullYear(),
      month: monthParam ? parseInt(monthParam) : currentDate.getMonth() + 1,
    };
  };

  const initial = getInitialYearMonth();
  const [selectedYear, setSelectedYear] = useState(initial.year);
  const [selectedMonth, setSelectedMonth] = useState(initial.month);

  // Update URL when year or month changes
  const updateURL = (year: number, month: number) => {
    const params = new URLSearchParams();
    params.set("year", year.toString());
    params.set("month", month.toString());
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, "", newURL);
  };

  // Initialize URL params if not present
  useEffect(() => {
    updateURL(selectedYear, selectedMonth);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedYear, selectedMonth]);

  // Load the available categories once on mount.
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setAvailableCategories(data.map((c) => c.name));
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses(selectedYear, selectedMonth);
      setExpenses(data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    updateURL(year, selectedMonth);
  };

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month);
    updateURL(selectedYear, month);
  };

  const handleAddExpense = async (data: ExpenseFormData) => {
    try {
      await createExpense(data);
      setIsModalOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  };

  const openCategoryModal = () => {
    setNewCategoryName("");
    setCategoryError(undefined);
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name is required");
      return;
    }

    setIsCreatingCategory(true);
    setCategoryError(undefined);
    try {
      await createCategory(name);
      await loadCategories(); // refresh the dropdown with the new category
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
    } catch (error) {
      setCategoryError(
        error instanceof Error ? error.message : "Failed to create category",
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Calculate category breakdown
  const categoryData = expenses.reduce(
    (acc, expense) => {
      const category = expense.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = { category, amount: 0, count: 0 };
      }
      acc[category].amount += Number(expense.amount);
      acc[category].count += 1;
      return acc;
    },
    {} as Record<string, { category: string; amount: number; count: number }>,
  );

  const categories = Object.values(categoryData).sort(
    (a, b) => b.amount - a.amount,
  );
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalCount = categories.reduce((sum, cat) => sum + cat.count, 0);

  const pageStyle: React.CSSProperties = {
    padding: "48px 64px",
    minHeight: "100vh",
    background: COLORS.secondary.s01,
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    justifyContent: "space-between",
  };

  const leftHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "24px",
  };

  const headerActionsStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "40px",
    fontWeight: 700,
    color: COLORS.secondary.s10,
    margin: 0,
    flexShrink: 0,
  };

  const loadingStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "48px",
    fontSize: "18px",
    color: COLORS.secondary.s08,
  };

  const categoryModalActionsStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    marginTop: "1rem",
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={leftHeaderStyle}>
          <h1 style={titleStyle}>Expense History</h1>
          <YearNavigation
            currentYear={selectedYear}
            onYearChange={handleYearChange}
          />
        </div>
        <div style={headerActionsStyle}>
          <Button variant="secondary" onClick={openCategoryModal}>
            Add Category
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Add Expense
          </Button>
        </div>
      </div>

      <MonthNavigation
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        onMonthChange={handleMonthChange}
      />

      <div>
        {loading ? (
          <div style={loadingStyle}>Loading...</div>
        ) : (
          <>
            <CategoryBreakdown
              categories={categories}
              total={total}
              totalCount={totalCount}
            />
            <div style={{ marginTop: "32px" }}>
              <CalendarExpenseTable
                expenses={expenses}
                onExpenseUpdated={fetchExpenses}
                categories={availableCategories}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Expense"
      >
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setIsModalOpen(false)}
          categories={availableCategories}
        />
      </Modal>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add New Category"
      >
        <div>
          <TextField
            label="Category Name"
            type="text"
            placeholder="Enter category name"
            value={newCategoryName}
            onChange={(e) => {
              setNewCategoryName(e.target.value);
              if (categoryError) setCategoryError(undefined);
            }}
            error={categoryError}
            fullWidth
            required
          />
          <div style={categoryModalActionsStyle}>
            <Button
              type="button"
              variant="primary"
              onClick={handleAddCategory}
              disabled={isCreatingCategory}
              fullWidth
            >
              {isCreatingCategory ? "Adding..." : "Add Category"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={isCreatingCategory}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HistoryPage;