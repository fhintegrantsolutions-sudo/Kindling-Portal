import { 
  LayoutDashboard, 
  PieChart, 
  TrendingUp, 
  FileText, 
  User, 
  LogOut, 
  Menu,
  Plus,
  Trash2,
  Upload,
  Download
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "My Notes", icon: PieChart, href: "/notes" },
  { label: "Opportunities", icon: TrendingUp, href: "/opportunities" },
  { label: "Profile & Documents", icon: User, href: "/profile" },
];

export const MOCK_USER = {
  name: "Alex Johnson",
  email: "alex.j@example.com",
  totalInvested: 125000,
  activeNotes: 3,
  monthlyReturn: 1250,
};

export const MOCK_NOTES = [
  {
    id: 1,
    title: "Austin Multi-Family Fund II",
    principal: 50000,
    rate: "10%",
    term: "24 Months",
    startDate: "2024-01-15",
    nextPayment: "2024-06-15",
    status: "Active",
    type: "Real Estate",
  },
  {
    id: 2,
    title: "Tech Growth Bridge Loan",
    principal: 25000,
    rate: "12%",
    term: "12 Months",
    startDate: "2024-03-01",
    nextPayment: "2024-06-01",
    status: "Active",
    type: "Venture Debt",
  },
  {
    id: 3,
    title: "Green Energy Infrastructure",
    principal: 50000,
    rate: "9.5%",
    term: "36 Months",
    startDate: "2023-11-20",
    nextPayment: "2024-06-20",
    status: "Active",
    type: "Infrastructure",
  },
];

export const MOCK_OPPORTUNITIES = [
  {
    id: 101,
    title: "Miami Residential Redevelopment",
    targetRaise: 2000000,
    minInvestment: 25000,
    rate: "11%",
    term: "18 Months",
    description: "Senior secured debt for the renovation of a 12-unit apartment complex in Little Havana.",
    closingDate: "2024-07-15",
  },
  {
    id: 102,
    title: "SaaS Revenue Financing Series A",
    targetRaise: 5000000,
    minInvestment: 50000,
    rate: "13%",
    term: "24 Months",
    description: "Revenue-based financing for a high-growth logistics software company reaching $5M ARR.",
    closingDate: "2024-08-01",
  },
];

export const MOCK_BENEFICIARIES = [
  { id: 1, name: "Sarah Johnson", relation: "Spouse", percentage: 50 },
  { id: 2, name: "Michael Johnson", relation: "Son", percentage: 50 },
];
