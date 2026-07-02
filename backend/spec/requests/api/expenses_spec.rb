require 'rails_helper'

RSpec.describe "Api::Expenses", type: :request do
  let!(:food_category) { Category.create!(name: "Food") }
  let!(:transport_category) { Category.create!(name: "Transport") }

  describe "GET /api/expenses" do
  
  # Created in an order that intentionally does NOT match date order:
  # expense1 is created first but has the LATER date; expense2 is created
  # second but has the EARLIER date. This proves ordering is by `date`, not `created_at`.
  let!(:expense1) { Expense.create!(description: "Lunch", amount: 100.00, category: food_category, date: Date.new(2026, 1, 20)) }
  let!(:expense2) { Expense.create!(description: "Taxi", amount: 50.00, category: transport_category, date: Date.new(2026, 1, 10)) }

    it "returns all expenses with category information" do
      get "/api/expenses"

      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json.length).to eq(2)
    end

    it "returns expenses ordered by expense date descending (not by created_at)" do
      get "/api/expenses"

      json = JSON.parse(response.body)

      # expense1 has the later date (2026-01-20) so it must come first;
      # expense2 has the earlier date (2026-01-10) so it must come last.
      expect(json.first["id"]).to eq(expense1.id)
      expect(json.last["id"]).to eq(expense2.id)
    end

    it "filters by expense date (not created_at) when year and month are given" do
      # Dated in January but created now — proves the filter uses `date`, not `created_at`.
      jan_expense = Expense.create!(description: "January expense", amount: 25.00, category: food_category, date: Date.new(2026, 1, 15))

      get "/api/expenses", params: { year: 2026, month: 1 }
      expect(JSON.parse(response.body).map { |e| e["id"] }).to include(jan_expense.id)

      get "/api/expenses", params: { year: 2026, month: 2 }
      expect(JSON.parse(response.body).map { |e| e["id"] }).not_to include(jan_expense.id)
    end
  end

  describe "POST /api/expenses" do
    context "with valid parameters" do
      let(:valid_params) do
        {
          expense: {
            description: "Team Lunch",
            amount: 150.50,
            category_id: food_category.id,
            date: Date.today
          }
        }
      end

      it "creates a new expense" do
        expect {
          post "/api/expenses", params: valid_params, as: :json
        }.to change(Expense, :count).by(1)

        expect(response).to have_http_status(:created)
        json = JSON.parse(response.body)
        expect(json["description"]).to eq("Team Lunch")
        expect(json["amount"]).to eq(150.5)
      end
    end

    context "with invalid parameters" do
      it "with negative amounts" do
        invalid_params = {
          expense: {
            description: "Invalid expense",
            amount: -100.00,
            category_id: food_category.id,
            date: Date.today
          }
        }

        expect {
          post "/api/expenses", params: invalid_params, as: :json
        }.to change(Expense, :count).by(1)

        expect(response).to have_http_status(:created)
      end

      it "with empty descriptions" do
        invalid_params = {
          expense: {
            description: "",
            amount: 100.00,
            category_id: food_category.id,
            date: Date.today
          }
        }

        expect {
          post "/api/expenses", params: invalid_params, as: :json
        }.to change(Expense, :count).by(1)

        expect(response).to have_http_status(:created)
      end
    end
  end
end
